# Security Policy — SkinOracle Electron Desktop App

> **Notice for Developers and AI Agents:**
> Review [AGENTS.md](./AGENTS.md) and [.agent/workflows/electron_security_guide.md](./.agent/workflows/electron_security_guide.md) before contributing code.
> All code must adhere to strict zero-secret guidelines and open-source readiness standards.

---

## 1. Core Security Architecture

The SkinOracle Desktop App is engineered with a **zero-trust, local-first credential model**:

1. **Hardware / OS-Level Secret Encryption (`safeStorage`)**:
   - Marketplace API keys (CSFloat, Skins.com, DMarket), Market Data Provider / Price Aggregator keys (Skinsnipe, Pricempire, etc.), and SaaS JWTs are stored in `secure-keys.bin` inside `userData`.
   - Keys are encrypted using Electron's `safeStorage` (backed by macOS Keychain, Windows DPAPI, or Linux Secret Service / Keytar).
   - Storage file permissions are restricted to POSIX mode `0o600` (user read/write only).
2. **Zero Backend Routing of Credentials**:
   - Third-party marketplace and pricing provider credentials never leave the user's local device and are **never** transmitted to or stored on the SaaS backend.
   - All marketplace interactions, buy orders, and pricing aggregator queries fire directly from the user's IP to the external service.
3. **In-Memory Ed25519 Cryptographic Signing**:
   - DMarket HMAC/Ed25519 request signatures are computed strictly inside Node.js main process memory using `tweetnacl`. Secret keys never reach the renderer or any network payload.
4. **Renderer Hardening & Context Isolation**:
   - `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`.
   - IPC communication is strictly typed and routed through `preload.ts` using `safeInvoke`. Direct `ipcRenderer` access is disabled.
   - External links open exclusively in the user's default OS browser via `shell.openExternal`.

---

## 2. Quick Reference

| Do This | Never Do This |
|---|---|
| Store keys with `secureSet()` via `safeStorage` | Store keys in `localStorage`, cookies, or hardcode them |
| Call SaaS API via `saasAxios` | Call SaaS API with raw `fetch` or vanilla `axios` |
| Route IPC channels through `preload.ts` contextBridge | Expose `ipcRenderer` or Node built-ins to the renderer |
| Define all endpoints in `src/main/constants/apiUrls.ts` | Inline URLs inside IPC handlers or UI components |
| Open links via `app.openExternal` IPC | Use `window.open()` in the renderer |
| Use mock keypairs in tests (`nacl.sign.keyPair()`) | Check in or commit real API keys / credentials in tests |

---

## 3. Security Status

| Control | Implementation File | Status |
|---|---|---|
| OS-level key encryption (`safeStorage`) | `src/storage/secure-store.ts` | ✅ Active (Keychain / DPAPI / Secret Service) |
| Local POSIX file mode (`0o600`) | `src/storage/secure-store.ts` | ✅ Active |
| DMarket In-Memory Ed25519 Signing | `src/main/ipc/dmarket.ipc.ts` | ✅ Active (tweetnacl detached signatures) |
| JWT + Version header on SaaS calls | `src/main/services/saasAxios.ts` | ✅ Active |
| Context isolation + No node integration | `src/main/main.ts` | ✅ Active |
| DevTools disabled in production | `src/main/main.ts` | ✅ Active |
| Production JS Obfuscation | `vite.config.ts` | ✅ Active |
| Version gating + offline enforcement | `src/main/services/versionGate.ts` | ✅ Active |
| Code signing | `package.json` | ⚠️ Pending (EV cert / Apple Dev ID) |

---

## 4. Open-Source Readiness & Boundaries

If this application is published as open source:
- **Client Independence:** The client repository must never contain proprietary backend pricing algorithms, backend database seeds, or private SaaS secrets.
- **Environment Separation:** `.env.production` contains only public endpoint pointers (e.g. `SAAS_API_URL`). Never store private secrets in `.env` files.
- **Git Hygiene:** Local configuration files (`.env.local`, `secure-keys.bin`, `*.pem`) must be ignored by `.gitignore`.

---

## 5. Reporting a Security Vulnerability

If you discover a potential security issue or vulnerability within this desktop application:
1. Please do **NOT** open a public GitHub issue.
2. Email security findings directly to the team: **`security@skinoracle.app`** or open a confidential security advisory.
3. Include detailed steps to reproduce the issue and affected operating systems.
