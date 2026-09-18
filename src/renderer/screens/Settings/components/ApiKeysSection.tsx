import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { confirmModal } from "../../../store/useConfirmStore";
import { KeyRound, ShieldCheck, Lock, Zap, Save, Trash2, Globe, ShoppingBag } from "lucide-react";
import {
  skinSnipeLogo,
  cs2capLogo,
  csfloatLogo,
  skinsLogo,
  dmarketLogo,
} from "../../../../../assets/images";

export const ApiKeysSection: React.FC = () => {
  const [keysStatus, setKeysStatus] = useState({
    hasSkinsnipeKey: false,
    hasCs2capKey: false,
    hasCsfloatKey: false,
    hasSkinscomToken: false,
    hasDmarketKeys: false,
  });

  const [skinsnipeKey, setSkinsnipeKey] = useState("");
  const [cs2capKey, setCs2capKey] = useState("");
  const [csfloatKey, setCsfloatKey] = useState("");
  const [skinscomToken, setSkinscomToken] = useState("");
  const [dmarketPublicKey, setDmarketPublicKey] = useState("");
  const [dmarketSecretKey, setDmarketSecretKey] = useState("");

  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.settings?.getKeysStatus) {
      window.electronAPI.settings.getKeysStatus().then(setKeysStatus);
    }
  }, []);

  const saveKey = async (
    type: "skinsnipe" | "cs2cap" | "csfloat" | "skinscom" | "dmarket",
  ) => {
    setSaving(type);
    try {
      if (type === "skinsnipe") {
        await window.electronAPI.settings.setSkinsnipeKey(skinsnipeKey);
        setSkinsnipeKey("");
        toast.success("Skinsnipe API key encrypted & saved!");
      } else if (type === "cs2cap") {
        await window.electronAPI.settings.setCs2capKey(cs2capKey);
        setCs2capKey("");
        toast.success("CS2Cap API key encrypted & saved!");
      } else if (type === "csfloat") {
        await window.electronAPI.settings.setCsfloatKey(csfloatKey);
        setCsfloatKey("");
        toast.success("CSFloat API key encrypted & saved!");
      } else if (type === "dmarket") {
        if (!dmarketPublicKey.trim() || !dmarketSecretKey.trim()) {
          toast.error("Both DMarket Public Key and Secret Key are required.");
          return;
        }
        await window.electronAPI.settings.setDmarketKeys(
          dmarketPublicKey.trim(),
          dmarketSecretKey.trim(),
        );
        setDmarketPublicKey("");
        setDmarketSecretKey("");
        toast.success("DMarket API keys encrypted & saved!");
      } else {
        await window.electronAPI.settings.setSkinscomToken(skinscomToken);
        setSkinscomToken("");
        toast.success("Skins.com API key encrypted & saved!");
      }
      const updated = await window.electronAPI.settings.getKeysStatus();
      setKeysStatus(updated);
    } catch (err: any) {
      toast.error(`Failed to save key: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const revokeKey = async (
    type: "skinsnipe" | "cs2cap" | "csfloat" | "skinscom" | "dmarket",
  ) => {
    const label =
      type === "skinsnipe"
        ? "Skinsnipe API key"
        : type === "cs2cap"
          ? "CS2Cap API key"
          : type === "csfloat"
            ? "CSFloat API key"
            : type === "dmarket"
              ? "DMarket API keys"
              : "Skins.com session token";

    const providerName =
      type === "skinsnipe"
        ? "Skinsnipe"
        : type === "cs2cap"
          ? "CS2Cap"
          : type === "csfloat"
            ? "CSFloat"
            : type === "dmarket"
              ? "DMarket"
              : "Skins.com";

    const confirmed = await confirmModal({
      title: type === "dmarket" ? "Remove API Keys?" : "Remove API Key?",
      message: `Are you sure you want to remove your ${label} from Skin Oracle? It will be deleted from your local hardware-encrypted keychain. Your key remains active on ${providerName}.`,
      confirmText: type === "dmarket" ? "Remove Keys" : "Remove Key",
      cancelText: "Keep Key",
      variant: "danger",
    });
    if (!confirmed) return;

    setSaving(`revoke_${type}`);
    try {
      if (type === "skinsnipe") {
        await window.electronAPI.settings.revokeSkinsnipeKey();
        setSkinsnipeKey("");
      } else if (type === "cs2cap") {
        await window.electronAPI.settings.revokeCs2capKey();
        setCs2capKey("");
      } else if (type === "csfloat") {
        await window.electronAPI.settings.revokeCsfloatKey();
        setCsfloatKey("");
      } else if (type === "dmarket") {
        await window.electronAPI.settings.revokeDmarketKeys();
        setDmarketPublicKey("");
        setDmarketSecretKey("");
      } else {
        await window.electronAPI.settings.revokeSkinscomToken();
        setSkinscomToken("");
      }
      toast.success(`${label} removed from device`);
      const updated = await window.electronAPI.settings.getKeysStatus();
      setKeysStatus(updated);
    } catch (err: any) {
      toast.error(`Failed to remove key: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Section Header */}
      <div>
        <h2 style={styles.sectionHeading}>
          <KeyRound size={22} style={{ color: "var(--so-primary)" }} />
          API Keys & Exchange Integrations
        </h2>
        <p style={styles.sectionSubtitle}>
          Manage local price provider feeds and marketplace credentials. All keys are encrypted natively on your machine.
        </p>
      </div>

      {/* Security Banner Card */}
      <div style={styles.securityBanner}>
        <div style={styles.securityBannerHeader}>
          <ShieldCheck size={28} style={{ color: "#38bdf8", flexShrink: 0 }} />
          <div>
            <div style={styles.securityBannerTitleRow}>
              <span>Bank-Grade OS Encryption & Hardware Isolation</span>
              <span style={styles.securityBadge}>100% LOCAL & PRIVATE</span>
            </div>
            <div style={styles.securityBannerDesc}>
              Your API keys and session tokens are stored exclusively on your device using native OS cryptographic storage (
              <strong>macOS Keychain</strong>, <strong>Windows DPAPI</strong>, or <strong>Linux Secret Service</strong>).
            </div>
          </div>
        </div>

        <div style={styles.securityFeaturesGrid}>
          <div style={styles.securityFeatureItem}>
            <Lock size={13} style={{ color: "#38bdf8" }} />
            <span>
              <strong>Zero Cloud Storage:</strong> Keys are never uploaded to our servers.
            </span>
          </div>
          <div style={styles.securityFeatureItem}>
            <Zap size={13} style={{ color: "var(--so-primary)" }} />
            <span>
              <strong>Direct Calls:</strong> Requests go straight from your desktop to CSFloat & Skinsnipe.
            </span>
          </div>
          <div style={styles.securityFeatureItem}>
            <ShieldCheck size={13} style={{ color: "#6366f1" }} />
            <span>
              <strong>Protected Binary:</strong> Production app code is hardened to prevent extraction.
            </span>
          </div>
        </div>
      </div>

      {/* ── Sub-Group 1: Price Sources & Market Data Feeds ── */}
      <div>
        <div style={styles.groupHeading}>
          <Globe size={16} style={{ color: "var(--so-cyan-text)" }} />
          Market Data & Price Sources (Required for Streaming)
        </div>

        <div style={styles.cardsStack}>
          {/* Skinsnipe API Key Card */}
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div style={styles.cardTitleBox}>
                <img
                  src={skinSnipeLogo}
                  alt="Skinsnipe"
                  style={styles.providerLogo}
                />
                <span>Skinsnipe API Key</span>
              </div>
              <span
                style={keysStatus.hasSkinsnipeKey ? styles.badgeSuccess : styles.badgeWarning}
              >
                {keysStatus.hasSkinsnipeKey ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>
            <p style={styles.cardDesc}>
              Used to query market pricing databases and cache live skin listings for Oracle evaluation.
            </p>
            <div style={styles.inputRow}>
              <input
                type="password"
                value={skinsnipeKey}
                onChange={(e) => setSkinsnipeKey(e.target.value)}
                placeholder={keysStatus.hasSkinsnipeKey ? "••••••••••••••••••••••••" : "sk-..."}
                style={styles.keyInput}
              />
              <button
                type="button"
                style={styles.saveBtn}
                onClick={() => saveKey("skinsnipe")}
                disabled={saving === "skinsnipe" || !skinsnipeKey}
              >
                <Save size={14} />
                {saving === "skinsnipe" ? "Saving..." : "Save Key"}
              </button>
              {keysStatus.hasSkinsnipeKey && (
                <button
                  type="button"
                  style={styles.revokeBtn}
                  onClick={() => revokeKey("skinsnipe")}
                  disabled={saving === "revoke_skinsnipe"}
                >
                  <Trash2 size={14} />
                  {saving === "revoke_skinsnipe" ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>

          {/* CS2Cap API Key Card */}
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div style={styles.cardTitleBox}>
                <img
                  src={cs2capLogo}
                  alt="CS2Cap"
                  style={styles.providerLogo}
                />
                <span>CS2Cap API Key</span>
                <span style={styles.quantBadge}>PRO / QUANT STREAMING</span>
              </div>
              <span
                style={keysStatus.hasCs2capKey ? styles.badgeSuccess : styles.badgeWarning}
              >
                {keysStatus.hasCs2capKey ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>
            <p style={styles.cardDesc}>
              Enables high-speed live NDJSON streaming of full CS2 market catalogs across 40+ providers (Buff163, C5, CSFloat, AvanMarket, etc.).
            </p>
            <div style={styles.inputRow}>
              <input
                type="password"
                value={cs2capKey}
                onChange={(e) => setCs2capKey(e.target.value)}
                placeholder={keysStatus.hasCs2capKey ? "••••••••••••••••••••••••" : "sk_live_..."}
                style={styles.keyInput}
              />
              <button
                type="button"
                style={styles.saveBtn}
                onClick={() => saveKey("cs2cap")}
                disabled={saving === "cs2cap" || !cs2capKey}
              >
                <Save size={14} />
                {saving === "cs2cap" ? "Saving..." : "Save Key"}
              </button>
              {keysStatus.hasCs2capKey && (
                <button
                  type="button"
                  style={styles.revokeBtn}
                  onClick={() => revokeKey("cs2cap")}
                  disabled={saving === "revoke_cs2cap"}
                >
                  <Trash2 size={14} />
                  {saving === "revoke_cs2cap" ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Group 2: Trading Marketplaces (Execution) ── */}
      <div>
        <div style={styles.groupHeading}>
          <ShoppingBag size={16} style={{ color: "var(--so-primary)" }} />
          Trading Marketplaces (Optional for Execution)
        </div>

        <div style={styles.cardsStack}>
          {/* CSFloat API Key Card */}
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div style={styles.cardTitleBox}>
                <img
                  src={csfloatLogo}
                  alt="CSFloat"
                  style={styles.providerLogo}
                />
                <span>CSFloat API Key</span>
              </div>
              <span
                style={keysStatus.hasCsfloatKey ? styles.badgeSuccess : styles.badgeWarning}
              >
                {keysStatus.hasCsfloatKey ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>
            <p style={styles.cardDesc}>
              Allows the CSFloat Workstation to fetch buy orders, execute single order updates, and run automated batch price adjustments.
            </p>
            <div style={styles.inputRow}>
              <input
                type="password"
                value={csfloatKey}
                onChange={(e) => setCsfloatKey(e.target.value)}
                placeholder={keysStatus.hasCsfloatKey ? "••••••••••••••••••••••••" : "Your CSFloat API Key"}
                style={styles.keyInput}
              />
              <button
                type="button"
                style={styles.saveBtn}
                onClick={() => saveKey("csfloat")}
                disabled={saving === "csfloat" || !csfloatKey}
              >
                <Save size={14} />
                {saving === "csfloat" ? "Saving..." : "Save Key"}
              </button>
              {keysStatus.hasCsfloatKey && (
                <button
                  type="button"
                  style={styles.revokeBtn}
                  onClick={() => revokeKey("csfloat")}
                  disabled={saving === "revoke_csfloat"}
                >
                  <Trash2 size={14} />
                  {saving === "revoke_csfloat" ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>

          {/* DMarket API Key Card */}
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div style={styles.cardTitleBox}>
                <img
                  src={dmarketLogo}
                  alt="DMarket"
                  style={styles.providerLogo}
                />
                <span>DMarket API Keypair</span>
              </div>
              <span
                style={keysStatus.hasDmarketKeys ? styles.badgeSuccess : styles.badgeWarning}
              >
                {keysStatus.hasDmarketKeys ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>
            <p style={styles.cardDesc}>
              Allows the DMarket Workstation to query your personal inventory, manage buy targets, and execute trade orders via Ed25519 signatures.
            </p>
            <div style={styles.dmarketInputCol}>
              <input
                type="password"
                value={dmarketPublicKey}
                onChange={(e) => setDmarketPublicKey(e.target.value)}
                placeholder={keysStatus.hasDmarketKeys ? "•••••••••••••••••••••••• (Public Key)" : "DMarket Public Key (hex string)"}
                style={styles.keyInput}
              />
              <input
                type="password"
                value={dmarketSecretKey}
                onChange={(e) => setDmarketSecretKey(e.target.value)}
                placeholder={keysStatus.hasDmarketKeys ? "•••••••••••••••••••••••• (Secret Key)" : "DMarket Secret / Private Key (hex string)"}
                style={styles.keyInput}
              />
              <div style={styles.dmarketActionRow}>
                <button
                  type="button"
                  style={styles.saveBtn}
                  onClick={() => saveKey("dmarket")}
                  disabled={saving === "dmarket" || !dmarketPublicKey || !dmarketSecretKey}
                >
                  <Save size={14} />
                  {saving === "dmarket" ? "Saving..." : "Save DMarket Keypair"}
                </button>
                {keysStatus.hasDmarketKeys && (
                  <button
                    type="button"
                    style={styles.revokeBtn}
                    onClick={() => revokeKey("dmarket")}
                    disabled={saving === "revoke_dmarket"}
                  >
                    <Trash2 size={14} />
                    {saving === "revoke_dmarket" ? "Removing..." : "Remove Keys"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Skins.com API Key Card */}
          <div style={styles.card}>
            <div style={styles.cardTopRow}>
              <div style={styles.cardTitleBox}>
                <img
                  src={skinsLogo}
                  alt="Skins.com"
                  style={styles.providerLogo}
                />
                <span>Skins.com API Key</span>
              </div>
              <span
                style={keysStatus.hasSkinscomToken ? styles.badgeSuccess : styles.badgeWarning}
              >
                {keysStatus.hasSkinscomToken ? "CONFIGURED" : "NOT SET"}
              </span>
            </div>
            <p style={styles.cardDesc}>
              Required for the Skins.com Workstation to read your active inventory and post batch listing adjustments.
            </p>
            <div style={styles.inputRow}>
              <input
                type="password"
                value={skinscomToken}
                onChange={(e) => setSkinscomToken(e.target.value)}
                placeholder={keysStatus.hasSkinscomToken ? "••••••••••••••••••••••••" : "Bearer ..."}
                style={styles.keyInput}
              />
              <button
                type="button"
                style={styles.saveBtn}
                onClick={() => saveKey("skinscom")}
                disabled={saving === "skinscom" || !skinscomToken}
              >
                <Save size={14} />
                {saving === "skinscom" ? "Saving..." : "Save Token"}
              </button>
              {keysStatus.hasSkinscomToken && (
                <button
                  type="button"
                  style={styles.revokeBtn}
                  onClick={() => revokeKey("skinscom")}
                  disabled={saving === "revoke_skinscom"}
                >
                  <Trash2 size={14} />
                  {saving === "revoke_skinscom" ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Styles Dictionary (Rule 9: Zero inline styles in render flow)
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  sectionHeading: {
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "4px",
    marginBottom: 0,
    lineHeight: 1.45,
  },
  securityBanner: {
    backgroundColor: "rgba(14, 165, 233, 0.06)",
    border: "1px solid rgba(14, 165, 233, 0.22)",
    borderRadius: "var(--so-radius-md)",
    padding: "18px 22px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  securityBannerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  securityBannerTitleRow: {
    fontWeight: 800,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  securityBadge: {
    fontSize: "10px",
    padding: "2px 7px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    color: "var(--so-cyan-text, #38bdf8)",
    border: "1px solid rgba(14, 165, 233, 0.3)",
    letterSpacing: "0.5px",
  },
  securityBannerDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    marginTop: "3px",
    lineHeight: 1.4,
  },
  securityFeaturesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
    borderTop: "1px solid rgba(14, 165, 233, 0.15)",
    paddingTop: "12px",
  },
  securityFeatureItem: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  groupHeading: {
    fontSize: "13px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cardsStack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  card: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
  },
  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleBox: {
    fontWeight: 700,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  providerLogo: {
    height: 20,
    width: "auto",
    objectFit: "contain",
  },
  quantBadge: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    color: "var(--so-cyan-text, #38bdf8)",
    border: "1px solid rgba(14, 165, 233, 0.3)",
    letterSpacing: "0.5px",
  },
  badgeSuccess: {
    fontSize: "10.5px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    letterSpacing: "0.5px",
  },
  badgeWarning: {
    fontSize: "10.5px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    letterSpacing: "0.5px",
  },
  cardDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "4px",
  },
  keyInput: {
    flex: 1,
    height: "36px",
    padding: "6px 12px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    fontSize: "12.5px",
    fontFamily: "var(--so-font-mono)",
    outline: "none",
    boxSizing: "border-box",
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    border: "1px solid var(--so-primary)",
    color: "#ffffff",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  revokeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "var(--so-danger-text, #ef4444)",
    fontSize: "12.5px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dmarketInputCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "4px",
  },
  dmarketActionRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "flex-end",
  },
};
