/**
 * Certificate numbering.
 *
 * Format: <PREFIX>/<FY>/<SEQ>  e.g. SGM/26-27/001
 * The financial year runs 1 April – 31 March and the sequence restarts at 001
 * when a new FY begins. Numbers are derived from the certificates already
 * stored, so the roll survives reloads, restores from backup, and edits.
 */

export type Numbering = {
  prefix: string;
  pad: number;
  start: number;
};

export const DEFAULT_NUMBERING: Numbering = { prefix: "SGM", pad: 3, start: 1 };

export function financialYear(dateISO: string | Date): string {
  const d = typeof dateISO === "string" ? parseISO(dateISO) : dateISO;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  const startYear = month >= 4 ? year : year - 1;
  return `${pad2(startYear % 100)}-${pad2((startYear + 1) % 100)}`;
}

export function parseISO(dateISO: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateISO ?? "");
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(dateISO);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatCertificateNo(prefix: string, fy: string, seq: number, pad = 3): string {
  return `${prefix}/${fy}/${String(seq).padStart(pad, "0")}`;
}

/** Highest sequence used in the given FY for the given prefix. */
export function highestSequence(existing: string[], prefix: string, fy: string): number {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}/${fy.replace("-", "\\-")}/(\\d+)$`, "i");
  let max = 0;
  for (const no of existing) {
    const m = re.exec((no ?? "").trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export function nextCertificateNo(
  existing: string[],
  dateISO: string,
  numbering: Numbering = DEFAULT_NUMBERING
): string {
  const fy = financialYear(dateISO);
  const max = highestSequence(existing, numbering.prefix, fy);
  const seq = Math.max(max + 1, numbering.start);
  return formatCertificateNo(numbering.prefix, fy, seq, numbering.pad);
}

/** True when `no` already exists (case/space-insensitive). */
export function isDuplicateNo(existing: string[], no: string, ignoreIdValue?: string): boolean {
  const target = (no ?? "").trim().toLowerCase();
  if (!target) return false;
  return existing.some((v) => v.trim().toLowerCase() === target && v !== ignoreIdValue);
}

/** dd.mm.yyyy — BIS certificates are dated like this. */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
