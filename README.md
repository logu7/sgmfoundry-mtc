# SGM Foundry — Material Test Certificates

MTC generator for Sri Gnanamurugan Foundry, following the **BIS Annexure-I** format
for *Test Certificate for Grey Iron Castings* (IS 210:2009, Para 4 of the Scheme of
Inspection and Testing).

Live at **https://mtc.sgmfoundry.com** — one shared cloud database, one A4
landscape sheet per certificate.

## Architecture

```
Browser (Next.js static export)  ──►  Cloudflare Worker "sgm-mtc"
                                        ├─ serves ./out (HTML/CSS/JS/fonts)
                                        └─ /api/*  ──►  D1 database "sgm-mtc" (SQLite)
```

- **Static export.** `next build` with `output: "export"` produces `out/`; there is
  no server-rendered Next runtime anywhere.
- **Worker API.** `worker/index.ts` serves the assets and a small JSON API.
- **D1.** Certificates, customers and settings live in one SQLite database, so
  every device that signs in sees the same records. No Supabase, no third-party
  database, no per-browser storage.
- **Auth.** One shared password (Worker secret `MTC_PASSWORD`) exchanged for a
  signed HttpOnly session cookie (HMAC-SHA256, 30 days, secret
  `SESSION_SECRET`). No accounts, no email service.

## Features

| Requirement | How it works |
| --- | --- |
| Fits one A4 sheet when printed | Fixed 297 × 210 mm sheet; content is measured after every edit and scaled down (never up) only if it would overflow. The editor shows the live fit (`fits 1 sheet` / `auto-fit 87%`). |
| Cloud storage | Certificates, customers and settings are rows in D1. Saving is a `POST /api/certificates`; the list is a `GET`. |
| Remembers customers | Type 3 letters of a customer name → suggestions from the shared database; picking one fills address, GSTIN and contact. Retyping an exact past name and tabbing out does the same. |
| Certificate number rolls | `SGM/26-27/001`, per financial year (April–March), derived from the numbers already stored. Hand edits stop the auto-follow; a duplicate number is rejected by a unique index. |
| Sign-in | Shared password, server-verified. Every API route checks the session cookie. |
| Extras kept | Invoice/part details, chemical Table A, microstructure Table B, attestation, Prepared/Approved blocks, Wagon/Truck No., search, duplicate, backup/restore, settings. |

## Layout notes

The 13 BIS columns need ~279 mm of usable width, so the sheet is landscape.
`CertificateSheet` renders a fixed 297 × 210 mm box, measures the content inside
it, and applies a damped fit factor (iterating, because a wider layout re-wraps
text and changes the height). The measured scale is exposed as `data-scale` on
`.mtc-body` and shown as a badge in the editor:

- `≥ 100%` — fits at full size (up to ~3 order rows)
- `90–99%` — fits, slightly reduced
- `< 90%` — fits but small; red badge, consider splitting the certificate

## Local development

```bash
npm install
npm run build            # static export into ./out
echo 'MTC_PASSWORD=dev-password' > .dev.vars
echo 'SESSION_SECRET=dev-secret' >> .dev.vars
npx wrangler dev --port 8787
```

Open http://127.0.0.1:8787 and sign in with `dev-password`. Wrangler keeps a
local D1 file under `.wrangler/state`, so local testing never touches production.

For UI-only work, `npm run dev` runs plain `next dev` on :3000 (API calls will
fail there unless you point them at the Worker).

## Deploy

```bash
npm run typecheck        # app + worker
npm run build
npx wrangler deploy      # publishes to mtc.sgmfoundry.com and sgm-mtc.logu.workers.dev
```

Secrets are set once:

```bash
npx wrangler secret put MTC_PASSWORD
npx wrangler secret put SESSION_SECRET
```

To deploy on every push instead of by hand, connect the GitHub repo in
**Cloudflare dashboard → Workers & Pages → sgm-mtc → Settings → Builds** with
build command `npm run build` and deploy command `npx wrangler deploy`.

## Database

`migrations/0001_init.sql` mirrors the schema the Worker creates on first
request. Tables:

- `certificates` — one row per MTC (`certificate_no` unique, `data` holds the whole BIS payload as JSON)
- `customers` — customer memory keyed by the normalised name (`use_count`, address, GSTIN, contact)
- `meta` — `issuer`, `numbering`, `defaults` (shared settings)

Inspect or back up from the dashboard (**Backup**), or:

```bash
npx wrangler d1 execute sgm-mtc --remote --command "select certificate_no, customer_name from certificates"
```

## Verification

```bash
npm run build
npx wrangler dev --port 8787
BASE_URL=http://127.0.0.1:8787 MTC_PASSWORD=dev-password node scripts/api-check.mjs
BASE_URL=http://127.0.0.1:8787 MTC_PASSWORD=dev-password node scripts/verify-print.mjs
```

- `api-check.mjs` — 13 API checks: auth, create/list/get/delete, duplicate-number
  rejection, customer memory, settings, backup, logout.
- `verify-print.mjs` — 17 browser checks in real Chrome: sign-in, save, rolling
  numbers, customer memory, and a PDF that is **exactly one A4 landscape page**
  for both a 2-row and a 7-row certificate.

Both scripts accept `BASE_URL=https://mtc.sgmfoundry.com` to run against
production (they create and delete their own throwaway rows).

## Repository map

```
worker/index.ts                     Worker: static assets + JSON API + auth
migrations/0001_init.sql            D1 schema
wrangler.jsonc                      Worker/D1/route configuration
src/app/                            pages (static export)
  page.tsx                          dashboard
  login/page.tsx                    password sign-in
  certificates/new/page.tsx         new certificate
  certificates/view/page.tsx        edit ( ?id= )
  certificates/print/page.tsx       sheet-only print view
src/components/certificate/         sheet, editor, form, customer memory
src/lib/db.ts                       typed client for /api
src/lib/certificate-number.ts       FY numbering
src/styles/certificate-sheet.css    print contract
scripts/                            api-check.mjs, verify-print.mjs
```

## Known limits

- One shared password for the whole foundry; there is no per-user audit trail.
  Change it with `wrangler secret put MTC_PASSWORD`.
- The Worker API has no rate limiting beyond a 400 ms delay on wrong passwords.
- Printing is verified in Chrome; Firefox/Edge print engines are untested.
- The old Lovable app (`mtc-foundry.pages.dev`, repo `foundry-gem-dash`) is
  unrelated to this code and can be deleted once this is live.
