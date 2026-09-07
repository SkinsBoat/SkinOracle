import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UpdateStatusState } from '../../shared/types';

interface UpdateNotificationProps {
  isMandatory?: boolean;
}

export default function UpdateNotification({ isMandatory = false }: UpdateNotificationProps) {
  const [updateState, setUpdateState] = useState<UpdateStatusState>({
    status: 'idle',
    info: null,
    progress: null,
    error: null,
  });

  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isStartingDownload, setIsStartingDownload] = useState<boolean>(false);

  useEffect(() => {
    if (!window.electronAPI?.updater) return;

    // Listen for real-time update status changes from main process
    const unsubscribe = window.electronAPI.updater.onUpdateStatus((state) => {
      setUpdateState(state);
      if (state.status === 'downloading') {
        setIsStartingDownload(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDownload = async () => {
    setIsStartingDownload(true);
    try {
      await window.electronAPI.updater.downloadUpdate();
    } catch (err) {
      setIsStartingDownload(false);
    }
  };

  const handleRestart = async () => {
    await window.electronAPI.updater.quitAndInstall();
  };

  // If dismissed by user for current session, don't display (unless mandatory)
  if (!isMandatory && updateState.info?.version && dismissedVersion === updateState.info.version) {
    return null;
  }

  // Do not render anything when idle or check completed with no update
  if (updateState.status === 'idle' || updateState.status === 'checking' || updateState.status === 'not-available') {
    return null;
  }

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec) return '';
    const mbps = bytesPerSec / (1024 * 1024);
    return `${mbps.toFixed(2)} MB/s`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '460px',
        width: 'calc(100% - 48px)',
        backgroundColor: 'rgba(15, 17, 26, 0.95)',
        backdropFilter: 'blur(12px)',
        border: isMandatory ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--so-border-strong)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: isMandatory
          ? '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(244, 63, 94, 0.2)'
          : '0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(37, 99, 235, 0.15)',
        color: 'var(--so-text-primary)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* ── Status: Available ── */}
      {updateState.status === 'available' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: isMandatory ? 'rgba(244, 63, 94, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                  border: isMandatory ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isMandatory ? '#f43f5e' : 'var(--so-primary)',
                }}
              >
                {isMandatory ? <AlertCircle size={18} /> : <Sparkles size={18} />}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                  {isMandatory ? `Mandatory Update (v${updateState.info?.version})` : `Update Available (v${updateState.info?.version})`}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--so-text-muted)' }}>
                  {isMandatory
                    ? 'This update is required to connect to SkinOracle services.'
                    : 'A new version of SkinOracle is ready to download.'}
                </p>
              </div>
            </div>
            {!isMandatory && (
              <button
                onClick={() => setDismissedVersion(updateState.info?.version || '1.0')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--so-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Dismiss for now"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {!isMandatory && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDismissedVersion(updateState.info?.version || '1.0')}
              >
                Later
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={isStartingDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: isMandatory ? '100%' : 'auto',
                justifyContent: 'center',
              }}
            >
              <Download size={14} />
              {isStartingDownload ? 'Starting Download...' : 'Download Update'}
            </button>
          </div>
        </div>
      )}

      {/* ── Status: Downloading ── */}
      {updateState.status === 'downloading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={16} className="spin" style={{ color: 'var(--so-primary)' }} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                Downloading Update v{updateState.info?.version}...
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--so-primary)' }}>
              {Math.round(updateState.progress?.percent || 0)}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${updateState.progress?.percent || 0}%`,
                height: '100%',
                backgroundColor: 'var(--so-primary)',
                borderRadius: '3px',
                transition: 'width 0.2s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--so-text-muted)' }}>
            <span>{formatSpeed(updateState.progress?.bytesPerSecond)}</span>
            <span>
              {((updateState.progress?.transferred || 0) / (1024 * 1024)).toFixed(1)} MB /{' '}
              {((updateState.progress?.total || 0) / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}

      {/* ── Status: Downloaded ── */}
      {updateState.status === 'downloaded' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--so-success)',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Update Ready to Install (v{updateState.info?.version})
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--so-text-muted)' }}>
                Restart application to complete update installation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-success btn-sm"
              onClick={handleRestart}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}
            >
              <RefreshCw size={14} /> Restart & Install Update
            </button>
          </div>
        </div>
      )}

      {/* ── Status: Error ── */}
      {updateState.status === 'error' && updateState.error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ color: 'var(--so-danger-text)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--so-danger-text)' }}>
              {updateState.error}
            </span>
          </div>
          <button
            onClick={() => setUpdateState((prev) => ({ ...prev, status: 'idle' }))}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--so-text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
