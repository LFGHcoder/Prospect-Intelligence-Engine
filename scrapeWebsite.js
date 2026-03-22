const axios = require("axios");
const cheerio = require("cheerio");

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_500_000;

const CHAT_HINTS = [
  "intercom",
  "drift",
  "tawk.to",
  "tidio",
  "crisp.chat",
  "zendesk",
  "livechat",
  "olark",
  "hubspot",
  "fb-messenger",
  "facebook.com/plugins/page.php",
];

const BOOKING_HINTS = [
  "calendly",
  "acuityscheduling",
  "square.site",
  "squareup.com/appointments",
  "booksy",
  "setmore",
  "simplybook",
  "youcanbook.me",
  "schedule",
  "/book",
  "book-now",
  "booknow",
  "appointments",
];

function normalizeUrl(href) {
  if (!href || typeof href !== "string") return null;
  const t = href.trim();
  if (!t.startsWith("http")) return null;
  if (t.includes("yelp.com")) return null;
  if (t.includes("facebook.com") && !t.includes("/plugins/")) return null;
  return t.split("?")[0];
}

async function fetchText(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const res = await axios.get(url, {
    timeout: timeoutMs,
    maxRedirects: 5,
    maxContentLength: MAX_HTML_BYTES,
    maxBodyLength: MAX_HTML_BYTES,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 400) {
    throw new Error(`HTTP ${res.status}`);
  }
  const html = typeof res.data === "string" ? res.data : String(res.data || "");
  return html.slice(0, MAX_HTML_BYTES);
}

/**
 * Try to resolve the business website from a Yelp business page URL.
 * @param {string} yelpUrl
 * @returns {Promise<string|null>}
 */
async function extractBusinessSiteFromYelp(yelpUrl) {
  if (!yelpUrl) return null;
  try {
    const html = await fetchText(yelpUrl, DEFAULT_TIMEOUT_MS);
    const $ = cheerio.load(html);
    const candidates = [];
    $('a[href^="http"]').each((_, el) => {
      const href = $(el).attr("href");
      const nu = normalizeUrl(href);
      if (nu) candidates.push(nu);
    });
    // Yelp often uses redirect links; prefer non-yelp http(s) first occurrence that's not maps
    const direct = candidates.find(
      (u) => !u.includes("yelp.com") && !u.includes("google.com/maps")
    );
    return direct || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} html
 * @param {string} [pageUrl]
 */
function analyzeHtml(html, pageUrl = "") {
  const lower = html.toLowerCase();
  const $ = cheerio.load(html);

  const hasForm = $("form").length > 0;
  const bodyText = $("body").text() || "";

  const haystack = `${lower}\n${pageUrl.toLowerCase()}`;
  const hasChat = CHAT_HINTS.some((h) => haystack.includes(h));
  const hasBooking = BOOKING_HINTS.some((h) => haystack.includes(h));

  const phoneRegex = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const hasPhone = phoneRegex.test(bodyText.replace(/\s+/g, " "));

  return {
    hasForm,
    hasChat,
    hasBooking,
    hasPhone,
  };
}

/**
 * @param {{ url: string, phone?: string }} business — `url` is Yelp page URL from Fusion API
 * @returns {Promise<{
 *   websiteUrl: string | null,
 *   scraped: boolean,
 *   error: string | null,
 *   hasForm: boolean,
 *   hasChat: boolean,
 *   hasBooking: boolean,
 *   hasPhone: boolean
 * }>}
 */
async function scrapeWebsite(business) {
  const yelpUrl = business.url || "";
  const yelpPhone = !!(business.phone && String(business.phone).replace(/\D/g, "").length >= 10);

  const empty = {
    websiteUrl: null,
    scraped: false,
    error: null,
    hasForm: false,
    hasChat: false,
    hasBooking: false,
    hasPhone: yelpPhone,
  };

  if (!yelpUrl) {
    return { ...empty, error: "no_yelp_url" };
  }

  const isYelpPage =
    yelpUrl.includes("yelp.com") || yelpUrl.includes("yelpusercontent.com");
  if (!isYelpPage) {
    try {
      const html = await fetchText(yelpUrl, DEFAULT_TIMEOUT_MS);
      const signals = analyzeHtml(html, yelpUrl);
      return {
        websiteUrl: yelpUrl,
        scraped: true,
        error: null,
        hasForm: signals.hasForm,
        hasChat: signals.hasChat,
        hasBooking: signals.hasBooking,
        hasPhone: signals.hasPhone || yelpPhone,
      };
    } catch (e) {
      return {
        ...empty,
        websiteUrl: yelpUrl,
        scraped: false,
        error: e.message || "fetch_failed",
      };
    }
  }

  let websiteUrl = null;
  try {
    websiteUrl = await extractBusinessSiteFromYelp(yelpUrl);
  } catch (e) {
    return {
      ...empty,
      error: e.message || "yelp_resolve_failed",
    };
  }

  if (!websiteUrl) {
    return { ...empty, error: "no_website_found" };
  }

  try {
    const html = await fetchText(websiteUrl, DEFAULT_TIMEOUT_MS);
    const signals = analyzeHtml(html, websiteUrl);
    return {
      websiteUrl,
      scraped: true,
      error: null,
      hasForm: signals.hasForm,
      hasChat: signals.hasChat,
      hasBooking: signals.hasBooking,
      hasPhone: signals.hasPhone || yelpPhone,
    };
  } catch (e) {
    return {
      websiteUrl,
      scraped: false,
      error: e.message || "fetch_failed",
      hasForm: false,
      hasChat: false,
      hasBooking: false,
      hasPhone: yelpPhone,
    };
  }
}

module.exports = { scrapeWebsite, extractBusinessSiteFromYelp, analyzeHtml };
