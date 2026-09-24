import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Zap,
  Activity,
  Ban,
  Eye,
  AlertTriangle,
  Flame,
  Search,
} from 'lucide-react';
import { DealMakerItem } from '../../../../shared/types/dealmaker.types';
import { useDealMakerStore } from '../../../store/useDealMakerStore';
import { SkinImage } from '../../../components/SkinImage';
import { CopyMarketHashButton } from '../../../components/CopyMarketHashButton';
import { getMarketItemUrl } from '../../../utils/marketUrls';
import { getCsfloatSearchUrl } from '../../../utils/csfloatUrls';
import { MarketLogo } from '../../../components/MarketLogo';
import { getMarketDisplayName } from '../../../../shared/canonicalMarkets';
import {
  CSFloatLookupModal,
  LookupModalItemData,
} from '../../CSFloat/modals/CSFloatLookupModal';
import {
  parseSkinHashName,
  getWearColors,
} from '../utils/skinCardUtils';

export interface DealItemCardProps {
  auction: DealMakerItem;
  myCeiling?: number;
  /** Supply Stability Score for this item from the local Oracle cache. */
  mySss?: number;
}

export type AuctionItemCardProps = DealItemCardProps;

export const DealItemCard: React.FC<DealItemCardProps> = ({
  auction,
  myCeiling,
  mySss,
}) => {
  const { placeBid, isBidding, myAuctions, activeBidAuctions } =
    useDealMakerStore();

  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [customBid, setCustomBid] = useState<string>('');
  const [lookupItem, setLookupItem] = useState<LookupModalItemData | null>(null);

  // A trader can never place an offer on their own broadcast.
  const isOwnDeal = myAuctions.some((a) => a.id === auction.id);

  // The trader already submitted an offer on this deal.
  const hasExistingOffer = activeBidAuctions.some((a) => a.id === auction.id);

  const currentPrice = Number(auction.highestBid || auction.startingPrice || 0);
  const nextMinBid = currentPrice > 0 ? (currentPrice + 1.0).toFixed(2) : '1.00';

  const hasCeiling = typeof myCeiling === 'number' && myCeiling > 0;
  const hasSss = typeof mySss === 'number' && mySss > 0;

  // Non-blocking advisories: we never prevent an offer, we warn the trader.
  const pendingBid = parseFloat(customBid || nextMinBid) || 0;
  const offerExceedsCeiling =
    hasCeiling && pendingBid > myCeiling;
  const minNextExceedsCeiling =
    hasCeiling && !customBid && parseFloat(nextMinBid) > myCeiling;

  const ceilingWarning = offerExceedsCeiling || minNextExceedsCeiling;
  const hasOfferAlert = hasExistingOffer || ceilingWarning;

  const offerAlertLabel =
    hasExistingOffer && ceilingWarning
      ? 'Offer Alerts'
      : hasExistingOffer
        ? 'Existing Offer'
        : 'Over Ceiling';

  const offerAlertTooltip = [
    hasExistingOffer
      ? 'You already have an active offer on this deal — submitting will raise it.'
      : '',
    offerExceedsCeiling
      ? `Your offer of $${pendingBid.toFixed(2)} is above your Buy Ceiling ($${myCeiling.toFixed(2)}) — you may overpay.`
      : '',
    minNextExceedsCeiling
      ? `The minimum next offer ($${nextMinBid}) already exceeds your Buy Ceiling ($${myCeiling.toFixed(2)}).`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Live countdown timer calculation
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

  const openExternalUrl = (url: string) => {
    if (window.electronAPI?.auction?.openExternalLink) {
      window.electronAPI.auction.openExternalLink(url);
    } else if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const postedLink = auction.listingUrl || auction.marketLink;

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

  const handleOpenMarketByName = (name: string) => {
    const targetUrl =
      getMarketItemUrl(auction.marketplace, name) ||
      getCsfloatSearchUrl(name);
    openExternalUrl(targetUrl);
  };

  const spreadCents = hasCeiling ? myCeiling - currentPrice : 0;
  const isProfitable = hasCeiling && currentPrice <= myCeiling;
  const hasBids = Number(auction.bidsCount || 0) > 0;

  const itemImageUrl =
    auction.imageUrl ||
    `https://api.steamapis.com/image/item/730/${encodeURIComponent(auction.marketHashName)}`;

  const marketDisplayName = getMarketDisplayName(auction.marketplace);
  const listingButtonLabel = postedLink
    ? postedLink.includes('/stall/') || auction.marketLink
      ? 'Buy From Seller Store'
      : `Buy on ${marketDisplayName} Now`
    : '';

  const parsed = useMemo(() => {
    return parseSkinHashName(auction.marketHashName, auction.wear);
  }, [auction.marketHashName, auction.wear]);

  const wearColors = useMemo(() => {
    return getWearColors(parsed.shortWear);
  }, [parsed.shortWear]);

  const isUrgentTimer = !isExpired && secondsRemaining > 0 && secondsRemaining <= 120;

  return (
    <div style={styles.card}>
      {/* 1. Card Header: Timer & Marketplace Meta */}
      <div style={styles.headerRow}>
        <div style={getTimerBadgeStyle(isExpired, hasBids, isUrgentTimer)}>
          {isUrgentTimer ? <Flame size={12} style={{ color: '#f59e0b' }} /> : <Clock size={12} />}
          <span>{isExpired ? (hasBids ? 'Matched' : 'Expired') : timeLeft}</span>
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
              onClick={() =>
                setLookupItem({
                  name: auction.marketHashName,
                  acceptedPrice: myCeiling,
                  marketPrice: currentPrice,
                  iconUrl: auction.imageUrl,
                  market: auction.marketplace,
                })
              }
              style={styles.iconBtn}
              title="Inspect Multi-Market Prices (Cross-Market Lookup)"
            >
              <Eye size={13} />
            </button>
            <button
              type="button"
              onClick={handleOpenMarket}
              style={styles.iconBtn}
              title={`Open on ${marketDisplayName} (Browser)`}
            >
              <ExternalLink size={13} />
            </button>
            <CopyMarketHashButton name={auction.marketHashName} />
          </div>
        </div>
      </div>

      {/* 2. Hero Skin Showcase (Prominent Visual Centerpiece) */}
      <div style={styles.heroShowcase}>
        {/* Floating Overlays Top: StatTrak, Souvenir, Knife Star, Wear */}
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

        {/* Floating Overlays Bottom: Float & CS2 Inspect */}
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

      {/* 3. Item Identity (Structured Typography) */}
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

      {/* 4. Pricing & Valuation Intelligence (Dual-Column Comparison) */}
      <div style={styles.pricingContainer}>
        {/* Left Column: Top Live Offer */}
        <div style={styles.priceCol}>
          <span style={styles.colLabel}>Top Offer</span>
          <div style={styles.topOfferAmount}>
            ${currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
          </div>
          <div style={styles.offerMetaLine}>
            <span style={styles.bidsCountText}>
              {auction.bidsCount} {auction.bidsCount === 1 ? 'offer' : 'offers'}
            </span>
            {auction.highestBidderTag && (
              <span style={styles.bidderTag} title={`Top Match: ${auction.highestBidderTag}`}>
                • {auction.highestBidderTag}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Personal Oracle Buy Ceiling (Click to auto-fill!) */}
        <div
          style={getCeilingColStyle(hasCeiling)}
          onClick={() => {
            if (hasCeiling) {
              setCustomBid(myCeiling.toFixed(2));
            }
          }}
          title={
            hasCeiling
              ? `Click to set offer directly to your Buy Ceiling ($${myCeiling.toFixed(2)})`
              : 'Buy Ceiling not calculated for this item in Oracle Central'
          }
        >
          <div style={styles.ceilingHeaderRow}>
            <span style={styles.ceilingLabel}>
              <ShieldCheck size={12} style={{ color: '#38bdf8' }} />
              Buy Ceiling
            </span>
            {hasSss && (
              <span
                style={styles.sssPill}
                title="Supply Stability Score (SSS): cross-market balance & listed depth"
              >
                <Activity size={10} />
                <span>{mySss!.toFixed(1)}</span>
              </span>
            )}
          </div>

          <div style={styles.ceilingAmount}>
            {hasCeiling ? `$${myCeiling.toFixed(2)}` : 'Not Calculated'}
          </div>

          <div style={styles.ceilingSubRow}>
            {hasCeiling ? (
              <div style={getSpreadBadgeStyle(isProfitable)}>
                <TrendingUp size={11} />
                <span>
                  {isProfitable
                    ? `+$${spreadCents.toFixed(2)} Margin`
                    : 'Over Ceiling'}
                </span>
              </div>
            ) : (
              <span style={styles.ceilingUnsetHint}>Unset in Oracle</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Action / Submission Zone */}
      <div style={styles.actionZone}>
        {isOwnDeal ? (
          <div style={styles.ownDealBanner}>
            <Ban size={13} style={styles.ownDealIcon} />
            <span>Your broadcast — manage in My Broadcasts</span>
          </div>
        ) : postedLink ? (
          <button onClick={handleOpenListing} style={styles.buyMarketBtn}>
            <Zap size={14} />
            <span>{listingButtonLabel}</span>
            <ExternalLink size={13} />
          </button>
        ) : isExpired ? (
          hasBids ? (
            <div style={styles.pendingLinkBanner}>
              ⏳ Deal matched • Awaiting seller listing link
            </div>
          ) : (
            <div style={styles.expiredBanner}>
              Deal closed • No offers placed
            </div>
          )
        ) : (
          <form onSubmit={handleCustomBidSubmit} style={styles.offerForm}>
            {hasOfferAlert && (
              <div style={styles.alertBar} title={offerAlertTooltip}>
                <AlertTriangle size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                <span style={styles.alertBarText}>{offerAlertLabel}</span>
              </div>
            )}

            <div style={styles.offerControlsRow}>
              {hasCeiling && myCeiling > currentPrice && (
                <button
                  type="button"
                  onClick={() => setCustomBid(myCeiling.toFixed(2))}
                  style={styles.maxCeilingBtn}
                  title={`1-Click auto-fill with maximum Buy Ceiling ($${myCeiling.toFixed(2)})`}
                >
                  <ShieldCheck size={12} style={{ color: '#38bdf8' }} />
                  <span>Max ${myCeiling.toFixed(2)}</span>
                </button>
              )}

              <div style={styles.inputWrapper}>
                <span style={styles.currencySymbol}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min={nextMinBid}
                  placeholder={nextMinBid}
                  value={customBid}
                  onChange={(e) => setCustomBid(e.target.value)}
                  style={styles.offerInput}
                />
              </div>

              <button
                type="submit"
                disabled={isBidding}
                style={styles.submitBtn}
                title="Submit Matchmaking Offer ($0.20 fee)"
              >
                Offer ($0.20)
              </button>
            </div>
          </form>
        )}
      </div>

      {lookupItem && (
        <CSFloatLookupModal
          item={lookupItem}
          onClose={() => setLookupItem(null)}
          onOpenMarket={handleOpenMarketByName}
        />
      )}
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
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
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
  pricingContainer: {
    display: 'flex',
    gap: '8px',
    padding: '9px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
    minHeight: '66px',
  },
  priceCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
  },
  colLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  topOfferAmount: {
    fontSize: '17px',
    fontWeight: 900,
    color: '#22c55e',
    letterSpacing: '-0.3px',
    lineHeight: '20px',
  },
  offerMetaLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10.5px',
    color: 'var(--so-text-muted, #64748b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bidsCountText: {
    fontWeight: 700,
  },
  bidderTag: {
    color: 'var(--so-text-muted, #64748b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  ceilingHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px',
  },
  ceilingLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  sssPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '9.5px',
    fontWeight: 700,
    color: '#a78bfa',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    padding: '0 4px',
    borderRadius: '3px',
  },
  ceilingAmount: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
    lineHeight: '19px',
  },
  ceilingSubRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  ceilingUnsetHint: {
    fontSize: '10px',
    color: 'var(--so-text-muted, #64748b)',
  },
  actionZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: 'auto',
  },
  offerForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  alertBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 7px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    cursor: 'help',
  },
  alertBarText: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  offerControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  maxCeilingBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '7px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: '11px',
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
    minWidth: '70px',
  },
  currencySymbol: {
    position: 'absolute',
    left: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  offerInput: {
    width: '100%',
    padding: '7px 6px 7px 20px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-bg, #090d14)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '12.5px',
    fontWeight: 700,
    outline: 'none',
    boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '7px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
  buyMarketBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '9px 14px',
    borderRadius: '6px',
    backgroundColor: '#16a34a',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  pendingLinkBanner: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.25)',
    color: '#fde047',
    fontSize: '11.5px',
    textAlign: 'center',
    fontWeight: 700,
  },
  ownDealBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '11.5px',
    fontWeight: 600,
  },
  ownDealIcon: {
    color: '#94a3b8',
    flexShrink: 0,
  },
  expiredBanner: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    border: '1px solid rgba(100, 116, 139, 0.2)',
    color: 'var(--so-text-muted, #94a3b8)',
    fontSize: '11.5px',
    textAlign: 'center',
    fontWeight: 600,
  },
};

// ─────────────────────────────────────────────────────────────────
// Pure helper functions for dynamic styling
// ─────────────────────────────────────────────────────────────────
function getTimerBadgeStyle(
  isExpired: boolean,
  hasBids: boolean,
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
    fontFamily: 'monospace',
    letterSpacing: '0.4px',
  };

  if (isExpired && hasBids) {
    return {
      ...base,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.4)',
      color: '#22c55e',
    };
  }

  if (isExpired) {
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
    };
  }

  return {
    ...base,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    color: '#38bdf8',
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

function getCeilingColStyle(hasCeiling: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    paddingLeft: '10px',
    cursor: hasCeiling ? 'pointer' : 'default',
    transition: 'background-color 0.15s ease',
  };
}

function getSpreadBadgeStyle(isProfitable: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '10px',
    fontWeight: 700,
    color: isProfitable ? '#4ade80' : '#ef4444',
  };
}

export const AuctionItemCard = DealItemCard;
