const { chromium } = require("playwright");

async function scrapeWebsite(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      timeout: 30000,
      waitUntil: "load",
    });

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

module.exports = scrapeWebsite;