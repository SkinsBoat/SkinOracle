/**
 * marketHashValidation.ts
 * Pure validation, correction, and autocompletion utilities for CS2 Market Hash Names.
 */

export const CS2_WEAPONS = [
  // Rifles
  'AK-47',
  'M4A4',
  'M4A1-S',
  'AWP',
  'Galil AR',
  'FAMAS',
  'SG 553',
  'AUG',
  'SSG 08',
  'SCAR-20',
  'G3SG1',
  // Pistols
  'USP-S',
  'Glock-18',
  'Desert Eagle',
  'P250',
  'Five-SeVeN',
  'Tec-9',
  'CZ75-Auto',
  'Dual Berettas',
  'P2000',
  'R8 Revolver',
  // SMGs
  'MP9',
  'MAC-10',
  'MP7',
  'MP5-SD',
  'UMP-45',
  'P90',
  'PP-Bizon',
  // Heavy & Shotguns
  'Nova',
  'XM1014',
  'MAG-7',
  'Sawed-Off',
  'M249',
  'Negev',
] as const;

export const CS2_KNIVES = [
  'Karambit',
  'M9 Bayonet',
  'Bayonet',
  'Butterfly Knife',
  'Flip Knife',
  'Gut Knife',
  'Huntsman Knife',
  'Falchion Knife',
  'Shadow Daggers',
  'Bowie Knife',
  'Ursus Knife',
  'Navaja Knife',
  'Stiletto Knife',
  'Talon Knife',
  'Classic Knife',
  'Skeleton Knife',
  'Nomad Knife',
  'Survival Knife',
  'Paracord Knife',
  'Kukri Knife',
] as const;

export const CS2_GLOVES = [
  'Bloodhound Gloves',
  'Driver Gloves',
  'Hand Wraps',
  'Moto Gloves',
  'Specialist Gloves',
  'Sport Gloves',
  'Hydra Gloves',
  'Broken Fang Gloves',
] as const;

export const WEAR_NAME_TO_CODE: Record<string, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
};

export const WEAR_CODE_TO_NAME: Record<string, string> = {
  FN: 'Factory New',
  MW: 'Minimal Wear',
  FT: 'Field-Tested',
  WW: 'Well-Worn',
  BS: 'Battle-Scarred',
};

export const VALID_WEAR_REGEX =
  /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/;

// Colloquial weapon replacements
const WEAPON_ALIASES: Record<string, string> = {
  ak47: 'AK-47',
  'ak 47': 'AK-47',
  m4a1: 'M4A1-S',
  m4a1s: 'M4A1-S',
  'm4a1-s': 'M4A1-S',
  'm4a1 s': 'M4A1-S',
  m4: 'M4A4',
  deagle: 'Desert Eagle',
  'desert eagle': 'Desert Eagle',
  usps: 'USP-S',
  'usp s': 'USP-S',
  glock: 'Glock-18',
  'glock 18': 'Glock-18',
  scout: 'SSG 08',
  dualies: 'Dual Berettas',
  berettas: 'Dual Berettas',
  galil: 'Galil AR',
  bizon: 'PP-Bizon',
};

// Shorthand or informal wear patterns
const INFORMAL_WEAR_MAP: Array<{ pattern: RegExp; canonical: string; code: string }> = [
  { pattern: /\s*\((?:fn|factory\s*new)\)$/i, canonical: 'Factory New', code: 'FN' },
  { pattern: /\s*\((?:mw|minimal\s*wear)\)$/i, canonical: 'Minimal Wear', code: 'MW' },
  { pattern: /\s*\((?:ft|field\s*-?\s*tested)\)$/i, canonical: 'Field-Tested', code: 'FT' },
  { pattern: /\s*\((?:ww|well\s*-?\s*worn)\)$/i, canonical: 'Well-Worn', code: 'WW' },
  { pattern: /\s*\((?:bs|battle\s*-?\s*scarred)\)$/i, canonical: 'Battle-Scarred', code: 'BS' },
  // Ending without parentheses (e.g. "FT" or "Field-Tested")
  { pattern: /\s+(?:FN|Factory\s*New)$/i, canonical: 'Factory New', code: 'FN' },
  { pattern: /\s+(?:MW|Minimal\s*Wear)$/i, canonical: 'Minimal Wear', code: 'MW' },
  { pattern: /\s+(?:FT|Field\s*-?\s*Tested)$/i, canonical: 'Field-Tested', code: 'FT' },
  { pattern: /\s+(?:WW|Well\s*-?\s*Worn)$/i, canonical: 'Well-Worn', code: 'WW' },
  { pattern: /\s+(?:BS|Battle\s*-?\s*Scarred)$/i, canonical: 'Battle-Scarred', code: 'BS' },
];

export interface MarketHashValidationResult {
  isValid: boolean;
  status: 'valid' | 'warning' | 'invalid' | 'empty';
  errorReason?: string;
  detectedWear?: string; // 'FN' | 'MW' | 'FT' | 'WW' | 'BS'
  isKnownCatalogItem?: boolean;
  quickFix?: {
    label: string;
    fixedName: string;
    wear?: string;
  };
}

/**
 * Replace or append wear condition on an existing skin name string.
 * Example: setWearInName("AK-47 | Redline (Field-Tested)", "FN") -> "AK-47 | Redline (Factory New)"
 * Non-wear items (Stickers, Cases, Vanilla Knives) are never mutated.
 */
export function setWearInName(name: string, wearCode: string): string {
  if (!name.trim()) return name;

  // Never append or alter wear for stickers, cases, vanilla knives, patches, or music kits
  if (isNonWearCs2Item(name)) {
    return name.trim();
  }

  const canonicalWear = WEAR_CODE_TO_NAME[wearCode] || 'Field-Tested';

  if (VALID_WEAR_REGEX.test(name.trim())) {
    return name.trim().replace(VALID_WEAR_REGEX, `(${canonicalWear})`);
  }

  // If ends with informal wear, replace
  for (const { pattern } of INFORMAL_WEAR_MAP) {
    if (pattern.test(name.trim())) {
      return name.trim().replace(pattern, ` (${canonicalWear})`);
    }
  }

  // If has pipe (Weapon | Skin), append wear
  if (name.includes('|')) {
    return `${name.trim()} (${canonicalWear})`;
  }

  return name.trim();
}

/**
 * Checks if a string represents a valid CS2 non-wear item:
 * Stickers, Vanilla knives, Cases, Capsules, Music Kits, Agents, Pins, Patches.
 */
export function isNonWearCs2Item(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // Stickers: e.g. "Sticker | Crown (Foil)", "Sticker | Titan (Holo) | Katowice 2014"
  if (/^Sticker\s*\|/i.test(trimmed)) {
    return true;
  }

  // Patches: e.g. "Patch | The Boss"
  if (/^Patch\s*\|/i.test(trimmed)) {
    return true;
  }

  // Music Kits: e.g. "Music Kit | Beartooth", "StatTrak™ Music Kit | ..."
  if (/^(?:StatTrak™\s*)?Music Kit\s*\|/i.test(trimmed)) {
    return true;
  }

  // Vanilla knife: e.g. "★ Karambit", "★ StatTrak™ Butterfly Knife"
  const isVanillaKnife =
    /^(?:★\s*)?(?:StatTrak™\s*)?(?:Karambit|M9 Bayonet|Bayonet|Butterfly Knife|Flip Knife|Gut Knife|Huntsman Knife|Falchion Knife|Shadow Daggers|Bowie Knife|Ursus Knife|Navaja Knife|Stiletto Knife|Talon Knife|Classic Knife|Skeleton Knife|Nomad Knife|Survival Knife|Paracord Knife|Kukri Knife)$/i.test(
      trimmed,
    );
  if (isVanillaKnife) return true;

  // Cases, capsules, packages, pins, passes
  if (/(?:Case|Capsule|Souvenir Package|Pin|Patch|Pass|Key)$/i.test(trimmed)) {
    return true;
  }

  // Common tools
  if (trimmed === 'Name Tag' || trimmed === 'Storage Unit') {
    return true;
  }

  return false;
}

/**
 * Validates a user-entered CS2 market hash name.
 * Provides real-time feedback, identifies fixable syntax errors, and checks catalog presence.
 */
export function validateMarketHashName(
  input: string,
  options?: {
    currentWearDropdown?: string;
    catalogSet?: Set<string>;
  },
): MarketHashValidationResult {
  const raw = input || '';
  const trimmed = raw.trim();

  if (!trimmed) {
    return {
      isValid: false,
      status: 'empty',
    };
  }

  const selectedWear = options?.currentWearDropdown || 'FT';
  const selectedWearFull = WEAR_CODE_TO_NAME[selectedWear] || 'Field-Tested';
  const catalogSet = options?.catalogSet;

  // 1. Direct match in known catalog
  if (catalogSet && catalogSet.has(trimmed)) {
    const wearMatch = trimmed.match(VALID_WEAR_REGEX);
    const detected = wearMatch ? WEAR_NAME_TO_CODE[wearMatch[1]] : undefined;
    return {
      isValid: true,
      status: 'valid',
      isKnownCatalogItem: true,
      detectedWear: detected,
    };
  }

  // 2. Direct match with standard wear syntax
  const standardWearMatch = trimmed.match(VALID_WEAR_REGEX);
  if (standardWearMatch) {
    const detected = WEAR_NAME_TO_CODE[standardWearMatch[1]];
    const baseName = trimmed.replace(VALID_WEAR_REGEX, '').trim();

    // Check if it has a proper pipe separator
    if (!baseName.includes('|')) {
      return {
        isValid: false,
        status: 'invalid',
        errorReason: "Missing ' | ' between weapon and skin finish name.",
      };
    }

    const [weaponPart, ...skinParts] = baseName.split('|').map((s) => s.trim());
    const skinName = skinParts.join('|').trim();

    if (!weaponPart || !skinName) {
      return {
        isValid: false,
        status: 'invalid',
        errorReason: 'Both weapon name and skin finish name are required.',
      };
    }

    // Check knife/glove missing star prefix
    const isKnifeOrGlove = [...CS2_KNIVES, ...CS2_GLOVES].some(
      (k) =>
        weaponPart.toLowerCase() === k.toLowerCase() ||
        weaponPart.toLowerCase() === `stattrak™ ${k.toLowerCase()}`,
    );

    if (isKnifeOrGlove && !weaponPart.startsWith('★')) {
      const fixedName = `★ ${trimmed}`;
      return {
        isValid: false,
        status: 'warning',
        errorReason: 'Knives & Gloves require the official ★ prefix.',
        detectedWear: detected,
        quickFix: {
          label: 'Add ★ Prefix',
          fixedName,
          wear: detected,
        },
      };
    }

    // Fully valid weapon skin syntax!
    return {
      isValid: true,
      status: 'valid',
      detectedWear: detected,
      isKnownCatalogItem: Boolean(catalogSet && catalogSet.has(trimmed)),
    };
  }

  // 3. Stickers validation & correction
  if (/^Sticker/i.test(trimmed)) {
    // Missing pipe e.g. "Sticker Crown (Foil)"
    if (!trimmed.includes('|')) {
      const rest = trimmed.replace(/^Sticker\s*/i, '').trim();
      if (rest) {
        return {
          isValid: false,
          status: 'warning',
          errorReason: "Stickers require ' | ' separator (e.g. Sticker | Crown (Foil)).",
          quickFix: {
            label: `Format as 'Sticker | ${rest}'`,
            fixedName: `Sticker | ${rest}`,
          },
        };
      }
    } else {
      // Has pipe, ensure canonical capitalization and spacing
      const parts = trimmed.split('|').map((p) => p.trim());
      if (parts.length >= 2 && parts[1]) {
        const canonicalSticker = `Sticker | ${parts.slice(1).join(' | ')}`;
        if (canonicalSticker !== trimmed) {
          return {
            isValid: false,
            status: 'warning',
            errorReason: "Canonical format requires 'Sticker | <Name>'.",
            quickFix: {
              label: `Format as '${canonicalSticker}'`,
              fixedName: canonicalSticker,
            },
          };
        }
        return {
          isValid: true,
          status: 'valid',
          isKnownCatalogItem: Boolean(catalogSet && catalogSet.has(trimmed)),
        };
      }
    }
  }

  // 4. Check for Non-Wear CS2 Items (Vanilla Knives, Cases, Music Kits, etc.)
  if (isNonWearCs2Item(trimmed)) {
    // Check if vanilla knife missing star
    const isKnifeNoStar = CS2_KNIVES.some(
      (k) =>
        trimmed.toLowerCase() === k.toLowerCase() ||
        trimmed.toLowerCase() === `stattrak™ ${k.toLowerCase()}`,
    );
    if (isKnifeNoStar && !trimmed.startsWith('★')) {
      return {
        isValid: false,
        status: 'warning',
        errorReason: 'Knives require the official ★ prefix.',
        quickFix: {
          label: 'Add ★ Prefix',
          fixedName: `★ ${trimmed}`,
        },
      };
    }

    return {
      isValid: true,
      status: 'valid',
      isKnownCatalogItem: Boolean(catalogSet && catalogSet.has(trimmed)),
    };
  }

  // 4. Check for informal / shorthand wear condition (e.g. "(FT)", "(field tested)", "FT")
  for (const { pattern, canonical, code } of INFORMAL_WEAR_MAP) {
    if (pattern.test(trimmed)) {
      const corrected = trimmed.replace(pattern, ` (${canonical})`);
      return {
        isValid: false,
        status: 'warning',
        errorReason: `Non-standard wear format. Use canonical '(${canonical})'.`,
        detectedWear: code,
        quickFix: {
          label: `Fix to (${canonical})`,
          fixedName: corrected,
          wear: code,
        },
      };
    }
  }

  // 5. Check if item has pipe but missing wear entirely (e.g. "AK-47 | Redline")
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|').map((s) => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      let weapon = parts[0];
      const skin = parts[1];

      // Check weapon alias (e.g. "ak47" -> "AK-47")
      const lowerWeapon = weapon.toLowerCase().replace(/^(?:★\s*)?(?:stattrak™\s*)?/i, '').trim();
      const aliasMatch = WEAPON_ALIASES[lowerWeapon];
      if (aliasMatch) {
        const prefix = weapon.startsWith('★') ? '★ ' : weapon.startsWith('StatTrak™') ? 'StatTrak™ ' : '';
        weapon = `${prefix}${aliasMatch}`;
      }

      // Check knife/glove star
      const isKnifeOrGlove = [...CS2_KNIVES, ...CS2_GLOVES].some((k) =>
        weapon.toLowerCase().includes(k.toLowerCase()),
      );
      if (isKnifeOrGlove && !weapon.startsWith('★')) {
        weapon = `★ ${weapon}`;
      }

      const canonicalName = `${weapon} | ${skin} (${selectedWearFull})`;
      return {
        isValid: false,
        status: 'warning',
        errorReason: `Missing wear condition. Standard CS2 skins require (Wear Condition).`,
        quickFix: {
          label: `Append (${selectedWearFull})`,
          fixedName: canonicalName,
          wear: selectedWear,
        },
      };
    }
  }

  // 6. Check if user typed weapon and skin without pipe (e.g. "AK-47 Redline" or "M4A4 Howl")
  for (const weapon of CS2_WEAPONS) {
    const lowerTrimmed = trimmed.toLowerCase();
    const lowerWeapon = weapon.toLowerCase();
    if (lowerTrimmed.startsWith(lowerWeapon) && lowerTrimmed.length > lowerWeapon.length) {
      const rest = trimmed.substring(weapon.length).replace(/^[\s|-]+/, '').trim();
      if (rest) {
        const suggested = `${weapon} | ${rest} (${selectedWearFull})`;
        return {
          isValid: false,
          status: 'warning',
          errorReason: `Skin finishes require ' | ' separator between weapon and finish name.`,
          quickFix: {
            label: `Format as '${weapon} | ${rest}'`,
            fixedName: suggested,
            wear: selectedWear,
          },
        };
      }
    }
  }

  // 7. Check if user typed knife name without star or pipe (e.g. "Karambit Doppler")
  for (const knife of CS2_KNIVES) {
    const lowerTrimmed = trimmed.toLowerCase().replace(/^★\s*/, '');
    const lowerKnife = knife.toLowerCase();
    if (lowerTrimmed.startsWith(lowerKnife) && lowerTrimmed.length > lowerKnife.length) {
      const rest = lowerTrimmed.substring(lowerKnife.length).replace(/^[\s|-]+/, '').trim();
      if (rest) {
        const capRest = rest.charAt(0).toUpperCase() + rest.slice(1);
        const suggested = `★ ${knife} | ${capRest} (${selectedWearFull})`;
        return {
          isValid: false,
          status: 'warning',
          errorReason: `Knives require '★ ' prefix and ' | ' separator.`,
          quickFix: {
            label: `Format as '★ ${knife} | ${capRest}'`,
            fixedName: suggested,
            wear: selectedWear,
          },
        };
      }
    }
  }

  // 8. Otherwise invalid / unrecognized CS2 format
  return {
    isValid: false,
    status: 'invalid',
    errorReason:
      'Unrecognized CS2 item format. Official skins follow: Weapon | Skin (Wear Condition)',
  };
}

/**
 * Filter catalog items for autocomplete suggestions.
 * Returns up to maxResults matching names prioritizing prefix and exact word matches.
 */
export function searchCatalogSuggestions(
  query: string,
  catalogNames: string[],
  maxResults = 6,
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || catalogNames.length === 0) return [];

  const exactPrefixMatches: string[] = [];
  const wordMatches: string[] = [];
  const substringMatches: string[] = [];

  for (const name of catalogNames) {
    const lower = name.toLowerCase();
    if (lower === q) continue; // Skip exact match

    if (lower.startsWith(q)) {
      exactPrefixMatches.push(name);
      if (exactPrefixMatches.length >= maxResults) return exactPrefixMatches;
    } else if (lower.includes(` ${q}`) || lower.includes(`| ${q}`)) {
      wordMatches.push(name);
    } else if (lower.includes(q)) {
      substringMatches.push(name);
    }
  }

  return [...exactPrefixMatches, ...wordMatches, ...substringMatches].slice(0, maxResults);
}
