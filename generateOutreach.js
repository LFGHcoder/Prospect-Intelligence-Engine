const { GoogleGenerativeAI } = require("@google/generative-ai");

const FALLBACK = {
  outreach:
    "We help businesses improve their website conversions and capture more leads.",
};

async function generateOutreach(ctx) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("❌ Missing GEMINI_API_KEY");
    return FALLBACK;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.4,
      },
    });

    const prompt = `
Write a short cold outreach message (3-4 sentences).

Business: ${ctx.name}
Rating: ${ctx.rating}
Reviews: ${ctx.review_count}

Missing features: ${ctx.missing_features.join(", ")}

Rules:
- Friendly and human
- Mention 1–2 missing features
- Focus on getting more customers
- No fluff, no buzzwords
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    if (!text || text.length < 20) {
      console.log("⚠️ Empty LLM response");
      return FALLBACK;
    }

    return { outreach: text.trim() };
  } catch (e) {
    console.log("❌ Gemini error:", e.message);
    return FALLBACK;
  }
}

module.exports = { generateOutreach };