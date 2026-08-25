/**
 * numbers.ts — Safe numeric utilities
 *
 * Use safeNumber() everywhere you convert an unknown value to a number.
 * This prevents NaN from appearing in the UI.
 *
 * Semantics:
 *   safeNumber(10)        → 10
 *   safeNumber("10")      → 10
 *   safeNumber(0)         → 0        ← actual zero is preserved
 *   safeNumber("0")       → 0
 *   safeNumber(null)      → null     ← genuinely missing
 *   safeNumber(undefined) → null
 *   safeNumber("")        → null
 *   safeNumber("abc")     → null
 *   safeNumber(NaN)       → null
 *
 * When you need a fallback number (e.g. for averages) pass one:
 *   safeNumber(value, 0)  → 0 when value is null/invalid
 *
 * IMPORTANT: only pass fallback=0 when 0 is a legitimate "no data" value
 * in context (e.g. attendance count). For marks, prefer null so the UI
 * can show "—" instead of a false zero.
 */

export function safeNumber(value: unknown, fallback?: number): number | null {
  if (value === null || value === undefined || value === '') return fallback ?? null;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback ?? null;
  return n;
}

/**
 * safeAverage — average of an array of unknowns, ignoring null/invalid.
 * Returns null if there are no valid values.
 */
export function safeAverage(values: unknown[]): number | null {
  const valid = values
    .map(v => safeNumber(v))
    .filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * formatMark — display a mark value safely.
 * Returns "—" for null/invalid rather than NaN or 0.
 */
export function formatMark(value: unknown, decimals = 0): string {
  const n = safeNumber(value);
  if (n === null) return '—';
  return decimals > 0 ? n.toFixed(decimals) : String(n);
}

/**
 * safeInitials — produce avatar initials from a name string.
 * Never crashes on null/undefined/empty.
 *
 *   "Lokesh M"  → "LM"
 *   "Lokesh"    → "L"
 *   ""          → "?"
 *   undefined   → "?"
 */
export function safeInitials(name: unknown, maxChars = 2): string {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return initials.slice(0, maxChars) || '?';
}
