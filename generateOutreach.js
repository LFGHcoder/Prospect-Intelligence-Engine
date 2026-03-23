const { GoogleGenerativeAI } = require("@google/generative-ai");

const OUTREACH_FALLBACK =
  "We help businesses improve their website conversions and capture more leads.";

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
 * @returns {{ outreach: string } | null}
 */
function safeParseOutreachJson(raw) {
  const cleaned = stripJsonFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice);
    if (!obj || typeof obj !== "object") return null;
    const outreach =
      typeof obj.outreach === "string" ? obj.outreach.trim() : "";
    if (!outreach) return null;
    return { outreach };
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   name: string,
 *   missing_features: string[],
 *   review_count: number,
 *   rating: number
 * }} ctx
 * @returns {Promise<{ outreach: string }>}
 */
async function generateOutreach(ctx) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return { outreach: OUTREACH_FALLBACK };
  }

  try {
    const genAI = new GoogleGenerativeAI(String(apiKey).trim());
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.45,
        responseMimeType: "application/json",
      },
    });

    const payload = {
      name: ctx.name,
      missing_features: Array.isArray(ctx.missing_features)
        ? ctx.missing_features
        : [],
      review_count: ctx.review_count,
      rating: ctx.rating,
    };

    const prompt = `You write B2B outreach for a web/digital agency.

Business context (JSON):
${JSON.stringify(payload)}

Write a short cold outreach email body (3–4 sentences only). Tone: professional, warm, and helpful — never pushy or spammy.
Naturally mention 1–2 of the missing_features (if the list is empty, speak generally about website improvements for lead capture).
Emphasize helping them win more customers and inquiries, not selling hard.

Respond with STRICT JSON only, no markdown, matching exactly:
{"outreach":"your full message as one string (plain text, 3–4 sentences)"}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = typeof response.text === "function" ? response.text() : "";

    const parsed = safeParseOutreachJson(text);
    if (parsed) return parsed;

    return { outreach: OUTREACH_FALLBACK };
  } catch {
    return { outreach: OUTREACH_FALLBACK };
  }
}

module.exports = { generateOutreach };
