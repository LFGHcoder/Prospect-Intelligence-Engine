const { chromium } = require("playwright");

async function scrapeWebsite(url) {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true, // ✅ FIX SSL errors
  });

  const page = await context.newPage();

  try {
    await page.goto(url, {
      timeout: 20000,
      waitUntil: "networkidle", // ✅ WAIT PROPERLY
    });

    // small delay for dynamic content
    await page.waitForTimeout(1500);

    const html = (await page.content()).toLowerCase();

    const hasPhone =
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(html) ||
      html.includes("tel:") ||
      html.includes("call") ||
      html.includes("phone");

    const hasForm =
      html.includes("<form") ||
      html.includes("contact") ||
      html.includes("get a quote") ||
      html.includes("request service") ||
      html.includes("submit");

    const hasChat =
      html.includes("intercom") ||
      html.includes("drift") ||
      html.includes("tawk") ||
      html.includes("chat");

    const hasBooking =
      html.includes("book") ||
      html.includes("schedule") ||
      html.includes("appointment") ||
      html.includes("reserve");

    await browser.close();

    return {
      websiteUrl: url,
      scraped: true,
      error: null,
      hasForm,
      hasChat,
      hasBooking,
      hasPhone,
    };
  } catch (e) {
    await browser.close();

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