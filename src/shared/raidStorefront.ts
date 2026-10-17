/**
 * RAID — Storefront link resolution (shared).
 *
 * Pure logic used by both the renderer (manual input) and the main process
 * (clipboard paste). Keeping it shared means the clipboard flow can validate
 * the text in main and return only a structured storefront reference — raw
 * clipboard contents never cross into the renderer.
 */

import {
  RaidMarketplaceId,
  RaidParseResult,
  RaidProviderInfo,
} from "./types/raid.types";

/** Skinport public website root (storefront + item links). */
export const SKINPORT_SITE = "https://skinport.com";

/** Skinport shop slugs are lowercase alphanumerics with `_` / `-` separators. */
const STOREFRONT_HANDLE_RE = /^[A-Za-z0-9_.-]{1,64}$/;

/** CSFloat sellers are keyed by SteamID64 (17 digits). */
const CSFLOAT_STEAM_ID_RE = /^\d{17}$/;

/** DMarket sellers resolve to a 0x saga address on the public exchange. */
const DMARKET_SAGA_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/** Clipboard contents are capped before parsing (defensive). */
const CLIPBOARD_MAX_LENGTH = 2048;

/**
 * Provider registry. `skinport`, `csfloat` and `dmarket` are fully wired for
 * scanning; the others are recognized so pasted links resolve honestly.
 */
export const RAID_PROVIDERS: RaidProviderInfo[] = [
  {
    id: "skinport",
    name: "Skinport",
    hosts: ["skinport.com"],
    storefrontPrefixes: ["shop"],
    status: "live",
  },
  {
    id: "csfloat",
    name: "CSFloat",
    hosts: ["csfloat.com"],
    storefrontPrefixes: ["stall", "users"],
    status: "live",
  },
  {
    id: "dmarket",
    name: "DMarket",
    hosts: ["dmarket.com"],
    storefrontPrefixes: ["store", "user"],
    status: "live",
  },
  {
    id: "csmoney",
    name: "CS.MONEY",
    hosts: ["cs.money"],
    storefrontPrefixes: ["market", "user"],
    status: "soon",
  },
  {
    id: "steam",
    name: "Steam Inventory",
    hosts: ["steamcommunity.com"],
    storefrontPrefixes: ["inventory", "profiles", "id"],
    status: "soon",
  },
];

const PROVIDER_MAP: Record<string, RaidProviderInfo> = RAID_PROVIDERS.reduce(
  (acc, provider) => {
    acc[provider.id] = provider;
    return acc;
  },
  {} as Record<string, RaidProviderInfo>,
);

export function getRaidProvider(
  id: RaidMarketplaceId,
): RaidProviderInfo | undefined {
  return PROVIDER_MAP[id];
}

export function getRaidMarketplaceName(id: RaidMarketplaceId): string {
  return PROVIDER_MAP[id]?.name ?? id;
}

function matchProvider(hostname: string): RaidProviderInfo | undefined {
  const host = hostname.toLowerCase();
  return RAID_PROVIDERS.find((provider) =>
    provider.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
  );
}

/** Extract a seller handle from path segments using the provider's prefixes. */
function extractHandle(
  segments: string[],
  provider: RaidProviderInfo,
): string {
  const lower = segments.map((s) => s.toLowerCase());
  for (const prefix of provider.storefrontPrefixes) {
    const idx = lower.indexOf(prefix.toLowerCase());
    if (idx >= 0 && segments[idx + 1]) {
      return decodeURIComponent(segments[idx + 1]);
    }
  }
  return segments.length > 0
    ? decodeURIComponent(segments[segments.length - 1])
    : "";
}

function buildSkinportRef(handle: string, originalUrl: string): RaidParseResult {
  if (!STOREFRONT_HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: "That Skinport link does not contain a valid shop slug.",
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: "skinport",
      handle,
      originalUrl,
      canonicalUrl: `${SKINPORT_SITE}/shop/${handle}`,
      scanSupported: true,
    },
  };
}

function buildCsFloatRef(
  steamId: string,
  originalUrl: string,
): RaidParseResult {
  if (!CSFLOAT_STEAM_ID_RE.test(steamId)) {
    return {
      ok: false,
      error: "That CSFloat link does not contain a SteamID64.",
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: "csfloat",
      handle: steamId,
      originalUrl,
      canonicalUrl: `https://csfloat.com/stall/${steamId}`,
      scanSupported: true,
    },
  };
}

function buildDmarketRef(
  address: string,
  originalUrl: string,
): RaidParseResult {
  if (!DMARKET_SAGA_ADDR_RE.test(address)) {
    return {
      ok: false,
      error: "That DMarket link does not contain a valid seller address (0x…).",
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: "dmarket",
      handle: address,
      originalUrl,
      canonicalUrl: `https://dmarket.com/ingame-items/item-list/csgo-skins?user=${address}`,
      scanSupported: true,
    },
  };
}

/**
 * Resolves pasted storefront text into a provider + seller handle.
 * Accepts full URLs (with or without scheme) and a bare Skinport shop slug.
 */
export function parseStorefrontUrl(raw: string): RaidParseResult {
  const input = (raw || "").trim();
  if (!input) {
    return { ok: false, error: "Paste a seller storefront link to raid." };
  }

  // Bare, unambiguous identifiers.
  if (DMARKET_SAGA_ADDR_RE.test(input)) return buildDmarketRef(input, input);
  if (CSFLOAT_STEAM_ID_RE.test(input)) return buildCsFloatRef(input, input);

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  const candidate = hasScheme ? input : `https://${input}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return {
      ok: false,
      error: "That does not look like a valid storefront link.",
    };
  }

  // Accept a bare handle (e.g. the Skinport shop slug "example-shop").
  if (!url.hostname.includes(".")) {
    if (STOREFRONT_HANDLE_RE.test(input)) return buildSkinportRef(input, input);
    return { ok: false, error: "Enter a full storefront URL or shop slug." };
  }

  const provider = matchProvider(url.hostname);
  if (!provider) {
    return {
      ok: false,
      error: `Unrecognized storefront host: ${url.hostname}. Supported: ${RAID_PROVIDERS.map((p) => p.name).join(", ")}.`,
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const handle = extractHandle(segments, provider);

  if (provider.id === "skinport") {
    // Only `/shop/{slug}` maps to the public shop API.
    const hasShopSegment = segments.some((s) => s.toLowerCase() === "shop");
    if (!hasShopSegment) {
      return {
        ok: false,
        error:
          "Paste the Skinport seller shop link (skinport.com/shop/…), not a profile page.",
      };
    }
    return buildSkinportRef(handle, input);
  }

  if (provider.id === "csfloat") {
    const match = input.match(/\b(\d{17})\b/);
    if (!match) {
      return {
        ok: false,
        error:
          "Paste the CSFloat seller stall link (csfloat.com/stall/…), which contains a SteamID64.",
      };
    }
    return buildCsFloatRef(match[1], input);
  }

  if (provider.id === "dmarket") {
    const candidates = [
      url.searchParams.get("user"),
      url.searchParams.get("sagaAddress"),
      url.searchParams.get("owner"),
      handle,
      (input.match(/0x[a-fA-F0-9]{40}/) || [])[0],
    ].filter((c): c is string => Boolean(c));
    const address = candidates.find((c) => DMARKET_SAGA_ADDR_RE.test(c));
    if (!address) {
      return {
        ok: false,
        error:
          "Paste a DMarket seller store link that includes the seller address (0x…), or the address itself.",
      };
    }
    return buildDmarketRef(address, input);
  }

  if (!handle) {
    return {
      ok: false,
      error: `Could not read a seller handle from that ${provider.name} link.`,
    };
  }

  return {
    ok: true,
    ref: {
      marketplace: provider.id,
      handle,
      originalUrl: input,
      canonicalUrl: hasScheme ? input : candidate,
      scanSupported: provider.status === "live",
    },
  };
}

/**
 * Returns a storefront reference with no raw clipboard text attached.
 * `originalUrl` is replaced by the canonical storefront URL.
 */
function toSanitizedResult(result: RaidParseResult): RaidParseResult {
  if (!result.ok || !result.ref) {
    return { ok: false, error: result.error };
  }
  const { marketplace, handle, canonicalUrl, scanSupported } = result.ref;
  return {
    ok: true,
    ref: {
      marketplace,
      handle,
      canonicalUrl,
      originalUrl: canonicalUrl,
      scanSupported,
    },
  };
}

/**
 * Clipboard-specific parser. Unlike `parseStorefrontUrl`, it refuses bare
 * slugs (which could be an API key/token sitting on the clipboard) and only
 * accepts an explicit http(s) storefront URL, a 17-digit SteamID64, or a
 * 0x saga address. It never returns the raw clipboard string.
 */
export function parseStorefrontClipboard(raw: string): RaidParseResult {
  const text = String(raw ?? "").trim().slice(0, CLIPBOARD_MAX_LENGTH);
  if (!text) {
    return { ok: false, error: "Clipboard is empty." };
  }

  if (DMARKET_SAGA_ADDR_RE.test(text)) {
    return toSanitizedResult(buildDmarketRef(text, text));
  }
  if (CSFLOAT_STEAM_ID_RE.test(text)) {
    return toSanitizedResult(buildCsFloatRef(text, text));
  }

  if (!/^https?:\/\//i.test(text)) {
    return {
      ok: false,
      error: "Clipboard does not contain a supported storefront link.",
    };
  }

  const parsed = toSanitizedResult(parseStorefrontUrl(text));
  if (!parsed.ok) {
    // Keep the error generic: never echo any part of the clipboard text.
    return {
      ok: false,
      error: "Clipboard does not contain a supported storefront link.",
    };
  }
  return parsed;
}
