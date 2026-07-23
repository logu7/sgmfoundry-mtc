/**
 * Fixed CSS for CertificateSheet, scoped to exactly the utility classes the
 * component uses (verified against certificate-sheet.tsx — see
 * scripts/check-certificate-css-coverage.mjs). This exists so PDF rendering
 * is fully self-contained: no Tailwind CDN, no Google Fonts network fetch,
 * no risk of the print output silently changing if a CDN is slow/down.
 *
 * The on-screen editor preview still uses the real Tailwind build (via the
 * same class names on the same component), so both paths render pixel-identical.
 */
export const CERTIFICATE_STATIC_CSS = `
.flex { display: flex; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.items-start { align-items: flex-start; }
.items-baseline { align-items: baseline; }
.justify-between { justify-content: space-between; }
.shrink-0 { flex-shrink: 0; }
.align-middle { vertical-align: middle; }
.table-fixed { table-layout: fixed; }
.border-collapse { border-collapse: collapse; }
.overflow-hidden { overflow: hidden; }
.w-auto { width: auto; }
.w-full { width: 100%; }
.w-24 { width: 6rem; }
.w-56 { width: 14rem; }
.h-10 { height: 2.5rem; }
.h-11 { height: 2.75rem; }
.h-6 { height: 1.5rem; }
.w-52 { width: 13rem; }
.mt-6 { margin-top: 1.5rem; }
.pt-6 { padding-top: 1.5rem; }
.block { display: block; }
.flex-1 { flex: 1 1 0%; }
.items-end { align-items: flex-end; }
.gap-4 { gap: 1rem; }
.w-40 { width: 10rem; }
.w-\\[38\\%\\] { width: 38%; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.pl-9 { padding-left: 2.25rem; }
.pt-0\\.5 { padding-top: 0.125rem; }
.p-1\\.5 { padding: 0.375rem; }
.border-y { border-top-width: 1px; border-bottom-width: 1px; border-top-style: solid; border-bottom-style: solid; }
.font-bold { font-weight: 700; }
.leading-tight { line-height: 1.25; }
.underline { text-decoration-line: underline; }
.underline-offset-2 { text-underline-offset: 2px; }
.text-slate-600 { color: #475569; }
.text-\\[11px\\] { font-size: 11px; line-height: 1.3; }
.text-\\[13px\\] { font-size: 13px; line-height: 1.3; }

.py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.gap-x-2 { column-gap: 0.5rem; }
.gap-y-1\\.5 { row-gap: 0.375rem; }
.mb-0\\.5 { margin-bottom: 0.125rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-1\\.5 { margin-bottom: 0.375rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mt-0\\.5 { margin-top: 0.125rem; }
.p-2 { padding: 0.5rem; }
.pb-2\\.5 { padding-bottom: 0.625rem; }
.pt-1 { padding-top: 0.25rem; }
.px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.border { border-width: 1px; border-style: solid; border-color: currentColor; }
.border-b { border-bottom-width: 1px; border-bottom-style: solid; }
.border-b-2 { border-bottom-width: 2px; border-bottom-style: solid; }
.border-l { border-left-width: 1px; border-left-style: solid; }
.border-r { border-right-width: 1px; border-right-style: solid; }
.border-t { border-top-width: 1px; border-top-style: solid; }
.rounded-sm { border-radius: 2px; }
.border-slate-200 { border-color: #e2e8f0; }
.border-slate-300 { border-color: #cbd5e1; }
.border-slate-400 { border-color: #94a3b8; }
.border-slate-800 { border-color: #1e293b; }
.bg-slate-50 { background-color: #f8fafc; }
.bg-slate-800 { background-color: #1e293b; }
.text-slate-400 { color: #94a3b8; }
.text-slate-500 { color: #64748b; }
.text-slate-700 { color: #334155; }
.text-slate-800 { color: #1e293b; }
.text-slate-900 { color: #0f172a; }
.text-white { color: #ffffff; }
.text-emerald-600 { color: #059669; }
.text-\\[8\\.5px\\] { font-size: 8.5px; line-height: 1.3; }
.text-\\[9px\\] { font-size: 9px; line-height: 1.3; }
.text-\\[9\\.5px\\] { font-size: 9.5px; line-height: 1.3; }
.text-\\[10px\\] { font-size: 10px; line-height: 1.3; }
.text-\\[10\\.5px\\] { font-size: 10.5px; line-height: 1.4; }
.text-\\[11\\.5px\\] { font-size: 11.5px; line-height: 1.4; }
.text-\\[12px\\] { font-size: 12px; line-height: 1.4; }
.text-\\[17px\\] { font-size: 17px; line-height: 1.3; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.italic { font-style: italic; }
.uppercase { text-transform: uppercase; }
.tracking-tight { letter-spacing: -0.025em; }
.tracking-wider { letter-spacing: 0.05em; }
.tracking-widest { letter-spacing: 0.1em; }
.leading-snug { line-height: 1.375; }
.min-h-\\[1\\.1em\\] { min-height: 1.1em; }
.line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
`;
