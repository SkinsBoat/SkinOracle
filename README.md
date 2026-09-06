# SkinOracle Desktop

> Source-available desktop workstation built with Electron, React, and TypeScript for Counter-Strike 2 marketplace integration and order management.

[![License](https://img.shields.io/badge/License-Source--Available-orange.svg)](./LICENSE)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](./SECURITY.md)
[![AI Guidelines](https://img.shields.io/badge/AI%20Directives-AGENTS.md-green.svg)](./AGENTS.md)

---

## Technical Highlights

- **Local Credential Encryption:** API keys and access tokens are encrypted locally using OS-level hardware credentials (`safeStorage` via Keychain on macOS, DPAPI on Windows, Secret Service on Linux).
- **Direct API Execution:** All market interactions and buy orders fire directly from the user's local IP address without intermediate traffic proxying.
- **Modular Data Ingestion:** Pluggable adapter architecture for integrating with diverse market data providers and price aggregators.
- **In-Memory Request Signing:** Cryptographic request signing (e.g., Ed25519) computed entirely in-memory within the Node.js main process.
- **Hardened Electron Runtime:** Strictly isolated renderer (`nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`) with typed IPC context bridges.

---

## Supported Integrations

1. **Marketplace Execution Workstations:** Direct order and target management (CSFloat, DMarket, Skins.com).
2. **Market Data & Price Aggregators:** Real-time listing feeds and cross-market price caches (e.g., Skinsnipe and supported feeds).

---

## Building from Source (Audit & Verification)

This repository is published for source transparency and independent security auditing. To verify and compile standalone application packages locally:

### Prerequisites
- Node.js (>= 20.x)
- npm

### Build Commands
```bash
# 1. Clone the repository
git clone https://github.com/SkinsBoat/SkinOracle.git
cd SkinOracle

# 2. Install dependencies
npm install

# 3. Compile production binaries
npm run build           # Build for current host OS
npm run build:win       # Package Windows installer (.exe)
npm run build:linux     # Package Linux (.AppImage, .deb)
```

---

## Developer & Security Guidelines

Before making changes or writing code:
- **[SECURITY.md](./SECURITY.md)** — Hardware key encryption, security controls, and vulnerability reporting.
- **[AGENTS.md](./AGENTS.md)** — Mandatory directives and pre-commit verification checklist for AI agents and developers.

---

## License & Code Transparency

This software is released under the **SkinOracle Source-Available License**.
The source code is made publicly available for **transparency, privacy auditing, and trust verification** — allowing traders to independently verify that their credentials, private keys, and data remain strictly on their local machine.
Commercial redistribution, reselling, or operating competing products using this software is strictly prohibited. See [LICENSE](./LICENSE) for full terms.
