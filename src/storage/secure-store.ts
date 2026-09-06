import { ipcMain, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// ─────────────────────────────────────────────────────────────────
// Secure local storage for API keys using Electron safeStorage
// Keys are encrypted by the OS (Keychain on Mac, Secret Service on Linux)
// They are NEVER sent to our SaaS backend.
// ─────────────────────────────────────────────────────────────────

const KEYS_FILE = path.join(
  app?.getPath ? app.getPath('userData') : (process.env.USER_DATA_PATH || process.cwd()),
  'secure-keys.bin',
);

const STORAGE_KEYS = {
  SKINSNIPE: 'skinsnipe_api_key',
  CSFLOAT: 'csfloat_api_key',
  SKINSCOM: 'skinscom_token',
  DMARKET_PUBLIC: 'dmarket_public_key',
  DMARKET_SECRET: 'dmarket_secret_key',
  JWT: 'saas_jwt',
};

interface StoredKeys {
  [key: string]: string; // encrypted base64
}

function readStore(): StoredKeys {
  try {
    if (!fs.existsSync(KEYS_FILE)) return {};
    const raw = fs.readFileSync(KEYS_FILE);
    return JSON.parse(raw.toString());
  } catch {
    return {};
  }
}

function writeStore(store: StoredKeys) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(store), { mode: 0o600 });
  try {
    // Ensure POSIX file permissions are strictly restricted even if the file already existed
    fs.chmodSync(KEYS_FILE, 0o600);
  } catch {
    // chmod may fail on certain Windows filesystems; safely ignore
  }
}

export function secureSet(key: string, value: string) {
  const store = readStore();
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    store[key] = encrypted.toString('base64');
  } else {
    // Fallback if OS keytar daemon is unavailable (e.g. headless/Linux without secret-service).
    // ⚠️ WARNING: Keys are stored as base64 (NOT encrypted) in this mode.
    console.warn(
      '[SecureStore] OS encryption unavailable — falling back to base64 storage. ' +
      'API keys are NOT hardware-protected on this system.'
    );
    store[key] = 'plain:' + Buffer.from(value).toString('base64');
  }
  writeStore(store);
}

export function secureGet(key: string): string | null {
  const store = readStore();
  const raw = store[key];
  if (!raw) return null;

  if (raw.startsWith('plain:')) {
    return Buffer.from(raw.slice(6), 'base64').toString('utf8');
  }

  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw, 'base64'));
    }
    return null;
  } catch {
    return null;
  }
}

export function secureDelete(key: string) {
  const store = readStore();
  delete store[key];
  writeStore(store);
}

// ── IPC handlers for settings ──────────────────────────────────

if (ipcMain?.handle) {
  ipcMain.handle('settings:set-skinsnipe-key', (_, key: string) => {
    secureSet(STORAGE_KEYS.SKINSNIPE, key);
    return { success: true };
  });

  ipcMain.handle('settings:set-csfloat-key', (_, key: string) => {
    secureSet(STORAGE_KEYS.CSFLOAT, key);
    return { success: true };
  });

  ipcMain.handle('settings:set-skinscom-token', (_, token: string) => {
    secureSet(STORAGE_KEYS.SKINSCOM, token);
    return { success: true };
  });

  ipcMain.handle('settings:revoke-skinsnipe-key', () => {
    secureDelete(STORAGE_KEYS.SKINSNIPE);
    return { success: true };
  });

  ipcMain.handle('settings:revoke-csfloat-key', () => {
    secureDelete(STORAGE_KEYS.CSFLOAT);
    return { success: true };
  });

  ipcMain.handle('settings:set-dmarket-keys', (_, publicKey: string, secretKey: string) => {
    secureSet(STORAGE_KEYS.DMARKET_PUBLIC, publicKey);
    secureSet(STORAGE_KEYS.DMARKET_SECRET, secretKey);
    return { success: true };
  });

  ipcMain.handle('settings:revoke-skinscom-token', () => {
    secureDelete(STORAGE_KEYS.SKINSCOM);
    return { success: true };
  });

  ipcMain.handle('settings:revoke-dmarket-keys', () => {
    secureDelete(STORAGE_KEYS.DMARKET_PUBLIC);
    secureDelete(STORAGE_KEYS.DMARKET_SECRET);
    return { success: true };
  });

  ipcMain.handle('settings:get-keys-status', () => {
    return {
      hasSkinsnipeKey: !!secureGet(STORAGE_KEYS.SKINSNIPE),
      hasCsfloatKey: !!secureGet(STORAGE_KEYS.CSFLOAT),
      hasSkinscomToken: !!secureGet(STORAGE_KEYS.SKINSCOM),
      hasDmarketKeys: !!secureGet(STORAGE_KEYS.DMARKET_PUBLIC) && !!secureGet(STORAGE_KEYS.DMARKET_SECRET),
      hasJwt: !!secureGet(STORAGE_KEYS.JWT),
    };
  });

  // Returns whether OS-level encryption (Keychain / DPAPI / Secret Service) is available.
  // The renderer uses this to show a security warning when the plaintext fallback is active.
  ipcMain.handle('settings:get-encryption-status', () => {
    const isEncrypted = safeStorage?.isEncryptionAvailable ? safeStorage.isEncryptionAvailable() : false;
    return { isEncrypted };
  });
}

export { STORAGE_KEYS };
