---
description: Comprehensive security guidelines and architectural patterns for the Electron app
---

# SkinOracle Electron App — Security Guide for AI Agents & Developers
> **Read this before writing any new code for the Electron app.**
> Repository: `oracle-electron-app.git` | Path: `skin-oracle-saas/electron-app/`

---

## 🏗️ Architecture Overview (Security-Relevant)

```
User Device                        SaaS Backend (saas.skinsboat.com)
──────────────────────────         ─────────────────────────────────
Renderer (React)                   NestJS API
  │  contextIsolation: true
  │  nodeIntegration: false
  ▼
Preload (contextBridge only)       All routes → JWT required
  │                                All routes → x-app-version validated (HTTP 426)
  ▼
Main Process (Node.js)
  │
  ├── safeStorage → API keys encrypted by OS (Keychain / DPAPI / Secret Service)
  ├── saasAxios  → auto-attaches JWT + x-app-version header
  └── Marketplace APIs called DIRECTLY from user's machine
        (CSFloat, Skins.com, Skinsnipe, DMarket — using user's own keys)
        These NEVER route through the SaaS backend.
```

**Critical principle:** The SaaS backend never sees marketplace API keys. Marketplace requests go from the user's machine directly to CSFloat/Skins.com/Skinsnipe/DMarket using the user's own credentials.

---

## ✅ Established Security Patterns — Always Follow These

### 1. Storing Secrets / Keys / Tokens
**Always use `secureSet` / `secureGet` from `src/storage/secure-store.ts`.**

```typescript
// ✅ CORRECT — OS-encrypted storage
import { secureSet, secureGet, STORAGE_KEYS } from '../../storage/secure-store';
secureSet(STORAGE_KEYS.CSFLOAT, apiKey);
const key = secureGet(STORAGE_KEYS.CSFLOAT);

// ❌ NEVER DO THIS — never store secrets in plain variables, localStorage, or hardcode them
const API_KEY = "sk-abc123";
localStorage.setItem('api_key', key);
```

**Adding a new key type?**
1. Add it to `STORAGE_KEYS` in `secure-store.ts`
2. Add `ipcMain.handle` set/get/revoke handlers in `secure-store.ts`
3. Expose via `preload.ts` contextBridge
4. Never transmit it to the SaaS backend

---

### 2. Making API Calls to the SaaS Backend
**Always use `saasAxios` from `src/main/services/saasAxios.ts`.**

```typescript
// ✅ CORRECT — auto-attaches JWT + x-app-version
import { saasAxios } from '../services/saasAxios';
const res = await saasAxios.get('/some-route');

// ❌ NEVER use raw fetch/axios for SaaS API calls — JWT and version header won't be attached
const res = await fetch('https://saas.skinsboat.com/api/v1/some-route');
```

---

### 3. Adding New IPC Channels
**All IPC must go through the contextBridge in `preload.ts`. Never expose raw ipcRenderer.**

```typescript
// ✅ CORRECT pattern in preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  myFeature: {
    doThing: (param: string) => safeInvoke('myfeature:do-thing', param),
  }
});

// ❌ NEVER expose ipcRenderer directly
contextBridge.exposeInMainWorld('ipc', ipcRenderer); // FORBIDDEN
```

**Rule:** One `ipcMain.handle` in main → one typed function in contextBridge. Never skip the bridge.

---

### 4. Adding New API URL Constants
**All URLs go in `src/main/constants/apiUrls.ts`. Never hardcode URLs inline.**

```typescript
// ✅ CORRECT — centralized in apiUrls.ts
import { CSFLOAT_BUY_ORDERS } from '../constants/apiUrls';

// ❌ NEVER inline URLs in IPC handlers or services
const res = await axios.get('https://csfloat.com/api/v1/buy-orders');
```

**For any new SaaS endpoint, derive it from `SAAS_API`:**
```typescript
export const SAAS_NEW_FEATURE = `${SAAS_API}/new-feature`;
```

---

### 5. Opening External Links
**Never use `window.open()` or `<a href target="_blank">` in the renderer. Always use the IPC bridge.**

```typescript
// ✅ CORRECT — opens in user's default browser, not in Electron
window.electronAPI.app.openExternal(url);

// ❌ NEVER open links inside Electron's renderer
window.open('https://example.com');
```

---

### 6. Environment Variables
- **Dev** → `.env` or `.env.development` (auto-loaded by Vite, gitignored)
- **Production** → `.env.production` (committed, contains non-secret URLs only)
- **Secrets** → Never in `.env` files for Electron. Use `secureSet` instead.
- `SAAS_API_URL` is required in prod — set in `.env.production` ✅ already done

---

### 7. Cryptographic Signing in Memory (DMarket Pattern)
**All request signing (such as DMarket Ed25519) must be computed strictly in main process memory via `tweetnacl`.**
- Never transmit secret signing keys over IPC to the renderer.
- Never pass secret signing keys to the backend.
- Use detached signatures (`nacl.sign.detached`) and hex formatting in main process.

---

## 🚫 Patterns That Are Forbidden

| Pattern | Why It's Forbidden |
|---|---|
| `nodeIntegration: true` | Gives renderer full Node.js access — XSS becomes RCE |
| `contextIsolation: false` | Renderer can access Electron internals |
| `webSecurity: false` | Disables CORS and same-origin policy |
| Hardcoded API keys/secrets | Baked into binary, git history, or leaked in open-source |
| Raw `fetch` to SaaS API | Skips JWT auth and version header |
| `localStorage` for secrets | Unencrypted, accessible from renderer XSS |
| Inline external URLs in handlers | Bypasses centralized URL management |
| Skipping `safeInvoke` in preload | Raw IPC errors leak Electron internal stack traces |

---

## 🛡️ Security Controls Already in Place (Don't Remove)

| Control | File | What It Does |
|---|---|---|
| JS Obfuscation | `vite.config.ts` | RC4+base64 string encoding, control flow flattening, self-defending — production only |
| DevTools disabled | `main.ts` lines 36, 54–58 | `devTools: isDev` + force-closes if triggered |
| Version gate | `src/main/services/versionGate.ts` | Blocks old versions; persists block locally to defeat offline bypass |
| Backend version guard | `saasAxios.ts` + NestJS | HTTP 426 on blocked `x-app-version` — bypass even via raw clients |
| safeStorage | `src/storage/secure-store.ts` | OS-level key encryption with 0o600 file permissions |
| DMarket In-Memory Signing | `src/main/ipc/dmarket.ipc.ts` | Ed25519 detached signatures without exposing secret key |
| Fail-closed only when previously blocked | `versionGate.ts` | Only enforces block when server previously confirmed it — normal users always fail-open |
| Encryption fallback warning | `secure-store.ts` + `App.tsx` | Console warn + in-app banner if OS encryption unavailable |

---

## 📋 Pre-Commit & Verification Checklist for AI Agents

Before submitting new Electron code or committing changes:

- [ ] Consult [AGENTS.md](../../AGENTS.md) for non-negotiable rules.
- [ ] API keys / tokens stored via `secureSet`, never in `localStorage` or variables.
- [ ] SaaS API calls use `saasAxios`, not raw fetch/axios.
- [ ] New IPC channels registered in `ipcMain.handle` **and** exposed via `preload.ts` contextBridge.
- [ ] External URLs declared in `src/main/constants/apiUrls.ts`, not inlined.
- [ ] External links opened using `app.openExternal` via IPC bridge.
- [ ] No `nodeIntegration: true`, `contextIsolation: false`, or `webSecurity: false` anywhere.
- [ ] Zero secrets in `.env.production` or commit diff (run `git diff` to verify).
- [ ] Typecheck passes: `npx tsc --noEmit`
- [ ] Tests pass: `npm run test`

---

## ⚠️ One Remaining Gap — Code Signing

The app is **not code-signed** yet. This means:
- Windows: SmartScreen "Unknown Publisher" on install
- macOS: Gatekeeper blocks the app

**When you are asked to help with release/publish tasks**, remind the user that code signing is pending and they should obtain:
- Windows EV certificate → add `certificateFile` to `package.json` build config
- Apple Developer ID → add `identity` to `package.json` mac config

---

*Last updated: 2026-09-06 | Aligned with Open-Source Readiness and AGENTS.md*
