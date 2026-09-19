import { describe, it, expect } from 'vitest';
import {
  validateMarketHashName,
  setWearInName,
  isNonWearCs2Item,
  searchCatalogSuggestions,
} from '../marketHashValidation';

describe('marketHashValidation', () => {
  describe('validateMarketHashName - Valid Cases', () => {
    it('accepts standard weapon skins with official wear', () => {
      const res = validateMarketHashName('AK-47 | Redline (Field-Tested)');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.detectedWear).toBe('FT');
    });

    it('accepts StatTrak weapon skins', () => {
      const res = validateMarketHashName('StatTrak™ M4A4 | Howl (Factory New)');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.detectedWear).toBe('FN');
    });

    it('accepts Souvenir weapon skins', () => {
      const res = validateMarketHashName('Souvenir AWP | Dragon Lore (Minimal Wear)');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.detectedWear).toBe('MW');
    });

    it('accepts knives with star prefix and wear', () => {
      const res = validateMarketHashName('★ Karambit | Doppler (Factory New)');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.detectedWear).toBe('FN');
    });

    it('accepts gloves with star prefix and wear', () => {
      const res = validateMarketHashName('★ Sport Gloves | Pandora\'s Box (Field-Tested)');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('valid');
      expect(res.detectedWear).toBe('FT');
    });

    it('accepts vanilla knives without wear condition', () => {
      const res1 = validateMarketHashName('★ Karambit');
      expect(res1.isValid).toBe(true);
      expect(res1.status).toBe('valid');

      const res2 = validateMarketHashName('★ StatTrak™ Butterfly Knife');
      expect(res2.isValid).toBe(true);
      expect(res2.status).toBe('valid');
    });

    it('accepts cases, stickers, and music kits', () => {
      const resCase = validateMarketHashName('Recoil Case');
      expect(resCase.isValid).toBe(true);
      expect(resCase.status).toBe('valid');

      const resSticker1 = validateMarketHashName('Sticker | Crown (Foil)');
      expect(resSticker1.isValid).toBe(true);
      expect(resSticker1.status).toBe('valid');

      const resSticker2 = validateMarketHashName('Sticker | Titan (Holo) | Katowice 2014');
      expect(resSticker2.isValid).toBe(true);
      expect(resSticker2.status).toBe('valid');

      const resSticker3 = validateMarketHashName('Sticker | s1mple (Gold) | Antwerp 2022');
      expect(resSticker3.isValid).toBe(true);
      expect(resSticker3.status).toBe('valid');

      const resSticker4 = validateMarketHashName('Sticker | Howling Dawn');
      expect(resSticker4.isValid).toBe(true);
      expect(resSticker4.status).toBe('valid');
    });

    it('identifies exact items from catalog set', () => {
      const catalog = new Set(['Special Custom Item (Field-Tested)']);
      const res = validateMarketHashName('Special Custom Item (Field-Tested)', {
        catalogSet: catalog,
      });
      expect(res.isValid).toBe(true);
      expect(res.isKnownCatalogItem).toBe(true);
      expect(res.detectedWear).toBe('FT');
    });
  });

  describe('validateMarketHashName - Warnings & Quick Fixes', () => {
    it('detects missing wear condition on weapon skins and provides quickFix', () => {
      const res = validateMarketHashName('AK-47 | Redline', {
        currentWearDropdown: 'FT',
      });
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('AK-47 | Redline (Field-Tested)');
      expect(res.quickFix?.wear).toBe('FT');
    });

    it('detects shorthand wear (FT) and corrects to official canonical wear', () => {
      const res = validateMarketHashName('AK-47 | Redline (FT)');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('AK-47 | Redline (Field-Tested)');
      expect(res.detectedWear).toBe('FT');
    });

    it('detects informal lowercase wear (field-tested) and corrects', () => {
      const res = validateMarketHashName('AWP | Asiimov (field-tested)');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('AWP | Asiimov (Field-Tested)');
    });

    it('detects missing star prefix on knife with skin', () => {
      const res = validateMarketHashName('Butterfly Knife | Fade (Factory New)');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('★ Butterfly Knife | Fade (Factory New)');
      expect(res.detectedWear).toBe('FN');
    });

    it('detects missing star prefix on vanilla knife', () => {
      const res = validateMarketHashName('Karambit');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('★ Karambit');
    });

    it('detects missing pipe separator (e.g. AK-47 Redline)', () => {
      const res = validateMarketHashName('AK-47 Redline', {
        currentWearDropdown: 'MW',
      });
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('AK-47 | Redline (Minimal Wear)');
    });

    it('replaces colloquial weapon abbreviation (e.g. ak47 | vulcan)', () => {
      const res = validateMarketHashName('ak47 | Vulcan', {
        currentWearDropdown: 'FT',
      });
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('AK-47 | Vulcan (Field-Tested)');
    });

    it('detects missing pipe on stickers and provides quickFix', () => {
      const res = validateMarketHashName('Sticker Crown (Foil)');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('Sticker | Crown (Foil)');
    });

    it('detects non-canonical sticker formatting and provides quickFix', () => {
      const res = validateMarketHashName('sticker|Crown (Foil)');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('warning');
      expect(res.quickFix?.fixedName).toBe('Sticker | Crown (Foil)');
    });
  });

  describe('validateMarketHashName - Invalid & Empty Cases', () => {
    it('returns empty status for blank input', () => {
      const res = validateMarketHashName('   ');
      expect(res.status).toBe('empty');
      expect(res.isValid).toBe(false);
    });

    it('marks random gibberish as invalid', () => {
      const res = validateMarketHashName('superrandomgibberish12345');
      expect(res.status).toBe('invalid');
      expect(res.isValid).toBe(false);
      expect(res.errorReason).toBeDefined();
    });
  });

  describe('setWearInName helper', () => {
    it('replaces existing standard wear condition', () => {
      expect(setWearInName('AK-47 | Redline (Field-Tested)', 'FN')).toBe(
        'AK-47 | Redline (Factory New)',
      );
      expect(setWearInName('AWP | Dragon Lore (Battle-Scarred)', 'MW')).toBe(
        'AWP | Dragon Lore (Minimal Wear)',
      );
    });

    it('appends wear condition if name has pipe but no wear', () => {
      expect(setWearInName('M4A4 | Howl', 'FT')).toBe('M4A4 | Howl (Field-Tested)');
    });

    it('never appends or mutates wear on stickers or non-wear items', () => {
      expect(setWearInName('Sticker | Crown (Foil)', 'FN')).toBe('Sticker | Crown (Foil)');
      expect(setWearInName('Sticker | Titan (Holo) | Katowice 2014', 'BS')).toBe(
        'Sticker | Titan (Holo) | Katowice 2014',
      );
      expect(setWearInName('Recoil Case', 'FN')).toBe('Recoil Case');
    });
  });

  describe('isNonWearCs2Item helper', () => {
    it('correctly identifies vanilla knives and cases', () => {
      expect(isNonWearCs2Item('★ Karambit')).toBe(true);
      expect(isNonWearCs2Item('Dreams & Nightmares Case')).toBe(true);
      expect(isNonWearCs2Item('Sticker | Titan (Holo)')).toBe(true);
      expect(isNonWearCs2Item('AK-47 | Redline (Field-Tested)')).toBe(false);
    });
  });

  describe('searchCatalogSuggestions', () => {
    const catalog = [
      'AK-47 | Redline (Field-Tested)',
      'AK-47 | Vulcan (Factory New)',
      'AK-47 | Frontside Misty (Field-Tested)',
      'AWP | Asiimov (Field-Tested)',
      'AWP | Redline (Field-Tested)',
      '★ Karambit | Doppler (Factory New)',
    ];

    it('finds items by weapon prefix', () => {
      const matches = searchCatalogSuggestions('ak-47', catalog);
      expect(matches).toContain('AK-47 | Redline (Field-Tested)');
      expect(matches).toContain('AK-47 | Vulcan (Factory New)');
    });

    it('finds items by skin name keyword', () => {
      const matches = searchCatalogSuggestions('redline', catalog);
      expect(matches).toContain('AK-47 | Redline (Field-Tested)');
      expect(matches).toContain('AWP | Redline (Field-Tested)');
    });

    it('returns empty array for query length < 2', () => {
      expect(searchCatalogSuggestions('a', catalog)).toEqual([]);
    });
  });
});
