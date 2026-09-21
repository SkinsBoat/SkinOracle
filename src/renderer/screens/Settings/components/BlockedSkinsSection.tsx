import React from "react";
import {
  Ban,
  Clipboard,
  Trash2,
  Download,
  Upload,
  Search,
  X,
  AlertTriangle,
  Plus,
  Info,
} from "lucide-react";
import { useOracleStore } from "../../../store/useOracleStore";
import { confirmModal } from "../../../store/useConfirmStore";
import { extractBaseName } from "../../Oracle/utils/oracleUtils";
import toast from "react-hot-toast";

export const BlockedSkinsSection: React.FC = () => {
  const { blockedSkins, blockSkin, unblockSkin, clearBlockedSkins } =
    useOracleStore();

  const [inputValue, setInputValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Live-preview: what base name will actually get stored
  const previewBaseName = React.useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return null;
    return extractBaseName(trimmed);
  }, [inputValue]);

  const isDuplicate = previewBaseName
    ? blockedSkins.includes(previewBaseName)
    : false;

  // ── Add single skin ──────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!previewBaseName || isDuplicate) return;
    blockSkin(previewBaseName);
    setInputValue("");
    inputRef.current?.focus();
    toast.success(`Blocked: ${previewBaseName}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // ── Paste from clipboard ────────────────────────────────────────────────
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputValue(text.trim());
        inputRef.current?.focus();
      } else {
        toast("Clipboard is empty", { icon: "📋" });
      }
    } catch (err: any) {
      toast.error("Failed to read clipboard: " + (err?.message || "Permission denied"));
    }
  };

  // ── Filtered display list ────────────────────────────────────────────────
  const filteredList = React.useMemo(() => {
    if (!searchQuery.trim()) return blockedSkins;
    const q = searchQuery.toLowerCase();
    return blockedSkins.filter((name) => name.toLowerCase().includes(q));
  }, [blockedSkins, searchQuery]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (blockedSkins.length === 0) {
      toast("No blocked skins to export.", { icon: "ℹ️" });
      return;
    }
    const json = JSON.stringify(blockedSkins, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blocked-skins-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${blockedSkins.length} pattern(s).`);
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (
          !Array.isArray(parsed) ||
          parsed.some((item) => typeof item !== "string")
        ) {
          setImportError(
            'Invalid format — file must be a JSON array of strings, e.g. ["AWP | Atheris", ...]',
          );
          return;
        }
        let added = 0;
        parsed.forEach((raw: string) => {
          const base = extractBaseName(raw.trim());
          if (base && !blockedSkins.includes(base)) {
            blockSkin(base);
            added++;
          }
        });
        setImportError(null);
        toast.success(
          `Imported ${added} new pattern(s). ${parsed.length - added} duplicate(s) skipped.`,
        );
      } catch {
        setImportError("Failed to parse file — make sure it is valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Clear All ────────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (blockedSkins.length === 0) return;
    const confirmed = await confirmModal({
      title: "Clear All Blocked Skins?",
      message: `This will unblock all ${blockedSkins.length} pattern(s) and allow them to be evaluated by Oracle again. Export a backup first if you need to restore later.`,
      confirmText: "Clear All",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    clearBlockedSkins();
    toast.success("All blocked skin patterns cleared.");
  };

  // ── Preview hint text ────────────────────────────────────────────────────
  const previewHint = React.useMemo(() => {
    if (!inputValue.trim()) return null;
    if (!previewBaseName) return null;
    const isNormalized = previewBaseName !== inputValue.trim();
    if (isDuplicate) {
      return { text: `Already blocked: ${previewBaseName}`, type: "warn" as const };
    }
    if (isNormalized) {
      return { text: `Will block as: ${previewBaseName}`, type: "info" as const };
    }
    return { text: `Will block: ${previewBaseName} (all wears & variants)`, type: "ok" as const };
  }, [inputValue, previewBaseName, isDuplicate]);

  return (
    <div style={styles.container}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div style={styles.iconBox}>
          <Ban size={20} style={styles.headerIcon} />
        </div>
        <div>
          <h2 style={styles.title}>Blocked Skins</h2>
          <p style={styles.subtitle}>
            Skins added here are excluded from Oracle evaluation entirely —
            every wear condition, StatTrak™ and Souvenir variant is blocked.
            Paste any format (full hash name or short base name) and we'll
            normalize it automatically.
          </p>
        </div>
      </div>

      {/* ── Add skin input card ─────────────────────────────────────────── */}
      <div style={styles.addCard}>
        <div style={styles.addCardHeader}>
          <Plus size={15} style={styles.addCardIcon} />
          <span style={styles.addCardTitle}>Add Skin to Block List</span>
        </div>

        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            type="text"
            placeholder='Paste any format — e.g. "AWP | Atheris" or "StatTrak™ AWP | Atheris (Factory New)"'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={getInputStyle(isDuplicate)}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handlePaste}
            style={getPasteBtnStyle()}
            title="Paste from clipboard"
          >
            <Clipboard size={13} />
            Paste
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!previewBaseName || isDuplicate}
            style={getAddBtnStyle(!previewBaseName || isDuplicate)}
          >
            <Ban size={13} />
            Block
          </button>
        </div>

        {/* Live preview hint */}
        {previewHint && (
          <div style={getHintStyle(previewHint.type)}>
            {previewHint.type === "warn" ? (
              <AlertTriangle size={12} />
            ) : (
              <Info size={12} />
            )}
            <span>{previewHint.text}</span>
          </div>
        )}

        <p style={styles.inputHelp}>
          Short name (<code style={styles.code}>AWP | Atheris</code>) or full
          hash (<code style={styles.code}>StatTrak™ AWP | Atheris (FN)</code>
          ) — both work. Wear suffix and StatTrak™ / Souvenir prefix are
          stripped automatically so one entry covers all variants.
        </p>
      </div>

      {/* ── Stats + action bar ──────────────────────────────────────────── */}
      <div style={styles.statsBar}>
        <div style={styles.statGroup}>
          <span style={styles.statValue}>{blockedSkins.length}</span>
          <span style={styles.statLabel}>
            Pattern{blockedSkins.length !== 1 ? "s" : ""} blocked
          </span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statGroup}>
          <span style={styles.statValue}>~{blockedSkins.length * 5}</span>
          <span style={styles.statLabel}>Variants excluded</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statGroup}>
          <span style={getStorageLabelStyle(blockedSkins.length)}>
            {blockedSkins.length === 0
              ? "Empty"
              : blockedSkins.length <= 500
                ? "Optimal"
                : blockedSkins.length <= 2000
                  ? "Normal"
                  : "Large"}
          </span>
          <span style={styles.statLabel}>List size</span>
        </div>

        <div style={styles.statActions}>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleImportClick}
            style={styles.actionBtn}
            title="Restore from a JSON backup"
          >
            <Upload size={13} /> Import
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleExport}
            disabled={blockedSkins.length === 0}
            style={styles.actionBtn}
            title="Export as JSON backup"
          >
            <Download size={13} /> Export
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleClearAll}
            disabled={blockedSkins.length === 0}
            style={getClearBtnStyle(blockedSkins.length === 0)}
            title="Clear all blocked skins"
          >
            <Trash2 size={13} /> Clear All
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={styles.hiddenInput}
        />
      </div>

      {/* Import error */}
      {importError && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{importError}</span>
          <button onClick={() => setImportError(null)} style={styles.errorClose}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── List card ───────────────────────────────────────────────────── */}
      <div style={styles.listCard}>
        {/* Search */}
        <div style={styles.searchRow}>
          <div style={styles.searchWrap}>
            <Search size={13} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search blocked patterns…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              spellCheck={false}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={styles.clearSearchBtn}>
                <X size={12} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span style={styles.searchCount}>
              {filteredList.length} / {blockedSkins.length} shown
            </span>
          )}
        </div>

        {/* Body */}
        {blockedSkins.length === 0 ? (
          <div style={styles.emptyState}>
            <Ban size={34} style={styles.emptyIcon} />
            <p style={styles.emptyTitle}>No Blocked Skins Yet</p>
            <p style={styles.emptyDesc}>
              Add a skin name above to start blocking it from Oracle
              evaluation.
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyDesc}>
              No patterns match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div style={styles.tableHeader}>
              <span>Base Pattern</span>
              <span />
            </div>
            {/* Rows */}
            <div style={styles.tableBody}>
              {filteredList.map((name) => (
                <div key={name} style={styles.tableRow}>
                  <div style={styles.rowNameCell}>
                    <Ban size={11} style={styles.rowIcon} />
                    <span style={styles.rowName}>{name}</span>
                  </div>
                  <div style={styles.rowAction}>
                    <button
                      onClick={() => unblockSkin(name)}
                      style={styles.unblockBtn}
                      title={`Unblock "${name}"`}
                    >
                      <X size={12} /> Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC HELPERS ───────────────────────────────────────

function getInputStyle(isDuplicate: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: "36px",
    padding: "0 12px",
    borderRadius: "var(--so-radius-sm)",
    border: isDuplicate
      ? "1px solid rgba(239, 68, 68, 0.5)"
      : "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
    color: "var(--so-text-primary)",
    fontSize: "12.5px",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s ease",
  };
}

function getPasteBtnStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "36px",
    padding: "0 14px",
    fontSize: "12.5px",
    fontWeight: 700,
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getAddBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "36px",
    padding: "0 16px",
    fontSize: "12.5px",
    fontWeight: 700,
    borderRadius: "var(--so-radius-sm)",
    border: disabled
      ? "1px solid var(--so-border-subtle)"
      : "1px solid rgba(239, 68, 68, 0.4)",
    backgroundColor: disabled ? "var(--so-surface-input)" : "rgba(239, 68, 68, 0.14)",
    color: disabled ? "var(--so-text-muted)" : "var(--so-danger-text, #ef4444)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    flexShrink: 0,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getHintStyle(
  type: "info" | "ok" | "warn",
): React.CSSProperties {
  const colorMap = {
    ok: "rgba(34, 197, 94, 0.12)",
    info: "rgba(99, 102, 241, 0.1)",
    warn: "rgba(239, 68, 68, 0.1)",
  };
  const textMap = {
    ok: "var(--so-success-text, #22c55e)",
    info: "var(--so-primary-light, #818cf8)",
    warn: "var(--so-danger-text, #ef4444)",
  };
  return {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "6px 10px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: colorMap[type],
    color: textMap[type],
    fontSize: "12px",
    fontWeight: 600,
    marginTop: "8px",
  };
}

function getClearBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontSize: "12px",
    padding: "3px 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    color: disabled ? "var(--so-text-muted)" : "var(--so-danger-text, #ef4444)",
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function getStorageLabelStyle(count: number): React.CSSProperties {
  return {
    fontSize: "15px",
    fontWeight: 800,
    color:
      count === 0
        ? "var(--so-text-muted)"
        : count <= 500
          ? "var(--so-success-text, #22c55e)"
          : count <= 2000
            ? "var(--so-cyan-text)"
            : "var(--so-warning-text, #f59e0b)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },
  iconBox: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerIcon: {
    color: "var(--so-danger, #ef4444)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.55,
  },
  // ── Add card ──
  addCard: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
  },
  addCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  addCardIcon: {
    color: "var(--so-primary)",
  },
  addCardTitle: {
    fontSize: "13.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  inputHelp: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    margin: "10px 0 0 0",
    lineHeight: 1.55,
  },
  code: {
    fontFamily: "monospace",
    fontSize: "11px",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    padding: "1px 5px",
    borderRadius: "3px",
    color: "var(--so-primary-light, #818cf8)",
  },
  // ── Stats bar ──
  statsBar: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "12px 18px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    flexWrap: "wrap",
  },
  statGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  statValue: {
    fontSize: "17px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  statDivider: {
    width: "1px",
    height: "30px",
    backgroundColor: "var(--so-border-subtle)",
  },
  statActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "auto",
  },
  actionBtn: {
    fontSize: "12px",
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  hiddenInput: {
    display: "none",
  },
  // ── Error ──
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    fontSize: "12.5px",
    color: "var(--so-danger-text, #ef4444)",
  },
  errorClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--so-danger-text, #ef4444)",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  // ── List card ──
  listCard: {
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    overflow: "hidden",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 14px",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  searchWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    height: "30px",
    padding: "0 10px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
  },
  searchIcon: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontFamily: "inherit",
  },
  clearSearchBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    padding: "2px",
  },
  searchCount: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 90px",
    gap: "12px",
    padding: "7px 14px",
    backgroundColor: "var(--so-surface-card)",
    borderBottom: "1px solid var(--so-border-subtle)",
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tableBody: {
    maxHeight: "460px",
    overflowY: "auto",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 90px",
    gap: "12px",
    padding: "8px 14px",
    alignItems: "center",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  rowNameCell: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    minWidth: 0,
  },
  rowIcon: {
    color: "var(--so-danger, #ef4444)",
    opacity: 0.65,
    flexShrink: 0,
  },
  rowName: {
    fontSize: "12.5px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowVariants: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
  rowAction: {
    display: "flex",
    justifyContent: "flex-end",
  },
  unblockBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 8px",
    fontSize: "11.5px",
    fontWeight: 700,
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.12s ease",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    gap: "10px",
    textAlign: "center",
  },
  emptyIcon: {
    color: "var(--so-text-muted)",
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    margin: 0,
  },
  emptyDesc: {
    fontSize: "13px",
    color: "var(--so-text-muted)",
    margin: 0,
    maxWidth: "360px",
    lineHeight: 1.5,
  },
};
