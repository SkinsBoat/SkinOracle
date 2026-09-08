import { describe, it, expect } from 'vitest';
import { formatCsfloatItemName, getCsfloatSearchUrl } from '../csfloatUrls';

describe('formatCsfloatItemName', () => {
  it('correctly handles knives with StatTrak placing ★ first and eliminating duplicate spaces', () => {
    // Malformed input with StatTrak before star and double space
    const malformed = 'StatTrak™ ★  Kukri Knife | Urban Masked (Minimal Wear)';
    expect(formatCsfloatItemName(malformed)).toBe('★ StatTrak™ Kukri Knife | Urban Masked (Minimal Wear)');

    // Correct input stays canonical
    const canonical = '★ StatTrak™ Kukri Knife | Urban Masked (Minimal Wear)';
    expect(formatCsfloatItemName(canonical)).toBe('★ StatTrak™ Kukri Knife | Urban Masked (Minimal Wear)');
  });

  it('correctly formats non-StatTrak knives', () => {
    const knife = '★ Butterfly Knife | Doppler (Factory New)';
    expect(formatCsfloatItemName(knife)).toBe('★ Butterfly Knife | Doppler (Factory New)');
  });

  it('correctly formats normal weapons with StatTrak', () => {
    const stGun = 'StatTrak™ AK-47 | Redline (Field-Tested)';
    expect(formatCsfloatItemName(stGun)).toBe('StatTrak™ AK-47 | Redline (Field-Tested)');
  });

  it('adds parentheses around wear when missing', () => {
    const unparenthesized = 'AK-47 | Redline Field-Tested';
    expect(formatCsfloatItemName(unparenthesized)).toBe('AK-47 | Redline (Field-Tested)');
  });

  it('correctly handles Souvenir weapons', () => {
    const souvenir = 'Souvenir AWP | Desert Hydra (Factory New)';
    expect(formatCsfloatItemName(souvenir)).toBe('Souvenir AWP | Desert Hydra (Factory New)');
  });
});

describe('getCsfloatSearchUrl', () => {
  it('generates the working URL matching CSFloat requirements', () => {
    const input = 'StatTrak™ ★  Kukri Knife | Urban Masked (Minimal Wear)';
    const url = getCsfloatSearchUrl(input);

    expect(url).toBe(
      'https://csfloat.com/search?market_hash_name=%E2%98%85%20StatTrak%E2%84%A2%20Kukri%20Knife%20%7C%20Urban%20Masked%20(Minimal%20Wear)&sort_by=lowest_price'
    );
  });
});
