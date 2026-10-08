# Skins.com Trading API — Reference for Agents

> Scope: this reference is only relevant when working on the Skins.com
> workstation (`src/renderer/screens/Skinscom/**`, `src/main/ipc/skinscom.ipc.ts`,
> the `Skins.com Endpoints` block in `src/main/constants/apiUrls.ts`). It is
> co-located with that code and is not part of the repo-wide agent instructions.
>
> **Read this file before touching the Skins.com workstation.** It records the
> real upstream API (base URL, auth, endpoints, payload shapes) so an agent can
> work against the source of truth instead of guessing.

## Source of truth

- Raw OpenAPI 3.1 spec, vendored into the repo for offline reference:
  [`skinscomtradingopenapi.json`](./skinscomtradingopenapi.json)
- Upstream URL: `https://trading-api.skins.com/openapi.json`
- Title/version: **Skins.com Trading API** `1.0.0`
- When the spec in this folder is stale, re-download it from the upstream URL
  above and replace the vendored file.

## Base URL & auth

- Base: `https://trading-api.skins.com` — declared once in
  `src/main/constants/apiUrls.ts` (`SKINSCOM_TRADING_API`).
- Auth: `Authorization: Bearer <API key>`.
  The key is created in the user's Skins.com account: **Profile > Developers**.
- The key is stored encrypted at rest via `STORAGE_KEYS.SKINSCOM` in
  `src/storage/secure-store.ts` and reached only from the Node.js main process.
- All requests fire **directly from the trader's machine/IP** to Skins.com.
  Never route Skins.com credentials or traffic through `saas-api`.

> **Do not confuse this with the legacy `https://api.skins.com/v1` buy-order
> API.** That integration was a placeholder for a different, not-yet-ready
> product and has been removed. The only supported Skins.com integration is the
> Trading API documented here.

## Domain model

The Trading API is a **deposit/listing** model, not a buy-order model:

1. `GET /trading/user/inventory` — **your** Steam CS2 inventory (items you can list).
2. `POST /trading/deposit` — deposit (list) your inventory items at a chosen price. This is how you create a listing.
3. `PATCH /trading/deposit/{deposit_id}` / `PATCH /trading/deposit/bulk` — reprice **your** listings.
4. `POST /trading/deposit/{deposit_id}/cancel` — cancel **your** listing.
5. Withdraw flow: bids, withdrawals, mark-as-received, disputes.

> **Critical distinction — `GET /trading/items` is the PUBLIC MARKETPLACE FEED.**
> It returns items **listed for sale by any depositor/seller**, not your own
> inventory and not (only) your own listings. Evidence: the description says
> *"Items listed for sale"* with a `per_page` of `1–200` **without an API key**
> (up to `2500` with one), and every `Listing` carries `depositor_stats`
> (delivery rate, Steam level, online status) — stats about *the seller*, which
> would be meaningless for your own item. The `id` on a `Listing` is that
> seller's deposit id. `PATCH`/`cancel` only succeed on deposit ids **you** own.
>
> **There is no "get my deposits" endpoint.** To manage your own active
> listings you must track the deposit ids returned by `POST /trading/deposit`
> (and updates from the websocket `new_item`/`deleted_item` events).

All monetary values are **USD cents** (integer). E.g. `16300` = `$163.00`.

## Operational constraints (read before polling)

- **Rate limit:** 120 requests / 60s per IP across *all* endpoints. Exceeding it
  returns HTTP `429` and locks the IP out for 60 seconds.
- **Repricing cooldown:** a listing price can be edited **once every 5 minutes**.
  Expect individual failures like `"You can edit the price again in 4 minutes"`.
  The bulk endpoint reports these per item in `data.failed[]`.
- **Prefer the websocket over polling.** socket.io v4 at
  `wss://trading-api.skins.com`, path `/s/`, namespace `/trade`. Get
  `socket_token` + `socket_signature` from `GET /metadata/socket`, connect with
  query `uid`/`token`, then `identify` if `init.authenticated` is false. Item
  events arrive as arrays.
- **MCP:** the same API is exposed at `https://trading-api.skins.com/mcp`
  (Streamable HTTP); each operation is a tool named after its operation id with
  `-` → `_` (e.g. `create-deposit` → `create_deposit`).
- **Paging:** the workstation's `fetchAll` pages at 550ms intervals and is
  capped at 40 pages (`per_page=100`) — 4000 listings — to stay within the rate
  budget.
- **Ordering pitfall:** `order` only supports `market_value`, so
  `sort=asc&order=market_value` returns the global cheapest listings first
  (1¢ stickers). Combined with a `price_min` floor this floods the page with
  identical cheap rows. Do **not** send `sort`/`order`; use the API's default
  (mixed/newest) order and sort client-side by closeness. `sort=desc` returns a
  `100000000` sentinel for many rows — avoid it.
- **`is_commodity` is the only category hint:** `is_commodity=no` drops
  stickers/cases/passes and returns weapons/skins; `yes` returns stickers and
  other commodities. There is no weapon-vs-sticker `category` param.

## Endpoints used by the workstation

| Method | Path | Purpose | IPC channel |
|---|---|---|---|
| `GET` | `/metadata/socket` | Account/user + short-lived socket token | `skinscom:get-metadata` |
| `GET` | `/trading/items` | **Public marketplace** listings for sale (all depositors), paginated | `skinscom:get-listed-items` |
| `GET` | `/trading/user/inventory` | Your Steam CS2 inventory | `skinscom:get-inventory` |
| `POST` | `/trading/deposit` | Create deposits (list your items), **max 20 items/request** | `skinscom:create-deposit` |
| `PATCH` | `/trading/deposit/{deposit_id}` | Update one of your listing prices | `skinscom:update-listing-price` |
| `PATCH` | `/trading/deposit/bulk` | Bulk update your listing prices, **max 20 items/request** | `skinscom:bulk-update-listing-prices` |
| `POST` | `/trading/deposit/{deposit_id}/cancel` | Cancel one of your listings | `skinscom:cancel-deposit` |
| `WS` | `wss://trading-api.skins.com` (`/trade`) | Live item feed: `new_item`, `updated_item`, `auction_update`, `deleted_item` | `skinscom:start-stream` / `skinscom:stop-stream` |

### Workstation status

- **Market Scan tab (implemented):** read-only scan of `GET /trading/items`,
  filtered by search/price/auction, compared against the Oracle **Buy Ceiling**
  (`acceptedPrice`) using the same closeness model as the CSFloat/DMarket So
  Close scanners (`closeness = market_price / buy_ceiling`; So Close when
  `closeness ≤ maxCloseness`, default `1.08`). No buy/sell/cancel — the feed is
  other sellers' items.
  - **No server-side category filter.** `/trading/items` only accepts
    `has_stickers` (whether an item *has* stickers applied, not that it *is* a
    sticker), `is_commodity`, wear/price/auction/sort — there is no
    weapon-vs-sticker-vs-case `category` param. The `item_search`
    (category/type/sub_type/rarity) field on `Listing` is **websocket-only**.
    So the tab classifies results client-side from `market_name` via
    `classifySkinscomItem` (weapon = `★` prefix or `<Weapon> | <Skin> (<Wear>)`;
    sticker = `Sticker |` prefix; everything else filtered out). Because the
    filter is client-side, scanning more pages may be needed to surface
    weapons/stickers when the cheapest listings are cases/graffiti.
- **Listings & Inventory tab (implemented):** Inventory view — `GET
  /trading/user/inventory`, per-item list price, single **List** and batch
  **List Selected** via `POST /trading/deposit` (chunked to the 20-item cap;
  items with a non-null `invalid` reason are disabled). Active Listings is
  **not** implemented (see below).
- **Events tab (implemented):** live, read-only feed driven by the Skins.com
  websocket. The main process owns the socket.io v4 connection
  (`src/main/services/skinscomSocket.ts`): it fetches `socket_token` /
  `socket_signature` from `GET /metadata/socket` with the API key, connects to
  namespace `/trade` (path `/s/`, query `uid`/`token`), emits `identify` when
  `init.authenticated` is false, subscribes via `allowedEvents`
  (`new_item`, `updated_item`, `auction_update`, `deleted_item`) and narrows
  with `filters` (`price_min`/`price_max`/`auction`). Events are broadcast to
  the renderer on `skinscom:stream-event` / `skinscom:stream-status`. The tab
  collapses events per **item identity** (`market_name` + exact float), not per
  deposit id — Skins.com assigns a new deposit id when an unsold auction is
  re-listed, so keying by id would stack the same item several times. Each entry
  tracks every deposit id it was seen under, the newest state wins, it is only
  dropped once all of its ids are deleted, and the card shows the latest id plus
  an `×N ids` badge when re-listings were merged. It matches listings against the
  Oracle Buy
  Ceiling with the same closeness/SSS filters as Market Scan, and tags each
  card NEW / UPDATED / AUCTION BID. `deleted_item` removes the card. The
  `socket.io-client` package is a production dependency and is externalized
  from the main bundle (see `vite.config.ts`) so Node resolves its `ws`-based
  Node transport rather than the browser one.
- **Future: Active Listings.** There is no "get my deposits" endpoint, so this
  view requires tracking deposit ids locally from `POST /trading/deposit`
  responses and the websocket `new_item`/`deleted_item` events, then managing
  them via `PATCH /trading/deposit/{id}` and
  `POST /trading/deposit/{id}/cancel`. The IPC channels already exist.

The spec also defines a buy (withdraw) and a place-bid endpoint. No
buy/bid/withdraw UI or IPC is wired yet — those actions are deferred pending
explicit approval.

### ⚠️ Why Listings & Inventory is hidden in production

The tab is gated by `FEATURE_FLAGS.SKINSCOM_LISTINGS` (see
`src/shared/featureFlags.ts`): visible in development, hidden in production.

**Blocker: the API cannot report listing/sale status for your own items.**

- There is **no "get my deposits" endpoint** — `GET /trading/items` is the
  market-wide feed, not scoped to your account.
- `GET /trading/user/inventory` exposes **no listing flag**: verified live that
  an already-listed item still returns `invalid: null`, `trade_exists: false`,
  `tradable: true` (Skins.com keeps the item in Steam inventory until it sells).
- `GET /trading/deposit/status/{tracking_code}` only reports deposit
  *creation* (`processing | completed | failed`) and yields `deposit_id`; it
  says nothing about whether the listing sold or is still active.
- `GET /trading/deposit/{id}/stats` returns buyer-facing **depositor** stats,
  not listing status.

So a "LISTED vs UNLISTED" (and sold) indicator cannot be built from REST. The
only signal is a **live websocket session** (`new_item` / `deleted_item`) while
the app runs — with no persistence across restarts, so it would go stale (a
sold item would remain "LISTED" forever if cached locally). Do **not** add a
local-storage workaround. Re-enable the flag only when a reliable status source
exists.

Additional endpoints present in the spec (not yet wired): deposit status,
cancel-multiple, sell-now, mark-as-sent, depositor stats, withdrawal, place-bid,
mark-as-received, dispute.

## Payload shapes

### `GET /trading/items` → `ListedItemsResponse`

Paginated Laravel-style envelope. The useful field is `data: Listing[]`.

`Listing` (key fields):

| Field | Type | Notes |
|---|---|---|
| `id` | integer | Deposit id (used for reprice/cancel). |
| `market_name` | string | Market hash name. |
| `market_value` | integer | Current listing price, USD cents. |
| `purchase_price` | integer | Price a buyer pays now (bid for auctions). |
| `suggested_price` | integer\|null | Skins.com recommended price, USD cents. |
| `above_recommended_price` | number | Percent above (+) / below (-) suggested. |
| `price_is_unreliable` | boolean | Suggested price confidence flag. |
| `is_commodity` | boolean | Commodity listing. |
| `icon_url` | string | Steam economy image hash — prefix with `https://community.cloudflare.steamstatic.com/economy/image/`. |
| `wear` / `wear_name` | number\|null / string\|null | Float / wear bucket. |
| `stickers` | `Sticker[]` | `{ sticker_id, wear, name, image }`. |
| `auction_ends_at` | string\|null | Null for fixed-price listings. |
| `published_at` | string | ISO 8601. |
| `depositor_stats` | `DepositorStats` | Delivery rate/online status. |

Query params: `per_page`, `page`, `auction`, `sort`, `order`, `search`,
`price_min`, `price_max`, `price_max_above`, `wear_min`, `wear_max`,
`has_stickers`, `is_commodity`.

### `GET /trading/user/inventory` → `InventoryResponse`

`{ success, updatedAt (unix s), allowUpdate, data: InventoryItem[] }`.

`InventoryItem` key fields: `id` (deposit id), `asset_id`, `market_name`,
`market_value`, `suggested_price`, `icon_url`, `wear`, `stickers`,
`is_commodity`, `tradable`, `tradelock`, `trade_exists`, `invalid`
(non-null = reason it cannot be deposited).

### `POST /trading/deposit` — request

```json
{ "items": [ { "id": 123, "asset_id": 123, "coin_value": 16300 } ] }
```

`coin_value` is required (USD cents). `items` max 20 per request.
Response: `{ success: true, data: [ { item_id, tracking_code, tracking_expires_at, asset_id } ] }`.

### `PATCH /trading/deposit/{deposit_id}` — request

```json
{ "coin_value": 15990 }
```

Response: `{ success: true }`. Repricing is **rate limited per listing** —
a listing price can be edited once every 5 minutes, so expect failures like
`"You can edit the price again in 4 minutes"`.

### `PATCH /trading/deposit/bulk` — request

```json
{ "items": [ { "id": 288775415, "coin_value": 15990 } ] }
```

`items` max 20 per request. Response:

```json
{
  "success": true,
  "data": {
    "summary": { "attempted": 3, "updated": 1, "unchanged": 1, "failed": 1 },
    "updated":   [ { "index": 0, "id": 288775415, "old_price": 16300, "new_price": 15990 } ],
    "unchanged": [ { "index": 1, "id": 288775416 } ],
    "failed":    [ { "index": 2, "id": 288775417, "error": "You can edit the price again in 4 minutes" } ]
  }
}
```

> The worker must chunk selected items into batches of **20** because the bulk
> endpoint rejects larger payloads (`422 ValidationError`).

## Architecture rules (also enforced by the repo AGENTS.md)

- Endpoints live only in `src/main/constants/apiUrls.ts`; never inline URLs in
  IPC handlers or UI components.
- IPC is bridged through typed `safeInvoke` wrappers in `src/main/preload.ts`
  and typed in `src/shared/types/electron-api.types.ts`.
- Secrets are read with `secureGet(STORAGE_KEYS.SKINSCOM)` in the main process
  only; never expose the key to the renderer.
- UI tone follows the institutional-trader style guide; listing prices are
  qualified as **Listing Prices (Sell Targets)**.
