/**
 * @param {{
*   categories: Array<{ alias?: string, title?: string }>,
*   phone: string,
*   review_count: number,
*   hasForm: boolean,
*   hasChat: boolean,
*   hasBooking: boolean,
*   hasPhone: boolean,
*   missing_features: string[],
*   scrapeError?: string | null
* }} input
*/
function scoreBusiness(input) {
 const plumbingHit = (input.categories || []).some((c) => {
   const a = (c.alias || "").toLowerCase();
   const t = (c.title || "").toLowerCase();
   return a.includes("plumb") || t.includes("plumb");
 });

 const digits = String(input.phone || "").replace(/\D/g, "");
 const hasYelpPhone = digits.length >= 10;

 /** Missing conversion tools on site → higher pain */
 let pain = 0;
 if (!input.hasForm) pain += 1;
 if (!input.hasChat) pain += 1;
 if (!input.hasBooking) pain += 1;

 // ✅ Penalize failed scrapes (IMPORTANT)
 if (input.scrapeError) {
  return {
    pain: 0,
    fit: 0,
    expansion: 0,
    priority: -1 // pushes to bottom
  };
}

 /** Category match + reachable business + social proof */
 let fit = 0;
 if (plumbingHit) fit += 1;
 if (hasYelpPhone || input.hasPhone) fit += 1;
 if (input.review_count >= 20) fit += 1;
 else if (input.review_count >= 5) fit += 0.5;

 /** Expansion = number of missing features */
 const expansion = Array.isArray(input.missing_features)
   ? input.missing_features.length
   : 0;

 /** Final priority score */
 const priority = pain * 4 + expansion * 2 + fit * 3;

 return {
   pain,
   fit: Math.round(fit * 10) / 10,
   expansion,
   priority: Math.round(priority * 10) / 10,
 };
}

function sortResults(rows) {
 return [...rows].sort((a, b) => {
   if (b.scores.priority !== a.scores.priority) {
     return b.scores.priority - a.scores.priority;
   }
   if (b.business.review_count !== a.business.review_count) {
     return b.business.review_count - a.business.review_count;
   }
   return String(a.business.name).localeCompare(String(b.business.name));
 });
}

module.exports = { scoreBusiness, sortResults };