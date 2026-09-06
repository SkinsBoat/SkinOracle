import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { SAAS_APP_VERSION_CHECK } from '../constants/apiUrls';

// ─────────────────────────────────────────────────────────────────
// Local persistence for version block state.
//
// Attack scenario prevented:
//   1. Bad guy disconnects internet → startup check fails open (safe)
//   2. App loads normally without online check
//   3. Bad guy reconnects → already inside the app
//
// Fix: once the server returns allowed: false, we persist that block
// to disk. On next startup we check local state FIRST. Only a confirmed
// allowed: true response from the server can clear it.
// ─────────────────────────────────────────────────────────────────

const GATE_STATE_FILE = path.join(app.getPath('userData'), 'version-gate.json');

interface PersistedGateState {
  blockedVersion: string;  // The exact version string that was blocked
  reason: string;
  minVersion: string;
  blockedAt: string;       // ISO timestamp for auditability
}

function readPersistedBlock(): PersistedGateState | null {
  try {
    if (!fs.existsSync(GATE_STATE_FILE)) return null;
    const raw = fs.readFileSync(GATE_STATE_FILE, 'utf8');
    return JSON.parse(raw) as PersistedGateState;
  } catch {
    return null;
  }
}

function persistBlock(state: PersistedGateState) {
  try {
    fs.writeFileSync(GATE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('[VersionGate] Failed to persist block state:', err);
  }
}

function clearPersistedBlock() {
  try {
    if (fs.existsSync(GATE_STATE_FILE)) fs.unlinkSync(GATE_STATE_FILE);
  } catch (err) {
    console.warn('[VersionGate] Failed to clear block state:', err);
  }
}

// ─────────────────────────────────────────────────────────────────

export interface VersionCheckResponse {
  allowed: boolean;
  reason?: string;
  minVersion?: string;
  latestVersion?: string;
  systemConfig?: any;
}

let cachedSystemConfig: any = null;

export async function refreshSystemConfig() {
  try {
    const currentVersion = app.getVersion();
    const response = await fetch(`${SAAS_APP_VERSION_CHECK}?v=${encodeURIComponent(currentVersion)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = (await response.json()) as VersionCheckResponse;
      if (data.systemConfig) cachedSystemConfig = data.systemConfig;
    }
  } catch (err) {
    console.warn('[VersionGate] Failed to refresh system config:', err);
  }
  return cachedSystemConfig;
}

export function getCachedSystemConfig() {
  return cachedSystemConfig;
}

export async function checkVersionGate(): Promise<VersionCheckResponse> {
  const currentVersion = app.getVersion();

  // ── Step 1: Check local persisted block state FIRST ──────────────
  // This defeats the "disconnect internet to bypass check" attack.
  const localBlock = readPersistedBlock();
  if (localBlock && localBlock.blockedVersion === currentVersion) {
    // Version was previously blocked by the server.
    // We still try the network to see if it has been un-blocked,
    // but we do not fail open if the network is unavailable.
    try {
      const response = await fetch(`${SAAS_APP_VERSION_CHECK}?v=${encodeURIComponent(currentVersion)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = (await response.json()) as VersionCheckResponse;
        if (data.systemConfig) cachedSystemConfig = data.systemConfig;
        if (data.allowed) {
          // Server says we're OK now — clear the local block
          clearPersistedBlock();
          console.info('[VersionGate] Previously blocked version now allowed by server. Block cleared.');
          return { allowed: true };
        } else {
          // Server still blocking — refresh the persisted state
          persistBlock({
            blockedVersion: currentVersion,
            reason: data.reason || 'Version blocked.',
            minVersion: data.minVersion || '',
            blockedAt: new Date().toISOString(),
          });
          return data;
        }
      }
    } catch {
      // Network unavailable — enforce the locally persisted block
      console.warn('[VersionGate] Network unavailable and version is locally blocked. Enforcing block.');
    }

    // Fall through: enforce local block (server unreachable or non-200)
    return {
      allowed: false,
      reason: localBlock.reason,
      minVersion: localBlock.minVersion,
    };
  }

  // ── Step 2: No local block — standard network check ──────────────
  try {
    const response = await fetch(`${SAAS_APP_VERSION_CHECK}?v=${encodeURIComponent(currentVersion)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // Fail open only when there's no local block (server error / unreachable)
      return { allowed: true };
    }

    const data = (await response.json()) as VersionCheckResponse;
    if (data.systemConfig) cachedSystemConfig = data.systemConfig;

    if (!data.allowed) {
      // Server just blocked this version — persist it immediately
      persistBlock({
        blockedVersion: currentVersion,
        reason: data.reason || 'Version blocked.',
        minVersion: data.minVersion || '',
        blockedAt: new Date().toISOString(),
      });
      console.warn(`[VersionGate] Version ${currentVersion} blocked by server. Persisted locally.`);
    }

    return data;
  } catch (err) {
    // Network error with no local block — fail open
    console.warn('[VersionGate] Network check failed, no local block, allowing startup:', err);
    return { allowed: true };
  }
}

export function showUpdateRequiredWindow(details: VersionCheckResponse): BrowserWindow {
  const currentVersion = app.getVersion();
  const blockedWin = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    movable: true,
    minimizable: true,
    maximizable: false,
    backgroundColor: '#050505',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  blockedWin.setMenuBarVisibility(false);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Update Required - SkinOracle</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #050505;
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
            user-select: none;
            -webkit-app-region: drag;
          }
          .container {
            background: linear-gradient(145deg, #0d0e14, #08090d);
            border: 1px solid #1e2330;
            border-radius: 16px;
            padding: 36px 32px;
            max-width: 520px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.08);
          }
          .icon-badge {
            width: 56px;
            height: 56px;
            background: rgba(244, 63, 94, 0.12);
            border: 1px solid rgba(244, 63, 94, 0.3);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
          }
          .icon-badge svg {
            width: 28px;
            height: 28px;
            stroke: #f43f5e;
          }
          h1 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          p.reason {
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .version-box {
            background: rgba(17, 24, 39, 0.7);
            border: 1px solid #2d3748;
            border-radius: 10px;
            padding: 12px 16px;
            display: inline-flex;
            gap: 16px;
            font-size: 13px;
            color: #cbd5e1;
            margin-bottom: 16px;
          }
          .version-tag {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .badge-disabled {
            color: #f43f5e;
            font-weight: 600;
          }
          .badge-required {
            color: #10b981;
            font-weight: 600;
          }
          .subtext {
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon-badge">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1>Update Required</h1>
          <p class="reason">${details.reason || 'This version of SkinOracle is no longer supported.'}</p>

          <div class="version-box">
            <div class="version-tag">
              <span>Your Version:</span>
              <span class="badge-disabled">v${currentVersion}</span>
            </div>
            ${details.minVersion ? `
              <div style="width: 1px; background: #2d3748;"></div>
              <div class="version-tag">
                <span>Required:</span>
                <span class="badge-required">v${details.minVersion}+</span>
              </div>
            ` : ''}
          </div>

          <p class="subtext">Please download and install the latest update to continue using the workstation.</p>
        </div>
      </body>
    </html>
  `;

  blockedWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  return blockedWin;
}
