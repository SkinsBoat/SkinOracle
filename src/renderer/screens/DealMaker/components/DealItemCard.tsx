import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, ShieldCheck, TrendingUp, Zap, Store } from 'lucide-react';
import { DealMakerItem } from '../../../../shared/types/dealmaker.types';
import { useDealMakerStore } from '../../../store/useDealMakerStore';
import { SkinImage } from '../../../components/SkinImage';
import { CopyMarketHashButton } from '../../../components/CopyMarketHashButton';
import { getMarketItemUrl } from '../../../utils/marketUrls';
import { MarketLogo } from '../../../components/MarketLogo';
import { getMarketDisplayName } from '../../../../shared/canonicalMarkets';

export interface DealItemCardProps {
  auction: DealMakerItem;
  myCeiling?: number;
}

export type AuctionItemCardProps = DealItemCardProps;

export const DealItemCard: React.FC<DealItemCardProps> = ({
  auction,
  myCeiling,
}) => {
  const { placeBid, isBidding } = useDealMakerStore();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [customBid, setCustomBid] = useState<string>('');

  const currentPrice = Number(auction.highestBid || auction.startingPrice || 0);
  const nextMinBid = currentPrice > 0 ? (currentPrice + 1.0).toFixed(2) : '1.00';

  // Live countdown timer calculation
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

  const handleCustomBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customBid || nextMinBid);
    if (val > currentPrice) {
      await placeBid(auction.id, val);
      setCustomBid('');
    }
  };

  const handleOpenInspect = () => {
    if (auction.inspectUrl && window.electronAPI?.auction) {
      window.electronAPI.auction.openExternalLink(auction.inspectUrl);
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

  const hasCeiling = typeof myCeiling === 'number' && myCeiling > 0;
  const spreadCents = hasCeiling ? myCeiling - currentPrice : 0;
  const isProfitable = hasCeiling && currentPrice <= myCeiling;
  const hasBids = Number(auction.bidsCount || 0) > 0;

  const itemImageUrl =
    auction.imageUrl ||
    `https://api.steamapis.com/image/item/730/${encodeURIComponent(auction.marketHashName)}`;

  const marketDisplayName = getMarketDisplayName(auction.marketplace);
  const listingButtonLabel = auction.listingUrl
    ? auction.listingUrl.includes('/stall/')
      ? 'View Seller Stall on CSFloat'
      : auction.listingUrl.includes('sagaAddress')
        ? "View Seller's Personal Store on DMarket"
        : `Buy on ${marketDisplayName} Now`
    : '';

  return (
    <div style={styles.card}>
      {/* Top Bar: Timer & Status Badges */}
      <div style={styles.topRow}>
        <div style={getTimerBadgeStyle(isExpired)}>
          <Clock size={13} />
          <span>{isExpired ? (hasBids ? 'Deal Matched' : 'Expired (0 Offers)') : timeLeft}</span>
        </div>

        <div style={styles.topRightActions}>
          <button
            type="button"
            onClick={handleOpenMarket}
            style={styles.actionBtn}
            title={`Open on ${marketDisplayName} Market (Browser)`}
          >
            <ExternalLink size={13} />
          </button>
          <CopyMarketHashButton name={auction.marketHashName} />
          <div style={styles.marketplaceBadge}>
            <MarketLogo
              marketId={auction.marketplace}
              marketName={marketDisplayName}
              size={14}
              showBackground={false}
            />
            <span style={styles.marketText}>{marketDisplayName}</span>
          </div>
        </div>
      </div>

      {/* Main Info: Image & Details */}
      <div style={styles.contentRow}>
        <div style={styles.imageCol}>
          <SkinImage
            src={itemImageUrl}
            alt={auction.marketHashName}
            fallbackItemName={auction.marketHashName}
            height={72}
            maxImageHeight={62}
          />
        </div>

        <div style={styles.itemInfo}>
          <h3 style={styles.itemName} title={auction.marketHashName}>
            {auction.marketHashName}
          </h3>

          <div style={styles.tagRow}>
            {auction.wear && <span style={styles.wearTag}>{auction.wear}</span>}
            {auction.floatValue && (
              <span style={styles.floatTag}>Float: {auction.floatValue}</span>
            )}
            {auction.inspectUrl && (
              <button
                onClick={handleOpenInspect}
                style={styles.inspectBtn}
                title="Inspect in CS2"
              >
                Inspect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section: Top Offer vs Skin Oracle Buy Ceiling */}
      <div style={styles.pricingSection}>
        {/* Left: Current Highest Offer */}
        <div style={styles.priceCol}>
          <span style={styles.priceLabel}>Top Offer</span>
          <div style={styles.bidAmount}>
            ${currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
          </div>
          <span style={styles.bidCount}>
            {auction.bidsCount} {auction.bidsCount === 1 ? 'offer' : 'offers'}
            {auction.highestBidderTag && ` • by ${auction.highestBidderTag}`}
          </span>
        </div>

        {/* Right: Trader's Personal Oracle Buy Ceiling Reference */}
        <div
          style={{
            ...styles.oracleCol,
            cursor: hasCeiling ? 'pointer' : 'default',
          }}
          onClick={() => {
            if (hasCeiling) {
              setCustomBid(myCeiling.toFixed(2));
            }
          }}
          title={hasCeiling ? `Click to set offer to your buy ceiling ($${myCeiling.toFixed(2)})` : undefined}
        >
          <span style={styles.oracleLabel}>
            <ShieldCheck size={12} style={{ color: '#38bdf8' }} />
            Your Buy Ceiling
          </span>
          <div style={styles.oracleCeiling}>
            {hasCeiling ? `$${myCeiling.toFixed(2)}` : 'Not Calculated'}
          </div>
          {hasCeiling && (
            <div style={getSpreadBadgeStyle(isProfitable)}>
              <TrendingUp size={11} />
              <span>
                {isProfitable
                  ? `+$${spreadCents.toFixed(2)} margin`
                  : 'Over Ceiling'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div style={styles.actionFooter}>
        {auction.listingUrl ? (
          /* Winner Action: Buy on CSFloat directly or open stall/store */
          <button onClick={handleOpenListing} style={styles.buyMarketBtn}>
            <Zap size={15} />
            <span>{listingButtonLabel}</span>
            <ExternalLink size={14} />
          </button>
        ) : isExpired ? (
          hasBids ? (
            <div style={styles.pendingLinkNotice}>
              ⏳ Deal matched. Awaiting seller listing URL...
            </div>
          ) : (
            <div style={styles.noBidsNotice}>
              Deal expired • No offers placed
            </div>
          )
        ) : (
          /* Live Matchmaking Offer Toolbar */
          <form onSubmit={handleCustomBidSubmit} style={styles.bidForm}>
            {hasCeiling && myCeiling > currentPrice && (
              <button
                type="button"
                onClick={() => setCustomBid(myCeiling.toFixed(2))}
                style={styles.ceilingBidBtn}
                title={`1-Click: Set offer to your maximum accepted buy ceiling ($${myCeiling.toFixed(2)})`}
              >
                <ShieldCheck size={13} style={{ color: '#38bdf8' }} />
                <span>Max: ${myCeiling.toFixed(2)}</span>
              </button>
            )}

            <div style={styles.inputWrapper}>
              <span style={styles.currencyPrefix}>$</span>
              <input
                type="number"
                step="0.5"
                min={nextMinBid}
                placeholder={nextMinBid}
                value={customBid}
                onChange={(e) => setCustomBid(e.target.value)}
                style={styles.bidInput}
              />
            </div>

            <button
              type="submit"
              disabled={isBidding}
              style={styles.submitBidBtn}
              title="Submit Offer ($0.20 fee)"
            >
              Offer ($0.20)
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Extracted styles object per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--so-surface-card, #131720)',
    borderRadius: 'var(--so-radius-md, 12px)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRightActions: {
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
  marketplaceBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  marketText: {
    fontSize: '10.5px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    color: 'var(--so-text-secondary, #94a3b8)',
  },
  contentRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  imageCol: {
    width: '82px',
    height: '72px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    borderRadius: '8px',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    overflow: 'hidden',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    overflow: 'hidden',
  },
  itemName: {
    margin: 0,
    fontSize: '14.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    letterSpacing: '-0.2px',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  wearTag: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.25)',
  },
  floatTag: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--so-text-muted, #64748b)',
    fontFamily: 'monospace',
  },
  inspectBtn: {
    fontSize: '10.5px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--so-text-secondary, #94a3b8)',
    border: '1px solid var(--so-border-subtle)',
    cursor: 'pointer',
  },
  pricingSection: {
    display: 'flex',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  priceCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
  },
  bidAmount: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#22c55e',
    letterSpacing: '-0.3px',
  },
  bidCount: {
    fontSize: '11px',
    color: 'var(--so-text-muted, #64748b)',
  },
  oracleCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    paddingLeft: '12px',
  },
  oracleLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    textTransform: 'uppercase',
  },
  oracleCeiling: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  actionFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bidForm: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ceilingBidBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.32)',
    color: '#38bdf8',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencyPrefix: {
    position: 'absolute',
    left: '10px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  bidInput: {
    width: '100%',
    padding: '8px 8px 8px 24px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle)',
    color: 'var(--so-text-primary)',
    fontSize: '13px',
    fontWeight: 700,
    outline: 'none',
  },
  submitBidBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
  buyMarketBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '6px',
    backgroundColor: '#16a34a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
  },
  pendingLinkNotice: {
    padding: '9px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.25)',
    color: '#fde047',
    fontSize: '12px',
    textAlign: 'center',
    fontWeight: 600,
  },
  noBidsNotice: {
    padding: '9px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    border: '1px solid rgba(100, 116, 139, 0.25)',
    color: 'var(--so-text-muted, #94a3b8)',
    fontSize: '12px',
    textAlign: 'center',
    fontWeight: 600,
  },
};

function getTimerBadgeStyle(isExpired: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 9px',
    borderRadius: '6px',
    backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.14)',
    border: isExpired ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
    color: isExpired ? '#ef4444' : '#38bdf8',
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: 'monospace',
    letterSpacing: '0.4px',
  };
}

function getSpreadBadgeStyle(isProfitable: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: 700,
    color: isProfitable ? '#4ade80' : '#ef4444',
  };
}

export const AuctionItemCard = DealItemCard;
