import React, { useState } from 'react';
import { ClipboardPaste, Radar, Search } from 'lucide-react';

interface RaidStorefrontSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onPaste: () => void;
  isScanning: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** Storefront URL entry with validated clipboard paste and scan action. */
export const RaidStorefrontSearch: React.FC<
  RaidStorefrontSearchProps
> = ({ value, onChange, onSubmit, onPaste, isScanning, inputRef }) => {
  const [isFocused, setIsFocused] = useState(false);
  const disabled = !value.trim();

  return (
    <form onSubmit={onSubmit} style={styles.searchRow}>
      <div style={getInputWrapperStyle(isFocused)}>
        <Radar size={16} style={styles.inputIcon} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste a storefront link or SteamID64 — Skinport, CSFloat, DMarket, or Steam inventory"
          style={styles.input}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        onClick={onPaste}
        style={styles.pasteBtn}
        title="Paste a storefront link from your clipboard (validated in the main process)"
      >
        <ClipboardPaste size={15} />
        <span>Paste</span>
      </button>
      <button
        type="submit"
        disabled={disabled}
        style={getScanBtnStyle(disabled)}
      >
        <Search size={15} />
        <span>{isScanning ? 'Scanning…' : 'Scan Storefront'}</span>
      </button>
    </form>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pasteBtn: {
    height: '42px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    padding: '0 14px',
    borderRadius: 'var(--so-radius-sm, 6px)',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-medium, #2a3342)',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputIcon: { color: 'var(--so-text-muted, #64748b)', flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    outline: 'none',
    boxShadow: 'none',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13.5px',
    fontWeight: 600,
    fontFamily: 'var(--so-font-sans)',
  },
};

function getInputWrapperStyle(isFocused: boolean): React.CSSProperties {
  return {
    ...styles.inputWrapper,
    borderColor: isFocused
      ? 'var(--so-border-focus, #2563eb)'
      : 'var(--so-border-medium, #2a3342)',
    boxShadow: isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
  };
}

function getScanBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '42px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '0 18px',
    borderRadius: '10px',
    backgroundColor: disabled ? 'rgba(22, 163, 74, 0.4)' : '#16a34a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.28)',
  };
}
