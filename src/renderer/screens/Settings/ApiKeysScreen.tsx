import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Settings, ShieldCheck, Lock, Zap, Save, Trash2 } from 'lucide-react';
import { skinSnipeLogo, cs2capLogo, csfloatLogo, skinsLogo, dmarketLogo } from '../../../../assets/images';

export default function ApiKeysScreen() {
  const [keysStatus, setKeysStatus] = useState({
    hasSkinsnipeKey: false,
    hasCs2capKey: false,
    hasCsfloatKey: false,
    hasSkinscomToken: false,
    hasDmarketKeys: false,
  });

  const [skinsnipeKey, setSkinsnipeKey] = useState('');
  const [cs2capKey, setCs2capKey] = useState('');
  const [csfloatKey, setCsfloatKey] = useState('');
  const [skinscomToken, setSkinscomToken] = useState('');
  const [dmarketPublicKey, setDmarketPublicKey] = useState('');
  const [dmarketSecretKey, setDmarketSecretKey] = useState('');

  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI.settings.getKeysStatus().then(setKeysStatus);
  }, []);

  const saveKey = async (type: 'skinsnipe' | 'cs2cap' | 'csfloat' | 'skinscom' | 'dmarket') => {
    setSaving(type);
    try {
      if (type === 'skinsnipe') {
        await window.electronAPI.settings.setSkinsnipeKey(skinsnipeKey);
        setSkinsnipeKey('');
        toast.success('Skinsnipe API key encrypted & saved!');
      } else if (type === 'cs2cap') {
        await window.electronAPI.settings.setCs2capKey(cs2capKey);
        setCs2capKey('');
        toast.success('CS2Cap API key encrypted & saved!');
      } else if (type === 'csfloat') {
        await window.electronAPI.settings.setCsfloatKey(csfloatKey);
        setCsfloatKey('');
        toast.success('CSFloat API key encrypted & saved!');
      } else if (type === 'dmarket') {
        if (!dmarketPublicKey.trim() || !dmarketSecretKey.trim()) {
          toast.error('Both DMarket Public Key and Secret Key are required.');
          return;
        }
        await window.electronAPI.settings.setDmarketKeys(dmarketPublicKey.trim(), dmarketSecretKey.trim());
        setDmarketPublicKey('');
        setDmarketSecretKey('');
        toast.success('DMarket API keys encrypted & saved!');
      } else {
        await window.electronAPI.settings.setSkinscomToken(skinscomToken);
        setSkinscomToken('');
        toast.success('Skins.com API key encrypted & saved!');
      }
      const updated = await window.electronAPI.settings.getKeysStatus();
      setKeysStatus(updated);
    } catch (err: any) {
      toast.error(`Failed to save key: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  const revokeKey = async (type: 'skinsnipe' | 'cs2cap' | 'csfloat' | 'skinscom' | 'dmarket') => {
    const label =
      type === 'skinsnipe'
        ? 'Skinsnipe API key'
        : type === 'cs2cap'
        ? 'CS2Cap API key'
        : type === 'csfloat'
        ? 'CSFloat API key'
        : type === 'dmarket'
        ? 'DMarket API keys'
        : 'Skins.com session token';
    if (!confirm(`Are you sure you want to revoke and remove your ${label}?`)) return;

    setSaving(`revoke_${type}`);
    try {
      if (type === 'skinsnipe') {
        await window.electronAPI.settings.revokeSkinsnipeKey();
        setSkinsnipeKey('');
      } else if (type === 'cs2cap') {
        await window.electronAPI.settings.revokeCs2capKey();
        setCs2capKey('');
      } else if (type === 'csfloat') {
        await window.electronAPI.settings.revokeCsfloatKey();
        setCsfloatKey('');
      } else if (type === 'dmarket') {
        await window.electronAPI.settings.revokeDmarketKeys();
        setDmarketPublicKey('');
        setDmarketSecretKey('');
      } else {
        await window.electronAPI.settings.revokeSkinscomToken();
        setSkinscomToken('');
      }
      toast.success(`${label} revoked & removed!`);
      const updated = await window.electronAPI.settings.getKeysStatus();
      setKeysStatus(updated);
    } catch (err: any) {
      toast.error(`Failed to revoke key: ${err.message}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} style={{ color: 'var(--so-primary)' }} /> API Keys & Security Settings
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--so-text-secondary)', marginTop: '4px' }}>
          Manage local API keys and exchange tokens. All secrets are stored exclusively in your local device keychain.
        </p>
      </div>

      {/* Security Banner Card */}
      <div
        style={{
          backgroundColor: 'rgba(14, 165, 233, 0.06)',
          border: '1px solid rgba(14, 165, 233, 0.22)',
          borderRadius: 'var(--so-radius-md)',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ShieldCheck size={28} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Bank-Grade OS Encryption & Hardware Isolation
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '2px 7px', fontWeight: 800 }}>
                100% LOCAL & PRIVATE
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--so-text-secondary)', marginTop: '3px', lineHeight: '1.4' }}>
              Your API keys and session tokens are stored exclusively on your device using native OS cryptographic storage (<strong>macOS Keychain</strong>, <strong>Windows DPAPI</strong>, or <strong>Linux Secret Service</strong>).
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            borderTop: '1px solid rgba(14, 165, 233, 0.15)',
            paddingTop: '12px',
          }}
        >
          <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={13} style={{ color: '#38bdf8' }} />
            <span><strong>Zero Cloud Storage:</strong> Keys are never uploaded to our servers.</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={13} style={{ color: 'var(--so-primary)' }} />
            <span><strong>Direct Calls:</strong> Requests go straight from your desktop to CSFloat & Skinsnipe.</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={13} style={{ color: '#6366f1' }} />
            <span><strong>Protected Binary:</strong> Production app code is obfuscated to prevent extraction.</span>
          </div>
        </div>
      </div>

      {/* Skinsnipe API Key Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={skinSnipeLogo} alt="Skinsnipe" style={{ height: 20, width: 'auto', objectFit: 'contain' }} /> Skinsnipe API Key
          </div>
          {keysStatus.hasSkinsnipeKey ? (
            <span className="badge badge-success">CONFIGURED</span>
          ) : (
            <span className="badge badge-warning">NOT SET</span>
          )}
        </div>
        <p className="card-desc">
          Used to query market pricing databases and cache live skin listings for Oracle evaluation.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="password"
            value={skinsnipeKey}
            onChange={e => setSkinsnipeKey(e.target.value)}
            placeholder={keysStatus.hasSkinsnipeKey ? '••••••••••••••••••••••••' : 'sk-...' }
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => saveKey('skinsnipe')}
            disabled={saving === 'skinsnipe' || !skinsnipeKey}
          >
            <Save size={14} /> {saving === 'skinsnipe' ? 'Saving...' : 'Save Key'}
          </button>
          {keysStatus.hasSkinsnipeKey && (
            <button
              className="btn"
              onClick={() => revokeKey('skinsnipe')}
              disabled={saving === 'revoke_skinsnipe'}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
              }}
            >
              <Trash2 size={14} /> {saving === 'revoke_skinsnipe' ? 'Revoking...' : 'Revoke'}
            </button>
          )}
        </div>
      </div>

      {/* CS2Cap API Key Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={cs2capLogo} alt="CS2Cap" style={{ height: 20, width: 'auto', objectFit: 'contain' }} /> CS2Cap API Key
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>PRO / QUANT STREAMING</span>
          </div>
          {keysStatus.hasCs2capKey ? (
            <span className="badge badge-success">CONFIGURED</span>
          ) : (
            <span className="badge badge-warning">NOT SET</span>
          )}
        </div>
        <p className="card-desc">
          Enables high-speed live NDJSON streaming of full CS2 market catalogs across 40+ providers (Buff163, C5, CSFloat, AvanMarket, etc.).
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="password"
            value={cs2capKey}
            onChange={e => setCs2capKey(e.target.value)}
            placeholder={keysStatus.hasCs2capKey ? '••••••••••••••••••••••••' : 'sk_live_...'}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => saveKey('cs2cap')}
            disabled={saving === 'cs2cap' || !cs2capKey}
          >
            <Save size={14} /> {saving === 'cs2cap' ? 'Saving...' : 'Save Key'}
          </button>
          {keysStatus.hasCs2capKey && (
            <button
              className="btn"
              onClick={() => revokeKey('cs2cap')}
              disabled={saving === 'revoke_cs2cap'}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
              }}
            >
              <Trash2 size={14} /> {saving === 'revoke_cs2cap' ? 'Revoking...' : 'Revoke'}
            </button>
          )}
        </div>
      </div>

      {/* CSFloat API Key Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={csfloatLogo} alt="CSFloat" style={{ height: 20, width: 'auto', objectFit: 'contain' }} /> CSFloat API Key
          </div>
          {keysStatus.hasCsfloatKey ? (
            <span className="badge badge-success">CONFIGURED</span>
          ) : (
            <span className="badge badge-warning">NOT SET</span>
          )}
        </div>
        <p className="card-desc">
          Allows the CSFloat Workstation to fetch buy orders, execute single order updates, and run automated batch price adjustments.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="password"
            value={csfloatKey}
            onChange={e => setCsfloatKey(e.target.value)}
            placeholder={keysStatus.hasCsfloatKey ? '••••••••••••••••••••••••' : 'cf-...' }
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => saveKey('csfloat')}
            disabled={saving === 'csfloat' || !csfloatKey}
          >
            <Save size={14} /> {saving === 'csfloat' ? 'Saving...' : 'Save Key'}
          </button>
          {keysStatus.hasCsfloatKey && (
            <button
              className="btn"
              onClick={() => revokeKey('csfloat')}
              disabled={saving === 'revoke_csfloat'}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
              }}
            >
              <Trash2 size={14} /> {saving === 'revoke_csfloat' ? 'Revoking...' : 'Revoke'}
            </button>
          )}
        </div>
      </div>

      {/* DMarket API Keys Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={dmarketLogo} alt="DMarket" style={{ height: 20, width: 'auto', objectFit: 'contain' }} /> DMarket API Keys (Ed25519)
          </div>
          {keysStatus.hasDmarketKeys ? (
            <span className="badge badge-success">CONFIGURED</span>
          ) : (
            <span className="badge badge-warning">NOT SET</span>
          )}
        </div>
        <p className="card-desc">
          Enables the DMarket Workstation to query targets, monitor live USD balance, and execute automated target adjustments directly from your device with Ed25519 request signing.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--so-text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Public Key (X-Api-Key)
              </label>
              <input
                type="password"
                value={dmarketPublicKey}
                onChange={e => setDmarketPublicKey(e.target.value)}
                placeholder={keysStatus.hasDmarketKeys ? '••••••••••••••••••••••••' : 'Public key (hex string)'}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', color: 'var(--so-text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                Secret Key (Ed25519 Private Key)
              </label>
              <input
                type="password"
                value={dmarketSecretKey}
                onChange={e => setDmarketSecretKey(e.target.value)}
                placeholder={keysStatus.hasDmarketKeys ? '••••••••••••••••••••••••' : 'Secret key (Ed25519 hex)'}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              className="btn btn-primary"
              onClick={() => saveKey('dmarket')}
              disabled={saving === 'dmarket' || !dmarketPublicKey.trim() || !dmarketSecretKey.trim()}
            >
              <Save size={14} /> {saving === 'dmarket' ? 'Saving...' : 'Save DMarket Keys'}
            </button>
            {keysStatus.hasDmarketKeys && (
              <button
                className="btn"
                onClick={() => revokeKey('dmarket')}
                disabled={saving === 'revoke_dmarket'}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontWeight: 700,
                }}
              >
                <Trash2 size={14} /> {saving === 'revoke_dmarket' ? 'Revoking...' : 'Revoke'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Skins.com Session Token Card - Temporarily Commented Out
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={skinsLogo} alt="Skins.com" style={{ height: 20, width: 'auto', objectFit: 'contain' }} /> Skins.com API Key
          </div>
          {keysStatus.hasSkinscomToken ? (
            <span className="badge badge-success">CONFIGURED</span>
          ) : (
            <span className="badge badge-warning">NOT SET</span>
          )}
        </div>
        <p className="card-desc">
          Enables direct communication with Skins.com API endpoints for order execution and liquidity management.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="password"
            value={skinscomToken}
            onChange={e => setSkinscomToken(e.target.value)}
            placeholder={keysStatus.hasSkinscomToken ? '••••••••••••••••••••••••' : 'sc-...' }
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => saveKey('skinscom')}
            disabled={saving === 'skinscom' || !skinscomToken}
          >
            <Save size={14} /> {saving === 'skinscom' ? 'Saving...' : 'Save Token'}
          </button>
          {keysStatus.hasSkinscomToken && (
            <button
              className="btn"
              onClick={() => revokeKey('skinscom')}
              disabled={saving === 'revoke_skinscom'}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
              }}
            >
              <Trash2 size={14} /> {saving === 'revoke_skinscom' ? 'Revoking...' : 'Revoke'}
            </button>
          )}
        </div>
      </div>
      */}
    </div>
  );
}

