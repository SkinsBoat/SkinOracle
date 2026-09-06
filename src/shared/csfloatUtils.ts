/**
 * CSFloat Buy Order Price Increments (from CSFloat official rules):
 * Below $5 ($0.01 - $4.99): $0.01 increment (1 cent)
 * $5 - $10 ($5.00 - $9.99): $0.05 increment (5 cents)
 * $10 - $100 ($10.00 - $99.99): $0.10 increment (10 cents)
 * $100 - $500 ($100.00 - $499.99): $1.00 increment (100 cents)
 * $500 - $1,000 ($500.00 - $999.99): $5.00 increment (500 cents)
 * Above $1,000 ($1,000.00+): $10.00 increment (1,000 cents)
 */

export function getCsFloatIncrementInCents(cents: number): number {
  if (cents < 500) return 1;
  if (cents < 1000) return 5;
  if (cents < 10000) return 10;
  if (cents < 50000) return 100;
  if (cents < 100000) return 500;
  return 1000;
}

export function snapCsFloatBuyOrderPriceCents(maxPriceCents: number): number {
  const cents = Math.round(maxPriceCents);
  if (cents <= 0) return cents;

  const step = getCsFloatIncrementInCents(cents);
  return Math.floor(cents / step) * step;
}

export function roundToCsFloatStep(price: number): number {
  if (!price || isNaN(price) || price <= 0) return 0;
  const totalCents = Math.round(price * 100);
  const snappedCents = snapCsFloatBuyOrderPriceCents(totalCents);
  return Number((snappedCents / 100).toFixed(2));
}
