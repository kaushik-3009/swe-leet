export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// Monday of the week containing `d`, as YYYY-MM-DD (local calendar, UTC-based to stay
// deterministic across server timezones).
export function mondayOf(d: Date = new Date()): string {
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday.toISOString().split("T")[0];
}

export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split("T")[0];
}
