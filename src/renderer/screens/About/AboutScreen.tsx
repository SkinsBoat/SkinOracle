import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  Send,
  Mail,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Terminal,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Database,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { oracleLogo, skinsBoatLogo } from "../../../../assets/images";
import {
  DISCORD_COMMUNITY_URL,
  TELEGRAM_COMMUNITY_URL,
  SUPPORT_EMAIL,
  SKINSBOAT_WEBSITE_URL,
  GITHUB_REPO_URL,
  APP_RELEASES_URL,
} from "../../constants/brandUrls";
import { UpdateStatusState } from "../../../shared/types";

// Clean GitHub SVG Icon
function GithubIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// Clean Discord SVG Icon
function DiscordIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface FaqItem {
  id: string;
  icon: React.ReactNode;
  category: string;
  badgeColor: string;
  question: string;
  answerContent: React.ReactNode;
}

export default function AboutScreen() {
  const [appVersion, setAppVersion] = useState<string>("0.1.21");
  const [updateState, setUpdateState] = useState<UpdateStatusState | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [emailCopied, setEmailCopied] = useState<boolean>(false);
  const [specsCopied, setSpecsCopied] = useState<boolean>(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("api-keys");

  useEffect(() => {
    // Fetch live app version through preload IPC
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app
        .getVersion()
        .then((v) => {
          if (v) setAppVersion(v);
        })
        .catch(() => {});
    }

    // Check for updates ONLY when landing on the About screen to save API calls
    let isMounted = true;
    if (window.electronAPI?.updater?.checkForUpdates) {
      setIsCheckingUpdate(true);
      window.electronAPI.updater
        .checkForUpdates()
        .then((res) => {
          if (!isMounted) return;
          if (res?.message && res.message.toLowerCase().includes("available")) {
            toast.success(res.message);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsCheckingUpdate(false);
        });
    }

    // Listen to updater status
    if (window.electronAPI?.updater?.onUpdateStatus) {
      const unsub = window.electronAPI.updater.onUpdateStatus((state) => {
        setUpdateState(state);
        if (state.status !== "checking") {
          setIsCheckingUpdate(false);
        }
      });
      return () => {
        isMounted = false;
        unsub();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenExternal = (url: string) => {
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (window.electronAPI?.updater?.checkForUpdates) {
        const res = await window.electronAPI.updater.checkForUpdates();
        if (res?.message) {
          toast.success(res.message);
        }
      } else {
        toast("Updater is active in packaged builds.", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to check for updates");
    } finally {
      setTimeout(() => setIsCheckingUpdate(false), 1200);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setEmailCopied(true);
    toast.success(`Copied ${SUPPORT_EMAIL} to clipboard!`);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  const handleCopyDiagnostics = () => {
    const diagnostics = {
      product: "Skin Oracle",
      version: appVersion,
      brand: "A SkinsBoat Product",
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: navigator.platform,
    };
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setSpecsCopied(true);
    toast.success("System diagnostics copied to clipboard!");
    setTimeout(() => setSpecsCopied(false), 2500);
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const faqs: FaqItem[] = [
    {
      id: "api-keys",
      icon: <KeyRound size={18} style={{ color: "#38bdf8" }} />,
      category: "Security & Setup",
      badgeColor: "#38bdf8",
      question: "Can I use Skin Oracle without sharing my marketplace API keys?",
      answerContent: (
        <div style={styles.faqBody}>
          <div style={styles.faqHighlightBox}>
            <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
            <div style={styles.faqHighlightText}>
              <strong>Yes, 100%!</strong> You can use Skin Oracle, monitor valuations, and use the{" "}
              <strong style={{ color: "var(--so-primary-light, #93c5fd)" }}>SoClose Scanner</strong> to find
              undervalued deals and snipes without connecting any marketplace API keys.
            </div>
          </div>
          <p style={styles.faqParagraph}>
            You only need to configure a <strong>Price Source</strong> (such as Skinsnipe or CS2Cap) so the app can stream
            live listing prices and market data feeds.
          </p>
          <p style={styles.faqParagraph}>
            Third-party marketplace API keys (CSFloat or DMarket) are <strong>strictly optional</strong>. They are only
            required if you wish to trigger direct one-click trade execution or automated listing actions directly from
            your local machine.
          </p>
        </div>
      ),
    },
    {
      id: "cached-trends",
      icon: <Database size={18} style={{ color: "#a855f7" }} />,
      category: "Trends & Local SQLite DB",
      badgeColor: "#a855f7",
      question: "What happens if I refresh prices for items already saved in my local trends?",
      answerContent: (
        <div style={styles.faqBody}>
          <div style={styles.faqHighlightBox}>
            <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
            <div style={styles.faqHighlightText}>
              <strong>Zero data loss or duplication.</strong> The local trends and Accepted Prices engine operates on
              an atomic SQLite schema:
            </div>
          </div>
          <p style={styles.faqParagraph}>
            When you refresh prices or pull latest market listings, the database executes an <code>INSERT OR REPLACE</code> keyed on{" "}
            <code>(item_name, snapshot_date)</code>. If today’s snapshot already exists, it seamlessly refreshes today's
            computed median price and active listing count with the freshest market numbers.
          </p>
          <p style={styles.faqParagraph}>
            Crucially, historical snapshots from previous days are <strong>completely preserved</strong>. This maintains
            your rolling 7-day, 14-day, and 30-day historical trend windows, which the <strong>OracleNexus v2</strong>{" "}
            engine uses for momentum, elasticity, and volatility damping calculations.
          </p>
        </div>
      ),
    },
    {
      id: "free-vs-paid",
      icon: <Coins size={18} style={{ color: "#f59e0b" }} />,
      category: "Workstations & Valuation",
      badgeColor: "#f59e0b",
      question: "What features are completely free vs. paid in Skin Oracle?",
      answerContent: (
        <div style={styles.faqBody}>
          <div style={styles.faqGridTwoCol}>
            <div style={styles.faqCardCol}>
              <div style={styles.faqColHeader}>
                <span style={styles.freeBadge}>100% FREE</span>
                <span style={styles.faqColTitle}>Everyday Workstation Usage</span>
              </div>
              <ul style={styles.faqBulletList}>
                <li>
                  <strong>All Workstation Tabs:</strong> CSFloat Workstation, DMarket Workstation, and SoClose Scanner.
                </li>
                <li>
                  <strong>Reusing Accepted Prices:</strong> Once you build your accepted prices, you can use them freely
                  across all app sections (for buy orders, buy targets, and deal sniping) with zero additional charge.
                </li>
                <li>
                  <strong>Local Database & Storage:</strong> Unlimited local snapshot history and trends queries on your
                  machine.
                </li>
              </ul>
            </div>

            <div style={styles.faqCardCol}>
              <div style={styles.faqColHeader}>
                <span style={styles.paidBadge}>PAID FEATURE</span>
                <span style={styles.faqColTitle}>Calculating Accepted Prices (Buy Ceilings)</span>
              </div>
              <ul style={styles.faqBulletList}>
                <li>
                  <strong>Only Calculating Accepted Prices is Paid:</strong> You only pay when evaluating and calculating accepted prices (buy ceilings).
                  Once calculated, you can use them as your purchasing targets, buy orders, and sniper thresholds across all
                  app sections completely for free with zero extra charges.
                </li>
                <li>
                  <strong>One-Time Calculation, Infinite Reuse:</strong> You only need to calculate your accepted prices once; then
                  you can freely apply them across CSFloat, DMarket, and SoClose.
                </li>
                <li>
                  <strong>Baseline Prerequisite:</strong> An active Price Source (such as Skinsnipe or CS2Cap) is
                  required as the base feed to calculate accepted prices.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      {/* ── 1. Hero Showcase Banner ── */}
      <div style={styles.heroBanner}>
        <div style={styles.heroGlow} />

        <div style={styles.heroMainRow}>
          {/* Main Title & Brand Identity */}
          <div style={styles.heroBrandWrap}>
            <div style={styles.heroLogoBox}>
              <img src={oracleLogo} alt="Skin Oracle" style={styles.heroLogoImg} />
            </div>

            <div style={styles.heroMetaWrap}>
              <div style={styles.heroTitleRow}>
                <h1 style={styles.heroTitle}>Skin Oracle</h1>
                <span style={styles.betaBadge}>Beta</span>
                <span style={styles.versionBadge}>v{appVersion}</span>
              </div>
              <p style={styles.heroDescription}>
                Official High-Frequency CS2 Valuation, Market Depth Analysis & Multi-Market Trading Workstation by SkinsBoat
              </p>
            </div>
          </div>

          {/* SkinsBoat Product Badge */}
          <div
            onClick={() => handleOpenExternal(SKINSBOAT_WEBSITE_URL)}
            title="Visit SkinsBoat Official Portal"
            style={styles.coBrandBadge}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--so-primary)";
              e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--so-border-strong)";
              e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.8)";
            }}
          >
            <div style={styles.coBrandLogoBox}>
              <img src={skinsBoatLogo} alt="SkinsBoat" style={styles.coBrandLogoImg} />
            </div>
            <div>
              <div style={styles.coBrandSubLabel}>A SKINSBOAT PRODUCT</div>
              <div style={styles.coBrandMainLabel}>
                SkinsBoat
                <ExternalLink size={12} style={{ color: "var(--so-text-muted)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Update Status Strip */}
        <div style={styles.actionStrip}>
          <div style={styles.actionButtonsWrap}>
            <button
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              style={{
                ...styles.primaryBtn,
                cursor: isCheckingUpdate ? "wait" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isCheckingUpdate) e.currentTarget.style.backgroundColor = "var(--so-primary-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isCheckingUpdate) e.currentTarget.style.backgroundColor = "var(--so-primary)";
              }}
            >
              <RefreshCw size={14} className={isCheckingUpdate ? "spin" : ""} />
              {isCheckingUpdate ? "Checking for Updates..." : "Check for Updates"}
            </button>

            <button
              onClick={() => handleOpenExternal(APP_RELEASES_URL)}
              style={styles.secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--so-surface-panel)";
              }}
            >
              <GithubIcon size={14} />
              Releases & Changelog
            </button>

            <button
              onClick={handleCopyDiagnostics}
              style={styles.secondaryBtnMuted}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--so-text-primary)";
                e.currentTarget.style.borderColor = "var(--so-border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--so-text-secondary)";
                e.currentTarget.style.borderColor = "var(--so-border-medium)";
              }}
            >
              {specsCopied ? <Check size={14} style={{ color: "#38bdf8" }} /> : <Copy size={14} />}
              {specsCopied ? "Diagnostics Copied!" : "Copy Diagnostics"}
            </button>
          </div>

          <div style={styles.updateStatusWrap}>
            <span
              style={{
                ...styles.updateStatusDot,
                backgroundColor: updateState?.status === "available" ? "#f59e0b" : "#10b981",
              }}
            />
            <span>
              {updateState?.status === "available"
                ? `Update v${updateState.info?.version || "new"} is ready`
                : "Desktop Client is up to date"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Official Communities & Support Contacts ── */}
      <div>
        <h2 style={styles.sectionHeader}>
          <Sparkles size={16} style={{ color: "var(--so-primary)" }} />
          Official Communities & Support
        </h2>

        <div style={styles.contactsGrid}>
          {/* Discord Card */}
          <div
            onClick={() => handleOpenExternal(DISCORD_COMMUNITY_URL)}
            style={styles.contactCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#5865F2";
              e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--so-border-medium)";
              e.currentTarget.style.backgroundColor = "var(--so-surface-card)";
            }}
          >
            <div style={styles.contactCardInner}>
              <div style={styles.discordIconBox}>
                <DiscordIcon size={20} />
              </div>
              <div>
                <div style={styles.contactCardTitle}>Discord</div>
                <div style={styles.contactCardSub}>Community Server</div>
              </div>
            </div>
            <ExternalLink size={15} style={{ color: "var(--so-text-muted)" }} />
          </div>

          {/* Telegram Card */}
          <div
            onClick={() => handleOpenExternal(TELEGRAM_COMMUNITY_URL)}
            style={styles.contactCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#0088cc";
              e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--so-border-medium)";
              e.currentTarget.style.backgroundColor = "var(--so-surface-card)";
            }}
          >
            <div style={styles.contactCardInner}>
              <div style={styles.telegramIconBox}>
                <Send size={18} />
              </div>
              <div>
                <div style={styles.contactCardTitle}>Telegram</div>
                <div style={styles.contactCardSub}>@skinsboat</div>
              </div>
            </div>
            <ExternalLink size={15} style={{ color: "var(--so-text-muted)" }} />
          </div>

          {/* Email Support Card */}
          <div
            style={styles.contactCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--so-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--so-border-medium)";
            }}
          >
            <div
              onClick={() => handleOpenExternal(`mailto:${SUPPORT_EMAIL}`)}
              title="Click to send email"
              style={styles.emailCardClickable}
            >
              <div style={styles.emailIconBox}>
                <Mail size={18} />
              </div>
              <div style={styles.emailTextWrap}>
                <div style={styles.contactCardTitle}>Email Support</div>
                <div style={styles.emailAddressText}>{SUPPORT_EMAIL}</div>
              </div>
            </div>

            <button
              onClick={handleCopyEmail}
              title="Copy email address"
              style={styles.copyEmailBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--so-border-strong)";
                e.currentTarget.style.color = "var(--so-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--so-border-medium)";
                e.currentTarget.style.color = emailCopied ? "#38bdf8" : "var(--so-text-muted)";
              }}
            >
              {emailCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Frequently Asked Questions (FAQ) ── */}
      <div>
        <div style={styles.faqSectionHeaderRow}>
          <h2 style={styles.sectionHeaderNoMargin}>
            <HelpCircle size={18} style={{ color: "var(--so-primary)" }} />
            Frequently Asked Questions
          </h2>
          <span style={styles.faqHeaderHint}>Instant answers to setup, trends, and pricing</span>
        </div>

        <div style={styles.faqContainer}>
          {faqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  ...styles.faqItemCard,
                  borderColor: isExpanded ? "var(--so-border-strong)" : "var(--so-border-subtle)",
                }}
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  style={{
                    ...styles.faqHeaderButton,
                    backgroundColor: isExpanded ? "var(--so-surface-card-hover)" : "var(--so-surface-card)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isExpanded
                      ? "var(--so-surface-card-hover)"
                      : "var(--so-surface-card)";
                  }}
                >
                  <div style={styles.faqQuestionRow}>
                    <div style={styles.faqIconBox}>{faq.icon}</div>
                    <div style={styles.faqTitleWrap}>
                      <div style={styles.faqCategoryWrap}>
                        <span
                          style={{
                            ...styles.faqCategoryBadge,
                            color: faq.badgeColor,
                            borderColor: `${faq.badgeColor}33`,
                            backgroundColor: `${faq.badgeColor}15`,
                          }}
                        >
                          {faq.category}
                        </span>
                      </div>
                      <div style={styles.faqQuestionText}>{faq.question}</div>
                    </div>
                  </div>

                  <div style={styles.faqToggleIconBox}>
                    {isExpanded ? (
                      <ChevronUp size={18} style={{ color: "var(--so-primary)" }} />
                    ) : (
                      <ChevronDown size={18} style={{ color: "var(--so-text-muted)" }} />
                    )}
                  </div>
                </button>

                {isExpanded && <div style={styles.faqExpandedContent}>{faq.answerContent}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. SkinsBoat Architecture & Zero-Trust Pledge ── */}
      <div>
        <h2 style={styles.sectionHeader}>
          <Cpu size={18} style={{ color: "var(--so-accent-cyan)" }} />
          SkinsBoat Architecture & Security Directives
        </h2>

        <div style={styles.architectureGrid}>
          {/* Card 1: Zero-Trust Local Storage */}
          <div style={styles.archCard}>
            <div style={styles.archCardHeader}>
              <ShieldCheck size={20} style={{ color: "#38bdf8" }} />
              <h3 style={styles.archCardTitle}>Zero-Trust Local Key Storage</h3>
            </div>
            <p style={styles.archCardText}>
              All marketplace credentials (CSFloat API Keys, DMarket Keypairs, Skins.com tokens) are encrypted locally
              using your operating system's native hardware keychain (Windows DPAPI, macOS Keychain, Linux Secret Service).
              No third-party trading keys ever touch the SkinsBoat cloud.
            </p>
          </div>

          {/* Card 2: Direct Local IP Execution */}
          <div style={styles.archCard}>
            <div style={styles.archCardHeader}>
              <Terminal size={20} style={{ color: "var(--so-primary)" }} />
              <h3 style={styles.archCardTitle}>Direct Local IP Execution</h3>
            </div>
            <p style={styles.archCardText}>
              Workstation orders, target listings, and price sweeps are executed directly from your desktop machine to
              marketplace endpoints. Your trading requests carry your legitimate residential IP, preventing cloud proxy rate
              limits and marketplace bot flags.
            </p>
          </div>

          {/* Card 3: Dual Pricing Core */}
          <div style={styles.archCard}>
            <div style={styles.archCardHeader}>
              <Layers size={20} style={{ color: "#a855f7" }} />
              <h3 style={styles.archCardTitle}>Dual-Tier Valuation Engines</h3>
            </div>
            <p style={styles.archCardText}>
              Skin Oracle harnesses both <strong>SkinOracle v20 Standard</strong> (heuristic multi-market consensus) and{" "}
              <strong>OracleNexus v2</strong> (machine-learned momentum & trend elasticity). Evaluate thousands of CS2 items
              in milliseconds with hyper-stable volatility damping.
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Legal Disclaimer & Source Information ── */}
      <div style={styles.footerContainer}>
        <div>
          Skin Oracle is an official desktop trading terminal developed and maintained by the <strong>SkinsBoat</strong>{" "}
          team. Not affiliated with Valve Corporation, Counter-Strike 2, CSFloat, DMarket, or Skins.com. All trademarks
          and registered trademarks are the property of their respective owners.
        </div>
        <div style={styles.footerLinksRow}>
          <span>© 2026 Skin Oracle by SkinsBoat</span>
          <span>•</span>
          <a
            onClick={() => handleOpenExternal(GITHUB_REPO_URL)}
            style={styles.footerLink}
          >
            Source-Available on GitHub
          </a>
          <span>•</span>
          <a
            onClick={() => handleOpenExternal(`mailto:${SUPPORT_EMAIL}`)}
            style={styles.footerLink}
          >
            support@skinsboat.com
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Clean Extracted Styles Dictionary (Zero inline styles in main render flow)
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1050px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    paddingBottom: "48px",
  },
  heroBanner: {
    position: "relative",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    padding: "32px 36px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  },
  heroGlow: {
    position: "absolute",
    top: "-80px",
    right: "-80px",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)",
    pointerEvents: "none",
  },
  heroMainRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap",
  },
  heroBrandWrap: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flex: 1,
    minWidth: "300px",
  },
  heroLogoBox: {
    width: "72px",
    height: "72px",
    borderRadius: "16px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-strong)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
    flexShrink: 0,
  },
  heroLogoImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  heroMetaWrap: {
    minWidth: 0,
  },
  heroTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "6px",
    flexWrap: "wrap",
  },
  heroTitle: {
    fontSize: "26px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    color: "var(--so-text-primary)",
    margin: 0,
  },
  betaBadge: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    color: "#06b6d4",
    border: "1px solid rgba(6, 182, 212, 0.35)",
    textTransform: "uppercase",
  },
  versionBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    color: "#60a5fa",
    border: "1px solid rgba(37, 99, 235, 0.3)",
    fontFamily: "var(--so-font-mono)",
  },
  heroDescription: {
    fontSize: "13.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  coBrandBadge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 16px",
    borderRadius: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    border: "1px solid var(--so-border-strong)",
    cursor: "pointer",
    transition: "all 0.18s ease",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  coBrandLogoBox: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: "2px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  coBrandLogoImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  coBrandSubLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1px",
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
  },
  coBrandMainLabel: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  actionStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "14px",
    paddingTop: "16px",
    borderTop: "1px solid var(--so-border-subtle)",
  },
  actionButtonsWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    color: "#ffffff",
    border: "none",
    fontSize: "13px",
    fontWeight: 700,
    transition: "all 0.15s ease",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    border: "1px solid var(--so-border-strong)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  secondaryBtnMuted: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-secondary)",
    border: "1px solid var(--so-border-medium)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  updateStatusWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "var(--so-text-muted)",
  },
  updateStatusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    display: "inline-block",
  },
  sectionHeader: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionHeaderNoMargin: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  contactsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },
  contactCard: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  contactCardInner: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  contactCardTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  contactCardSub: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
  },
  discordIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(88, 101, 242, 0.15)",
    color: "#5865F2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  telegramIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(0, 136, 204, 0.15)",
    color: "#0088cc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emailCardClickable: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    flex: 1,
    minWidth: 0,
  },
  emailIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    color: "var(--so-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emailTextWrap: {
    minWidth: 0,
  },
  emailAddressText: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  copyEmailBtn: {
    background: "transparent",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-sm)",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: "8px",
    transition: "all 0.15s ease",
  },
  websiteIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  faqSectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  faqHeaderHint: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
  },
  faqContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  faqItemCard: {
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    overflow: "hidden",
    transition: "border-color 0.18s ease",
  },
  faqHeaderButton: {
    width: "100%",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    gap: "14px",
    transition: "background-color 0.15s ease",
  },
  faqQuestionRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flex: 1,
  },
  faqIconBox: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  faqTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  faqCategoryWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  faqCategoryBadge: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "1px 6px",
    borderRadius: "4px",
    border: "1px solid",
    textTransform: "uppercase",
  },
  faqQuestionText: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    lineHeight: 1.35,
  },
  faqToggleIconBox: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  faqExpandedContent: {
    padding: "16px 20px 20px 66px",
    borderTop: "1px solid var(--so-border-subtle)",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  faqBody: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  faqHighlightBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
  },
  faqHighlightText: {
    fontSize: "13px",
    color: "var(--so-text-primary)",
    lineHeight: 1.5,
  },
  faqParagraph: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.55,
    margin: 0,
  },
  faqGridTwoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "14px",
    marginTop: "4px",
  },
  faqCardCol: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-md)",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  faqColHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  freeBadge: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  paidBadge: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.3)",
  },
  faqColTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  faqBulletList: {
    margin: 0,
    paddingLeft: "18px",
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.55,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  architectureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  },
  archCard: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-md)",
    padding: "20px",
  },
  archCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  archCardTitle: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  archCardText: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
    margin: 0,
  },
  footerContainer: {
    padding: "16px 20px",
    borderTop: "1px solid var(--so-border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "center",
    color: "var(--so-text-muted)",
    fontSize: "11.5px",
    lineHeight: 1.6,
  },
  footerLinksRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  footerLink: {
    color: "var(--so-text-secondary)",
    textDecoration: "underline",
    cursor: "pointer",
  },
};
