// v1 lessons name the unit counts after the Ngọc Hồi armies; v2 names them by side.
// Kept apart from silk-map.ts so the editor can use it without loading three.js.
const COUNT_ALIASES: Record<string, string> = { taySonInfantry: 'aInfantry', taySonElephants: 'aSpecial', qingInfantry: 'bInfantry', qingCannons: 'bArtillery' };

export function normalizeCounts(counts: Record<string, number | undefined> = {}) {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) if (value != null) out[COUNT_ALIASES[key] ?? key] = Number(value);
  return out;
}
