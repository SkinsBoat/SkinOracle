import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CopyMarketHashButtonProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CopyMarketHashButton: React.FC<CopyMarketHashButtonProps> = ({
  name,
  size = 13,
  className = 'btn btn-sm',
  style,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!name) return;
    navigator.clipboard.writeText(name);
    setCopied(true);
    toast.success(`Copied: ${name}`, { id: 'copy-mhn', duration: 1500 });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      style={{
        padding: '3px 6px',
        background: 'var(--so-surface-panel)',
        border: '1px solid var(--so-border-subtle)',
        borderRadius: '4px',
        color: copied ? 'var(--so-success)' : 'var(--so-text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        ...style,
      }}
      title="Copy Market Hash Name"
    >
      {copied ? (
        <Check size={size} style={{ color: 'var(--so-success)' }} />
      ) : (
        <Copy size={size} />
      )}
    </button>
  );
};
