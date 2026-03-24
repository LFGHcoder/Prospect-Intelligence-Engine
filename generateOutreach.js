function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatIssues(issues) {
  if (issues.length === 1) return issues[0];
  if (issues.length === 2) return `${issues[0]} and ${issues[1]}`;
  return issues.slice(0, 2).join(" and ");
}

function generateOutreach(business) {
  const name = business?.name || "your business";
  const missing = business?.llm?.missing_features || [];

  // ✅ ALWAYS pain-based if issues exist
  if (missing.length > 0) {
    const issues = missing.slice(0, 2);
    const issueText = formatIssues(issues);

    const openings = [
      `Hey ${name} team,`,
      `Hi ${name},`,
      `Hey, I came across ${name} and noticed something quick —`,
    ];

    const bodies = [
      `I noticed your website is missing ${issueText}, which could be costing you potential customers who prefer quick online interactions.`,

      `It looks like your site doesn’t currently have ${issueText}, which might be causing you to lose leads that don’t want to call directly.`,

      `One thing that stood out is the absence of ${issueText} — that usually impacts how many visitors actually convert into customers.`,
    ];

    const closings = [
      `We help service businesses add simple automation like chat and booking systems that capture leads 24/7. Would you be open to a quick 5-minute demo?`,

      `We’ve helped similar businesses capture more leads by adding lightweight automation. Happy to show you what that could look like if you're open.`,

      `We specialize in fixing exactly this with simple automation tools. Let me know if you'd be open to a quick walkthrough.`,
    ];

    return {
      outreach: `${pick(openings)} ${pick(bodies)} ${pick(closings)}`,
    };
  }

  // ✅ ONLY if no issues → soft pitch
  const variants = [
    `Hey ${name} team, I came across your website and it looks solid. If you're ever looking to increase conversions or automate customer interactions, we help businesses like yours grow efficiently.`,

    `Hi ${name}, your site is already well set up. We work with businesses to further improve lead capture and streamline customer communication if that's something you're exploring.`,
  ];

  return { outreach: pick(variants) };
}

module.exports = { generateOutreach };