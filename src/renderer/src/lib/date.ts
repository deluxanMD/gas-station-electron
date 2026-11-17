const pad = (n: number): string => String(n).padStart(2, '0');

/** The date in the device's local time as YYYY-MM-DD (not the UTC date, which can be a day off in the evening). */
export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
