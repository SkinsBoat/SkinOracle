import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  ExternalLink,
  Link as LinkIcon,
  Send,
  Sparkles,
  Store,
  AlertCircle,
  ClipboardPaste,
  Tag,
  Search,
  Flame,
} from 'lucide-react';
import { DealMakerItem } from '../../../../shared/types/dealmaker.types';
import { useDealMakerStore } from '../../../store/useDealMakerStore';
import { SkinImage } from '../../../components/SkinImage';
import { getSavedStoreUrl } from '../../../utils/storage';
import {
  getDealMakerMarket,
  validateDealMakerLink,
} from '../../../../shared/dealmakerMarkets';
import { CopyMarketHashButton } from '../../../components/CopyMarketHashButton';
import { getMarketItemUrl } from '../../../utils/marketUrls';
import { getCsfloatSearchUrl } from '../../../utils/csfloatUrls';
import { MarketLogo } from '../../../components/MarketLogo';
import {
  getMarketDisplayName,
  toCanonicalMarketId,
} from '../../../../shared/canonicalMarkets';
import {
  parseSkinHashName,
  getWearColors,
} from '../utils/skinCardUtils';

export interface SellerActiveDealCardProps {
  auction: DealMakerItem;
}

export type SellerActiveAuctionCardProps = SellerActiveDealCardProps;

export const SellerActiveDealCard: React.FC<SellerActiveDealCardProps> = ({
  auction,
}) => {
  const { submitListingLink, submitMarketLink } = useDealMakerStore();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [isExpired, setIsExpired] = useState(false);
  const [listingUrl, setListingUrl] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [linkMode, setLinkMode] = useState<'listing' | 'store'>(() =>
    getSavedStoreUrl(auction.marketplace) ? 'store' : 'listing',
  );
  const [linkError, setLinkError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedStoreUrl = getSavedStoreUrl(auction.marketplace);
  const marketConfig = getDealMakerMarket(auction.marketplace);
  const canonicalMarket = toCanonicalMarketId(auction.marketplace);
  const marketDisplayName = getMarketDisplayName(auction.marketplace);
  const supportsStore = !!marketConfig?.supportsStoreLink;
  const isCsFloat = canonicalMarket === 'csfloat';
  const storeTypeName =
    marketConfig?.storeLinkLabel || `${marketDisplayName} Store`;

  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(auction.timerEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        setSecondsRemaining(0);
        setIsExpired(true);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      setSecondsRemaining(totalSec);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setTimeLeft(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction.timerEndsAt]);

  const handlePaste = async (target: 'listing' | 'store') => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (target === 'store') {
        setStoreUrl(text);
      } else {
        setListingUrl(text);
      }
      setLinkError('');
    } catch {
      setLinkError('Clipboard access is unavailable on this system');
    }
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = listingUrl.trim();
    const check = validateDealMakerLink(auction.marketplace, 'listing', url);
    if (!check.valid) {
      setLinkError(check.message || 'Enter a valid listing link');
      return;
    }

    setIsSubmitting(true);
    setLinkError('');
    try {
      const ok = await submitListingLink(auction.id, url);
      if (ok) setListingUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStore = async (e: React.FormEvent, directUrl?: string) => {
    if (e) e.preventDefault();
    const url = (directUrl || storeUrl).trim();
    const check = validateDealMakerLink(auction.marketplace, 'store', url);
    if (!check.valid) {
      setLinkError(check.message || 'Enter a valid store link');
      return;
    }

    setIsSubmitting(true);
    setLinkError('');
    try {
      const ok = await submitMarketLink(auction.id, url);
      if (ok) setStoreUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const postedLink = auction.listingUrl || auction.marketLink || '';

  const openExternalUrl = (url: string) => {
    if (window.electronAPI?.auction?.openExternalLink) {
      window.electronAPI.auction.openExternalLink(url);
    } else if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenListing = () => {
    if (postedLink) {
      openExternalUrl(postedLink);
    }
  };

  const handleOpenMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl =
      postedLink ||
      getMarketItemUrl(auction.marketplace, auction.marketHashName) ||
      getCsfloatSearchUrl(auction.marketHashName);
    openExternalUrl(targetUrl);
  };

  const handleOpenInspect = () => {
    if (auction.inspectUrl && window.electronAPI?.auction) {
      window.electronAPI.auction.openExternalLink(auction.inspectUrl);
    }
  };

  const hasBids = Number(auction.bidsCount || 0) > 0;
  const currentPrice = Number(auction.highestBid || auction.startingPrice || 0);
  const isListingPosted = auction.status === 'LISTING_POSTED';
  const isAwaitingLink = (isExpired || auction.status === 'PENDING_LINK') && hasBids;
  const isExpiredNoBids = (isExpired || auction.status === 'EXPIRED') && !hasBids && !isListingPosted;
  const isUrgentTimer = !isExpired && secondsRemaining > 0 && secondsRemaining <= 120;

  const itemImageUrl =
    auction.imageUrl ||
    `https://api.steamapis.com/image/item/730/${encodeURIComponent(auction.marketHashName)}`;

  const parsed = useMemo(() => {
    return parseSkinHashName(auction.marketHashName, auction.wear);
  }, [auction.marketHashName, auction.wear]);

  const wearColors = useMemo(() => {
    return getWearColors(parsed.shortWear);
  }, [parsed.shortWear]);

  return (
    <div style={styles.card}>
      {/* 1. Header Row */}
      <div style={styles.headerRow}>
        <div style={getBadgeStyle(isListingPosted, isAwaitingLink, isExpiredNoBids, isUrgentTimer)}>
          {isUrgentTimer ? (
            <Flame size={12} style={{ color: '#f59e0b' }} />
          ) : (
            <Clock size={12} />
          )}
          <span>
            {isListingPosted
              ? 'Link Posted'
              : isAwaitingLink
                ? 'Deal Matched — Share Link'
                : isExpiredNoBids
                  ? 'Deal Closed — No Offers'
                  : `Live Deal: ${timeLeft}`}
          </span>
        </div>

        <div style={styles.headerRightGroup}>
          <div style={styles.marketBadge} title={`Marketplace: ${marketDisplayName}`}>
            <MarketLogo
              marketId={auction.marketplace}
              marketName={marketDisplayName}
              size={13}
              showBackground={false}
            />
            <span style={styles.marketText}>{marketDisplayName}</span>
          </div>

          <div style={styles.actionIconGroup}>
            <button
              type="button"
              onClick={handleOpenMarket}
              style={styles.iconBtn}
              title={`Open on ${marketDisplayName} Market (Browser)`}
            >
              <ExternalLink size={13} />
            </button>
            <CopyMarketHashButton name={auction.marketHashName} />
          </div>
        </div>
      </div>

      {/* 2. Hero Skin Showcase */}
      <div style={styles.heroShowcase}>
        {/* Floating Overlays Top */}
        <div style={styles.showcaseTopBadges}>
          {parsed.isStatTrak && (
            <span style={styles.statTrakBadge} title="StatTrak™ Certified Weapon">
              ST™
            </span>
          )}
          {parsed.isSouvenir && (
            <span style={styles.souvenirBadge} title="Souvenir Package Skin">
              SV
            </span>
          )}
          {parsed.isKnifeOrGloves && (
            <span style={styles.knifeBadge} title="★ Rare Special Item">
              ★
            </span>
          )}
          {parsed.shortWear && (
            <span
              style={getWearBadgeStyle(wearColors)}
              title={parsed.wear ? `Exterior Condition: ${parsed.wear}` : undefined}
            >
              {parsed.shortWear}
            </span>
          )}
        </div>

        {/* Floating Overlays Bottom */}
        <div style={styles.showcaseBottomRow}>
          {auction.floatValue ? (
            <span style={styles.floatPill} title={`Float Value: ${auction.floatValue}`}>
              Float: {auction.floatValue}
            </span>
          ) : (
            <span />
          )}

          {auction.inspectUrl && (
            <button
              type="button"
              onClick={handleOpenInspect}
              style={styles.inspectBtn}
              title="Inspect Item in CS2 Client"
            >
              <Search size={10} />
              <span>Inspect CS2</span>
            </button>
          )}
        </div>

        {/* Centered Large Skin Image */}
        <div style={styles.imageContainer}>
          <SkinImage
            src={itemImageUrl}
            alt={auction.marketHashName}
            fallbackItemName={auction.marketHashName}
            height={115}
            maxImageHeight={104}
          />
        </div>
      </div>

      {/* 3. Item Identity */}
      <div style={styles.titleSection} title={auction.marketHashName}>
        <div style={styles.weaponRow}>
          <span style={styles.weaponName}>{parsed.weapon}</span>
        </div>
        {parsed.pattern ? (
          <div style={styles.patternName}>{parsed.pattern}</div>
        ) : (
          <div style={styles.patternPlaceholder}>&nbsp;</div>
        )}
      </div>

      {/* 4. Matchmaking Stats Row */}
      <div style={styles.statsContainer}>
        <div style={styles.statCol}>
          <span style={styles.statLabel}>Top Offer</span>
          <span style={styles.topOfferAmount}>
            ${currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
          </span>
        </div>

        <div style={styles.statCol}>
          <span style={styles.statLabel}>Total Offers</span>
          <span style={styles.statValue}>{auction.bidsCount}</span>
        </div>

        <div style={styles.statCol}>
          <span style={styles.statLabel}>Top Match Trader</span>
          <span style={styles.statTraderValue} title={auction.highestBidderTag || 'None yet'}>
            {auction.highestBidderTag || '—'}
          </span>
        </div>
      </div>

      {/* 5. Seller Action Zone */}
      <div style={styles.actionZone}>
        {isListingPosted ? (
          /* State 3: Link posted, waiting for buyer to claim */
          <div style={styles.postedBanner}>
            <div style={styles.postedText}>
              <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
              <span>
                {auction.marketLink
                  ? `${storeTypeName} link active! Matched trader notified.`
                  : 'Listing link active! Matched trader notified.'}
              </span>
            </div>
            {postedLink && (
              <button onClick={handleOpenListing} style={styles.viewLinkBtn}>
                <Store size={13} />
                <span>Open Link</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        ) : isAwaitingLink ? (
          /* State 2: Timer ended & offers were submitted! Share a link */
          <div style={styles.linkSection}>
            <div style={styles.instructionBanner}>
              Deal matched at{' '}
              <strong style={{ color: '#22c55e' }}>
                ${currentPrice.toFixed(2)}
              </strong>
              . Share {supportsStore ? 'listing or store link' : 'listing link'}:
            </div>

            {supportsStore && (
              <div style={styles.modeToggle}>
                <button
                  type="button"
                  onClick={() => {
                    setLinkMode('listing');
                    setLinkError('');
                  }}
                  style={getModeToggleStyle(linkMode === 'listing')}
                >
                  <Tag size={12} />
                  <span>Item Listing</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkMode('store');
                    setLinkError('');
                  }}
                  style={getModeToggleStyle(linkMode === 'store')}
                >
                  <Store size={12} />
                  <span>{storeTypeName}</span>
                </button>
              </div>
            )}

            {linkMode === 'listing' ? (
              <form onSubmit={handleSubmitListing} style={styles.linkForm}>
                <div style={styles.inputWrapper}>
                  <LinkIcon size={13} style={styles.inputIcon} />
                  <input
                    type="url"
                    value={listingUrl}
                    onChange={(e) => {
                      setListingUrl(e.target.value);
                      setLinkError('');
                    }}
                    placeholder={`https://${canonicalMarket || 'market'}.com/...`}
                    style={styles.urlInput}
                  />
                </div>

                <div style={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => handlePaste('listing')}
                    style={styles.pasteBtn}
                  >
                    <ClipboardPaste size={12} />
                    <span>Paste</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !listingUrl.trim()}
                    style={styles.submitBtn}
                  >
                    <Send size={12} />
                    <span>{isSubmitting ? 'Sharing...' : 'Share Link'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div style={styles.linkForm}>
                {savedStoreUrl ? (
                  <div style={styles.savedStoreBox}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={(e) => handleSubmitStore(e, savedStoreUrl)}
                      style={styles.shareSavedBtn}
                    >
                      <Sparkles size={13} />
                      <span>
                        {isSubmitting ? 'Sharing...' : `Share Saved ${storeTypeName}`}
                      </span>
                    </button>
                    <span style={styles.savedStoreFootnote}>
                      Using {savedStoreUrl}
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => handleSubmitStore(e)}
                    style={styles.linkForm}
                  >
                    <div style={styles.inputWrapper}>
                      <Store size={13} style={styles.inputIcon} />
                      <input
                        type="url"
                        value={storeUrl}
                        onChange={(e) => {
                          setStoreUrl(e.target.value);
                          setLinkError('');
                        }}
                        placeholder={`Paste your ${storeTypeName} link...`}
                        style={styles.urlInput}
                      />
                    </div>
                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        onClick={() => handlePaste('store')}
                        style={styles.pasteBtn}
                      >
                        <ClipboardPaste size={12} />
                        <span>Paste</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !storeUrl.trim()}
                        style={styles.submitBtn}
                      >
                        <Send size={12} />
                        <span>{isSubmitting ? 'Sharing...' : 'Share Link'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {linkError && (
              <div style={styles.errorBanner}>
                <AlertCircle size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>{linkError}</span>
              </div>
            )}
          </div>
        ) : isExpiredNoBids ? (
          /* State 4: Expired with no bids */
          <div style={styles.noBidsBanner}>
            <span>Deal expired with no offers. You can create a new broadcast.</span>
          </div>
        ) : (
          /* State 1: Live countdown */
          <div style={styles.liveNoticeBanner}>
            <span>Deal is live on the floor — listening for trader offers</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Extracted institutional styles object per AGENTS.md & Style Guide
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--so-surface-card, #131720)',
    borderRadius: '12px',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '26px',
    gap: '6px',
  },
  headerRightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  marketBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 7px',
    borderRadius: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '120px',
    minWidth: 0,
  },
  marketText: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.2px',
    color: 'var(--so-text-secondary, #94a3b8)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actionIconGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  iconBtn: {
    padding: '3px 5px',
    backgroundColor: 'var(--so-surface-panel, #181d27)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    borderRadius: '4px',
    color: 'var(--so-text-secondary, #94a3b8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  heroShowcase: {
    position: 'relative',
    height: '124px',
    width: '100%',
    borderRadius: '8px',
    background:
      'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.14) 0%, rgba(13, 17, 23, 0.8) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  imageContainer: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '4px',
    boxSizing: 'border-box',
  },
  showcaseTopBadges: {
    position: 'absolute',
    top: '6px',
    left: '8px',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statTrakBadge: {
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    color: '#f97316',
    border: '1px solid rgba(249, 115, 22, 0.45)',
    letterSpacing: '0.2px',
  },
  souvenirBadge: {
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#eab308',
    border: '1px solid rgba(234, 179, 8, 0.45)',
    letterSpacing: '0.2px',
  },
  knifeBadge: {
    fontSize: '10px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.45)',
  },
  showcaseBottomRow: {
    position: 'absolute',
    bottom: '6px',
    left: '8px',
    right: '8px',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  floatPill: {
    fontSize: '9.5px',
    fontWeight: 700,
    fontFamily: 'monospace',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(9, 13, 20, 0.85)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(4px)',
  },
  inspectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '9.5px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: 'var(--so-text-secondary, #94a3b8)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    cursor: 'pointer',
    pointerEvents: 'auto',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.15s ease',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minHeight: '36px',
    justifyContent: 'center',
  },
  weaponRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  weaponName: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  patternName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--so-text-secondary, #94a3b8)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  patternPlaceholder: {
    fontSize: '12px',
    lineHeight: '16px',
  },
  statsContainer: {
    display: 'flex',
    gap: '8px',
    padding: '9px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
    minHeight: '60px',
  },
  statCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
  },
  statLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  topOfferAmount: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#22c55e',
    letterSpacing: '-0.3px',
    lineHeight: '19px',
  },
  statValue: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    lineHeight: '19px',
  },
  statTraderValue: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#38bdf8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '19px',
  },
  actionZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: 'auto',
  },
  postedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  postedText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#4ade80',
    lineHeight: 1.3,
  },
  viewLinkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 9px',
    borderRadius: '5px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#22c55e',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  linkSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  instructionBanner: {
    fontSize: '11px',
    color: '#fef08a',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.25)',
    padding: '6px 8px',
    borderRadius: '5px',
    lineHeight: 1.35,
  },
  modeToggle: {
    display: 'flex',
    gap: '6px',
  },
  linkForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '8px',
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  urlInput: {
    width: '100%',
    padding: '7px 8px 7px 26px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  pasteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-surface-panel, #181d27)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    flex: 1,
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  savedStoreBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  shareSavedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: '#0284c7',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'background-color 0.15s ease',
  },
  savedStoreFootnote: {
    fontSize: '10px',
    color: 'var(--so-text-muted, #64748b)',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 8px',
    borderRadius: '5px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '11px',
    fontWeight: 600,
  },
  noBidsBanner: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    border: '1px solid rgba(100, 116, 139, 0.2)',
    color: 'var(--so-text-muted, #94a3b8)',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 600,
  },
  liveNoticeBanner: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 600,
  },
};

// ─────────────────────────────────────────────────────────────────
// Pure helper functions for dynamic styling
// ─────────────────────────────────────────────────────────────────
function getModeToggleStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '5px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
    border: isActive
      ? '1px solid rgba(56, 189, 248, 0.45)'
      : '1px solid transparent',
    color: isActive ? '#7dd3fc' : 'var(--so-text-secondary, #94a3b8)',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

function getWearBadgeStyle(colors: {
  bg: string;
  text: string;
  border: string;
}): React.CSSProperties {
  return {
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    letterSpacing: '0.3px',
  };
}

function getBadgeStyle(
  isListingPosted: boolean,
  isAwaitingLink: boolean,
  isExpiredNoBids: boolean,
  isUrgent: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '2px 8px',
    borderRadius: '5px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.3px',
  };

  if (isListingPosted) {
    return {
      ...base,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.4)',
      color: '#22c55e',
    };
  }

  if (isAwaitingLink) {
    return {
      ...base,
      backgroundColor: 'rgba(234, 179, 8, 0.18)',
      border: '1px solid rgba(234, 179, 8, 0.45)',
      color: '#facc15',
    };
  }

  if (isExpiredNoBids) {
    return {
      ...base,
      backgroundColor: 'rgba(100, 116, 139, 0.12)',
      border: '1px solid rgba(100, 116, 139, 0.3)',
      color: '#94a3b8',
    };
  }

  if (isUrgent) {
    return {
      ...base,
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      color: '#fbbf24',
      fontFamily: 'monospace',
    };
  }

  return {
    ...base,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
    fontFamily: 'monospace',
  };
}

export const SellerActiveAuctionCard = SellerActiveDealCard;
