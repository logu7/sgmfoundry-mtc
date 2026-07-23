# SGM Foundry — Material Test Certificates

Material Test Certificate (MTC) generator for Sri Gnanamurugan Foundry,
following the **BIS Annexure-I** format for *Test Certificate for Grey Iron
Castings* (IS 210:2009, Para 4 of the Scheme of Inspection and Testing).

## Stack

- Next.js (App Router) + TypeScript
- Supabase (auth + Postgres, row-level security)
- Tailwind CSS, self-hosted fonts (`next/font/local`, no CDN)
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

## Certificate numbering

Test Certificate numbers follow `SGMF/TC/{financial-year}/{0000}`, e.g.
`SGMF/TC/2026-27/0001`, and reset each Indian financial year (1 April – 31
March, IST).

Numbers are claimed atomically from a Postgres sequence
(`next_certificate_number()` in `0002_certificate_numbering.sql`) — never
computed in the browser — so two people creating a certificate at the same
moment can never receive the same number.

**Trade-off:** a number is claimed the moment a *new* certificate page is
opened, not when it's saved. Opening a new certificate and abandoning it
without saving leaves a gap in the sequence. This mirrors a physical numbered
certificate book, where a spoiled page is voided rather than silently
skipped, and is the simplest way to guarantee no two certificates ever
collide. The field stays editable — use "New No." next to it to re-claim a
number, or type one manually (e.g. when reissuing a certificate).

Editing an *existing* saved certificate never touches the number or dates
automatically.

## Automatic dates

For a brand-new certificate, "Dated", "Prepared By — Date", and "Approved
By — Date" all pre-fill to today (`DD.MM.YY`) but stay fully editable.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npx playwright install chromium   # local PDF generation only
npm run dev
```

Apply migrations, in order, to your Supabase project:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_certificate_numbering.sql`

## PDF generation

`POST /api/certificates/pdf` launches headless Chromium (via
`@sparticuz/chromium` on Vercel, or a local Playwright install in dev), which
navigates to `/certificates/print?data=...` — a real, unauthenticated Next.js
page that renders `CertificateSheet` with the exact same Tailwind CSS and
self-hosted fonts as the live editor preview — then exports it as a landscape
A4 PDF. Because it's the same compiled page and CSS as what you see on
screen, there's no separate "PDF-only" render path to keep in sync.

`/certificates/print` and `/api/certificates/pdf` are excluded from the auth
proxy (`src/proxy.ts`) so Chromium's request isn't redirected to the login
page. The route takes no certificate ID and does no database lookup — it only
renders whatever data is passed to it in the (signed-length, not
secret) URL — so there's nothing for an unauthenticated visitor to browse or
enumerate.

## Deployment

Targets Vercel (the PDF route needs the Node runtime and uses
`@sparticuz/chromium` when `process.env.VERCEL` is set).

## Known gaps / ideas not yet built

- **List page has no search/filter** — fine for a handful of certificates,
  will want a search box once volume grows.
- **No "duplicate this certificate"** — repeat orders for the same customer
  currently mean re-typing everything.
- **No autosave** — a crashed tab or browser mid-edit loses unsaved changes.
- **No range/QC validation** — nothing flags an "Actual" value that falls
  outside its stated Min/Max, which would be a useful catch on a compliance
  document.
- **Prepared By / Approved By names aren't pulled from the logged-in user's
  profile** — currently typed by hand every time despite `profiles.full_name`
  already being stored.
