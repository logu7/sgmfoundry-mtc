# SGM Foundry — Material Test Certificates

Material Test Certificate (MTC) generator for Sri Gnanamurugan Foundry,
following the **BIS Annexure-I** format for *Test Certificate for Grey Iron
Castings* (IS 210:2009, Para 4 of the Scheme of Inspection and Testing).

## Stack

- Next.js (App Router) + TypeScript
- Supabase (auth + Postgres, row-level security)
- Tailwind CSS
- Playwright / headless Chromium for server-side PDF generation

## Layout notes

The certificate renders on a **single A4 landscape sheet**. Landscape is
required: the BIS TEST RESULTS table has 13 columns needing roughly 228mm of
width, which portrait A4 (190mm usable) cannot provide legibly.

The sheet is `<table>`-based rather than CSS Grid on purpose — tables render
consistently across every print/PDF engine, including older ones that silently
fall back to block layout for `display: grid`.

### BIS fields vs. our additions

The 13 BIS columns are represented exactly. Fields we add beyond the BIS
minimum are marked `EXTRA` in `src/lib/certificate-schema.ts`:

| Our field | Where it lives |
| --- | --- |
| Heat No. | BIS **Control Unit No.** |
| P.O. No. & Date | BIS **Order No. & Date** |
| Customer name + address | BIS **To M/s** |
| Hardness / Tensile / Transverse | BIS **Mechanical Properties** |
| Hydrostatic, Condition of delivery | own BIS columns |
| Wagon No. / Truck No. | BIS despatch block |
| Invoice No., Part No./Description | EXTRA — strip above the results table |
| Chemical composition detail | EXTRA — Table A |
| Microstructure detail | EXTRA — Table B |
| Attestation + Prepared/Approved signatures | EXTRA — footer |

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npx playwright install chromium   # local PDF generation only
npm run dev
```

Apply `supabase/migrations/0001_init.sql` to your Supabase project.

## Scripts

- `npm run dev` / `npm run build`
- `node scripts/check-certificate-css-coverage.mjs` — verifies the static CSS
  used for PDF rendering covers every Tailwind class in the certificate
  template. **Run this after editing `certificate-sheet.tsx`**, otherwise the
  PDF can silently drift from the on-screen preview.
- `npx tsx scripts/render-systemfont-diag.ts` — renders the sheet to
  `/tmp/cert-landscape.html` with system fonts for offline layout checks.

## Deployment

Targets Vercel (the PDF route needs the Node runtime and uses
`@sparticuz/chromium` when `process.env.VERCEL` is set).

## Known gaps

- PDF output has been verified for **single-page fit and structure**, but not
  yet visually confirmed through the production Playwright/Chromium path —
  verify once after first deploy by using **Download PDF** in the editor.
- `public/sgmf-logo.svg` is a placeholder; the BIS header is text-based so the
  logo is currently unused by the certificate itself.
