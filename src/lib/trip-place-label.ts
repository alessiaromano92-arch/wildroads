/** Title-style words (e.g. "ballard locks" → "Ballard Locks"). */
export function formatPlaceTitleForCard(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return t;
  return t
    .split(/\s+/)
    .map((w) => {
      if (!w.length) return w;
      if (/^[\d#-]+$/.test(w)) return w;
      return w[0]!.toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * True when a “name” is really a suite number, long postal code, or similar —
 * not a human-readable place label for the card.
 */
export function isMostlyNumericOrStreetCodeLabel(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  const compact = t.replace(/[\s,.#-]/g, "");
  if (/^\d+$/.test(compact)) return true;
  const digits = (t.match(/\d/g) ?? []).length;
  if (digits >= 8 && digits / Math.max(t.length, 1) > 0.35) return true;
  if (/^\d{1,5}\s+\S/.test(t) && t.length < 48) return true;
  return false;
}
