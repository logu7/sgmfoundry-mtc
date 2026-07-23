// Verifies that every className used in certificate-sheet.tsx has a
// matching rule in certificate-static-css.ts. Run after editing the
// certificate template so the self-contained PDF path doesn't silently
// drift from the on-screen Tailwind-rendered preview.
//
//   npx tsx scripts/check-certificate-css-coverage.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const componentSrc = readFileSync(
  join(root, "src/components/certificate/certificate-sheet.tsx"),
  "utf8"
);
const cssSrc = readFileSync(
  join(root, "src/lib/certificate-static-css.ts"),
  "utf8"
);

const usedClasses = new Set(
  [...componentSrc.matchAll(/className="([^"]*)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter(Boolean)
    // cn(...) calls with conditional classes are checked manually; this
    // catches the static className="..." literals which is the vast
    // majority of the component.
    .filter((c) => !c.includes("{") && !c.includes("("))
);

// Skip our own custom classes (defined in certificate-print.css, not here).
usedClasses.delete("mtc-serif");
usedClasses.delete("mtc-sans");
usedClasses.delete("mtc-mono");
usedClasses.delete("mtc-sheet");
usedClasses.delete("mtc-sheet-preview");
usedClasses.delete("bg-white");
usedClasses.delete("text-slate-900");
usedClasses.delete("mx-auto");

const definedRules = [...cssSrc.matchAll(/^\.((?:\\.|[^\s{])+)\s*\{/gm)].map((m) =>
  m[1].replace(/\\\\\./g, ".").replace(/\\\\/g, "")
);
const definedSet = new Set(definedRules);

const missing = [...usedClasses].filter((c) => !definedSet.has(c));

if (missing.length > 0) {
  console.error("Missing static CSS rules for classes used in certificate-sheet.tsx:");
  for (const c of missing) console.error(`  - ${c}`);
  process.exit(1);
} else {
  console.log(`OK: all ${usedClasses.size} static classes covered.`);
}
