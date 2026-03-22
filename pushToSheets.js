const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

function loadCredentialsFromEnv() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  const jsonInline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (jsonInline && jsonInline.trim().startsWith("{")) {
    return JSON.parse(jsonInline);
  }
  if (keyFile) {
    const resolved = path.isAbsolute(keyFile) ? keyFile : path.join(process.cwd(), keyFile);
    const raw = fs.readFileSync(resolved, "utf8");
    return JSON.parse(raw);
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
async function pushToSheets(rows) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const creds = loadCredentialsFromEnv();
  if (!creds) {
    throw new Error(
      "Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to JSON) or GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON)"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const sheetName = process.env.GOOGLE_SHEETS_TAB_NAME || "Pipeline";

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
  if (!titles.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  const header = [
    "name",
    "yelp_url",
    "website_url",
    "review_count",
    "rating",
    "phone",
    "hasForm",
    "hasChat",
    "hasBooking",
    "hasPhone",
    "pain",
    "fit",
    "expansion",
    "priority",
    "missing_features",
    "pitch",
    "scrape_error",
  ];

  const values = rows.map((r) => {
    const b = r.business || {};
    const s = r.signals || {};
    const sc = r.scores || {};
    const llm = r.llm || {};
    return [
      b.name,
      b.url,
      r.websiteUrl || "",
      b.review_count,
      b.rating,
      b.phone,
      s.hasForm,
      s.hasChat,
      s.hasBooking,
      s.hasPhone,
      sc.pain,
      sc.fit,
      sc.expansion,
      sc.priority,
      (llm.missing_features || []).join("; "),
      llm.pitch || "",
      r.scrapeError || "",
    ];
  });

  const resource = { values: [header, ...values] };

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: resource,
  });

  return { spreadsheetId, sheetName, rowCount: values.length };
}

module.exports = { pushToSheets };
