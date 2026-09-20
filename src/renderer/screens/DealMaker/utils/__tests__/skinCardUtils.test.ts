import { describe, it, expect } from 'vitest';
import {
  parseSkinHashName,
  getWearShort,
  getWearColors,
} from '../skinCardUtils';

describe('skinCardUtils', () => {
  describe('getWearShort', () => {
    it('normalizes various wear names correctly', () => {
      expect(getWearShort('Factory New')).toBe('FN');
      expect(getWearShort('Minimal Wear')).toBe('MW');
      expect(getWearShort('Field-Tested')).toBe('FT');
      expect(getWearShort('Well-Worn')).toBe('WW');
      expect(getWearShort('Battle-Scarred')).toBe('BS');
      expect(getWearShort('FT')).toBe('FT');
      expect(getWearShort(undefined)).toBeNull();
    });
  });

  describe('getWearColors', () => {
    it('returns appropriate color palettes', () => {
      expect(getWearColors('FN').text).toBe('#4ade80');
      expect(getWearColors('MW').text).toBe('#38bdf8');
      expect(getWearColors('FT').text).toBe('#fbbf24');
      expect(getWearColors('WW').text).toBe('#fb923c');
      expect(getWearColors('BS').text).toBe('#f87171');
      expect(getWearColors(null).text).toBe('#cbd5e1');
    });
  });

  describe('parseSkinHashName', () => {
    it('parses standard weapon and pattern with wear in name', () => {
      const parsed = parseSkinHashName(
        'StatTrak™ AK-47 | Case Hardened (Field-Tested)',
      );
      expect(parsed.isStatTrak).toBe(true);
      expect(parsed.isKnifeOrGloves).toBe(false);
      expect(parsed.weapon).toBe('AK-47');
      expect(parsed.pattern).toBe('Case Hardened');
      expect(parsed.wear).toBe('Field-Tested');
      expect(parsed.shortWear).toBe('FT');
    });

    it('parses knife with star prefix', () => {
      const parsed = parseSkinHashName('★ Karambit | Doppler (Factory New)');
      expect(parsed.isKnifeOrGloves).toBe(true);
      expect(parsed.weapon).toBe('Karambit');
      expect(parsed.pattern).toBe('Doppler');
      expect(parsed.shortWear).toBe('FN');
    });

    it('parses items without pattern like cases or stickers', () => {
      const parsedCase = parseSkinHashName('Recoil Case');
      expect(parsedCase.weapon).toBe('Recoil Case');
      expect(parsedCase.pattern).toBe('');
      expect(parsedCase.wear).toBeNull();
      expect(parsedCase.shortWear).toBeNull();

      const parsedSticker = parseSkinHashName(
        'Sticker | Team Liquid (Holo) | Katowice 2019',
      );
      expect(parsedSticker.weapon).toBe('Sticker');
      expect(parsedSticker.pattern).toBe('Team Liquid (Holo) | Katowice 2019');
    });

    it('respects rawWear prop when name has no wear suffix', () => {
      const parsed = parseSkinHashName('AWP | Asiimov', 'Field-Tested');
      expect(parsed.weapon).toBe('AWP');
      expect(parsed.pattern).toBe('Asiimov');
      expect(parsed.wear).toBe('Field-Tested');
      expect(parsed.shortWear).toBe('FT');
    });
  });
});
