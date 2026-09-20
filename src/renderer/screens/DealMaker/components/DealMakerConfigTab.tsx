import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Star,
  Store,
  ExternalLink,
  Link as LinkIcon,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MarketLogo } from '../../../components/MarketLogo';
import { getMarketDisplayName } from '../../../../shared/canonicalMarkets';
import {
  DEALMAKER_STORE_LINK_MARKETS,
  getDealMakerMarket,
  validateDealMakerLink,
} from '../../../../shared/dealmakerMarkets';
import { confirmModal } from '../../../store/useConfirmStore';
import {
  StoreLink,
  getStoreLinks,
  addStoreLink,
  updateStoreLink,
  removeStoreLink,
  setDefaultStoreLink,
} from '../../../utils/storage';

/**
 * Marketplaces where a DealMaker seller can host a store / stall and share a
 * direct link after a flash deal matches. Skins.com is intentionally excluded
 * because it does not expose seller store links.
 */
const MARKET_OPTIONS = DEALMAKER_STORE_LINK_MARKETS.map((m) => ({
  id: m.id,
  label: m.name,
}));

interface StoreLinkDraft {
  marketplace: string;
  label: string;
  url: string;
}

const EMPTY_DRAFT: StoreLinkDraft = {
  marketplace: MARKET_OPTIONS[0].id,
  label: '',
  url: '',
};

export const DealMakerConfigTab: React.FC = () => {
  const [links, setLinks] = useState<StoreLink[]>(() => getStoreLinks());
  const [draft, setDraft] = useState<StoreLinkDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<StoreLinkDraft>(EMPTY_DRAFT);

  const refresh = useCallback(() => {
    setLinks(getStoreLinks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => {
      if (a.marketplace !== b.marketplace) {
        return a.marketplace.localeCompare(b.marketplace);
      }
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [links]);

  const marketplaceCount = useMemo(
    () => new Set(links.map((l) => l.marketplace)).size,
    [links],
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const url = draft.url.trim();
    const check = validateDealMakerLink(draft.marketplace, 'store', url);
    if (!check.valid) {
      toast.error(check.message || 'Enter a valid store link');
      return;
    }

    addStoreLink({
      marketplace: draft.marketplace,
      label: draft.label,
      url,
    });
    refresh();
    setDraft({ ...EMPTY_DRAFT, marketplace: draft.marketplace });
    toast.success('Store link added');
  };

  const startEdit = (link: StoreLink) => {
    setEditingId(link.id);
    setEditDraft({
      marketplace: link.marketplace,
      label: link.label,
      url: link.url,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const url = editDraft.url.trim();
    const check = validateDealMakerLink(editDraft.marketplace, 'store', url);
    if (!check.valid) {
      toast.error(check.message || 'Enter a valid store link');
      return;
    }
    updateStoreLink(editingId, {
      marketplace: editDraft.marketplace,
      label: editDraft.label,
      url,
    });
    refresh();
    cancelEdit();
    toast.success('Store link updated');
  };

  const handleDelete = async (link: StoreLink) => {
    const label = link.label || getMarketDisplayName(link.marketplace);
    const confirmed = await confirmModal({
      title: 'Remove Store Link?',
      message: `Remove "${label}" from your saved store links? Deals you already shared are not affected.`,
      confirmText: 'Remove Link',
      variant: 'danger',
    });
    if (!confirmed) return;
    removeStoreLink(link.id);
    refresh();
    toast.success('Store link removed');
  };

  const handleSetDefault = (link: StoreLink) => {
    setDefaultStoreLink(link.id);
    refresh();
    toast.success(
      `Default ${getMarketDisplayName(link.marketplace)} link updated`,
    );
  };

  const handleOpen = (url: string) => {
    if (!url) return;
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else if (window.electronAPI?.auction?.openExternalLink) {
      window.electronAPI.auction.openExternalLink(url);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.introCard}>
        <div style={styles.introIconBox}>
          <ShieldCheck size={18} style={styles.introIcon} />
        </div>
        <div style={styles.introText}>
          <h3 style={styles.introTitle}>Seller Store Links</h3>
          <p style={styles.introSubtitle}>
            Register your {MARKET_OPTIONS.length} supported marketplace stalls
            and personal stores. The default link per market is offered as a
            1-click share whenever one of your flash deals matches.
          </p>
        </div>
        <div style={styles.summaryBadges}>
          <span style={styles.summaryBadge}>
            {links.length} {links.length === 1 ? 'Link' : 'Links'}
          </span>
          <span style={styles.summaryBadge}>
            {marketplaceCount}{' '}
            {marketplaceCount === 1 ? 'Market' : 'Markets'}
          </span>
        </div>
      </div>

      {/* Add Store Link */}
      <form onSubmit={handleAdd} style={styles.addForm}>
        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.fieldLabel}>Marketplace</label>
            <select
              value={draft.marketplace}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, marketplace: e.target.value }))
              }
              style={styles.select}
            >
              {MARKET_OPTIONS.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.fieldLabel}>Label (optional)</label>
            <input
              type="text"
              placeholder="Main Stall, Alt Account..."
              value={draft.label}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, label: e.target.value }))
              }
              style={styles.textInput}
            />
          </div>

          <div style={styles.fieldWide}>
            <label style={styles.fieldLabel}>Store Link URL</label>
            <div style={styles.inputWrapper}>
              <LinkIcon size={14} style={styles.inputIcon} />
              <input
                type="url"
                placeholder={
                  getDealMakerMarket(draft.marketplace)?.storeUrlPlaceholder ||
                  'https://...'
                }
                value={draft.url}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, url: e.target.value }))
                }
                style={styles.urlInput}
              />
            </div>
          </div>

          <button type="submit" style={styles.addBtn}>
            <Plus size={14} />
            <span>Add Link</span>
          </button>
        </div>
      </form>

      {/* Store Link Registry */}
      {sortedLinks.length === 0 ? (
        <div style={styles.emptyState}>
          <Store size={38} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>No Store Links Configured</h3>
          <p style={styles.emptySubtitle}>
            Add your {MARKET_OPTIONS.length} supported marketplace stalls or
            personal stores above to enable 1-click link sharing when a flash
            deal matches.
          </p>
        </div>
      ) : (
        <div style={styles.linkList}>
          {sortedLinks.map((link) => {
            const marketName = getMarketDisplayName(link.marketplace);
            const isEditing = editingId === link.id;

            if (isEditing) {
              return (
                <form
                  key={link.id}
                  onSubmit={saveEdit}
                  style={styles.linkRowEditing}
                >
                  <select
                    value={editDraft.marketplace}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        marketplace: e.target.value,
                      }))
                    }
                    style={styles.select}
                  >
                    {MARKET_OPTIONS.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Label (optional)"
                    value={editDraft.label}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    style={styles.editLabelInput}
                  />

                  <div style={styles.inputWrapperWide}>
                    <LinkIcon size={14} style={styles.inputIcon} />
                    <input
                      type="url"
                      value={editDraft.url}
                      onChange={(e) =>
                        setEditDraft((prev) => ({ ...prev, url: e.target.value }))
                      }
                      style={styles.urlInput}
                    />
                  </div>

                  <div style={styles.rowActions}>
                    <button
                      type="submit"
                      style={styles.iconActionBtn}
                      title="Save changes"
                    >
                      <Check size={15} style={{ color: '#22c55e' }} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={styles.iconActionBtn}
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={link.id} style={styles.linkRow}>
                <div style={styles.linkMarket}>
                  <MarketLogo
                    marketId={link.marketplace}
                    marketName={marketName}
                    size={18}
                    showBackground={false}
                  />
                  <span style={styles.linkMarketName}>{marketName}</span>
                </div>

                <div style={styles.linkDetails}>
                  <div style={styles.linkLabelRow}>
                    <span style={styles.linkLabel}>
                      {link.label || `${marketName} Store`}
                    </span>
                    {link.isDefault && (
                      <span style={styles.defaultBadge}>
                        <Star size={11} />
                        <span>Default</span>
                      </span>
                    )}
                  </div>
                  <span style={styles.linkUrl} title={link.url}>
                    {link.url}
                  </span>
                </div>

                <div style={styles.rowActions}>
                  {!link.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(link)}
                      style={styles.iconActionBtn}
                      title={`Set as default ${marketName} link`}
                    >
                      <Star size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpen(link.url)}
                    style={styles.iconActionBtn}
                    title="Open link in browser"
                  >
                    <ExternalLink size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(link)}
                    style={styles.iconActionBtn}
                    title="Edit link"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(link)}
                    style={styles.iconActionBtnDanger}
                    title="Remove link"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.footerNote}>
        <RotateCcw size={13} style={styles.footerIcon} />
        <span>
          Links are stored locally on this machine and never transmitted to the
          SkinOracle backend.
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  introCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    flexWrap: 'wrap',
  },
  introIconBox: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  introIcon: {
    color: '#38bdf8',
  },
  introText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    minWidth: '240px',
  },
  introTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  introSubtitle: {
    margin: 0,
    fontSize: '12.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.45,
  },
  summaryBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summaryBadge: {
    fontSize: '11.5px',
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    whiteSpace: 'nowrap',
  },
  addForm: {
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  formRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    minWidth: '150px',
    flex: '0 1 180px',
  },
  fieldWide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: '1 1 280px',
    minWidth: '240px',
  },
  fieldLabel: {
    fontSize: '10.5px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    color: 'var(--so-text-muted, #64748b)',
  },
  select: {
    height: '36px',
    padding: '0 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  textInput: {
    height: '36px',
    padding: '0 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13px',
    outline: 'none',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputWrapperWide: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 260px',
    minWidth: '220px',
  },
  inputIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  urlInput: {
    width: '100%',
    height: '36px',
    padding: '0 10px 0 30px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13px',
    outline: 'none',
  },
  addBtn: {
    height: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 16px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    flexWrap: 'wrap',
  },
  linkRowEditing: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    flexWrap: 'wrap',
  },
  editLabelInput: {
    height: '36px',
    padding: '0 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13px',
    outline: 'none',
    flex: '0 1 160px',
  },
  linkMarket: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    width: '130px',
    flexShrink: 0,
  },
  linkMarketName: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  linkDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    minWidth: '200px',
    overflow: 'hidden',
  },
  linkLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  linkLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  defaultBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.3px',
    padding: '2px 7px',
    borderRadius: '20px',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    color: '#eab308',
  },
  linkUrl: {
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  },
  rowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  iconActionBtn: {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    backgroundColor: 'var(--so-surface-panel, #181d27)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  iconActionBtnDanger: {
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.28)',
    color: '#f87171',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '10px',
  },
  emptyIcon: {
    color: 'var(--so-text-muted, #475569)',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  emptySubtitle: {
    margin: 0,
    maxWidth: '420px',
    fontSize: '12.5px',
    color: 'var(--so-text-muted, #64748b)',
    lineHeight: 1.45,
  },
  footerNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #64748b)',
  },
  footerIcon: {
    color: '#64748b',
    flexShrink: 0,
  },
};
