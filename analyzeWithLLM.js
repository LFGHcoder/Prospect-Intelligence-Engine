const { GoogleGenerativeAI } = require("@google/generative-ai");

const LLM_FALLBACK = {
  missing_features: [],
  pitch: "AI automation opportunity",
};

/**
 * Strip Gemini markdown fences and stray backticks before parsing.
 * @param {string} raw
 * @returns {string}
 */
function stripJsonFences(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();
  const block = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block) s = block[1].trim();
  s = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  return s;
}

/**
 * @param {string} raw
 * @returns {{ missing_features: string[], pitch: string } | null}
 */
function safeParseLLMJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = stripJsonFences(raw);

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  s = s.slice(start, end + 1);

  try {
    const obj = JSON.parse(s);
    if (!obj || typeof obj !== "object") return null;
    const missing = Array.isArray(obj.missing_features)
      ? obj.missing_features.map((x) => String(x)).filter(Boolean)
      : [];
    const pitch = typeof obj.pitch === "string" ? obj.pitch.trim() : "";
    return { missing_features: missing, pitch };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   name: string,
 *   review_count: number,
 *   rating: number,
 *   websiteUrl: string | null,
 *   scraped: boolean,
 *   scrapeError: string | null,
 *   hasForm: boolean,
 *   hasChat: boolean,
 *   hasBooking: boolean,
 *   hasPhone: boolean
 * }} ctx
 * @returns {Promise<{ missing_features: string[], pitch: string }>}
 */
async function analyzeWithLLM(ctx) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return { ...LLM_FALLBACK };
  }

  try {
    const genAI = new GoogleGenerativeAI(String(apiKey).trim());
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const payload = {
      business_name: ctx.name,
      yelp_reviews: ctx.review_count,
      yelp_rating: ctx.rating,
      website_url: ctx.websiteUrl,
      website_scraped: ctx.scraped,
      scrape_notes: ctx.scrapeError,
      signals: {
        has_contact_or_lead_form: ctx.hasForm,
        has_live_chat: ctx.hasChat,
        has_online_booking: ctx.hasBooking,
        phone_visible_on_site: ctx.hasPhone,
      },
    };

    const prompt = `You are a B2B sales assistant for a web agency.

Input (JSON):\n${JSON.stringify(payload)}

Respond with STRICT JSON only (no markdown, no backticks) matching exactly:
{"missing_features":["string"],"pitch":"string"}

Rules:
- missing_features: short feature names the site lacks or is weak on (e.g. "contact form", "live chat", "online booking"). Dedupe. Max 8 items.
- pitch: one concise paragraph (2-4 sentences) explaining how we can help this business, referencing their gaps.
- Use the provided booleans; do not invent a phone number or URL.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response?.text?.() || "";

    const parsed = safeParseLLMJson(text);
    if (parsed) return parsed;

    return { ...LLM_FALLBACK };
  } catch {
    return { ...LLM_FALLBACK };
  }
}

module.exports = { analyzeWithLLM, safeParseLLMJson, LLM_FALLBACK };
