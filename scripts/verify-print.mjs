/**
 * End-to-end check for the MTC app: save -> customer memory -> auto numbering
 * -> single-sheet print.
 *
 * Run against a built server:
 *   npm run build && npm run start -- -p 3100
 *   npm run verify:print
 *
 * Exits non-zero on any failed assertion, and writes
 * /tmp/mtc-print.pdf + /tmp/mtc-sheet.png for eyeballing.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
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
  // Chrome writes one /Type /Page object per page (plus /Pages nodes).
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console.error]", m.text());
});
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

async function fillLabel(text, value, tag = "input") {
  const loc = page.locator(`label:has-text("${text}") ${tag}`).first();
  await loc.click();
  await loc.fill(value);
}

/* ---------------- 1. create the first certificate ---------------- */
await page.goto(`${BASE}/certificates/new`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");

const tcInput = page.locator('label:has-text("Test Certificate No.") input').first();
const firstNo = await tcInput.inputValue();
check("first certificate number is SGM/<FY>/001", /^SGM\/\d{2}-\d{2}\/001$/.test(firstNo), firstNo);

await fillLabel("To M/s (customer)", "Sri Balaji Castings Pvt Ltd");
await fillLabel("Customer Address", "14/A, SIDCO Industrial Estate, Coimbatore - 641021", "textarea");
const heat1 = "H-4471";
await fillLabel("Control Unit No. (Heat No.)", heat1);
await fillLabel("Order No. & Date", "PO-8821 dated 12.10.2026");
await fillLabel("Quantity (tonnes)", "2.450");
await fillLabel("Tensile Test", "260 MPa min");
await fillLabel("Hardness", "187-241 HB");
await fillLabel("Nom Size", "Ø 120 x 45");

// chemistry actual values (Table A) — open the collapsed section first
await page.locator('summary:has-text("Table A")').first().click();
const carbonRow = page.locator("div:has(> span:text-is('C%'))").first();
await carbonRow.locator("input").nth(0).fill("3.20");
await carbonRow.locator("input").nth(1).fill("3.60");
await carbonRow.locator("input").nth(2).fill("3.35");

// add a second order row to exercise multi-row fitting
await page.locator('button:has-text("+ Row")').first().click();
const heatInputs = page.locator('label:has-text("Control Unit No. (Heat No.)") input');
await heatInputs.nth(1).fill("H-4472");
await fillLabel("Quantity (tonnes)", "1.100");

const scale1 = await page.locator(".mtc-body").getAttribute("data-scale");
check("sheet fits one page (multi-row) without shrink", Number(scale1) >= 0.999, `autofit scale ${scale1}`);

await page.locator('button:has-text("Save")').first().click();
await page.waitForURL(/\/certificates\/[0-9a-f-]{20,}/, { timeout: 15000 });
const savedUrl = page.url();
check("certificate save navigates to its record", /\/certificates\/[0-9a-f-]{20,}/.test(savedUrl), savedUrl);

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const rowText = await page.locator("tbody tr").first().innerText();
check("saved certificate appears on the dashboard", rowText.includes(firstNo) && rowText.includes("Sri Balaji Castings"), rowText.replace(/\s+/g, " ").slice(0, 90));

/* ---------------- 2. customer memory + rolling number ---------------- */
await page.goto(`${BASE}/certificates/new`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");

const secondNo = await page.locator('label:has-text("Test Certificate No.") input').first().inputValue();
check("number rolls to the next sequence", secondNo === firstNo.replace(/001$/, "002"), `${firstNo} -> ${secondNo}`);

const custInput = page.locator('label:has-text("To M/s (customer)") input').first();
await custInput.click();
await custInput.type("Sri Balaji", { delay: 25 });
await page.waitForSelector('ul li button', { timeout: 5000 });
const suggestion = await page.locator("ul li button").first().innerText();
await page.locator("ul li button").first().click();
const addrVal = await page.locator('label:has-text("Customer Address") textarea').first().inputValue();
check("typing a known customer suggests it", suggestion.includes("Sri Balaji"), suggestion.split("\n")[0]);
check("picking the suggestion restores the address", addrVal.includes("SIDCO Industrial Estate"), addrVal.slice(0, 60));

// exact-name retype also fills (blur path)
await custInput.fill("");
await page.locator('label:has-text("Customer Address") textarea').first().fill("");
await custInput.fill("Sri Balaji Castings Pvt Ltd");
await page.locator("body").click({ position: { x: 5, y: 5 } });
await page.waitForTimeout(400);
const addrVal2 = await page.locator('label:has-text("Customer Address") textarea').first().inputValue();
check("retyping the exact name fills the address", addrVal2.includes("SIDCO"), addrVal2.slice(0, 60));

await page.locator('button:has-text("Save")').first().click();
await page.waitForURL(/\/certificates\/[0-9a-f-]{20,}/, { timeout: 15000 });

/* ---------------- 3. print -> one A4 landscape page ---------------- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const idbDump = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("sgm-mtc");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const tx = db.transaction("certificates", "readonly");
  const all = await new Promise((resolve, reject) => {
    const r = tx.objectStore("certificates").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const custTx = db.transaction("customers", "readonly");
  const customers = await new Promise((resolve, reject) => {
    const r = custTx.objectStore("customers").getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return { certificates: all, customers };
});
check("both certificates are stored in IndexedDB", idbDump.certificates.length === 2, `${idbDump.certificates.length} records`);
check("customer is remembered in IndexedDB", idbDump.customers.length === 1 && idbDump.customers[0].address.includes("SIDCO"), `${idbDump.customers.length} customer(s)`);

const printable = idbDump.certificates.slice().sort((a, b) => (b.data?.rows?.length ?? 0) - (a.data?.rows?.length ?? 0))[0];
await page.evaluate((payload) => {
  localStorage.setItem("mtc:print", JSON.stringify(payload));
}, { data: printable.data, certificateNo: printable.certificate_no });

await page.goto(`${BASE}/certificates/print`, { waitUntil: "networkidle" });
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
const pdfPath = path.join(OUT, "mtc-print.pdf");
fs.writeFileSync(pdfPath, pdf);
check("PDF is exactly one A4 landscape page", pages === 1, `${pages} page(s) -> ${pdfPath}`);

// screenshot at true print size for visual review
const shotPage = await context.newPage();
await shotPage.setViewportSize({ width: 1122, height: 794 });
await shotPage.goto(`${BASE}/certificates/print`, { waitUntil: "networkidle" });
await shotPage.waitForSelector(".mtc-sheet");
await shotPage.waitForTimeout(700);
await shotPage.emulateMedia({ media: "screen" });
const pngPath = path.join(OUT, "mtc-sheet.png");
await shotPage.locator(".mtc-sheet").screenshot({ path: pngPath });
console.log("screenshot:", pngPath);

/* ---------------- 4. stress: 7 rows + long text still one page ---------------- */
const stressData = JSON.parse(JSON.stringify(printable.data));
stressData.header.toMs = "Shree Venkateshwara Precision Engineering & Foundry Works (P) Ltd";
stressData.header.toMsAddress =
  "Plot 44-47, Phase II, SIDCO Industrial Estate, Kurichi, Sulur Taluk, Coimbatore - 641021, Tamil Nadu, India";
stressData.rows = Array.from({ length: 7 }, (_, i) => ({
  ...stressData.rows[0],
  id: `stress-${i}`,
  orderNoDate: `PO-882${i} dated 1${i}.10.2026`,
  controlUnitNo: `H-447${i}`,
  quantityTonnes: `${(i + 1) * 1.25}`,
  remarks: "Stress relieved as per drawing rev C",
}));
stressData.footer.remarks = "Delivered in two lots against invoice 2291/2026";

await page.evaluate((payload) => {
  localStorage.setItem("mtc:print", JSON.stringify(payload));
}, { data: stressData, certificateNo: printable.certificate_no });
fs.writeFileSync(
  path.join(OUT, "stress.json"),
  JSON.stringify({ data: stressData, certificateNo: printable.certificate_no }, null, 2)
);

await page.goto(`${BASE}/certificates/print`, { waitUntil: "networkidle" });
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
const stressPages = pdfPageCount(stressPdf);
check("7-row PDF is still one page", stressPages === 1, `${stressPages} page(s)`);

await shotPage.goto(`${BASE}/certificates/print`, { waitUntil: "networkidle" });
await shotPage.waitForTimeout(800);
await shotPage.locator(".mtc-sheet").screenshot({ path: path.join(OUT, "mtc-sheet-stress.png") });

/* ---------------- 5. PIN lock ---------------- */
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.locator('button:has-text("Settings")').first().click();
await page.locator('input[placeholder="New PIN (4+ digits)"]').fill("4321");
await page.locator('button:has-text("Set PIN")').click();
await page.waitForTimeout(400);
await page.locator('button:has-text("Lock now")').click();
await page.waitForSelector("text=Enter the PIN for this computer", { timeout: 10000 });
check("PIN lock asks for the PIN after locking", true);

await page.locator('input[type="password"]').fill("1111");
await page.locator('button:has-text("Unlock")').click();
await page.waitForSelector("text=Wrong PIN", { timeout: 5000 });
check("wrong PIN is rejected", true);

await page.locator('input[type="password"]').fill("4321");
await page.locator('button:has-text("Unlock")').click();
await page.waitForSelector("text=Material Test Certificates", { timeout: 8000 });
check("correct PIN unlocks the app", true);

/* ---------------- 6. settings actually drive new certificates ---------------- */
await page.locator('button:has-text("Settings")').first().click();
await page.locator('label:has-text("Prefix") input').fill("TST");
await page.locator('label:has-text("CM/L licence no.") input').fill("CM/L 7788991");
await page.locator('button:has-text("Save settings")').click();
await page.waitForTimeout(500);
await page.goto(`${BASE}/certificates/new`, { waitUntil: "networkidle" });
await page.waitForSelector(".mtc-sheet");
const prefixedNo = await page.locator('label:has-text("Test Certificate No.") input').first().inputValue();
const sheetText = await page.locator(".mtc-sheet").innerText();
check("saved prefix drives the next number", prefixedNo.startsWith("TST/"), prefixedNo);
check("saved CM/L licence prints on the sheet", sheetText.includes("CM/L 7788991"), "CM/L 7788991");

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
