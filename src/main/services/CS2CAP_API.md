# CS2Cap API — Used Endpoints & Upstream References

> Scope: this reference is only relevant when working on the CS2Cap pricing
> integration (`src/main/ipc/cs2cap.ipc.ts`, `src/main/services/cs2capParser.ts`,
> `src/shared/cs2capProviders.ts`). It is intentionally co-located with that code
> and is not part of the repo-wide agent instructions.

CS2Cap is our market-data pricing provider. This file records the endpoints we
actually use, the provider-key rules, and where the upstream documentation lives
so any agent can verify behavior against the source of truth instead of guessing.

## Upstream documentation (source of truth)

```bash
# Read-only clone (outside the repo working tree):
git clone git@github.com:CS2Cap/docs.git /tmp/kilo/cs2cap-docs
# HTTPS fallback:
git clone https://github.com/CS2Cap/docs.git /tmp/kilo/cs2cap-docs
```

Most useful files in that repo:

| File | Contents |
|---|---|
| `openapi.json` | Full OpenAPI spec, including the `AllProviders` enum. |
| `api-reference/prices.mdx` | `POST /prices` (stream) and `GET /prices` parameter docs. |
| `reference/providers.mdx` | Provider catalog, market types, feature/health fields. |
| `authentication.mdx` | API key / Bearer auth. |

## Base URL & auth

- Base: `https://api.cs2c.app/v1` — declared once in `src/main/constants/apiUrls.ts` (`CS2CAP_API`).
- Auth: `Authorization: Bearer <CS2Cap API key>` (encrypted at rest via `STORAGE_KEYS.CS2CAP` in `src/storage/secure-store.ts`).
- Streaming tiers: Pro / Quant.

## Endpoint we use: `POST /v1/prices` (`streamFullPricesSnapshot`)

Streams the full live price catalog as NDJSON (one JSON object per line). The
snapshot is captured once at request start, then streamed in full.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `providers` | `string[]` (repeatable) | Restrict to provider keys, e.g. `providers=steam&providers=buff163`. **If omitted, ALL providers are included.** |
| `exclude_stale` | `boolean` (default `false`) | Drop listings missing from the provider's most recent scan. We do not currently send this. |

**Limits**

- Rolling 24h quota of successful stream starts: 50/day (Pro), 300/day (Quant).
- One active stream per API key (HTTP `409` with `Retry-After` otherwise).

**Response line fields** (NDJSON, one object per line)

`provider`, `item_id`, `market_hash_name`, `phase`, `lowest_ask` (cents),
`quantity`, `link`, `url`, `timestamp`, `last_updated`, `stale`.

> Note: `lowest_ask` is in **cents** (e.g. `3460` = `$34.60`). `stale` marks a
> listing absent from the provider's most recent scan; the parser currently
> ignores it.

## Provider keys

- The upstream `AllProviders` enum has **41** keys.
- We support **39** (`src/shared/cs2capProviders.ts`). The two deliberately
  excluded keys are `csgo500` and `csgoempire` — they are gambling platforms,
  not skin marketplaces.
- They are hard-blocked in `src/shared/canonicalMarkets.ts`
  (`BLOCKED_MARKET_IDS` / `isBlockedMarket`) and stripped by
  `src/main/services/cs2capParser.ts` even if the server returns them.

### Rule: always send an explicit `providers` list

Because an omitted `providers` param streams **all** providers (including the
blocked gambling keys), the client must always send the explicit vetted list.
`buildCs2CapStreamUrl()` enforces this:

- Sends the requested keys (validated against `CS2CAP_PROVIDERS`).
- Falls back to `DEFAULT_CS2CAP_PROVIDERS` when no list is supplied.
- Throws if a list is supplied but none of its entries are valid, rather than
  silently fetching the full server catalog.

Do not reintroduce the old "only send when a strict subset is selected" logic.

## Other endpoints available (currently unused)

`POST /prices/batch`, `GET /prices`, `GET /providers`, `/bids`, `/sales`,
`/catalog`, `/market/analytics`, `/inventory`, `/portfolio`, `/feed`.

## Code map

| Concern | Location |
|---|---|
| Stream IPC handler + cycle | `src/main/ipc/cs2cap.ipc.ts` |
| NDJSON parsing, URL builder, provider filter | `src/main/services/cs2capParser.ts` |
| Vetted provider catalog | `src/shared/cs2capProviders.ts` |
| Canonical IDs + blocked markets | `src/shared/canonicalMarkets.ts` |
| Endpoint constants | `src/main/constants/apiUrls.ts` |

When adding a CS2Cap endpoint: add its URL to `apiUrls.ts`, type it in
`src/shared/types`, wire it through `preload.ts`, and update this file.
