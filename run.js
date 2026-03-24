require("dotenv").config();

// const { fetchBusinesses } = require("./fetchBusinesses");
const { getMockBusinesses } = require("./mockBusinesses");
const { scrapeWebsite } = require("./scrapeWebsite");
const { analyzeWithLLM, LLM_FALLBACK } = require("./analyzeWithLLM");
const { generateOutreach } = require("./generateOutreach");
const { scoreBusiness, sortResults } = require("./score");
const { pushToSheets } = require("./pushToSheets");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const businesses = getMockBusinesses().map((b, i) => ({
    id: `mock-${i}`,
    name: b.name,
    phone: b.phone,
    review_count: b.reviews,
    rating: 4.5,
    url: b.website,
    categories: [{ alias: b.category, title: b.category }],
    location: {},
  }));

  const pipeline = [];

  for (let i = 0; i < businesses.length; i += 1) {
    const b = businesses[i];

    let scrape = {
      websiteUrl: null,
      scraped: false,
      error: null,
      hasForm: false,
      hasChat: false,
      hasBooking: false,
      hasPhone: false,
    };

    try {
      scrape = await scrapeWebsite(b.url);
    } catch (e) {
      scrape.error = e.message || "scrape_exception";
    }

    // deterministic missing features
    const missing_features = [
      !scrape.hasForm && "contact form",
      !scrape.hasChat && "live chat",
      !scrape.hasBooking && "online booking",
    ].filter(Boolean);

    const llmCtx = {
      name: b.name,
      review_count: b.review_count,
      rating: b.rating,
      websiteUrl: scrape.websiteUrl,
      scraped: scrape.scraped,
      scrapeError: scrape.error,
      hasForm: scrape.hasForm,
      hasChat: scrape.hasChat,
      hasBooking: scrape.hasBooking,
      hasPhone: scrape.hasPhone,
    };

    let llm = { missing_features: [], pitch: "" };

    try {
      llm = await analyzeWithLLM(llmCtx);
    } catch {
      llm = { ...LLM_FALLBACK };
    }

    // fallback if LLM fails
    if (!llm.missing_features || llm.missing_features.length === 0) {
      llm.missing_features = missing_features;
    }

    const scores = scoreBusiness({
      categories: b.categories,
      phone: b.phone,
      review_count: b.review_count,
      hasForm: scrape.hasForm,
      hasChat: scrape.hasChat,
      hasBooking: scrape.hasBooking,
      hasPhone: scrape.hasPhone,
      missing_features: llm.missing_features,
      scrapeError: scrape.error,
    });

    const { outreach } = await generateOutreach({
      name: b.name,
      llm: {
        missing_features: llm.missing_features || [],
      },
    });

    pipeline.push({
      business: b,
      websiteUrl: scrape.websiteUrl,
      scrapeError: scrape.error,
      signals: {
        hasForm: scrape.hasForm,
        hasChat: scrape.hasChat,
        hasBooking: scrape.hasBooking,
        hasPhone: scrape.hasPhone,
      },
      llm,
      scores,
      outreach,
    });

    await sleep(Number(process.env.REQUEST_PAUSE_MS) || 400);
  }

  const sorted = sortResults(pipeline);

  // only good leads
  const topProspects = sorted
    .filter((r) => r.scores.priority > 10)
    .slice(0, 3);

  let sheetsMeta = null;
  try {
    sheetsMeta = await pushToSheets(sorted);
  } catch (e) {
    sheetsMeta = { error: e.message || String(e) };
  }

  const output = {
    generated_at: new Date().toISOString(),
    count: topProspects.length,
    google_sheets: sheetsMeta,

    results: topProspects.map((r) => {
      let label = "LOW";
      if (r.scores.priority >= 20) label = "HOT";
      else if (r.scores.priority >= 12) label = "WARM";

      return {
        name: r.business.name,
        yelp_url: r.business.url,
        website_url: r.websiteUrl,
        phone: r.business.phone,
        review_count: r.business.review_count,
        rating: r.business.rating,

        // ✅ NEW: clean product-style fields
        lead_label: label,
        status: r.scrapeError ? "failed" : "scraped",

        signals: r.signals,
        scores: r.scores,
        llm: r.llm,

        outreach: r.outreach,
      };
    }),
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(
    JSON.stringify({ error: err.message || String(err) }, null, 2)
  );
  process.exitCode = 1;
});