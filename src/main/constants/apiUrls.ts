// ─────────────────────────────────────────────────────────────────
// Centralized API URLs & Route Constants
//
// Clean, modular endpoint constants for all external market integrations
// (CSFloat, Skins.com, Skinsnipe) and local SaaS API services.
// ─────────────────────────────────────────────────────────────────

// Base API Roots
export const CSFLOAT_API = 'https://csfloat.com/api/v1';
export const SKINSCOM_API = 'https://api.skins.com/v1';
export const SKINSNIPE_API = 'https://pricing.tradeupspy.com/public';
export const DMARKET_API = 'https://api.dmarket.com';
export const DMARKET_CS2_GAME_ID = 'a8db';

const isProd = process.env.NODE_ENV === 'production' || !process.env.VITE_DEV_SERVER_URL;

export const SAAS_API =
  process.env.SAAS_API_URL ||
  (isProd ? 'https://saas.skinsboat.com/api/v1' : 'http://localhost:3100/api/v1');

// ── CSFloat Endpoints ─────────────────────────────────────────────
export const CSFLOAT_ME = `${CSFLOAT_API}/me`;
export const CSFLOAT_BUY_ORDERS = `${CSFLOAT_API}/buy-orders`;
export const CSFLOAT_ME_BUY_ORDERS = `${CSFLOAT_API}/me/buy-orders`;
export const CSFLOAT_BUY_ORDER_BY_ID = (orderId: string) => `${CSFLOAT_API}/buy-orders/${orderId}`;
export const CSFLOAT_ME_INVENTORY = `${CSFLOAT_API}/me/inventory`;
export const CSFLOAT_LISTINGS = `${CSFLOAT_API}/listings`;
export const CSFLOAT_LISTING_BY_ID = (listingId: string) => `${CSFLOAT_API}/listings/${listingId}`;


// ── Skins.com Endpoints ───────────────────────────────────────────
export const SKINSCOM_BUY_ORDERS = `${SKINSCOM_API}/buy-orders`;
export const SKINSCOM_BUY_ORDER_BY_ID = (orderId: string) => `${SKINSCOM_API}/buy-orders/${orderId}`;

// ── Skinsnipe Endpoints ───────────────────────────────────────────
export const SKINSNIPE_LOWEST_PRICES = `${SKINSNIPE_API}/lowest-prices`;

// ── DMarket Endpoints ─────────────────────────────────────────────
export const DMARKET_USER_PROFILE = `${DMARKET_API}/account/v1/user`;
export const DMARKET_USER_BALANCE = `${DMARKET_API}/account/v1/balance`;
export const DMARKET_USER_TARGETS = `${DMARKET_API}/marketplace-api/v2/user/targets`;
export const DMARKET_CREATE_TARGETS = `${DMARKET_API}/marketplace-api/v1/user-targets/create`;
export const DMARKET_DELETE_TARGETS = `${DMARKET_API}/marketplace-api/v1/user-targets/delete`;
export const DMARKET_CLOSED_TARGETS = `${DMARKET_API}/marketplace-api/v1/user-targets/closed`;
export const DMARKET_TARGETS_BY_TITLE = (gameId: string, title: string) =>
  `${DMARKET_API}/marketplace-api/v1/targets-by-title/${gameId}/${encodeURIComponent(title)}`;
export const DMARKET_AGGREGATED_PRICES = `${DMARKET_API}/marketplace-api/v1/aggregated-prices`;

// ── SaaS Auth Endpoints ───────────────────────────────────────────
export const SAAS_AUTH_REGISTER = `${SAAS_API}/auth/register`;
export const SAAS_AUTH_VERIFY = `${SAAS_API}/auth/verify`;
export const SAAS_APP_VERSION_CHECK = `${SAAS_API}/app/version-check`;
