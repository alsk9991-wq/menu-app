export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/**
 * JSTの「その日 00:00」をUTC Dateにして返す
 * JST = UTC+9 なので、UTCでは前日15:00
 */
export function jstMidnightToUtcDate(ymd: string): Date {
  const p = parseYmd(ymd);
  if (!p) throw new Error("Invalid date format. Use YYYY-MM-DD");
  return new Date(Date.UTC(p.y, p.m - 1, p.d, -9, 0, 0, 0));
}

export function todayYmdInJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
