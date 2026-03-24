# Prospect Intelligence Engine

This tool identifies high-value local business leads by:

1. Scraping websites for conversion signals (forms, chat, booking)
2. Scoring businesses based on:
   - Missing features (pain)
   - Business fit (category, reviews)
   - Expansion opportunity
3. Ranking leads by priority
4. Generating outreach messages
5. Exporting results to CSV (ready for sales use)

## Output
- leads.csv → ranked prospects (HOT / WARM / LOW)
- output.json → full structured pipeline data

## Note
LLM output is fallback-safe. Core scoring is deterministic.
