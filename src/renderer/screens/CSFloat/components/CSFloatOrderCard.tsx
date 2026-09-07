import React from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import TrendSparkline from '../../../components/TrendSparkline';

export interface OrderDriftDetails {
  acceptedPrice: number;
  driftPercent: number;
  isOverbid: boolean;
  isUnderbid: boolean;
  trendMomentum14d?: number;
}

interface CSFloatOrderCardProps {
  order: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  driftDetails?: OrderDriftDetails | null;
  isProcessing: boolean;
  onManualUpdate: (id: string, name: string, price: number, qty: number) => void;
  onDelete: (id: string) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (name: string, acceptedPrice?: number, currentPrice?: number) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

export const CSFloatOrderCard: React.FC<CSFloatOrderCardProps> = ({
  order,
  isSelected,
  onToggleSelect,
  driftDetails,
  isProcessing,
  onManualUpdate,
  onDelete,
  onOpenMarket,
  onOpenLookup,
  onUpdateQuantity,
}) => {
  const currentPrice = order.price / 100;

  const cardBorderColor = isSelected
    ? 'var(--so-primary)'
    : driftDetails?.isOverbid
    ? '#ef4444'
    : driftDetails?.isUnderbid
    ? '#f59e0b'
    : 'var(--so-border-medium)';

  const match = order.market_hash_name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : order.market_hash_name;
  const wear = match ? match[2] : '';
  const imageUrl = `https://api.steamapis.com/image/item/730/${encodeURIComponent(order.market_hash_name)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '8px',
        margin: 0,
        padding: '10px',
        minHeight: '240px',
        height: 'auto',
        boxSizing: 'border-box',
        borderRadius: 'var(--so-radius-md)',
        backgroundColor: 'var(--so-surface-card)',
        border: `1px solid ${isSelected ? 'var(--so-primary)' : cardBorderColor}`,
        boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={onToggleSelect}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
        {isSelected ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              backgroundColor: 'var(--so-primary)',
              color: '#ffffff',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              lineHeight: '1.2',
            }}
          >
            <Check size={10} /> SELECTED
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenMarket(order.market_hash_name);
              }}
              className="btn btn-sm"
              style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Open on CSFloat Market (Browser)"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLookup(order.market_hash_name, driftDetails?.acceptedPrice, currentPrice);
              }}
              className="btn btn-sm"
              style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Inspect Item Details"
            >
              <Eye size={14} />
            </button>
          </div>
        )}

        {driftDetails ? (
          driftDetails.isOverbid ? (
            <span
              className="badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontWeight: 800,
                fontSize: '9px',
                padding: '1px 5px',
              }}
            >
              <AlertTriangle size={10} /> OVERBID ({driftDetails.driftPercent > 0 ? `+${driftDetails.driftPercent.toFixed(0)}%` : `${driftDetails.driftPercent.toFixed(0)}%`})
            </span>
          ) : driftDetails.isUnderbid ? (
            <span
              className="badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontWeight: 800,
                fontSize: '9px',
                padding: '1px 5px',
              }}
            >
              <AlertTriangle size={10} /> UNDERBID ({driftDetails.driftPercent.toFixed(0)}%)
            </span>
          ) : (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 800, fontSize: '9px', padding: '1px 5px' }}>
              <CheckCircle2 size={10} /> SAFE ({driftDetails.driftPercent >= 0 ? `+${driftDetails.driftPercent.toFixed(0)}%` : `${driftDetails.driftPercent.toFixed(0)}%`})
            </span>
          )
        ) : (
          <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>ACTIVE</span>
        )}
      </div>

      {/* Image */}
      <div
        style={{
          height: '65px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--so-radius-sm)',
          border: '1px solid var(--so-border-subtle)',
          padding: '4px',
          backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
      >
        <img
          src={imageUrl}
          alt={cleanTitle}
          onError={(e) => {
            (e.target as HTMLElement).style.opacity = '0.3';
          }}
          style={{
            maxHeight: '55px',
            maxWidth: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
          }}
        />
      </div>

      {/* Title & Wear */}
      <div style={{ textAlign: 'center', minHeight: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: '11.5px',
            color: 'var(--so-text-primary)',
            lineHeight: '1.2',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {cleanTitle}
        </div>
        {wear && (
          <div style={{ fontSize: '10px', color: 'var(--so-text-muted)', fontWeight: 700, marginTop: '2px' }}>
            {wear}
          </div>
        )}
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={order.market_hash_name}
          momentum={driftDetails?.trendMomentum14d}
          height={32}
          onClick={() => onOpenLookup(order.market_hash_name, driftDetails?.acceptedPrice, currentPrice)}
        />
      </div>

      {/* Pricing */}
      <div
        style={{
          backgroundColor: driftDetails?.isOverbid
            ? 'rgba(239, 68, 68, 0.12)'
            : driftDetails?.isUnderbid
            ? 'rgba(245, 158, 11, 0.12)'
            : 'var(--so-surface-input)',
          border: `1px solid ${
            driftDetails?.isOverbid
              ? 'rgba(239, 68, 68, 0.3)'
              : driftDetails?.isUnderbid
              ? 'rgba(245, 158, 11, 0.3)'
              : 'var(--so-border-subtle)'
          }`,
          padding: '6px 8px',
          borderRadius: 'var(--so-radius-sm)',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
          <span style={{ color: 'var(--so-text-muted)' }}>Quantity</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => onUpdateQuantity(order.id, Math.max(1, (order.qty || 1) - 1))}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: '1px solid var(--so-border-subtle)',
                background: 'var(--so-surface-panel)',
                color: 'var(--so-text-primary)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              title="Decrease Quantity"
            >
              -
            </button>
            <span style={{ fontWeight: 800, color: 'var(--so-primary)', minWidth: '16px', textAlign: 'center', fontSize: '11.5px' }}>
              {order.qty || 1}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(order.id, (order.qty || 1) + 1)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '3px',
                border: '1px solid var(--so-border-subtle)',
                background: 'var(--so-surface-panel)',
                color: 'var(--so-text-primary)',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              title="Increase Quantity"
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--so-text-muted)' }}>My Price</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color: driftDetails?.isOverbid
                ? '#ef4444'
                : driftDetails?.isUnderbid
                ? '#f59e0b'
                : 'var(--so-text-primary)',
            }}
          >
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--so-text-muted)' }}>Accepted</span>
          <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
            {driftDetails?.acceptedPrice ? `$${driftDetails.acceptedPrice.toFixed(2)}` : '---'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
        {driftDetails?.acceptedPrice && (
          <button
            onClick={() => onManualUpdate(order.id, order.market_hash_name, driftDetails.acceptedPrice, order.qty || 1)}
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px' }}
          >
            {isProcessing ? <Loader2 size={11} className="spin" /> : 'Update Order'}
          </button>
        )}
        <button
          onClick={() => onDelete(order.id)}
          disabled={isProcessing}
          className="btn btn-danger btn-sm"
          title="Delete Order"
          style={{ padding: '4px 6px' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};
