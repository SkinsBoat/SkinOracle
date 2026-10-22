# SkinOracle — CS2 Desktop Trading Workstation

**SkinOracle** is a desktop trading workstation for Counter-Strike 2 (CS2) skin traders, combining algorithmic pricing and valuation with market-analysis tools, opportunity scanning, and buy-order management workflows. It helps traders turn market data into actionable buying thresholds, evaluate listings against their own pricing criteria, and manage trading operations across supported third-party marketplaces.

[![Latest Release](https://img.shields.io/github/v/release/SkinsBoat/SkinOracle?label=release)](https://github.com/SkinsBoat/SkinOracle/releases)
[![Microsoft Store](https://img.shields.io/badge/Microsoft%20Store-Windows-0078D4)](https://apps.microsoft.com/detail/9N9V96813XD)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-informational)](https://github.com/SkinsBoat/SkinOracle/releases)
[![License](https://img.shields.io/badge/license-Source--Available-orange)](./LICENSE)
[![Security](https://img.shields.io/badge/security-policy-blue)](./SECURITY.md)

**Your Price. Your Rules.**

[Official Website](https://skinsboat.com/oracle) · [Download SkinOracle](https://github.com/SkinsBoat/SkinOracle/releases/latest) · [Source Code](https://github.com/SkinsBoat/SkinOracle) · [Join Discord](https://discord.gg/b62feTH5kS)

---

## Table of Contents

- [What Is SkinOracle?](#what-is-skinoracle)
- [Core Capabilities](#core-capabilities)
- [How the Pricing Workflow Works](#how-the-pricing-workflow-works)
- [Features](#features)
- [Supported Marketplaces and Data Sources](#supported-marketplaces-and-data-sources)
- [Who Is SkinOracle For?](#who-is-skinoracle-for)
- [Desktop Workstation vs. Browser-Based Workflows](#desktop-workstation-vs-browser-based-workflows)
- [Security and Privacy](#security-and-privacy)
- [Download and Installation](#download-and-installation)
- [Building from Source](#building-from-source)
- [Technology Stack](#technology-stack)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Community and Support](#community-and-support)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## What Is SkinOracle?

SkinOracle is an algorithmic pricing and trading workstation built for traders operating in the CS2 skin economy.

Rather than relying exclusively on marketplace prices, generic liquidity rankings, or manual comparisons, SkinOracle provides tools for evaluating market conditions against a trader's own buying criteria.

The objective is to help traders answer three practical questions:

1. **What price should I be willing to pay?** Calculate a buying threshold using a configurable pricing methodology.
2. **Which listings deserve attention?** Identify listings and market conditions that meet or approach that threshold.
3. **What should I do next?** Use supported marketplace workstations to inspect opportunities and carry out available trading operations.

SkinOracle brings these workflows together in a dedicated desktop environment instead of requiring traders to coordinate every step across separate browser tabs and tools.

### What makes SkinOracle different?

- **Algorithmic valuation:** Work with calculated buying thresholds instead of treating every displayed market price as an appropriate buying price.
- **Trader-defined criteria:** Apply pricing preferences, margin requirements, and supported stability filters.
- **Threshold-based opportunity discovery:** Find listings below or near an accepted buying price.
- **Practical trading workflows:** Monitor supported buy orders, inspect listings, and manage available marketplace operations.
- **Local credential protection:** Store supported API keys and access tokens using operating-system-backed encryption.
- **Source transparency:** Inspect the published source code under the SkinOracle Source-Available License.

SkinOracle is designed to support trading decisions, not replace them. A calculated valuation is not a guaranteed fair price, and an identified opportunity is not a guarantee of execution or profit.

## Core Capabilities

| Capability | Purpose |
|---|---|
| Algorithmic Pricing Engine | Calculate trader-specific buying thresholds using supported pricing inputs and configurations. |
| OracleNexus Pro | Analyze supported market trends, momentum, confidence, and market-direction indicators. |
| SoClose Scanner | Identify listings below or near an accepted buying threshold. |
| Buy-Order Workstations | Monitor price drift and manage supported marketplace targets and orders. |
| Multi-Source Market Intelligence | Use supported pricing providers and marketplace data for analysis and valuation. |
| Local Credential Storage | Protect supported API credentials using operating-system-backed encryption. |
| Desktop Trading Interface | Bring supported pricing, analysis, scanning, and trading workflows into one application. |

Feature availability and data coverage depend on the selected source, marketplace integration, application version, and configuration.

---

## How the Pricing Workflow Works

SkinOracle separates market observations from valuation and buying decisions.

<pre>
Market Data
    |
    v
Pricing and Valuation Engine
    |
    v
Accepted Price / Buy Ceiling
    |
    v
Listing and Opportunity Analysis
    |
    v
Trader Review and Supported Marketplace Action
</pre>

### 1. Market Data

Pricing and market-analysis tools consume data from supported sources. Depending on the provider, the available information may include observed prices, historical trends, supply conditions, and current listings.

Different providers may have different coverage, update intervals, fees, and data limitations.

### 2. Algorithmic Valuation

The pricing engine applies supported calculations and configured criteria to derive a buying threshold.

This allows traders to distinguish between the price at which an item is listed and the price at which the item meets their own buying requirements.

### 3. Accepted Price / Buy Ceiling

An **Accepted Price**, also referred to as a **Buy Ceiling**, is the trader's chosen threshold for evaluating a potential purchase.

It is not necessarily the lowest price available, the current market average, or an objectively correct valuation.

Its purpose is to provide a consistent decision reference for evaluating listings and supported trading operations.

### 4. Opportunity Discovery

SkinOracle's scanning workflows help traders identify listings that satisfy or approach configured criteria.

Depending on the feature, a result may be classified as a deal below the accepted threshold or as a listing approaching that threshold.

### 5. Trader Action

The trader can inspect the result and use the available marketplace workflow, such as a supported buy-target or buy-order action.

The availability of automated or manual actions depends on the specific integration. A detected opportunity does not guarantee that a listing will remain available or that an order will be filled.

---

## Features

### 1. Algorithmic Pricing and Valuation Engine

The SkinOracle Pricing Engine is designed to help traders establish consistent, actionable buying thresholds for CS2 skins.

Instead of treating a single marketplace listing as definitive evidence of an item's value, the engine applies supported pricing logic to available market data.

Depending on the selected configuration and data coverage, valuation workflows can incorporate:

- Configurable pricing methodologies.
- Conservative, Balanced, and Aggressive pricing profiles, where supported.
- Buying thresholds and margin requirements.
- Historical price trends and market momentum.
- Volatility and anomalous-price filtering.
- Supply Stability Score (SSS) and supported supply-related criteria.
- Confidence and market-direction indicators provided by supported analysis modules.

The resulting threshold reflects the chosen methodology and available inputs. It should be evaluated alongside marketplace fees, item-specific risks, data freshness, and the trader's own requirements.

**The key distinction:** Market price describes an observed price. Valuation estimates what an item may be worth under a defined methodology. Accepted Price defines the threshold at which a trader is willing to consider buying it.

### 2. OracleNexus Pro

OracleNexus Pro provides additional market-analysis capabilities for supported pricing workflows.

Its analysis includes a 14-day trend-momentum horizon and related confidence and market-direction indicators, where available in the current release.

These indicators help traders interpret recent market behavior and understand the context behind a valuation.

They are analytical signals, not guarantees about future prices. A positive trend does not guarantee continued appreciation, and a high confidence score does not eliminate market risk.

### 3. SoClose Scanner

**SoClose helps traders identify listings that are close to their accepted buying price.**

A listing does not need to fall below the buying threshold to be worth reviewing. Depending on the strategy, a trader may also want to inspect a listing slightly above that threshold and decide whether to create a buy target or take another supported action.

SoClose distinguishes two important situations:

| Result | Meaning |
|---|---|
| **Deal** | The listing is priced below the accepted buying threshold. |
| **SoClose** | The listing is above the accepted threshold but within the configured proximity range. |

For example, suppose a trader's Accepted Price for an item is **$12.40**.

| Observed listing price | Difference from Accepted Price | Interpretation |
|---:|---:|---|
| $12.30 | -0.8% | Below the threshold: potential deal |
| $12.40 | 0.0% | At the threshold |
| $12.55 | +1.2% | Above the threshold |
| $12.88 | +3.9% | Near the threshold, if within the configured range |

These figures illustrate the pricing concept; they are not live listings or current market quotations.

Where supported, SoClose applies eligibility criteria, supply-related filters, and anomaly checks to make the results more relevant to the selected buying methodology.

Depending on the marketplace integration, traders may be able to use a result to create a buy target or buy order rather than immediately purchasing the listing.

**SoClose is a proximity and opportunity-discovery tool, not an arbitrage guarantee.** A listing above the accepted price may still be unsuitable after fees, and a listing below it may involve other risks.

### 4. Buy-Order Workstations

Buy orders can become less attractive as market conditions change. A target that was appropriate when created may no longer align with a trader's intended buying threshold.

SkinOracle provides supported buy-order workflows to help traders review order prices and identify price drift.

Depending on the integration, available operations may include:

- Inspecting existing buy targets and orders.
- Comparing order prices with configured pricing criteria.
- Reviewing multiple orders within a dedicated workstation.
- Managing supported targets or orders in batches.
- Carrying out available marketplace actions.

Marketplace APIs determine which operations are available and whether they require confirmation, authentication, or additional user input.

### 5. Cross-Market Analysis

CS2 skin traders often work with several marketplaces and pricing sources, each with its own data coverage and trading conditions.

SkinOracle's multi-source architecture is designed to bring supported market information into pricing and analysis workflows.

Cross-market analysis can help traders investigate differences in observed prices, supply, and buying conditions. However, prices from different providers may not be directly comparable because of fees, currencies, data delays, item conditions, or differences in the listings being measured.

SkinOracle should therefore be understood as a pricing and trading workstation that supports cross-market analysis—not as a system that guarantees profitable price-difference arbitrage.

---
## Supported Marketplaces

SkinOracle provides dedicated workstations for supported CS2 skin marketplaces. These integrations help traders inspect listings, review buying opportunities, and use the trading operations available for each platform.


- **DMarket**
- **Skinport**
- **CSFloat**

Each marketplace has its own API capabilities, authentication requirements, and operational limitations. The availability of a particular action depends on the current integration and the marketplace's API.

A marketplace integration does not automatically imply that every operation is supported, fully automated, or available without user interaction.

## Pricing Data Sources — BYOK (Bring Your Own Key)

**SkinOracle's external pricing-data integrations use a Bring Your Own Key (BYOK) model.** Users provide their own API key for a supported pricing provider to access the corresponding data and use it within SkinOracle's pricing and valuation workflows.

SkinOracle provides the desktop environment, pricing logic, and analysis tools; it does not include a universal pricing-data subscription with unrestricted access to every provider.

| Pricing data provider | Purpose |
|---|---|
| **CS2Cap** | External pricing data for supported valuation and market-analysis workflows. |
| **Skinsnipe** | External pricing data for supported valuation and market-analysis workflows. |

### How BYOK Works

1. Obtain an API key or the required credentials directly from a supported pricing-data provider.
2. Configure the provider in SkinOracle.
3. Use the provider's available data in the supported pricing and valuation workflows.
4. Manage your provider account, API limits, and any applicable subscription or usage fees directly with that provider.

**Important:**

- You must provide your own credentials for the supported external pricing providers.
- Provider access, pricing, rate limits, and data coverage are determined by the provider, not by SkinOracle.
- Supported API credentials are protected using operating-system-backed local encryption.
- Pricing results depend on the available data, provider coverage, configuration, and valuation methodology.
- A pricing-data integration is distinct from a marketplace integration. Access to a provider's data does not imply that SkinOracle can execute trades on that provider's platform.

SkinOracle is designed to keep supported API credentials protected locally. Refer to the [Security Policy](./SECURITY.md) for details about credential handling and application security.

### Independent Third-Party Integrations

SkinOracle's marketplace integrations and pricing-data providers are independent third-party services. Their inclusion does not imply official affiliation, endorsement, or sponsorship.

Third-party APIs and data services may change their availability, permissions, pricing, or terms without notice.

## Who Is SkinOracle For?

### CS2 Skin Traders

Traders who want to evaluate listings using a consistent buying methodology rather than relying solely on displayed market prices.

**Typical workflow:** Calculate an Accepted Price, inspect current listings, and focus on opportunities that match the buying criteria.

### Volume Traders

Traders managing many items, listings, or buy orders who want a dedicated workspace for pricing and supported marketplace operations.

**Typical workflow:** Review pricing conditions and manage supported targets without distributing every task across numerous browser tabs.

### Buy-Order Managers

Traders who maintain buy orders and need to review whether existing prices still align with their current buying criteria.

**Typical workflow:** Inspect order prices, identify price drift, and use the available marketplace management tools.

### Market Analysts

Users who want to investigate market trends, pricing inputs, and supply-related conditions.

**Typical workflow:** Review supported historical and current data, interpret valuation indicators, and compare observations across available sources.

### Cross-Market Traders

Traders who evaluate the same item across multiple supported sources and want a more consistent way to compare market observations.

**Typical workflow:** Review comparable prices, account for differences between sources, and evaluate listings against the trader's own buying thresholds.

---

## Desktop Workstation vs. Browser-Based Workflows

SkinOracle is designed to consolidate supported trading tasks in a dedicated desktop application.

| Dimension | Separate Browser-Based Workflow | SkinOracle Desktop Workflow |
|---|---|---|
| Workspace | Tasks distributed across marketplace tabs and external tools | Dedicated interface for supported pricing and trading workflows |
| Pricing methodology | Depends on the websites and tools being used | Configurable pricing and valuation capabilities |
| Opportunity review | Manual comparison or separate scanners | Integrated threshold-based opportunity discovery, where supported |
| Buy-order management | Depends on each marketplace interface | Supported order-monitoring and management workflows |
| Credentials | Handling depends on each website and tool | Supported credentials can be stored using OS-backed local encryption |
| Market data | Depends on individually opened sources | Supported data sources can feed the application's analysis workflows |

This is a workflow comparison, not a benchmark of browser performance against Electron.

Actual speed, memory use, data freshness, and execution time depend on hardware, network conditions, marketplace APIs, and application configuration.

---

## Security and Privacy

SkinOracle is designed with local credential protection and a separated Electron application architecture.

Security-related implementation details are documented in the repository's [Security Policy](./SECURITY.md).

### OS-Backed Credential Encryption

Supported API keys and access tokens are encrypted locally using Electron's `safeStorage` functionality, backed by the relevant operating-system facilities:

- Windows: DPAPI.
- macOS: Keychain.
- Linux: Secret Service, where supported by the environment.

The protection provided by these mechanisms depends on the operating system, its configuration, and the security of the user's account and device.

### Direct Marketplace API Requests

Supported marketplace interactions and buy-order requests are made through the application's integration layer directly from the user's local environment, without an intermediate application traffic proxy.

Marketplace providers may still receive the requests and information required to process them. This does not mean that every application feature operates offline.

### In-Memory Request Signing

Supported cryptographic request-signing operations are performed in the Electron main process, with signing material handled in memory where implemented.

### Electron Runtime Isolation

The application uses Electron security controls including:

- `nodeIntegration: false`.
- `contextIsolation: true`.
- `webSecurity: true`.
- Typed IPC bridges between the renderer and main processes.

These controls help separate the user interface from privileged application operations.

### Local History and Data Handling

SkinOracle uses local SQLite-based storage for supported historical snapshots and retention workflows. The current implementation includes bounded history windows and offer deduplication in relevant valuation workflows.

Some features require network requests to obtain market data or perform supported valuation operations. Consult the source code and [SECURITY.md](./SECURITY.md) for implementation details and limitations.

**Source availability is intended to support independent inspection.** It is not a claim that the application has undergone an independent security audit or that every possible risk has been eliminated.

---

## Download and Installation

SkinOracle is distributed through the Microsoft Store and the project's GitHub Releases.

### Windows — Microsoft Store

**Recommended for most Windows users.**

[Install SkinOracle from the Microsoft Store](https://apps.microsoft.com/detail/9n9v96813xd5)

1. Open the official Microsoft Store listing.
2. Select the installation option.
3. Launch SkinOracle after installation.

The Store is the recommended distribution channel for users who prefer installation through Microsoft's application ecosystem.

### Windows — Standalone Installer

[Download the latest GitHub Release](https://github.com/SkinsBoat/SkinOracle/releases/latest)

1. Open the latest release.
2. Download the Windows installer (`.exe`).
3. Run the installer and follow the prompts.
4. Launch SkinOracle from the installed application.

Windows security prompts may vary depending on the installer, signature status, and system configuration. Verify the download's origin before proceeding; do not bypass security warnings without understanding their cause.

### Linux — AppImage or DEB

[Download Linux packages](https://github.com/SkinsBoat/SkinOracle/releases/latest)

Available package formats include:

- `.AppImage` for supported Linux distributions.
- `.deb` for compatible Debian-based distributions.

For an AppImage, download the package, make it executable if necessary, and launch it according to your desktop environment.

For a DEB package, use your distribution's package installer.

Linux credential storage may require a supported Secret Service implementation. Refer to the security documentation if credential storage is unavailable in your desktop environment.

### Release Information

For release notes, available installers, and version-specific changes, visit:

[SkinOracle Releases](https://github.com/SkinsBoat/SkinOracle/releases)

---

## Building from Source

The repository is publicly available for source inspection, security review, and permitted personal use under the SkinOracle Source-Available License.

### Prerequisites

- Git.
- Node.js 20 or later.
- npm.
- A supported development environment for Electron and its native dependencies.

Build output and packaging requirements may vary by operating system.

### Clone the Repository

```bash
git clone https://github.com/SkinsBoat/SkinOracle.git
cd SkinOracle
```

### Install Dependencies

```bash
npm install
```

### Run the Development Environment

```bash
npm run dev
```

The development command uses the project's Vite configuration and Electron integration.

### Build the Application

Build for the current host environment:

```bash
npm run build
```

Build a Windows installer:

```bash
npm run build:win
```

Build the Windows APPX package:

```bash
npm run build:appx
```

Build Linux packages:

```bash
npm run build:linux
```

Build for the configured Windows and Linux targets:

```bash
npm run build:all
```

Build artifacts are written to the configured release output directory.

### Additional Scripts

Run the test suite:

```bash
npm test
```

Preview the built frontend:

```bash
npm run preview
```

Format source files:

```bash
npm run format
```

The available scripts are defined in [`package.json`](./package.json). Some packaging operations may require operating-system-specific dependencies or configuration.

### Developer Guidelines

Before changing the application, review:

- [`AGENTS.md`](./AGENTS.md) — Repository-specific development instructions and verification requirements.
- [`SECURITY.md`](./SECURITY.md) — Security architecture and vulnerability reporting.
- [`LICENSE`](./LICENSE) — Permitted and prohibited uses of the source code.

Public source access does not grant permission to redistribute commercial builds, rebrand the application, or use the code to operate a competing commercial product.

---

## Technology Stack

SkinOracle is built as a desktop application using a web-based user interface and Electron's main-process runtime.

| Layer | Technology | Purpose |
|---|---|---|
| User Interface | React | Desktop application interface and interactive components |
| Language | TypeScript | Typed application code |
| Frontend Build | Vite | Development server and frontend production build |
| Desktop Runtime | Electron | Desktop packaging and access to operating-system capabilities |
| Application Networking | Axios and Socket.IO client | Supported HTTP and socket-based communication |
| Local Data | SQLite through `sql.js` | Local database and supported historical snapshots |
| State Management | Zustand | Application state |
| Data Visualization | Recharts | Supported charts and analytical visualizations |
| Cryptography | TweetNaCl and platform-supported facilities | Relevant cryptographic operations |
| Packaging | electron-builder | Windows and Linux application packaging |

The repository's implementation is the authoritative source for the technologies and capabilities used by each release.

---

## Frequently Asked Questions

### Is SkinOracle a CS2 arbitrage bot?

No. SkinOracle is a CS2 trading workstation focused on algorithmic pricing, market analysis, and opportunity discovery. It helps traders establish buying thresholds, evaluate listings, and manage supported marketplace workflows rather than relying solely on cross-market price differences.

### Can I use SkinOracle without marketplace API keys?

Yes. SkinOracle can run and provide value without connecting any marketplace API keys. Marketplace API credentials are only needed for specific integrations or actions that require them. Some pricing data providers may require their own API keys (BYOK) to enable their respective data features.

### What is the difference between Market Price and Accepted Price?

**Market Price** is an observed price from a market data source. **Accepted Price** is the trader's buying threshold, determined by the configured pricing methodology.

A listing below the Accepted Price may warrant attention, but this does not automatically mean it is fairly valued or profitable after fees and other costs.

### What is the difference between a Deal and SoClose?

A **Deal** identifies a listing priced below the applicable Accepted Price. **SoClose** highlights a listing above that threshold but within the configured proximity range.

Depending on the marketplace and available integration, SoClose can help traders identify listings to target through supported buy-order workflows.

### Does SkinOracle guarantee profitable trades?

No. SkinOracle provides pricing analysis and decision-support tools, not guaranteed outcomes. Market conditions can change, listings may disappear, buy orders may not fill, and fees or other costs can affect profitability.

### Does SkinOracle automatically execute trades?

Available actions depend on the feature, marketplace integration, API permissions, and user configuration. Not every workflow is fully automated. Consult the relevant feature documentation and in-app controls to understand which actions require user interaction.

### Do I need my own API keys?

Some pricing data integrations require your own API key (BYOK — Bring Your Own Key). Availability and requirements depend on the provider and feature. Configure credentials in the application where required.

### How are API keys stored?

Supported API keys and access tokens are encrypted locally using Electron's `safeStorage` and operating-system-backed facilities. This protects stored credentials; it does not mean the application operates entirely offline or that external providers never receive requests.

### Is SkinOracle open source?

No. SkinOracle is **source-available**, not open source. Its source code is publicly available under a custom license with specific usage restrictions. Commercial redistribution, rebranding, and competing commercial use are prohibited. See the [LICENSE](./LICENSE) for the complete terms.
## Community and Support

Questions, bug reports, and feature requests are welcome through the project's official channels.

- **Website:** [skinsboat.com/oracle](https://skinsboat.com/oracle)
- **GitHub Repository:** [SkinsBoat/SkinOracle](https://github.com/SkinsBoat/SkinOracle)
- **Releases:** [Download and release notes](https://github.com/SkinsBoat/SkinOracle/releases)
- **Issues:** [Report a bug or request a feature](https://github.com/SkinsBoat/SkinOracle/issues)
- **Discord:** [Join the SkinOracle community](https://discord.gg/b62feTH5kS)
- **Telegram:** [SkinsBoat on Telegram](https://t.me/skinsboat)
- **Support:** support@skinsboat.com
- **X:** [@skinsboat](https://x.com/skinsboat)
- **Security:** [Security policy and vulnerability reporting](./SECURITY.md)

For bug reports, include the application version, operating system, relevant steps to reproduce the issue, and any non-sensitive diagnostic information that helps explain the problem. Never include API keys, passwords, access tokens, or other private credentials in public issues.

---

## Disclaimer

SkinOracle is an independent third-party software application. It is not affiliated with, endorsed by, or sponsored by Valve Corporation, Steam, CSFloat, DMarket, Skinsnipe, CS2Cap, or any other third-party marketplace or data provider mentioned in this README.

Counter-Strike 2 and related trademarks belong to their respective owners.

Marketplace integrations depend on third-party services, API availability, permissions, and applicable terms. Integration capabilities may change without notice.

SkinOracle provides analytical and operational tools for traders. It does not guarantee item valuations, order fills, market liquidity, returns, or profits. Users remain responsible for their trading decisions, compliance with relevant platform terms, and the security of their accounts and devices.

---

## License

SkinOracle is distributed under the **SkinOracle Desktop Source-Available License**.

The source code is available for inspection, security review, and permitted personal use. Commercial redistribution, resale, sublicensing, rebranding, and use of the source code to operate a competing commercial product or service are prohibited under the license.

This is not an OSI-approved open-source license, and SkinOracle should not be represented as an open-source project.

See [`LICENSE`](./LICENSE) for the complete terms and disclaimer of warranty.

---

**SkinOracle — Your Price. Your Rules.**

[Visit the official website](https://skinsboat.com/oracle) · [Download the application](https://github.com/SkinsBoat/SkinOracle/releases/latest) · [Explore the source](https://github.com/SkinsBoat/SkinOracle)