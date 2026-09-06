# AI Agent Guidelines — SkinOracle Electron Desktop App

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS:**
> This repository (`skin-oracle-saas/electron-app`) is released as **source-available for user trust and security auditing**.
> When making modifications, writing code, creating tests, or proposing changes, you MUST strictly adhere to the security boundaries, storage patterns, and pre-commit protocols detailed below.
> **NEVER** bypass these rules for convenience or speed.

---

## 1. Non-Negotiable Core Rules

### 🔒 Rule 1: Zero Hardcoded Secrets Policy
- **NEVER** hardcode API keys, bearer tokens, passwords, private seeds, private URLs, or real credentials anywhere in source code, documentation, or commit messages.
- **NEVER** commit secret `.env` files (e.g., `.env.local`, `.env.development`). Only public non-sensitive configurations belong in `.env.production` (such as public backend base URLs).
- **In Automated Tests:** Always use dynamically generated mock keypairs (e.g., `nacl.sign.keyPair()`) or synthetic dummy tokens (e.g., `'test-token-123'`). Never check in real API keys under the guise of testing.

### 🛡️ Rule 2: Credential Isolation & `safeStorage`
- All third-party marketplace API credentials (CSFloat, Skins.com, DMarket), market data aggregator keys (Skinsnipe, Pricempire, or other price data feeds), and SaaS authentication tokens must be stored using the encrypted store:
  ```typescript
  // ✅ ALWAYS use secureSet / secureGet from src/storage/secure-store.ts
  import { secureSet, secureGet, STORAGE_KEYS } from '../../storage/secure-store';
  secureSet(STORAGE_KEYS.CSFLOAT, apiKey);
  const key = secureGet(STORAGE_KEYS.CSFLOAT);
  ```
- **FORBIDDEN:** Never store API keys or tokens in `localStorage`, `sessionStorage`, cookies, unencrypted files, or plain memory variables accessible from the renderer process.
- **Why?** `secure-store.ts` utilizes Electron's OS-backed `safeStorage` (macOS Keychain, Windows DPAPI, Linux Secret Service) with POSIX `0o600` file permissions on `secure-keys.bin`.

### 🌐 Rule 3: Direct Marketplace & Market Data Provider Communication (Zero Backend Routing)
- Marketplace API requests (CSFloat, Skins.com, DMarket) and Market Data Provider / Price Aggregator requests (Skinsnipe, Pricempire, etc.) must execute **DIRECTLY** from the trader's machine/IP to the respective external API.
- **Marketplace and pricing provider credentials must NEVER be transmitted to the SaaS backend** (`saas-api`) or included in Oracle evaluation payloads.
- DMarket Ed25519 cryptographic signatures must be computed locally in the Node.js main process (`src/main/ipc/dmarket.ipc.ts`) using `tweetnacl`. Secret keys must never leave main process memory.

### 📡 Rule 4: SaaS Backend Communication via `saasAxios`
- **ALWAYS** use the pre-configured `saasAxios` client (`src/main/services/saasAxios.ts`) for all calls to our SaaS backend:
  ```typescript
  // ✅ CORRECT — auto-attaches JWT, x-app-version header, and handles 401/426
  import { saasAxios } from '../services/saasAxios';
  const res = await saasAxios.post('/oracle/evaluate', payload);
  ```
- **FORBIDDEN:** Never call SaaS endpoints using raw `fetch()` or vanilla `axios` instances. Doing so bypasses JWT injection, version enforcement, and automatic session handling.

### 🌉 Rule 5: Strict IPC & Preload Isolation
- `nodeIntegration` is `false`, `contextIsolation` is `true`, `webSecurity` is `true`.
- **NEVER** expose `ipcRenderer` directly to the renderer:
  ```typescript
  // ❌ FORBIDDEN
  contextBridge.exposeInMainWorld('ipc', ipcRenderer);

  // ✅ CORRECT — typed methods in src/main/preload.ts wrapped with safeInvoke
  contextBridge.exposeInMainWorld('electronAPI', {
    myFeature: {
      action: (args: ArgsType) => safeInvoke('myfeature:action', args),
    },
  });
  ```
- Every new IPC channel must be registered in `ipcMain.handle` in `src/main/ipc/` and typed in `preload.ts` and `src/shared/types.ts`.

### 🔗 Rule 6: Centralized Endpoint Management
- All API URLs must be declared in `src/main/constants/apiUrls.ts`.
- **NEVER** inline external URLs inside IPC handlers or UI components.

### 🌐 Rule 7: External Link Opening
- Renderer links must **NEVER** open in Electron renderer windows (`window.open` is forbidden).
- Always route external links through the IPC bridge via `window.electronAPI.app.openExternal(url)` to open in the user's default OS browser.

---

## 2. Architectural Boundaries (Client vs Backend)

Because this desktop app's source is publicly inspectable for trust verification, keep client and backend responsibilities strictly separated:

| Responsibility | Belongs in `electron-app` (Public Client) | Belongs in `saas-api` (Private Backend) |
|---|---|---|
| Marketplace & Aggregator API Keys | ✅ Stored locally in OS Keychain (`safeStorage`) | ❌ NEVER sent to or stored on backend |
| Buy Order Execution | ✅ Executed directly from user's machine & IP | ❌ No proxying or executing trader orders |
| Price Cache Aggregation | ✅ Fetched from Market Data Providers / Price Aggregators | ❌ Backend does not hold trader cache |
| SkinOracle Pricing Engine | ❌ Only receives evaluated prices | ✅ Proprietary valuation algorithms live here |
| User Balance & Billing | ❌ Rendered in UI, verified via JWT | ✅ Authoritative ledger and usage tracking |
| System Version Gating | ✅ Client checks and halts outdated builds | ✅ Backend rejects outdated versions (HTTP 426) |


---

## 3. Pre-Commit Verification Flow for AI Agents

Before submitting changes, creating a commit, or concluding a task in `electron-app`, execute this checklist:

1. **Static Typecheck:**
   ```bash
   cd skin-oracle-saas/electron-app
   npx tsc --noEmit
   ```
   *Must pass with 0 errors.*

2. **Automated Unit Tests:**
   ```bash
   npm run test
   ```
   *All vitest suites must pass.*

3. **Secret & Credential Scan:**
   Inspect your git diff before staging:
   ```bash
   git diff
   ```
   - Verify NO API keys, test secrets, or bearer tokens were left in code or fixtures.
   - Verify no new unencrypted storage keys were introduced.
   - Verify new URLs were routed to `src/main/constants/apiUrls.ts`.
   - Verify no internal operations guides, server IP addresses, or private VPS runbooks were staged.

4. **IPC Exposure Audit:**
   - Confirm no direct `ipcRenderer` or Node built-ins were leaked into renderer window context.

---

## 4. Documentation References

- [SECURITY.md](./SECURITY.md) — Security policy, controls overview, and responsible disclosure.
- [.agent/workflows/electron_security_guide.md](./.agent/workflows/electron_security_guide.md) — Deep technical guide and code patterns.
> *Note: Internal VPS deployment guides and server operations runbooks (e.g. `PRODUCTION_RELEASE_GUIDE.md`) are strictly gitignored to keep this public repository free of private infrastructure details.*
