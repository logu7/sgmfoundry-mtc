import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { CertificateSheet } from "../src/components/certificate/certificate-sheet";
import {
  makeChemistryBlock,
  makeDefaultCertificateData,
  makeMicroBlock,
  makeOrderRow,
} from "../src/lib/certificate-schema";
import { CERTIFICATE_STATIC_CSS } from "../src/lib/certificate-static-css";

const base = makeDefaultCertificateData();

const chem = makeChemistryBlock();
chem.controlUnitNo = "H-26071";
const MIN = ["3.10", "1.80", "0.50", "", "", "", "", ""];
const MAX = ["3.40", "2.30", "0.90", "0.10", "0.15", "0.30", "0.40", ""];
const ACT = ["3.25", "2.05", "0.72", "0.045", "0.062", "0.18", "0.21", "-"];
chem.elements = chem.elements.map((e, i) => ({ ...e, min: MIN[i], max: MAX[i], actual: ACT[i] }));

const mic = makeMicroBlock();
Object.assign(mic, {
  controlUnitNo: "H-26071",
  graphiteType: "Type A, uniformly distributed flake graphite",
  flakeSize: "4-6",
  pearlite: "94%",
  ferrite: "6%",
  carbides: "nil",
});

const row = makeOrderRow();
Object.assign(row, {
  orderNoDate: "PO-2026-3391 / 02.07.26",
  nomSize: "180 mm",
  controlUnitNo: "H-26071",
  grade: "FG 260",
  tolerances: "IS 210",
  quantityTonnes: "2.450",
  chemicalComposition: "Table A",
  tensileTest: "289 N/mm²",
  hardness: "212 BHN",
  transverseTest: "N.A.",
  hydrostaticTest: "Passed 10 bar",
  microStructure: "Table B",
  conditionOfDelivery: "As cast, shot blasted",
  remarks: "PPAP batch; dimensional report enclosed",
});

// Two order rows, to confirm the layout still fits when a row is added.
const row2 = { ...makeOrderRow(), ...row, id: "row-2", orderNoDate: "PO-2026-3402 / 09.07.26", controlUnitNo: "H-26078", quantityTonnes: "1.180" };

const data = {
  ...base,
  issuer: {
    ...base.issuer,
    companyName: "SRI GNANAMURUGAN FOUNDRY",
    cmlNo: "CM/L-7712345",
  },
  header: {
    tcNo: "SGMF/TC/2026/0142",
    dated: "23.07.26",
    toMs: "Precision Auto Components Pvt Ltd",
    toMsAddress: "Plot 45, SIDCO Industrial Estate, Ambattur, Chennai - 600098, Tamil Nadu",
    invoiceNo: "INV-8821",
    partNo: "PN-4471-B",
    partDescription: "Differential housing casting, machined bore, as per drawing rev C",
  },
  rows: [row, row2],
  chemistry: [chem],
  micro: [mic],
  footer: {
    ...base.footer,
    remarks: "Batch inspected per customer PPAP requirements.",
    wagonNo: "-",
    truckNo: "TN-37-BX-4521",
    preparedByName: "R. Kumaresan",
    preparedByDate: "23.07.26",
    approvedByName: "S. Logeswaran",
    approvedByDate: "23.07.26",
  },
};

const body = renderToStaticMarkup(CertificateSheet({ data }));

// System DejaVu fonts (installed locally) so this diagnostic needs no network.
const html = `<!doctype html><html><head><style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.mtc-serif { font-family: 'DejaVu Serif', Georgia, serif; }
.mtc-sans { font-family: 'DejaVu Sans', system-ui, sans-serif; }
.mtc-mono { font-family: 'DejaVu Sans Mono', ui-monospace, monospace; }
.mtc-sheet { width: 297mm; min-height: 210mm; padding: 8mm 9mm 6mm; }
.bg-white { background-color: #ffffff; }
.text-slate-900 { color: #0f172a; }
.mx-auto { margin-left: auto; margin-right: auto; }
${CERTIFICATE_STATIC_CSS}
</style></head><body>${body}</body></html>`;

writeFileSync("/tmp/cert-landscape.html", html);
console.log("written", html.length);
