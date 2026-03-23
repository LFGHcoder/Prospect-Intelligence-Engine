function scoreBusiness(input) {
  // 🚨 fallback if scraping failed
  if (input.scrapeError) {
    return {
      pain: 3,
      fit: 1,
      expansion: Array.isArray(input.missing_features)
        ? input.missing_features.length
        : 2,
      priority: 15,
    };
  }

  const plumbingHit = (input.categories || []).some((c) => {
    const a = (c.alias || "").toLowerCase();
    const t = (c.title || "").toLowerCase();
    return a.includes("plumb") || t.includes("plumb");
  });

  const digits = String(input.phone || "").replace(/\D/g, "");
  const hasYelpPhone = digits.length >= 10;

  // 🔥 pain = missing conversion tools
  let pain = 0;
  if (!input.hasForm) pain += 1;
  if (!input.hasChat) pain += 1;
  if (!input.hasBooking) pain += 1;

  // 🔥 fit = good business + reachable + reviews
  let fit = 0;
  if (plumbingHit) fit += 1;
  if (hasYelpPhone || input.hasPhone) fit += 1;
  if (input.review_count >= 20) fit += 1;
  else if (input.review_count >= 5) fit += 0.5;

  const expansion = Array.isArray(input.missing_features)
    ? input.missing_features.length
    : 0;

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