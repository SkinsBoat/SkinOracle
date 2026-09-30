# SkinOracle Desktop

> Professional CS2 trading workstation with dual-engine algorithmic pricing, real-time multi-source market intelligence, and OS-encrypted credential management.

[![License](https://img.shields.io/badge/License-Source--Available-orange.svg)](./LICENSE)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](./SECURITY.md)
[![CodeQL Security Scan](https://github.com/SkinsBoat/SkinOracle/actions/workflows/codeql.yml/badge.svg)](https://github.com/SkinsBoat/SkinOracle/actions/workflows/codeql.yml)
[![Microsoft Store](https://img.shields.io/badge/Microsoft%20Store-Available-0078D7.svg?logo=microsoft)](https://apps.microsoft.com/detail/9N9V96813XD5)
[![Downloads](https://img.shields.io/badge/Downloads-Latest%20Release-2ea44f.svg?logo=github)](https://github.com/SkinsBoat/SkinOracle/releases/latest)
[![AI Guidelines](https://img.shields.io/badge/AI%20Directives-AGENTS.md-green.svg)](./AGENTS.md)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2.svg)](https://discord.gg/b62feTH5kS)

---

## Official Downloads & Installation

**Windows (Recommended) — Microsoft Store:**
[Download from Microsoft Store](https://apps.microsoft.com/detail/9N9V96813XD5)
Fast, automatic background updates, and certified by Microsoft.

**Windows (Standalone) — GitHub Release:**
[Latest GitHub Release (.exe)](https://github.com/SkinsBoat/SkinOracle/releases/latest)
Standalone installer for offline or custom-directory installs. Windows may display a SmartScreen prompt — click **More info → Run anyway** to proceed.

**Linux — Universal Package:**
[Latest GitHub Release](https://github.com/SkinsBoat/SkinOracle/releases/latest)
Universal `.AppImage` for any distribution, plus a native `.deb` for Ubuntu and Debian.

---

## Security Highlights

- **Local Credential Encryption:** API keys and access tokens are encrypted locally using OS-level hardware credentials (`safeStorage` via Keychain on macOS, DPAPI on Windows, Secret Service on Linux).
- **Direct API Execution:** All market interactions and buy orders fire directly from the user's local IP address without intermediate traffic proxying.
- **Modular Data Ingestion:** Pluggable adapter architecture for integrating with diverse market data providers and price aggregators.
- **In-Memory Request Signing:** Cryptographic request signing (e.g., Ed25519) computed entirely in-memory within the Node.js main process.
- **Hardened Electron Runtime:** Strictly isolated renderer (`nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`) with typed IPC context bridges.

---

## Developer & Security Guidelines

Before making changes or writing code:
- **[SECURITY.md](./SECURITY.md)** — Hardware key encryption, security controls, and vulnerability reporting.
- **[AGENTS.md](./AGENTS.md)** — Mandatory directives and pre-commit verification checklist for AI agents and developers.

---

## Community

- **Discord:** [discord.gg/b62feTH5kS](https://discord.gg/b62feTH5kS)
- **Telegram:** [t.me/skinsboat](https://t.me/skinsboat)
- **Support:** support@skinsboat.com

---

## License & Code Transparency

This software is released under the **SkinOracle Source-Available License**.
The source code is made publicly available for **transparency, privacy auditing, and trust verification** — allowing traders to independently verify that their credentials, private keys, and data remain strictly on their local machine.
Commercial redistribution, reselling, or operating competing products using this software is strictly prohibited. See [LICENSE](./LICENSE) for full terms.