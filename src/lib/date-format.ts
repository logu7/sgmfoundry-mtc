/** Formats a Date as DD.MM.YY, matching the convention used throughout the
 * certificate (e.g. "23.07.26"). */
export function formatDateDDMMYY(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}
