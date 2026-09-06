import React, { useState } from 'react';
import { Tag, X, AlertTriangle, ArrowUpRight, Loader2, PlusCircle } from 'lucide-react';
import { DmarketInventoryItem, ListingPriceInfo } from '../../../../shared/types';
import { getTradeTitle, getItemListingPriceWithMap } from '../dmarket-utils';
import toast from 'react-hot-toast';

interface CreateListingModalProps {
  item: DmarketInventoryItem | null;
  listingPriceMap: Record<string, ListingPriceInfo>;
  onClose: () => void;
  onSubmit: (item: DmarketInventoryItem, priceUsd: number) => Promise<void>;
  onDeposit: (item: DmarketInventoryItem) => Promise<void>;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  item,
  listingPriceMap,
  onClose,
  onSubmit,
  onDeposit,
}) => {
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const oracleEntry = getItemListingPriceWithMap(item, listingPriceMap);
  const tradeTitle = getTradeTitle(item);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Please enter a valid listing price');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(item, numPrice);
      onClose();
    } catch {
      // Toast handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          backgroundColor: 'var(--so-surface-card)',
          border: '1px solid var(--so-border-medium)',
          borderRadius: 'var(--so-radius-md)',
          maxWidth: '460px',
          width: '100%',
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--so-text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Tag size={16} style={{ color: 'var(--so-primary)' }} /> List Item on DMarket
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px', borderRadius: '50%' }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px',
            backgroundColor: 'var(--so-surface-panel)',
            borderRadius: 'var(--so-radius-sm)',
            border: '1px solid var(--so-border-subtle)',
          }}
        >
          <img
            src={
              item.imageUrl ||
              (item.title
                ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(tradeTitle)}`
                : '')
            }
            alt={item.title}
            onError={e => {
              const imgEl = e.target as HTMLImageElement;
              const fallback = `https://api.steamapis.com/image/item/730/${encodeURIComponent(tradeTitle)}`;
              if (imgEl.src !== fallback) {
                imgEl.src = fallback;
              } else {
                imgEl.style.opacity = '0.3';
              }
            }}
            style={{ width: '45px', height: '45px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--so-text-primary)' }}>
              {tradeTitle}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
              Location:{' '}
              <strong style={{ color: item.inMarket ? 'var(--so-success-text)' : '#60a5fa' }}>
                {item.inMarket ? 'On DMarket (Ready)' : 'In Steam Inventory'}
              </strong>{' '}
              • Status:{' '}
              <strong style={{ color: item.tradable ? 'var(--so-success-text)' : '#f59e0b' }}>
                {item.tradable ? 'Tradable' : 'Trade Locked'}
              </strong>
            </div>
          </div>
        </div>

        {!item.inMarket && (
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--so-radius-sm)',
              padding: '12px 14px',
              fontSize: '12px',
              color: '#93c5fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#60a5fa' }}>
              <AlertTriangle size={15} />
              <span>Item is currently in Steam Inventory</span>
            </div>
            <div style={{ color: 'var(--so-text-secondary)', fontSize: '11.5px', lineHeight: 1.4 }}>
              DMarket requires skins to be deposited to their storage bots before you can create an active sell listing. Click below to initiate the deposit trade offer.
            </div>
            <button
              type="button"
              onClick={async () => {
                onClose();
                await onDeposit(item);
              }}
              className="btn btn-primary btn-sm"
              style={{
                alignSelf: 'flex-start',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
              }}
            >
              <ArrowUpRight size={13} />
              <span>Deposit to DMarket Now</span>
            </button>
          </div>
        )}

        {oracleEntry?.listingPrice && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              padding: '8px 12px',
              borderRadius: 'var(--so-radius-sm)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>
              Oracle Target Price:{' '}
              <strong style={{ color: 'var(--so-success-text)' }}>
                ${oracleEntry.listingPrice.toFixed(2)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setPrice(oracleEntry.listingPrice.toFixed(2))}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '10.5px', padding: '2px 8px' }}
            >
              Use Oracle Price
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--so-text-secondary)',
                marginBottom: '5px',
              }}
            >
              Listing Price ($ USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              autoFocus
              required
              placeholder="e.g. 15.50"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: 'var(--so-surface-input)',
                color: 'var(--so-text-primary)',
                border: '1px solid var(--so-border-medium)',
                borderRadius: 'var(--so-radius-sm)',
                padding: '10px 14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !item.inMarket}
              title={!item.inMarket ? 'Deposit to DMarket before listing' : undefined}
            >
              {submitting ? <Loader2 size={14} className="spin" /> : <PlusCircle size={14} />}
              <span>{submitting ? 'Listing...' : 'Confirm & List'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
