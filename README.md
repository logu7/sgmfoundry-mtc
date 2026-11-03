# SGM Foundry — Material Test Certificates

Material Test Certificate (MTC) generator for Sri Gnanamurugan Foundry, following
the **BIS Annexure-I** format for *Test Certificate for Grey Iron Castings*
(IS 210:2009, Para 4 of the Scheme of Inspection and Testing).

The sheet is one **A4 landscape page**, every time — the layout measures itself
and shrinks to fit rather than spilling onto a second page.

## What it does

| Requirement | How it is handled |
| --- | --- |
| Fits one A4 sheet when printed | Fixed 297 × 210 mm sheet; content is measured after every edit and scaled down (never up) only if it would overflow. A badge in the editor shows the live fit (`fits 1 sheet` / `auto-fit 87%`). |
| Certificates are stored | IndexedDB in the browser on this PC (localStorage fallback), with JSON export/import for backup. |
| Remembers customers | Typing a customer name lists past customers; picking one fills address, GSTIN and contact. Retyping an exact past name and tabbing out fills it too. |
| Certificate number rolls | `SGM/26-27/001`, incrementing per financial year (April–March), derived from what is already saved. Editable by hand; "Next No." re-syncs. |
| Login without a cloud service | Optional local PIN (PBKDF2-SHA256, 150k iterations). No Supabase, no accounts, no network calls. |
| Extras kept | Invoice No., Part No./Description, chemical Table A, microstructure Table B, attestation paragraph, Prepared/Approved signature blocks, Wagon/Truck No., search, duplicate, backup. |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Plain CSS for the certificate sheet (`src/styles/certificate-sheet.css`)
- No database server, no auth provider, no PDF service

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build on the office PC:

```bash
npm run build
npm run start      # bind to the LAN if the shop floor needs it: -H 0.0.0.0
```

## Printing

The **Print / PDF** button (Ctrl+P) saves the certificate first, then opens
`/certificates/print` in a new window, which contains nothing but the sheet and
opens the print dialog itself.

In the print dialog use **A4 · Landscape · Margins: None · Scale 100%** and keep
**Background graphics** on. Do *not* use "Fit to page" — the sheet already fits
and the extra scaling adds white borders.

## Where the data lives

Everything is in the browser profile on the PC that runs the app:

- IndexedDB database `sgm-mtc`, stores `certificates`, `customers`, `meta`
- `localStorage` mirrors for the same data only if IndexedDB is unavailable
- an unsaved *new* certificate is kept as a draft (`mtc:draft:new`) so a crash
  or accidental reload does not lose the typing

**Take a backup** from the dashboard after each batch. The JSON file is the only
copy that survives clearing browser data, a new PC, or a Windows profile reset.
Restore merges or replaces, at your choice.

## Layout notes

The 13 BIS columns need ~279 mm of usable width, so the sheet is landscape.
`CertificateSheet` renders a fixed 297 × 210 mm box, then measures the content
inside it and applies a damped fit factor (iterating because a wider layout
re-wraps text and changes the height). The measured scale is exposed as
`data-scale` on `.mtc-body` and shown as a badge in the editor:

- `≥ 100%` — fits at full size (up to ~3 order rows)
- `90–99%` — fits, slightly reduced
- `< 90%` — fits but small; red badge, consider splitting the certificate

## Verification

```bash
npm run build && npm run start -- -p 3100
npm run verify:print
```

Drives real Chrome against the running app and asserts 19 things end to end:
saving to IndexedDB, dashboard listing, rolling numbers, customer memory
(suggestion + exact-name fill), the generated PDF being **exactly one A4
landscape page** at 2 rows and at 7 rows, the PIN lock, and settings feeding new
certificates. Screenshots and PDFs land in `$OUT_DIR` (default: temp dir).

## Project map

```
src/app/page.tsx                    dashboard (search, backup, settings)
src/app/certificates/new            new certificate
src/app/certificates/[id]           edit a saved certificate
src/app/certificates/print          sheet-only print view
src/components/certificate/
  certificate-sheet.tsx             the BIS sheet + auto-fit
  certificate-editor.tsx            save/print/numbering/duplicate
  certificate-form.tsx              field entry
  customer-input.tsx                customer memory
src/components/dashboard.tsx        list + backup/restore
src/components/settings-modal.tsx   issuer, numbering, defaults, PIN
src/lib/db.ts                       IndexedDB storage + backup
src/lib/certificate-number.ts       FY numbering
src/lib/certificate-schema.ts       data model (zod)
src/styles/certificate-sheet.css    print contract
```

## Known limits

- One PC, one browser profile. Two machines do not share data — use backup/restore.
- The PIN is a convenience lock, not encryption: anyone with access to the
  browser profile and devtools can read the database. Keep backups off-machine.
- Printing depends on the browser's print engine; Chrome/Edge are verified,
  Firefox has not been tested.
