/**
 * Centralized Steam item image URL construction.
 *
 * The SteamApis image endpoint resolves items by their Steam market hash name.
 * Names coming from valuation results, DMarket, and other feeds often carry a
 * Doppler phase suffix (e.g. "Doppler Phase 2", "Doppler Black Pearl") or omit
 * the mandatory "★ " knife/glove prefix, both of which cause 400 responses and
 * broken images. Normalizing the name before building the URL keeps lookups
 * resolvable across every workstation screen.
 */

const STEAM_APIS_IMAGE_BASE = "https://api.steamapis.com/image/item/730/";
const STEAM_ECONOMY_IMAGE_BASE =
  "https://community.cloudflare.steamstatic.com/economy/image/";

const STAR_PREFIXED_ITEMS = [
  "Bayonet",
  "Classic Knife",
  "Flip Knife",
  "Gut Knife",
  "Karambit",
  "M9 Bayonet",
  "Huntsman Knife",
  "Falchion Knife",
  "Bowie Knife",
  "Butterfly Knife",
  "Shadow Daggers",
  "Ursus Knife",
  "Navaja Knife",
  "Stiletto Knife",
  "Talon Knife",
  "Nomad Knife",
  "Skeleton Knife",
  "Survival Knife",
  "Paracord Knife",
  "Kukri Knife",
  "Bloodhound Gloves",
  "Sport Gloves",
  "Driver Gloves",
  "Hand Wraps",
  "Moto Gloves",
  "Specialist Gloves",
  "Hydra Gloves",
  "Broken Fang Gloves",
];

const STAR_PREFIXED_ITEM_RE = new RegExp(
  `^(?:StatTrak™\\s*|StatTrak\\s+|Souvenir\\s+)?(?:${STAR_PREFIXED_ITEMS.join(
    "|",
  )})\\s*\\|`,
  "i",
);

const DOPPLER_PHASE_SUFFIX_RE =
  /\s+(?:Phase\s*[1-4]|Black\s+Pearl|Ruby|Sapphire|Emerald)$/i;

/**
 * Normalizes a market hash name so the SteamApis image endpoint can resolve it:
 * strips Doppler phase suffixes and restores the "★ " prefix for knives/gloves.
 */
export function normalizeSteamMarketHashName(rawName: string): string {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name) return "";

  const wearMatch = name.match(/^(.*?)(\s*\([^)]*\))$/);
  let base = (wearMatch ? wearMatch[1] : name).trim();
  const wear = wearMatch ? wearMatch[2] : "";

  if (/doppler/i.test(base)) {
    base = base.replace(DOPPLER_PHASE_SUFFIX_RE, "").trim();
  }

  const withoutStar = base.replace(/^★\s*/, "");
  if (withoutStar !== base) {
    base = `★ ${withoutStar}`;
  } else if (STAR_PREFIXED_ITEM_RE.test(base)) {
    base = `★ ${base}`;
  }

  return `${base}${wear}`;
}

/** Builds a resolvable SteamApis item image URL for a market hash name. */
export function buildSteamApisImageUrl(marketHashName: string): string {
  const normalized = normalizeSteamMarketHashName(marketHashName);
  if (!normalized) return "";
  return `${STEAM_APIS_IMAGE_BASE}${encodeURIComponent(normalized)}`;
}

/**
 * Normalizes a Steam economy image reference: accepts a full URL, a
 * protocol-relative URL, or a bare Steam image hash.
 */
export function buildSteamEconomyImageUrl(icon?: string | null): string {
  if (typeof icon !== "string") return "";
  const trimmed = icon.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `${STEAM_ECONOMY_IMAGE_BASE}${trimmed}`;
}

/**
 * Single source of truth for item card images: prefers the provided Steam icon
 * (hash or URL) and falls back to the normalized SteamApis lookup name.
 */
export function resolveItemImageUrl(
  marketHashName: string,
  icon?: string | null,
): string {
  return (
    buildSteamEconomyImageUrl(icon) || buildSteamApisImageUrl(marketHashName)
  );
}
