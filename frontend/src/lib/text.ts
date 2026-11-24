// Composed and decomposed Vietnamese diacritics must never mix: everything that enters storage or
// the UI from data, files or inputs goes through here (NFC).
export function nfc<T>(value: T): T {
  if (typeof value === 'string') return value.normalize('NFC') as T;
  if (Array.isArray(value)) return value.map(nfc) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key.normalize('NFC')] = nfc(v);
    return out as T;
  }
  return value;
}

/** Lowercase, accents removed, đ → d: for search that ignores diacritics. */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

/** Local date as YYYY-MM-DD (not UTC: a lesson dated today must be visible today in Vietnam). */
export function today(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
