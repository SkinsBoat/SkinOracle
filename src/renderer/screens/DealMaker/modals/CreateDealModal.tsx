import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wand2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDealMakerStore } from '../../../store/useDealMakerStore';
import { DEALMAKER_CONSTANTS, AUCTION_CONSTANTS } from '../../../../shared/types/dealmaker.types';
import { SkinImage } from '../../../components/SkinImage';
import { extractWearFromName } from '../../../utils/storage';
import {
  validateMarketHashName,
  setWearInName,
  isNonWearCs2Item,
  searchCatalogSuggestions,
  WEAR_CODE_TO_NAME,
} from '../../../utils/marketHashValidation';
import { MarketLogo } from '../../../components/MarketLogo';
import { getMarketDisplayName } from '../../../../shared/canonicalMarkets';

export interface CreateDealModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export type CreateAuctionModalProps = CreateDealModalProps;

const WEAR_OPTIONS = [
  { label: 'Factory New', value: 'FN' },
  { label: 'Minimal Wear', value: 'MW' },
  { label: 'Field-Tested', value: 'FT' },
  { label: 'Well-Worn', value: 'WW' },
  { label: 'Battle-Scarred', value: 'BS' },
];

// In-memory module cache to eliminate redundant IPC transfers on modal open
let globalCatalogNames: string[] = [];
let globalCatalogSet: Set<string> = new Set();

export const CreateDealModal: React.FC<CreateDealModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    createAuction,
    isCreating,
    isCreateModalOpen,
    initialCreateData,
    closeCreateModal,
    activeTradersCount,
  } = useDealMakerStore();

  const modalOpen = isOpen !== undefined ? isOpen : isCreateModalOpen;
  const handleClose = onClose || closeCreateModal;

  const [marketHashName, setMarketHashName] = useState('');
  const [wear, setWear] = useState('FT');
  const [floatValue, setFloatValue] = useState('');
  const [inspectUrl, setInspectUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [marketplace, setMarketplace] = useState<'csfloat' | 'dmarket'>('csfloat');

  // Catalog cache for autocompletion & verification
  const [catalogNames, setCatalogNames] = useState<string[]>(globalCatalogNames);
  const [catalogSet, setCatalogSet] = useState<Set<string>>(globalCatalogSet);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Load known catalog items from Skinsnipe and Oracle (runs once, cached in memory)
  useEffect(() => {
    if (!modalOpen || globalCatalogNames.length > 0) return;
    let isMounted = true;

    const loadCatalogs = async () => {
      try {
        const names = new Set<string>();

        if (window.electronAPI?.skinsnipe?.getCache) {
          const cache: any = await window.electronAPI.skinsnipe.getCache();
          if (cache && typeof cache === 'object') {
            Object.keys(cache).forEach((k) => names.add(k));
          }
        }

        if (window.electronAPI?.oracle?.getAcceptedPrices) {
          const oracleData: any = await window.electronAPI.oracle.getAcceptedPrices();
          if (oracleData?.map && typeof oracleData.map === 'object') {
            Object.keys(oracleData.map).forEach((k) => names.add(k));
          }
        }

        if (isMounted && names.size > 0) {
          globalCatalogNames = Array.from(names);
          globalCatalogSet = names;
          setCatalogNames(globalCatalogNames);
          setCatalogSet(globalCatalogSet);
        }
      } catch (err) {
        console.warn('[CreateAuctionModal] Error loading catalog names:', err);
      }
    };

    // Load asynchronously in idle microtask to avoid any UI frame drops
    setTimeout(loadCatalogs, 0);

    return () => {
      isMounted = false;
    };
  }, [modalOpen]);

  // Synchronize fields when modal opens or initial data changes (e.g. broadcast from workstation)
  useEffect(() => {
    if (modalOpen && initialCreateData) {
      if (
        initialCreateData.marketplace === 'dmarket' &&
        (initialCreateData.tradable === false || initialCreateData.isLocked === true)
      ) {
        toast.error('Cannot broadcast: This DMarket item is trade-locked or in bot custody.');
        handleClose();
        return;
      }

      const name = initialCreateData.marketHashName || '';
      setMarketHashName(name);
      setWear(
        initialCreateData.wear ||
          extractWearFromName(name) ||
          'FT',
      );
      setFloatValue(initialCreateData.floatValue || '');
      setInspectUrl(initialCreateData.inspectUrl || '');
      setImageUrl(initialCreateData.imageUrl || '');
      const initialMarket = initialCreateData.marketplace === 'dmarket' ? 'dmarket' : 'csfloat';
      setMarketplace(initialMarket);
      setStartingPrice(
        initialCreateData.startingPrice !== undefined && initialCreateData.startingPrice > 0
          ? String(initialCreateData.startingPrice)
          : '',
      );
      setShowSuggestions(false);
    } else if (!modalOpen) {
      setMarketHashName('');
      setFloatValue('');
      setInspectUrl('');
      setImageUrl('');
      setStartingPrice('');
      setShowSuggestions(false);
    }
  }, [modalOpen, initialCreateData]);

  // Escape key and click outside suggestions dropdown listener
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalOpen, handleClose]);

  // Non-wear and sticker detection
  const isNonWear = useMemo(() => isNonWearCs2Item(marketHashName), [marketHashName]);
  const isSticker = useMemo(() => /^Sticker\s*\|/i.test(marketHashName.trim()), [marketHashName]);

  // Real-time market hash name validation
  const validation = useMemo(() => {
    if (!modalOpen) {
      return { isValid: false, status: 'empty' as const };
    }
    return validateMarketHashName(marketHashName, {
      currentWearDropdown: wear,
      catalogSet,
    });
  }, [modalOpen, marketHashName, wear, catalogSet]);

  // Suggestions filtered by query
  const suggestions = useMemo(() => {
    if (!modalOpen || !showSuggestions || !marketHashName || marketHashName.trim().length < 2) return [];
    if (catalogSet.has(marketHashName.trim())) return [];
    return searchCatalogSuggestions(marketHashName, catalogNames, 5);
  }, [modalOpen, showSuggestions, marketHashName, catalogNames, catalogSet]);

  // Auto-sync wear when input text changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMarketHashName(val);
    setShowSuggestions(true);

    const derivedWear = extractWearFromName(val);
    if (derivedWear && derivedWear !== wear) {
      setWear(derivedWear);
    }
  };

  // Two-way sync: updating wear dropdown updates skin name wear suffix
  const handleWearChange = (newWear: string) => {
    setWear(newWear);
    if (marketHashName.trim() && !isNonWear) {
      const updated = setWearInName(marketHashName, newWear);
      if (updated !== marketHashName) {
        setMarketHashName(updated);
      }
    }
  };

  // Quick-fix 1-click handler (e.g. missing wear condition or missing star)
  const handleApplyQuickFix = () => {
    if (validation.quickFix) {
      setMarketHashName(validation.quickFix.fixedName);
      if (validation.quickFix.wear) {
        setWear(validation.quickFix.wear);
      }
      setShowSuggestions(false);
    }
  };

  // Suggestion click
  const handleSelectSuggestion = (suggestedName: string) => {
    setMarketHashName(suggestedName);
    const derived = extractWearFromName(suggestedName);
    if (derived) setWear(derived);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = marketHashName.trim();
    if (!trimmed) return;

    let finalName = trimmed;
    // If warning with quickFix (e.g. user typed "AK-47 | Redline" without wear condition), auto-apply
    if (validation.status === 'warning' && validation.quickFix) {
      finalName = validation.quickFix.fixedName;
      setMarketHashName(finalName);
      if (validation.quickFix.wear) {
        setWear(validation.quickFix.wear);
      }
    } else if (validation.status === 'invalid') {
      toast.error(validation.errorReason || 'Please enter a valid CS2 market hash name.');
      return;
    }

    const success = await createAuction({
      marketHashName: finalName,
      wear: isNonWear ? undefined : wear,
      floatValue: isNonWear ? undefined : (floatValue.trim() || undefined),
      inspectUrl: inspectUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      marketplace,
      dmarketTradableConfirmed: marketplace === 'dmarket' ? true : undefined,
      startingPrice: startingPrice ? Number(startingPrice) : 0,
    });

    if (success) {
      setMarketHashName('');
      setFloatValue('');
      setInspectUrl('');
      setImageUrl('');
      setStartingPrice('');
      setShowSuggestions(false);
      handleClose();
    }
  };

  // Do not render anything if modal is not open
  if (!modalOpen) {
    return null;
  }

  const previewImageSrc =
    imageUrl.trim() ||
    (marketHashName.trim()
      ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(marketHashName.trim())}`
      : undefined);

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Fixed Header */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div style={styles.badge}>
              <Clock size={13} style={{ color: '#38bdf8' }} />
              <span style={styles.badgeText}>{AUCTION_CONSTANTS.DURATION_MINUTES}-Min Flash DealMaker</span>
            </div>
            <h2 style={styles.title}>Broadcast Deal to Traders</h2>
          </div>
          <button style={styles.closeBtn} onClick={handleClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.formContainer}>
          <div style={styles.scrollArea}>
          {/* Skin Preview Card if name or image is present */}
          {(marketHashName.trim() || imageUrl.trim()) && (
            <div style={styles.previewBox}>
              <div style={styles.previewImageCol}>
                <SkinImage
                  src={previewImageSrc}
                  alt={marketHashName}
                  fallbackItemName={marketHashName}
                  height={56}
                  maxImageHeight={48}
                />
              </div>
              <div style={styles.previewInfoCol}>
                <div style={styles.previewName}>{marketHashName || 'CS2 Item'}</div>
                <div style={styles.previewTags}>
                  {!isNonWear && <span style={styles.previewWear}>{wear}</span>}
                  {isSticker && <span style={styles.previewStickerTag}>STICKER</span>}
                  {isNonWear && !isSticker && <span style={styles.previewItemTag}>ITEM</span>}
                  {!isNonWear && floatValue && <span style={styles.previewFloat}>Float: {floatValue}</span>}
                  <div style={styles.previewMarket}>
                    <MarketLogo marketId={marketplace} marketName={getMarketDisplayName(marketplace)} size={11} showBackground={false} />
                    <span>{getMarketDisplayName(marketplace)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skin Name Input with Real-time Validation & Autocomplete */}
          <div style={styles.fieldGroup} ref={inputContainerRef}>
            <div style={styles.labelRow}>
              <label style={styles.label}>
                Skin Name & Condition <span style={styles.required}>*</span>
              </label>
              {validation.status === 'valid' && (
                <div style={styles.validHeaderBadge}>
                  <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
                  <span>
                    {validation.isKnownCatalogItem
                      ? 'Verified CS2 Item'
                      : isSticker
                        ? 'Valid Sticker'
                        : 'Valid CS2 Syntax'}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.inputWrapper}>
              <input
                type="text"
                required
                placeholder="e.g. AK-47 | Vulcan (Field-Tested) or Sticker | Crown (Foil)"
                value={marketHashName}
                onChange={handleInputChange}
                onFocus={() => {
                  if (marketHashName.trim().length >= 2) setShowSuggestions(true);
                }}
                style={getSkinInputStyle(validation.status)}
              />

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div style={styles.suggestionsList}>
                  <div style={styles.suggestionsHeader}>
                    <Search size={12} style={{ color: '#94a3b8' }} />
                    <span>Matching CS2 Items</span>
                  </div>
                  {suggestions.map((item) => {
                    const itemWear = extractWearFromName(item);
                    return (
                      <div
                        key={item}
                        style={styles.suggestionItem}
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <span style={styles.suggestionName}>{item}</span>
                        {itemWear && (
                          <span style={styles.suggestionWear}>{itemWear}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Feedback Banners */}
            {validation.status === 'warning' && (
              <div style={styles.warningBox}>
                <div style={styles.warningLeft}>
                  <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span>{validation.errorReason}</span>
                </div>
                {validation.quickFix && (
                  <button
                    type="button"
                    onClick={handleApplyQuickFix}
                    style={styles.quickFixBtn}
                    title="Auto-format to official market hash name"
                  >
                    <Wand2 size={12} />
                    <span>{validation.quickFix.label}</span>
                  </button>
                )}
              </div>
            )}

            {validation.status === 'invalid' && (
              <div style={styles.invalidBox}>
                <XCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>{validation.errorReason}</span>
              </div>
            )}
          </div>

          {/* Wear & Float */}
          <div style={styles.twoCol}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Wear Condition {isNonWear && <span style={styles.naHint}>(Not Applicable)</span>}
              </label>
              <select
                value={isNonWear ? '' : wear}
                disabled={isNonWear}
                onChange={(e) => handleWearChange(e.target.value)}
                style={isNonWear ? styles.selectDisabled : styles.select}
              >
                {isNonWear ? (
                  <option value="">N/A ({isSticker ? 'Sticker' : 'Container/Item'})</option>
                ) : (
                  WEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Exact Float {isNonWear && <span style={styles.naHint}>(N/A)</span>}
              </label>
              <input
                type="text"
                disabled={isNonWear}
                placeholder={isNonWear ? 'N/A (Sticker / Item)' : 'e.g. 0.1824'}
                value={isNonWear ? '' : floatValue}
                onChange={(e) => setFloatValue(e.target.value)}
                style={isNonWear ? styles.inputDisabled : styles.input}
              />
            </div>
          </div>

          {/* Marketplace Target & Starting Price */}
          <div style={styles.twoCol}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Listing Marketplace</label>
              <div style={styles.marketToggleGroup}>
                <button
                  type="button"
                  onClick={() => setMarketplace('csfloat')}
                  style={getMarketToggleStyle(marketplace === 'csfloat')}
                >
                  <MarketLogo marketId="csfloat" marketName="CSFloat" size={16} showBackground={false} />
                  <span>{getMarketDisplayName('csfloat')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarketplace('dmarket')}
                  style={getMarketToggleStyle(marketplace === 'dmarket')}
                >
                  <MarketLogo marketId="dmarket" marketName="DMarket" size={16} showBackground={false} />
                  <span>{getMarketDisplayName('dmarket')}</span>
                </button>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Reserve / Minimum Offer ($ USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00 (No Reserve)"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* DMarket Tradability Simple Warning */}
          {marketplace === 'dmarket' && (
            <div style={styles.dmarketWarnRow}>
              <AlertTriangle size={13} style={styles.dmarketWarningIcon} />
              <span style={styles.dmarketWarnText}>
                <strong>DMarket Notice:</strong> Ensure this item is unlocked & immediately tradable (not locked in bot custody or under trade cooldown).
              </span>
            </div>
          )}

          {/* Inspect Link */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Steam Inspect Link (Optional)</label>
            <input
              type="text"
              placeholder="steam://rungame/730/..."
              value={inspectUrl}
              onChange={(e) => setInspectUrl(e.target.value)}
              style={styles.input}
            />
          </div>

            {/* Active Floor Liquidity & Trader Presence Telemetry */}
            <div style={styles.presenceBanner}>
              <div style={styles.presenceLeft}>
                <span style={getPresenceDotStyle(activeTradersCount)} />
                <div style={styles.presenceContent}>
                  <div style={styles.presenceTitle}>
                    {activeTradersCount} {activeTradersCount === 1 ? 'Trader' : 'Traders'} Active Online
                  </div>
                  <div style={styles.presenceSubtitle}>
                    {activeTradersCount >= 5
                      ? 'High floor activity! Fast matchmaking offers expected.'
                      : activeTradersCount >= 2
                      ? 'Healthy activity across markets.'
                      : 'Floor is quiet right now. You can broadcast or wait for peak hours.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer Actions (ALWAYS IN VIEW!) */}
          <div style={styles.footer}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelBtn}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={getSubmitBtnStyle(
                isCreating ||
                  !marketHashName.trim() ||
                  validation.status === 'invalid',
              )}
              disabled={
                isCreating ||
                !marketHashName.trim() ||
                validation.status === 'invalid'
              }
            >
              <Sparkles size={15} />
              <span>
                {isCreating
                  ? 'Broadcasting Deal...'
                  : `Broadcast Deal ($${(AUCTION_CONSTANTS.SELLER_BROADCAST_FEE_CENTS / 100).toFixed(2)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px',
    boxSizing: 'border-box',
  },
  modal: {
    backgroundColor: 'var(--so-surface-card, #131720)',
    borderRadius: 'var(--so-radius-md, 12px)',
    border: '1px solid var(--so-border-strong, #242c3d)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: 'min(740px, calc(100vh - 32px))',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid var(--so-border-subtle, #1e2430)',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    width: 'fit-content',
  },
  badgeText: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--so-text-muted, #94a3b8)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceBanner: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '7px',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  presenceLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  presenceContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  presenceTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  presenceSubtitle: {
    fontSize: '11px',
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.3,
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #11141a)',
    border: '1px solid var(--so-border-subtle)',
  },
  previewImageCol: {
    width: '64px',
    height: '56px',
    borderRadius: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  previewInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflow: 'hidden',
  },
  previewName: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  previewTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  previewWear: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
  },
  previewStickerTag: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(234, 179, 8, 0.16)',
    color: '#eab308',
    border: '1px solid rgba(234, 179, 8, 0.3)',
  },
  previewItemTag: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    color: '#a855f7',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  previewFloat: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: 'var(--so-text-muted, #94a3b8)',
  },
  previewMarket: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '9.5px',
    fontWeight: 800,
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--so-text-secondary)',
    letterSpacing: '0.3px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  naHint: {
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--so-text-muted)',
    marginLeft: '4px',
  },
  validHeaderBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#22c55e',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  twoCol: {
    display: 'flex',
    gap: '14px',
  },
  label: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: 'var(--so-text-secondary)',
  },
  required: {
    color: 'var(--so-danger-text, #ef4444)',
  },
  input: {
    backgroundColor: 'var(--so-surface-input, #11141a)',
    border: '1px solid var(--so-border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13.5px',
    color: 'var(--so-text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px dashed var(--so-border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
  select: {
    backgroundColor: 'var(--so-surface-input, #11141a)',
    border: '1px solid var(--so-border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13.5px',
    color: 'var(--so-text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },
  selectDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px dashed var(--so-border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    cursor: 'not-allowed',
    opacity: 0.75,
  },
  marketToggleGroup: {
    display: 'flex',
    gap: '8px',
  },
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  warningLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#fde68a',
  },
  quickFixBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  invalidBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    fontSize: '12px',
    color: '#fca5a5',
  },
  suggestionsList: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#131720',
    border: '1px solid var(--so-border-strong, #334155)',
    borderRadius: '8px',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7)',
    zIndex: 100,
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px',
  },
  suggestionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px 4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #94a3b8)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '2px',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  suggestionName: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: 'var(--so-text-primary, #ffffff)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '8px',
  },
  suggestionWear: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    flexShrink: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '12px 20px',
    borderTop: '1px solid var(--so-border-subtle, #1e2430)',
    backgroundColor: 'var(--so-surface-card, #131720)',
    flexShrink: 0,
  },
  cancelBtn: {
    padding: '9px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    padding: '9px 18px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
    transition: 'all 0.15s ease',
  },
  dmarketWarnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '7px',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  dmarketWarningIcon: {
    color: '#f59e0b',
    flexShrink: 0,
  },
  dmarketWarnText: {
    fontSize: '12px',
    color: '#fde68a',
    lineHeight: 1.35,
  },
};

function getSubmitBtnStyle(isDisabled: boolean): React.CSSProperties {
  if (isDisabled) {
    return {
      ...styles.submitBtn,
      opacity: 0.5,
      cursor: 'not-allowed',
      boxShadow: 'none',
    };
  }
  return styles.submitBtn;
}

function getSkinInputStyle(
  status: 'valid' | 'warning' | 'invalid' | 'empty',
): React.CSSProperties {
  let borderColor = 'var(--so-border-subtle)';
  let boxShadow = 'none';

  if (status === 'valid') {
    borderColor = 'rgba(34, 197, 94, 0.6)';
    boxShadow = '0 0 0 1px rgba(34, 197, 94, 0.2)';
  } else if (status === 'warning') {
    borderColor = 'rgba(245, 158, 11, 0.6)';
    boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.2)';
  } else if (status === 'invalid') {
    borderColor = 'rgba(239, 68, 68, 0.6)';
    boxShadow = '0 0 0 1px rgba(239, 68, 68, 0.2)';
  }

  return {
    ...styles.input,
    borderColor,
    boxShadow,
  };
}

function getMarketToggleStyle(isSelected: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: isSelected
      ? '1px solid var(--so-primary, #2563eb)'
      : '1px solid var(--so-border-subtle)',
    backgroundColor: isSelected
      ? 'rgba(37, 99, 235, 0.16)'
      : 'var(--so-surface-input, #11141a)',
    color: isSelected ? '#ffffff' : 'var(--so-text-muted)',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

function getPresenceDotStyle(count: number): React.CSSProperties {
  const isHigh = count >= 5;
  const isMed = count >= 2;
  const color = isHigh ? '#22c55e' : isMed ? '#38bdf8' : '#eab308';
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    boxShadow: `0 0 8px ${color}`,
    flexShrink: 0,
  };
}

export const CreateAuctionModal = CreateDealModal;
