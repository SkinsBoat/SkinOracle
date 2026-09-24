/**
 * Utility functions for formatting CS2 item names and generating canonical CSFloat URLs.
 */

const WEAR_PHRASES = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Field Tested",
  "Well-Worn",
  "Well Worn",
  "Battle-Scarred",
  "Battle Scarred",
];

const KNIFE_KEYWORD_RE =
  /\b(Knife|Bayonet|Karambit|Daggers)\b/i;

/**
 * Formats a CS2 market hash name into the canonical format expected by CSFloat and Steam:
 * - Proper prefix ordering: Knives with StatTrak start with '★ StatTrak™ ', not 'StatTrak™ ★ '
 * - Vanilla Knives: CSFloat indexes vanilla knives strictly as '★ <Knife Name>' (e.g. '★ Gut Knife')
 *   without '(Vanilla)' and without 'StatTrak™' in the market_hash_name query parameter.
 * - No duplicate spaces (%20%20)
 * - Properly spaced pipe delimiters (' | ')
 * - Wear properly parenthesized (e.g. '(Minimal Wear)')
 */
export function formatCsfloatItemName(name: string | undefined | null): string {
  if (!name) return "";

  let trimmed = name.trim();
  if (!trimmed) return "";

  const hasStar = trimmed.includes("★");
  const hasStatTrak = /StatTrak/i.test(trimmed);
  const hasSouvenir = /Souvenir/i.test(trimmed);

  // Strip prefix markers to isolate clean base item name
  let base = trimmed
    .replace(/★/g, "")
    .replace(/StatTrak™?/gi, "")
    .replace(/Souvenir/gi, "")
    .trim();

  // Strip explicit (Vanilla) / Vanilla tags that may come from external APIs or caches
  base = base
    .replace(/\s*\(\s*Vanilla\s*\)/gi, "")
    .replace(/\bVanilla\b/gi, "")
    .trim();

  // Normalize pipe spacing
  base = base.replace(/\s*\|\s*/g, " | ");

  // Check if item is a knife without a weapon finish (Vanilla Knife)
  const isKnife = hasStar || KNIFE_KEYWORD_RE.test(base);
  const hasFinish = base.includes("|");

  if (isKnife && !hasFinish) {
    // Vanilla knife on CSFloat is always indexed simply as "★ <Knife Name>"
    return `★ ${base}`.replace(/\s+/g, " ").trim();
  }

  // Add parentheses around wear phrases if not present
  const hasParentheses = /\(.*\)/.test(base);
  if (!hasParentheses) {
    for (const phrase of WEAR_PHRASES) {
      const regex = new RegExp(`\\b${phrase}\\b`, "i");
      if (regex.test(base)) {
        base = base.replace(regex, `(${phrase})`);
        break;
      }
    }
  }

  // Normalize parentheses spacing
  base = base
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ") ")
    .replace(/\s+/g, " ")
    .trim();

  // Re-assemble in canonical CS2 / Steam Market Hash Name order
  let result = base;
  if (hasStar && hasStatTrak) {
    result = `★ StatTrak™ ${base}`;
  } else if (hasStar) {
    result = `★ ${base}`;
  } else if (hasStatTrak) {
    result = `StatTrak™ ${base}`;
  } else if (hasSouvenir) {
    result = `Souvenir ${base}`;
  }

  return result.replace(/\s+/g, " ").trim();
}

/**
 * Returns the search URL for CSFloat with lowest_price sorting and canonical name encoding.
 */
export function getCsfloatSearchUrl(name: string | undefined | null): string {
  const canonicalName = formatCsfloatItemName(name);
  if (!canonicalName) {
    return "https://csfloat.com/search?sort_by=lowest_price";
  }
  return `https://csfloat.com/search?market_hash_name=${encodeURIComponent(canonicalName)}&sort_by=lowest_price`;
}
