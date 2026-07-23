import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server.node";
import type { CertificateData } from "./certificate-schema";
import { CertificateSheet } from "@/components/certificate/certificate-sheet";
import { CERTIFICATE_STATIC_CSS } from "./certificate-static-css";

const FONT_FILES: Array<{
  file: string;
  family: string;
  weight: number;
}> = [
  { file: "inter-latin-400-normal.woff2", family: "Inter", weight: 400 },
  { file: "inter-latin-500-normal.woff2", family: "Inter", weight: 500 },
  { file: "inter-latin-600-normal.woff2", family: "Inter", weight: 600 },
  { file: "inter-latin-700-normal.woff2", family: "Inter", weight: 700 },
  { file: "source-serif-4-latin-500-normal.woff2", family: "Source Serif 4", weight: 500 },
  { file: "source-serif-4-latin-600-normal.woff2", family: "Source Serif 4", weight: 600 },
  { file: "source-serif-4-latin-700-normal.woff2", family: "Source Serif 4", weight: 700 },
  { file: "ibm-plex-mono-latin-500-normal.woff2", family: "IBM Plex Mono", weight: 500 },
  { file: "ibm-plex-mono-latin-600-normal.woff2", family: "IBM Plex Mono", weight: 600 },
];

function buildFontFaceCss(): string {
  const publicDir = join(process.cwd(), "public", "fonts");
  return FONT_FILES.map(({ file, family, weight }) => {
    const bytes = readFileSync(join(publicDir, file));
    const base64 = bytes.toString("base64");
    return `@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url(data:font/woff2;base64,${base64}) format("woff2");
}`;
  }).join("\n");
}

/**
 * Renders the certificate to a fully self-contained HTML document: fonts
 * and the (fixed, small) set of Tailwind-equivalent CSS rules are inlined
 * as base64/plain text, and the logo is inlined as a data URI. No CDN or
 * network fetch happens during PDF generation — the output can't drift
 * due to a slow/unavailable third party, and renders identically offline.
 */
export function renderCertificateHtml(data: CertificateData): string {
  const bodyMarkup = renderToStaticMarkup(CertificateSheet({ data }));
  const fontFaceCss = buildFontFaceCss();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
${fontFaceCss}

* { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.mtc-serif { font-family: "Source Serif 4", Georgia, serif; }
.mtc-sans { font-family: "Inter", system-ui, sans-serif; }
.mtc-mono { font-family: "IBM Plex Mono", ui-monospace, monospace; }
.mtc-sheet { width: 297mm; min-height: 210mm; padding: 8mm 9mm 6mm; }
.bg-white { background-color: #ffffff; }
.text-slate-900 { color: #0f172a; }
.mx-auto { margin-left: auto; margin-right: auto; }
${CERTIFICATE_STATIC_CSS}
@page { size: A4 landscape; margin: 0; }
</style>
</head>
<body>
${bodyMarkup}
</body>
</html>`;
}
