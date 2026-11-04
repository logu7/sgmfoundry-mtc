/**
 * End-to-end check for the cloud MTC app (Cloudflare Worker + D1 + static export).
 *
 *   npm run build
 *   npx wrangler dev --port 8787        # or point BASE_URL at production
 *   BASE_URL=http://127.0.0.1:8787 MTC_PASSWORD=foundry123 npm run verify:print
 *
 * Covers: sign-in, save, rolling numbers, customer memory, one-page A4 PDF at
 * 2 and 7 rows, and sign-out. Screenshots/PDFs land in $OUT_DIR.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8787";
const PASSWORD = process.env.MTC_PASSWORD ?? "foundry123";
const CHROME =
  process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.env.OUT_DIR ?? os.tmpdir();

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function pdfPageCount(buf) {
  const text = buf.toString("latin1");
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

async function fillLabel(text, value, tag = "input") {
  const loc = page.locator(`label:has-text("${text}") ${tag}`).first();
  await loc.click();
  await loc.fill(value);
}

/* ---------------- 0. sign in ---------------- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForURL(/\/login\/?/, { timeout: 20000 });
check("app redirects to sign-in when logged out", /\/login\/?/.test(page.url()), page.url());

await page.locator('input[type="password"]').fill("definitely-wrong");
await page.locator('button:has-text("Sign in")').click();
await page.waitForSelector("text=Wrong password", { timeout: 10000 });
check("wrong password is rejected by the server", true);

await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button:has-text("Sign in")').click();
await page.waitForSelector("text=Material Test Certificates", { timeout: 20000 });
check("password signs in to the dashboard", true);

/* ---------------- 1. create the first certificate ---------------- */
await page.goto(`${BASE}/certificates/new/`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");

const firstNo = await page.locator('label:has-text("Test Certificate No.") input').first().inputValue();
check("first certificate number is PREFIX/<FY>/001", /^SGM\/\d{2}-\d{2}\/001$/.test(firstNo), firstNo);

await fillLabel("To M/s (customer)", "Sri Balaji Castings Pvt Ltd");
await fillLabel("Customer Address", "14/A, SIDCO Industrial Estate, Coimbatore - 641021", "textarea");
await fillLabel("Control Unit No. (Heat No.)", "H-4471");
await fillLabel("Order No. & Date", "PO-8821 dated 12.10.2026");
await fillLabel("Quantity (tonnes)", "2.450");
await fillLabel("Tensile Test", "260 MPa min");
await fillLabel("Hardness", "187-241 HB");
await fillLabel("Nom Size", "Ø 120 x 45");

await page.locator('summary:has-text("Table A")').first().click();
const carbonRow = page.locator("div:has(> span:text-is('C%'))").first();
await carbonRow.locator("input").nth(0).fill("3.20");
await carbonRow.locator("input").nth(1).fill("3.60");
await carbonRow.locator("input").nth(2).fill("3.35");

await page.locator('button:has-text("+ Row")').first().click();
await page.locator('label:has-text("Control Unit No. (Heat No.)") input').nth(1).fill("H-4472");
await fillLabel("Quantity (tonnes)", "1.100");

const scale1 = await page.locator(".mtc-body").getAttribute("data-scale");
check("sheet fits one page at full size (2 rows)", Number(scale1) >= 0.999, `autofit ${scale1}`);

await page.locator('button:has-text("Save")').first().click();
await page.waitForURL(/\/certificates\/view\/\?id=/, { timeout: 25000 });
check("save stores the certificate on the server and opens it", true, page.url());

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForSelector("tbody tr");
const rowText = await page.locator("tbody tr").first().innerText();
check(
  "saved certificate is listed",
  rowText.includes(firstNo) && rowText.includes("Sri Balaji Castings"),
  rowText.replace(/\s+/g, " ").slice(0, 80)
);

/* ---------------- 2. rolling number + customer memory ---------------- */
await page.goto(`${BASE}/certificates/new/`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");
const secondNo = await page.locator('label:has-text("Test Certificate No.") input').first().inputValue();
check("number rolls on the next certificate", secondNo === firstNo.replace(/001$/, "002"), `${firstNo} -> ${secondNo}`);

const custInput = page.locator('label:has-text("To M/s (customer)") input').first();
await custInput.click();
await custInput.type("Sri Balaji", { delay: 25 });
await page.waitForSelector("ul li button", { timeout: 10000 });
const suggestion = await page.locator("ul li button").first().innerText();
await page.locator("ul li button").first().click();
const addr = await page.locator('label:has-text("Customer Address") textarea').first().inputValue();
check("past customer is suggested", suggestion.includes("Sri Balaji"), suggestion.split("\n")[0]);
check("address is restored from the shared database", addr.includes("SIDCO"), addr.slice(0, 50));

await page.locator('button:has-text("Save")').first().click();
await page.waitForURL(/\/certificates\/view\/\?id=/, { timeout: 25000 });

/* ---------------- 3. one A4 landscape page ---------------- */
const apiCerts = await page.evaluate(async () => {
  const res = await fetch("/api/certificates");
  return res.json();
});
check("both certificates are in D1", apiCerts.certificates?.length === 2, `${apiCerts.certificates?.length} records`);

const printable = apiCerts.certificates
  .slice()
  .sort((a, b) => (b.data?.rows?.length ?? 0) - (a.data?.rows?.length ?? 0))[0];

await page.evaluate((payload) => {
  localStorage.setItem("mtc:print", JSON.stringify(payload));
}, { data: printable.data, certificateNo: printable.certificate_no });

await page.goto(`${BASE}/certificates/print/`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");
await page.waitForTimeout(900);
const printScale = await page.locator(".mtc-body").getAttribute("data-scale");
check("print sheet reports a fit scale", !!printScale, `scale ${printScale}`);

const pdf = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
const pages = pdfPageCount(pdf);
fs.writeFileSync(path.join(OUT, "mtc-print.pdf"), pdf);
check("PDF is exactly one A4 landscape page", pages === 1, `${pages} page(s)`);

const shotPage = await context.newPage();
await shotPage.setViewportSize({ width: 1122, height: 794 });
await shotPage.goto(`${BASE}/certificates/print/`, { waitUntil: "networkidle" });
await shotPage.waitForSelector(".mtc-sheet");
await shotPage.waitForTimeout(700);
await shotPage.emulateMedia({ media: "screen" });
await shotPage.locator(".mtc-sheet").screenshot({ path: path.join(OUT, "mtc-sheet.png") });

/* ---------------- 4. stress: 7 rows ---------------- */
const stress = JSON.parse(JSON.stringify(printable.data));
stress.header.toMs = "Shree Venkateshwara Precision Engineering & Foundry Works (P) Ltd";
stress.header.toMsAddress =
  "Plot 44-47, Phase II, SIDCO Industrial Estate, Kurichi, Sulur Taluk, Coimbatore - 641021, Tamil Nadu, India";
stress.rows = Array.from({ length: 7 }, (_, i) => ({
  ...stress.rows[0],
  id: `stress-${i}`,
  orderNoDate: `PO-882${i} dated 1${i}.10.2026`,
  controlUnitNo: `H-447${i}`,
  quantityTonnes: `${(i + 1) * 1.25}`,
  remarks: "Stress relieved as per drawing rev C",
}));
stress.footer.remarks = "Delivered in two lots against invoice 2291/2026";

await page.evaluate((payload) => {
  localStorage.setItem("mtc:print", JSON.stringify(payload));
}, { data: stress, certificateNo: printable.certificate_no });

await page.goto(`${BASE}/certificates/print/`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");
await page.waitForTimeout(900);
const stressScale = Number(await page.locator(".mtc-body").getAttribute("data-scale"));
check("7-row sheet shrinks instead of overflowing", stressScale < 1 && stressScale > 0.5, `fit ${stressScale}`);

const stressPdf = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
fs.writeFileSync(path.join(OUT, "mtc-print-stress.pdf"), stressPdf);
check(
  "7-row PDF is still one page",
  pdfPageCount(stressPdf) === 1,
  `${pdfPageCount(stressPdf)} page(s)`
);

await shotPage.goto(`${BASE}/certificates/print/`, { waitUntil: "networkidle" });
await shotPage.waitForTimeout(800);
await shotPage.locator(".mtc-sheet").screenshot({ path: path.join(OUT, "mtc-sheet-stress.png") });

/* ---------------- 5. sign out ---------------- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('button:has-text("Sign out")').click();
await page.waitForURL(/\/login\/?/, { timeout: 15000 });
check("sign out returns to the login page", true);
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForURL(/\/login\/?/, { timeout: 15000 });
check("dashboard is protected after sign out", true);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
