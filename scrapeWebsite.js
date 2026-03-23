const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

async function scrapeWebsite(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    const $ = cheerio.load(data.toLowerCase());
    const html = $.html();

    return {
      websiteUrl: url,
      scraped: true,
      error: null,
      hasForm: html.includes("<form")||
      html.includes("contact") ||
      html.includes("get a quote"),
      hasChat:
        html.includes("intercom") ||
        html.includes("drift") ||
        html.includes("tawk"),
      hasBooking:
        html.includes("book") ||
        html.includes("schedule") ||
        html.includes("appointment"),
      hasPhone: 
      /\d{3}[-.\s]?\d{3}/.test(html) ||
      html.includes("call") ||
      html.includes("tel:"),
    };
  } catch (e) {
    return {
      websiteUrl: url,
      scraped: false,
      error: e.message || "scrape_failed",
      hasForm: false,
      hasChat: false,
      hasBooking: false,
      hasPhone: false,
    };
  }
}

module.exports = { scrapeWebsite };