const axios = require("axios");

const YELP_SEARCH = "https://api.yelp.com/v3/businesses/search";

/**
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   phone: string,
 *   review_count: number,
 *   rating: number,
 *   url: string,
 *   categories: Array<{ alias: string, title: string }>,
 *   location: object
 * }>>}
 */
async function fetchBusinesses() {
  const key = process.env.YELP_API_KEY;
  if (!key) {
    throw new Error("Missing YELP_API_KEY in environment");
  }

  const res = await axios.get(YELP_SEARCH, {
    headers: { Authorization: `Bearer ${key}` },
    params: {
      term: "plumbing",
      location: "Cleveland, OH",
      categories: "plumbers",
      limit: 50,
      sort_by: "review_count",
    },
    timeout: 30_000,
    validateStatus: () => true,
  });

  const data = res.data;
  if (res.status < 200 || res.status >= 300) {
    const msg =
      (data && data.error && data.error.description) ||
      (typeof data === "string" ? data : JSON.stringify(data));
    throw new Error(`Yelp HTTP ${res.status}: ${msg}`);
  }

  if (data.error) {
    throw new Error(`Yelp API error: ${data.error.description || JSON.stringify(data.error)}`);
  }

  const list = Array.isArray(data.businesses) ? data.businesses : [];
  return list.map((b) => ({
    id: b.id,
    name: b.name,
    phone: b.phone || "",
    review_count: b.review_count ?? 0,
    rating: b.rating ?? 0,
    url: b.url || "",
    categories: b.categories || [],
    location: b.location || {},
  }));
}

module.exports = { fetchBusinesses };
