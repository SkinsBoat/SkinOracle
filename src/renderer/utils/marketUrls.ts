import { toCanonicalMarketId } from "../../shared/canonicalMarkets";
import { formatCsfloatItemName } from "./csfloatUrls";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative Centralized Marketplace Link Generator Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides accurate, market-specific URL formatters for all supported CS2 platforms.
 * Reuses established domain rules (CSFloat, DMarket category filters, Waxpeer slugging,
 * LisSkins, AvanMarket, BitSkins, SkinOut, AimMarket, CS.MONEY, etc.).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function handleCsfloatReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://csfloat.com/search?sort_by=lowest_price";
  const formattedName = formatCsfloatItemName(name);
  return `https://csfloat.com/search?market_hash_name=${encodeURIComponent(formattedName)}&sort_by=lowest_price`;
}

export function handleDmarketReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://dmarket.com/ingame-items/item-list/csgo-skins";
  const encodedTitle = encodeURIComponent(name);
  const base = "https://dmarket.com/ingame-items/item-list/csgo-skins";
  if (name.includes("StatTrak")) {
    return `${base}?category_0=stattrak_tm&title=${encodedTitle}`;
  }
  return `${base}?category_1=not_souvenir&category_0=not_stattrak_tm&title=${encodedTitle}`;
}

export function handleWaxpeerReferenceLink(name: string | undefined | null, skinId?: string): string {
  if (!name) return "https://waxpeer.com";
  // Format exact market hash name into URL search param or slug
  const encodedName = encodeURIComponent(name);
  if (skinId) {
    return `https://waxpeer.com/?game=csgo&sort=ASC&order=price&all=0&exact=0&search=${encodedName}`;
  }
  return `https://waxpeer.com/?game=csgo&sort=ASC&order=price&all=0&exact=0&search=${encodedName}`;
}

export function handleAvanMarketReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://avan.market/en/market/cs";
  const isStatTrak = /StatTrak™/i.test(name);
  const isSouvenir = /Souvenir/i.test(name);

  // Clean item name by removing StatTrak™ and Souvenir prefix
  const cleanName = name
    .replace(/StatTrak™\s*/i, "")
    .replace(/Souvenir\s*/i, "")
    .trim();

  const encodedName = encodeURIComponent(cleanName).replace(/%20/g, "+");
  
  let specialParam = "";
  if (isStatTrak) {
    specialParam = "&special=" + encodeURIComponent("StatTrak™").replace(/%20/g, "+");
  } else if (isSouvenir) {
    specialParam = "&special=Souvenir";
  } else {
    specialParam = "&special=" + encodeURIComponent("Without StatTrak™").replace(/%20/g, "+");
  }

  return `https://avan.market/en/market/cs?name=${encodedName}${specialParam}`;
}

export function handleLisSkinsReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://lis-skins.com/market/csgo/";
  
  // Format into slug: lowercase, replacing spaces/special chars with hyphens
  const slug = name
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return `https://lis-skins.com/market/csgo/${slug}/`;
}

export function handleBitSkinsReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://bitskins.com/market/cs2";
  const encodedSkinName = encodeURIComponent(name).replace(/%20/g, "+");
  return `https://bitskins.com/market/cs2?search={"strict_search":1,"where":{"skin_name":"${encodedSkinName}"}}`;
}

export function handleSkinflowReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skinflow.gg/buy";
  const isStatTrak = /StatTrak™/i.test(name);
  const isSouvenir = /Souvenir/i.test(name);

  const formattedName = formatCsfloatItemName(name);
  const urlSafeName = formattedName.replace(/ /g, "+");

  let flags = "&sort_by=offered&offered=lte:2500000&trade_lock=0";
  if (isStatTrak) {
    flags += "&stattrak=1";
  } else if (isSouvenir) {
    flags += "&souvenir=1";
  } else {
    flags += "&stattrak=0&souvenir=0";
  }

  return `https://skinflow.gg/buy?search=${urlSafeName}${flags}`;
}

export function handleWhiteMarketReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://white.market/market";
  const encodedNameHash = encodeURIComponent(name);
  return `https://white.market/item?appId=730&nameHash=${encodedNameHash}`;
}

export function handleSkinoutReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skinout.gg/en/market/";
  const statTrakRegex = /(StatTrak™)/i;
  const statTrakMatch = name.match(statTrakRegex);
  let nameWithoutStatTrak = name.replace(statTrakRegex, "").trim();

  let formattedName = nameWithoutStatTrak
    .replace(/[^\w\s★-]/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .join("-")
    .replace(/-+/g, "-");

  if (statTrakMatch) {
    formattedName = `stattrak-${formattedName}`;
  }

  return `https://skinout.gg/en/market/${formattedName}`;
}

export function handleCsgoMarketReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://market.csgo.com/en/";
  
  const isStatTrak = /StatTrak™/i.test(name);
  const isSouvenir = /Souvenir/i.test(name);

  let category = "Normal";
  if (isStatTrak) {
    category = "StatTrak™";
  } else if (isSouvenir) {
    category = "Souvenir";
  }

  const encodedSearch = encodeURIComponent(name);
  const encodedCategory = encodeURIComponent(category);

  return `https://market.csgo.com/en/?search=${encodedSearch}&categories=${encodedCategory}`;
}

export function handleBuff163ReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://buff.163.com/market/csgo#tab=selling&page_num=1";
  return `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodeURIComponent(name)}`;
}

export function handleBuffMarketReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://buff.market/market/csgo#tab=selling&page_num=1";
  const encodedName = encodeURIComponent(name);
  return `https://buff.market/market/goods/cs2/${encodedName}`;
}

export function handleManncoReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://mannco.store/csgo";

  // Slug format: lowercase, remove special characters except hyphens and spaces, replace spaces with hyphens
  const slug = name
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return `https://mannco.store/item/730-${slug}`;
}

export function handleSkinlandReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skin.land/market/cs2/";

  // Format into slug: lowercase, replace spaces/pipes with hyphens, encode special unicode characters like ★
  const slug = name
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/\s*\|\s*/g, "-")
    .replace(/\s*\(/g, "-")
    .replace(/\)/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const encodedSlug = encodeURIComponent(slug);
  return `https://skin.land/market/cs2/${encodedSlug}`;
}

export function handleSkinportReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skinport.com/market";
  return `https://skinport.com/market?search=${encodeURIComponent(name)}`;
}

export function handleSteamReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://steamcommunity.com/market/";
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(name)}`;
}

export function handleCsMoneyReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://cs.money/csgo/store/";
  return `https://cs.money/csgo/store/?search=${encodeURIComponent(name)}`;
}

export function handleTradeitReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://tradeit.gg/csgo/store";

  const isStatTrak = /StatTrak™/i.test(name);
  const isSouvenir = /Souvenir/i.test(name);

  const statTrakParam = isStatTrak ? "statTrak=Has+StatTrak" : "statTrak=No+StatTrak";
  const souvenirParam = isSouvenir ? "souvenir=Has+Souvenir" : (isStatTrak ? "souvenir=No+Souvenir" : "");

  const encodedSearch = encodeURIComponent(name).replace(/%20/g, "+");
  const params = [statTrakParam, souvenirParam, `search=${encodedSearch}`]
    .filter(Boolean)
    .join("&");

  return `https://tradeit.gg/csgo/store?${params}`;
}

export function handleSkinSwapReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skinswap.com/buy";
  return `https://skinswap.com/buy?search=${encodeURIComponent(name)}`;
}

export function handleSkinsComReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skins.com";

  const isStatTrak = /StatTrak™/i.test(name);

  // Exterior mapping: (Factory New) -> fn, (Minimal Wear) -> mw, (Field-Tested) -> ft, (Well-Worn) -> ww, (Battle-Scarred) -> bs
  const exteriorMap: Record<string, string> = {
    "factory new": "fn",
    "minimal wear": "mw",
    "field-tested": "ft",
    "well-worn": "ww",
    "battle-scarred": "bs",
  };

  const exteriorMatch = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
  const exteriorCode = exteriorMatch ? exteriorMap[exteriorMatch[1].toLowerCase()] : null;

  // Clean item name by stripping StatTrak™, Souvenir, ★ prefix and exterior suffix
  const cleanName = name
    .replace(/^★\s*/, "")
    .replace(/StatTrak™\s*/i, "")
    .replace(/Souvenir\s*/i, "")
    .replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i, "")
    .replace(/\s*\|\s*/g, "-")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const queryParams: string[] = [];
  if (exteriorCode) {
    queryParams.push(`exterior=${exteriorCode}`);
  }
  if (isStatTrak) {
    queryParams.push("st=true");
  }

  const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

  return `https://skins.com/item/${cleanName}${queryString}`;
}

export function handleSkinBaronReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://skinbaron.de/en/csgo";

  const isStatTrak = /StatTrak™/i.test(name);

  // Exterior mapping: (Factory New) -> Factory-New, (Minimal Wear) -> Minimal-Wear, (Field-Tested) -> Field-Tested, (Well-Worn) -> Well-Worn, (Battle-Scarred) -> Battle-Scarred
  const exteriorMatch = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
  const exteriorFormatted = exteriorMatch ? exteriorMatch[1].replace(/\s+/g, "-") : null;

  // Remove ★, StatTrak™, Souvenir, and exterior suffix
  const cleanName = name
    .replace(/^★\s*/, "")
    .replace(/StatTrak™\s*/i, "")
    .replace(/Souvenir\s*/i, "")
    .replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i, "")
    .trim();

  // Split into weapon prefix and skin title if pipe exists (e.g., "Glock-18 | Shinobu" or "Bowie Knife | Autotronic")
  let category = "Pistol";
  let weaponName = cleanName;
  let skinTitle = "";

  if (cleanName.includes("Gloves") || cleanName.includes("Wraps")) {
    category = "Gloves";
  } else if (cleanName.includes("Knife") || cleanName.includes("Bayonet") || cleanName.includes("Karambit") || cleanName.includes("Daggers")) {
    category = "Knife";
  }

  if (cleanName.includes("|")) {
    const parts = cleanName.split(/\s*\|\s*/);
    weaponName = parts[0].trim().replace(/\s+/g, "-");
    skinTitle = parts[1].trim().replace(/\s+/g, "-");
  } else {
    weaponName = cleanName.replace(/\s+/g, "-");
  }

  const pathParts = ["https://skinbaron.de/en/csgo", category, weaponName];
  if (skinTitle) {
    pathParts.push(skinTitle);
  }
  if (exteriorFormatted) {
    pathParts.push(exteriorFormatted);
  }

  const queryParams: string[] = ["sort=CF"];
  if (isStatTrak) {
    queryParams.push("statTrak=true");
  }

  return `${pathParts.join("/")}?${queryParams.join("&")}`;
}

export function handleShadowPayReferenceLink(name: string | undefined | null): string {
  if (!name) return "https://shadowpay.com/csgo-items";

  const isStatTrak = /StatTrak™/i.test(name);
  const isSouvenir = /Souvenir/i.test(name);

  // Extract exterior condition e.g. "(Factory New)", "(Field-Tested)", etc.
  const exteriorMatch = name.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
  const exterior = exteriorMatch ? exteriorMatch[1] : null;

  // Clean name by removing StatTrak™, Souvenir, and exterior suffix
  const cleanName = name
    .replace(/StatTrak™\s*/i, "")
    .replace(/Souvenir\s*/i, "")
    .replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i, "")
    .trim();

  const exteriorParam = exterior ? `exteriors=${encodeURIComponent(JSON.stringify([exterior]))}` : "";
  const statTrakParam = isStatTrak ? "is_stattrak=1" : (isSouvenir ? "is_stattrak" : "is_stattrak=0");
  const souvenirParam = isSouvenir ? "is_souvenir=1" : "";
  const searchParam = `search=${encodeURIComponent(cleanName).replace(/%20/g, "+")}`;

  const params = [
    exteriorParam,
    "price_from=0",
    "price_to=100000",
    statTrakParam,
    souvenirParam,
    "hold_days",
    "sort_column=price",
    "sort_dir=asc",
    searchParam,
  ]
    .filter(Boolean)
    .join("&");

  return `https://shadowpay.com/csgo-items?${params}`;
}

/**
 * Universal router that dispatches to the correct market-specific link generator function.
 * Only returns URLs for fully supported, verified marketplace URL generators.
 * Returns null for unverified/unimplemented markets to prevent broken/unimplemented links.
 */
export function getMarketItemUrl(
  marketId: string | null | undefined,
  itemName: string | null | undefined,
  skinId?: string,
): string | null {
  if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
    return null;
  }

  const rawMarket = (marketId || "").trim().toLowerCase();
  const canonicalId = toCanonicalMarketId(rawMarket) || rawMarket;

  switch (canonicalId) {
    case "csfloat":
    case "csgofloat":
    case "cs_float":
      return handleCsfloatReferenceLink(itemName);

    case "dmarket":
    case "d_market":
    case "dmarket_target":
    case "dmarket_f":
    case "dmarket_sales":
      return handleDmarketReferenceLink(itemName);

    case "skinscom":
    case "skins_com":
    case "skins.com":
      return handleSkinsComReferenceLink(itemName);

    case "skinswap":
    case "skinswap_market":
    case "skinswap_m":
    case "skinswap_trade":
    case "skinswap_t":
      return handleSkinSwapReferenceLink(itemName);

    case "skinbaron":
    case "skin_baron":
      return handleSkinBaronReferenceLink(itemName);

    case "shadowpay":
    case "shadow_pay":
      return handleShadowPayReferenceLink(itemName);

    case "waxpeer":
    case "wax_peer":
      return handleWaxpeerReferenceLink(itemName, skinId);

    case "avanmarket":
    case "avan_market":
    case "avan":
      return handleAvanMarketReferenceLink(itemName);

    case "lisskins":
    case "lis_skins":
    case "lis-skins":
      return handleLisSkinsReferenceLink(itemName);

    case "skinland":
    case "skin_land":
    case "skin-land":
      return handleSkinlandReferenceLink(itemName);

    case "mannco":
    case "manncostore":
    case "mannco_store":
      return handleManncoReferenceLink(itemName);

    case "bitskins":
    case "bit-skins":
      return handleBitSkinsReferenceLink(itemName);

    case "skinflow":
    case "skin_flow":
      return handleSkinflowReferenceLink(itemName);

    case "whitemarket":
    case "white_market":
    case "white.market":
      return handleWhiteMarketReferenceLink(itemName);

    case "skinout":
    case "skin_out":
      return handleSkinoutReferenceLink(itemName);

    case "market_csgo":
    case "marketcsgo":
    case "market-csgo":
      return handleCsgoMarketReferenceLink(itemName);

    case "buff163":
    case "buff_163":
    case "buff":
      return handleBuff163ReferenceLink(itemName);

    case "buffmarket":
    case "buff_market":
      return handleBuffMarketReferenceLink(itemName);

    case "skinport":
    case "skin_port":
      return handleSkinportReferenceLink(itemName);

    case "steam":
    case "steam_market":
    case "scm":
      return handleSteamReferenceLink(itemName);

    case "csmoney_market":
    case "csmoney_p2p":
    case "csmoney_m":
    case "csmoney":
    case "csmoney_trade":
    case "csmoney_t":
      return handleCsMoneyReferenceLink(itemName);

    case "tradeit_store":
    case "tradeit":
    case "tradeitgg":
    case "tradeitgg_store":
    case "tradeit_s":
    case "tradeit_trade":
    case "tradeit_t":
      return handleTradeitReferenceLink(itemName);

    default:
      return null;
  }
}
