import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ExternalLink, Link as LinkIcon, Send, Sparkles, Store, AlertCircle } from 'lucide-react';
import { DealMakerItem } from '../../../../shared/types/dealmaker.types';
import { useDealMakerStore } from '../../../store/useDealMakerStore';
import { SkinImage } from '../../../components/SkinImage';
import { getSavedStoreUrl, setSavedStoreUrl } from '../../../utils/storage';
import { CopyMarketHashButton } from '../../../components/CopyMarketHashButton';
import { getMarketItemUrl } from '../../../utils/marketUrls';
import { MarketLogo } from '../../../components/MarketLogo';
import {
  getMarketDisplayName,
  toCanonicalMarketId,
} from '../../../../shared/canonicalMarkets';

export interface SellerActiveDealCardProps {
  auction: DealMakerItem;
}

export type SellerActiveAuctionCardProps = SellerActiveDealCardProps;

export const SellerActiveDealCard: React.FC<SellerActiveDealCardProps> = ({
  auction,
}) => {
  const { submitListingLink } = useDealMakerStore();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [listingUrl, setListingUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  const savedStoreUrl = getSavedStoreUrl(auction.marketplace);
  const canonicalMarket = toCanonicalMarketId(auction.marketplace);
  const marketDisplayName = getMarketDisplayName(auction.marketplace);
  const isCsFloat = canonicalMarket === 'csfloat';
  const storeTypeName = isCsFloat
    ? 'CSFloat Stall'
    : canonicalMarket === 'dmarket'
      ? 'DMarket Personal Store'
      : `${marketDisplayName} Store`;

  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(auction.timerEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setTimeLeft(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
      setIsExpired(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [auction.timerEndsAt]);

  const handleSubmitLink = async (e: React.FormEvent, directUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (directUrl || listingUrl).trim();
    if (!targetUrl) return;

    setIsSubmitting(true);
    try {
      if (saveAsDefault || directUrl) {
        setSavedStoreUrl(auction.marketplace, targetUrl);
      }
      await submitListingLink(auction.id, targetUrl);
      setListingUrl('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenListing = () => {
    if (auction.listingUrl && window.electronAPI?.auction) {
      window.electronAPI.auction.openExternalLink(auction.listingUrl);
    }
  };

  const handleOpenMarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl =
      auction.listingUrl ||
      getMarketItemUrl(auction.marketplace, auction.marketHashName) ||
      `https://csfloat.com/search?market_hash_name=${encodeURIComponent(auction.marketHashName)}`;

    if (window.electronAPI?.auction?.openExternalLink) {
      window.electronAPI.auction.openExternalLink(targetUrl);
    } else if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const hasBids = Number(auction.bidsCount || 0) > 0;
  const currentPrice = Number(auction.highestBid || auction.startingPrice || 0);
  const isListingPosted = auction.status === 'LISTING_POSTED';
  const isAwaitingLink = (isExpired || auction.status === 'PENDING_LINK') && hasBids;
  const isExpiredNoBids = (isExpired || auction.status === 'EXPIRED') && !hasBids && !isListingPosted;

  const itemImageUrl =
    auction.imageUrl ||
    `https://api.steamapis.com/image/item/730/${encodeURIComponent(auction.marketHashName)}`;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={getBadgeStyle(isListingPosted, isAwaitingLink, isExpiredNoBids)}>
          <Clock size={13} />
          <span>
            {isListingPosted
              ? 'Listing Posted'
              : isAwaitingLink
                ? `Deal Matched — Share ${storeTypeName}`
                : isExpiredNoBids
                  ? 'Deal Closed — No Offers'
                  : `Live Deal: ${timeLeft}`}
          </span>
        </div>

        <div style={styles.headerRightActions}>
          <button
            type="button"
            onClick={handleOpenMarket}
            style={styles.actionBtn}
            title={`Open on ${marketDisplayName} Market (Browser)`}
          >
            <ExternalLink size={13} />
          </button>
          <CopyMarketHashButton name={auction.marketHashName} />
          <div style={styles.marketBadge}>
            <MarketLogo
              marketId={auction.marketplace}
              marketName={marketDisplayName}
              size={13}
              showBackground={false}
            />
            <span>{marketDisplayName}</span>
          </div>
        </div>
      </div>

      {/* Item Body: Image + Title + Stats */}
      <div style={styles.body}>
        <div style={styles.contentRow}>
          <div style={styles.imageCol}>
            <SkinImage
              src={itemImageUrl}
              alt={auction.marketHashName}
              fallbackItemName={auction.marketHashName}
              height={68}
              maxImageHeight={58}
            />
          </div>

          <div style={styles.infoCol}>
            <h4 style={styles.title} title={auction.marketHashName}>
              {auction.marketHashName}
            </h4>
            <div style={styles.tagRow}>
              {auction.wear && <span style={styles.wearTag}>{auction.wear}</span>}
              {auction.floatValue && (
                <span style={styles.floatTag}>Float: {auction.floatValue}</span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statCol}>
            <span style={styles.statLabel}>Top Offer</span>
            <span style={styles.statValue}>
              ${currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
            </span>
          </div>

          <div style={styles.statCol}>
            <span style={styles.statLabel}>Total Offers</span>
            <span style={styles.statValue}>{auction.bidsCount}</span>
          </div>

          {auction.highestBidderTag && (
            <div style={styles.statCol}>
              <span style={styles.statLabel}>Top Match Trader</span>
              <span style={styles.statValue}>{auction.highestBidderTag}</span>
            </div>
          )}
        </div>
      </div>

      {/* Seller Action Zone */}
      <div style={styles.actionZone}>
        {isListingPosted ? (
          /* State 3: Listing Link posted, waiting for buyer to claim */
          <div style={styles.postedBanner}>
            <div style={styles.postedText}>
              <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <span>
                {storeTypeName} link active! Matched trader notified to purchase.
              </span>
            </div>
            {auction.listingUrl && (
              <button onClick={handleOpenListing} style={styles.viewLinkBtn}>
                <Store size={13} />
                <span>Open Link</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        ) : isAwaitingLink ? (
          /* State 2: Timer ended & offers were submitted! Prompt seller to share stall/store link */
          <div style={styles.linkSection}>
            <div style={styles.instructionBanner}>
              Deal matched! Top Offer:{' '}
              <strong style={{ color: '#22c55e' }}>
                ${currentPrice.toFixed(2)}
              </strong>
              . List your skin on {marketDisplayName} for{' '}
              <strong>${currentPrice.toFixed(2)}</strong> and share your {storeTypeName} link:
            </div>

            {/* 1-Click Button for saved store URL */}
            {savedStoreUrl && (
              <div style={styles.savedStoreBox}>
                <div style={styles.savedStoreInfo}>
                  <Store size={14} style={{ color: '#38bdf8' }} />
                  <span style={styles.savedStoreLabel}>Saved {storeTypeName}:</span>
                  <span style={styles.savedStoreUrlText} title={savedStoreUrl}>
                    {savedStoreUrl}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmitLink(e as any, savedStoreUrl)}
                  style={styles.oneClickShareBtn}
                  title={`Share saved ${storeTypeName} link immediately`}
                >
                  <Sparkles size={13} />
                  <span>1-Click Share Saved {isCsFloat ? 'Stall' : 'Store'}</span>
                </button>
              </div>
            )}

            <form onSubmit={(e) => handleSubmitLink(e)} style={styles.linkForm}>
              <div style={styles.inputRow}>
                <div style={styles.inputWrapper}>
                  <LinkIcon size={14} style={styles.inputIcon} />
                  <input
                    type="url"
                    required
                    placeholder={
                      isCsFloat
                        ? 'https://csfloat.com/stall/76561199...'
                        : 'https://dmarket.com/ingame-items/item-list/csgo-skins?sagaAddress=0x...'
                    }
                    value={listingUrl}
                    onChange={(e) => setListingUrl(e.target.value)}
                    style={styles.urlInput}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !listingUrl.trim()}
                  style={styles.submitBtn}
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Posting...' : 'Share Link'}</span>
                </button>
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>Save as my default {storeTypeName} URL (for 1-click sharing next time)</span>
              </label>
            </form>
          </div>
        ) : isExpiredNoBids ? (
          /* State 3: Timer ended but NO offers were submitted — share link is NOT available */
          <div style={styles.noBidsBanner}>
            <AlertCircle size={16} style={styles.noBidsIcon} />
            <div style={styles.noBidsContent}>
              <div style={styles.noBidsTitle}>Deal Closed — No Offers Placed</div>
              <div style={styles.noBidsDescription}>
                No offers were placed on this skin during the 10-minute matchmaking window. A marketplace listing link is not required. You can broadcast a new deal with a refreshed reserve price anytime.
              </div>
            </div>
          </div>
        ) : (
          /* State 4: Active deal in progress */
          <div style={styles.activeNotice}>
            {hasBids
              ? `⏳ Traders are submitting offers (${auction.bidsCount} offer${auction.bidsCount === 1 ? '' : 's'}). When the 10-minute timer ends, you will share your ${storeTypeName} link here.`
              : `⏳ Deal broadcasted live. When the 10-minute timer ends, if offers are submitted, you will share your ${storeTypeName} link here.`}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--so-surface-card, #131720)',
    borderRadius: '10px',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actionBtn: {
    padding: '3px 6px',
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
  marketBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10.5px',
    fontWeight: 800,
    padding: '2px 7px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--so-text-secondary, #94a3b8)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  contentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  imageCol: {
    width: '78px',
    height: '68px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    borderRadius: '8px',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    overflow: 'hidden',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflow: 'hidden',
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  wearTag: {
    fontSize: '10.5px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  floatTag: {
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--so-text-muted, #64748b)',
    fontFamily: 'monospace',
  },
  statsRow: {
    display: 'flex',
    gap: '20px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
  },
  statCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  actionZone: {
    marginTop: '4px',
  },
  activeNotice: {
    fontSize: '12px',
    color: 'var(--so-text-muted, #94a3b8)',
    fontStyle: 'italic',
  },
  postedBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
  },
  postedText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#86efac',
  },
  viewLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #22c55e',
    color: '#22c55e',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  linkSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  savedStoreBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    flexWrap: 'wrap',
  },
  savedStoreInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  savedStoreLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#38bdf8',
    whiteSpace: 'nowrap',
  },
  savedStoreUrlText: {
    fontSize: '11px',
    color: 'var(--so-text-muted, #94a3b8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  oneClickShareBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: '#0284c7',
    border: 'none',
    color: '#ffffff',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
  linkForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  instructionBanner: {
    fontSize: '12px',
    color: '#fef08a',
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    border: '1px solid rgba(234, 179, 8, 0.28)',
    padding: '8px 12px',
    borderRadius: '6px',
    lineHeight: 1.4,
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '10px',
    color: 'var(--so-text-muted)',
    pointerEvents: 'none',
  },
  urlInput: {
    width: '100%',
    padding: '9px 10px 9px 30px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle)',
    color: 'var(--so-text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  noBidsBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    border: '1px solid rgba(100, 116, 139, 0.22)',
  },
  noBidsIcon: {
    color: '#94a3b8',
    flexShrink: 0,
    marginTop: '2px',
  },
  noBidsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  noBidsTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  noBidsDescription: {
    fontSize: '11.5px',
    color: '#94a3b8',
    lineHeight: 1.45,
  },
};

function getBadgeStyle(
  isListingPosted: boolean,
  isAwaitingLink: boolean,
  isExpiredNoBids: boolean,
): React.CSSProperties {
  if (isListingPosted) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '6px',
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.35)',
      color: '#22c55e',
      fontSize: '11px',
      fontWeight: 800,
    };
  }

  if (isAwaitingLink) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '6px',
      backgroundColor: 'rgba(234, 179, 8, 0.15)',
      border: '1px solid rgba(234, 179, 8, 0.35)',
      color: '#eab308',
      fontSize: '11px',
      fontWeight: 800,
    };
  }

  if (isExpiredNoBids) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '6px',
      backgroundColor: 'rgba(100, 116, 139, 0.12)',
      border: '1px solid rgba(100, 116, 139, 0.28)',
      color: '#94a3b8',
      fontSize: '11px',
      fontWeight: 800,
    };
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
    fontSize: '11px',
    fontWeight: 800,
    fontFamily: 'monospace',
  };
}

export const SellerActiveAuctionCard = SellerActiveDealCard;
