import React from "react";
import { Ban, X, Trash2, Shield } from "lucide-react";
import { extractBaseName } from "../../utils/oracleUtils";

interface BlockedSkinsPanelProps {
  blockedSkins: string[];
  blockSkin: (name: string) => void;
  unblockSkin: (name: string) => void;
  clearBlockedSkins: () => void;
}

export const BlockedSkinsPanel: React.FC<BlockedSkinsPanelProps> = ({
  blockedSkins,
  blockSkin,
  unblockSkin,
  clearBlockedSkins,
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const name = inputValue.trim();
    if (!name) return;
    // Store the base name so "StatTrak™ AWP | Atheris (FN)" typed by accident
    // normalises to "AWP | Atheris" automatically.
    const baseName = extractBaseName(name);
    blockSkin(baseName);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div style={styles.panelContainer}>
      <div style={styles.headerRow}>
        <div style={styles.headerTitle}>
          <Ban size={16} style={styles.banIcon} />
          Blocked Skins
          {blockedSkins.length > 0 && (
            <span style={styles.countBadge}>
              {blockedSkins.length} pattern{blockedSkins.length !== 1 ? "s" : ""} blocked
            </span>
          )}
        </div>

        {blockedSkins.length > 0 && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={clearBlockedSkins}
            style={styles.clearAllBtn}
            title="Remove all blocked skin patterns"
          >
            <Trash2 size={12} />
            Clear All
          </button>
        )}
      </div>

      <p style={styles.description}>
        Enter a base skin name (e.g.{" "}
        <code style={styles.codeHint}>AWP | Atheris</code>) to block{" "}
        <strong>all variants</strong> — every wear condition, StatTrak™ and
        Souvenir version. For stickers enter the full name (e.g.{" "}
        <code style={styles.codeHint}>Sticker | Howl</code>). Blocked skins are
        silently skipped by the Oracle engine and never sent for evaluation.
        Manage the full list in{" "}
        <span style={styles.settingsHint}>Settings → Blocked Skins</span>.
      </p>

      {/* Input Row */}
      <div style={styles.inputRow}>
        <div style={styles.inputWrap}>
          <Shield size={13} style={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder='Base skin name — e.g. "AWP | Atheris" or "Sticker | Howl"'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.input}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          style={getAddBtnStyle(!inputValue.trim())}
        >
          <Ban size={13} />
          Block
        </button>
      </div>

      {/* Chip List */}
      {blockedSkins.length > 0 ? (
        <div style={styles.chipGrid}>
          {blockedSkins.map((name) => (
            <div key={name} style={styles.chip} title={`Blocks all variants of: ${name}`}>
              <Ban size={10} style={styles.chipIcon} />
              <span style={styles.chipText}>{name}</span>
              <button
                type="button"
                onClick={() => unblockSkin(name)}
                style={styles.chipRemoveBtn}
                title={`Unblock "${name}"`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.emptyState}>
          No skins blocked. Add a base name above to exclude it and all its
          variants from Oracle evaluation.
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────────────

function getAddBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    whiteSpace: "nowrap",
    fontSize: "12px",
    fontWeight: 700,
    padding: "0 14px",
    height: "32px",
    flexShrink: 0,
    backgroundColor: disabled
      ? "var(--so-surface-input)"
      : "rgba(239, 68, 68, 0.15)",
    color: disabled ? "var(--so-text-muted)" : "var(--so-danger-text, #ef4444)",
    border: disabled
      ? "1px solid var(--so-border-subtle)"
      : "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "var(--so-radius-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.6 : 1,
  };
}

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    marginBottom: "18px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  banIcon: {
    color: "var(--so-danger, #ef4444)",
  },
  countBadge: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    color: "var(--so-danger-text, #ef4444)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  clearAllBtn: {
    fontSize: "11.5px",
    padding: "3px 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    color: "var(--so-danger-text, #ef4444)",
  },
  description: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginBottom: "14px",
    lineHeight: 1.6,
  },
  codeHint: {
    fontFamily: "monospace",
    fontSize: "11.5px",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    padding: "1px 5px",
    borderRadius: "3px",
    color: "var(--so-primary-light, #818cf8)",
  },
  settingsHint: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "14px",
  },
  inputWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "32px",
    padding: "0 10px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
  },
  inputIcon: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontFamily: "inherit",
  },
  chipGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 6px 4px 8px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(239, 68, 68, 0.09)",
    border: "1px solid rgba(239, 68, 68, 0.28)",
    maxWidth: "320px",
  },
  chipIcon: {
    color: "var(--so-danger-text, #ef4444)",
    opacity: 0.7,
    flexShrink: 0,
  },
  chipText: {
    fontSize: "11.5px",
    color: "var(--so-danger-text, #ef4444)",
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  chipRemoveBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    color: "var(--so-danger-text, #ef4444)",
    opacity: 0.65,
    flexShrink: 0,
    lineHeight: 1,
  },
  emptyState: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    fontStyle: "italic",
    paddingTop: "2px",
  },
};
