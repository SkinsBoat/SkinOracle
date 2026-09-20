/**
 * Utilities for parsing and formatting CS2 skin market hash names and wears
 * for institutional DealMaker cards.
 */

export interface ParsedSkinName {
  isStatTrak: boolean;
  isSouvenir: boolean;
  isKnifeOrGloves: boolean;
  weapon: string;
  pattern: string;
  wear: string | null;
  shortWear: string | null;
}

export interface WearColors {
  bg: string;
  text: string;
  border: string;
}

/**
 * Returns standardized 2-letter wear abbreviation (FN, MW, FT, WW, BS).
 */
export function getWearShort(wear?: string | null): string | null {
  if (!wear) return null;
  const upper = wear.trim().toUpperCase();
  if (upper.includes('FACTORY NEW') || upper === 'FN') return 'FN';
  if (upper.includes('MINIMAL WEAR') || upper === 'MW') return 'MW';
  if (upper.includes('FIELD-TESTED') || upper.includes('FIELD TESTED') || upper === 'FT') return 'FT';
  if (upper.includes('WELL-WORN') || upper.includes('WELL WORN') || upper === 'WW') return 'WW';
  if (upper.includes('BATTLE-SCARRED') || upper.includes('BATTLE SCARRED') || upper === 'BS') return 'BS';
  return wear.trim();
}

/**
 * Institutional color styling for CS2 wear conditions.
 */
export function getWearColors(wearCode?: string | null): WearColors {
  switch (wearCode) {
    case 'FN':
      return {
        bg: 'rgba(34, 197, 94, 0.14)',
        text: '#4ade80',
        border: 'rgba(34, 197, 94, 0.35)',
      };
    case 'MW':
      return {
        bg: 'rgba(56, 189, 248, 0.14)',
        text: '#38bdf8',
        border: 'rgba(56, 189, 248, 0.35)',
      };
    case 'FT':
      return {
        bg: 'rgba(245, 158, 11, 0.14)',
        text: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.35)',
      };
    case 'WW':
      return {
        bg: 'rgba(249, 115, 22, 0.14)',
        text: '#fb923c',
        border: 'rgba(249, 115, 22, 0.35)',
      };
    case 'BS':
      return {
        bg: 'rgba(239, 68, 68, 0.14)',
        text: '#f87171',
        border: 'rgba(239, 68, 68, 0.35)',
      };
    default:
      return {
        bg: 'rgba(148, 163, 184, 0.12)',
        text: '#cbd5e1',
        border: 'rgba(148, 163, 184, 0.25)',
      };
  }
}

/**
 * Parses marketHashName into structured elements (StatTrak, Souvenir, Knife, Weapon, Pattern, Wear).
 */
export function parseSkinHashName(
  marketHashName: string,
  rawWear?: string | null,
): ParsedSkinName {
  let name = (marketHashName || '').trim();
  let isStatTrak = false;
  let isSouvenir = false;
  let isKnifeOrGloves = false;

  if (name.startsWith('StatTrak™ ')) {
    isStatTrak = true;
    name = name.slice('StatTrak™ '.length).trim();
  }

  if (name.startsWith('Souvenir ')) {
    isSouvenir = true;
    name = name.slice('Souvenir '.length).trim();
  }

  if (name.startsWith('★ ')) {
    isKnifeOrGloves = true;
    name = name.slice('★ '.length).trim();
  }

  let extractedWear = rawWear || null;
  const wearMatch = name.match(
    /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i,
  );
  if (wearMatch) {
    if (!extractedWear) {
      extractedWear = wearMatch[1];
    }
    name = name.replace(wearMatch[0], '').trim();
  }

  const shortWear = getWearShort(extractedWear);

  if (name.includes(' | ')) {
    const parts = name.split(' | ');
    const weapon = parts[0].trim();
    const pattern = parts.slice(1).join(' | ').trim();
    return {
      isStatTrak,
      isSouvenir,
      isKnifeOrGloves,
      weapon,
      pattern,
      wear: extractedWear,
      shortWear,
    };
  }

  return {
    isStatTrak,
    isSouvenir,
    isKnifeOrGloves,
    weapon: name,
    pattern: '',
    wear: extractedWear,
    shortWear,
  };
}
