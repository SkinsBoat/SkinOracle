import axios from "axios";
import { app, BrowserWindow } from "electron";
import {
  secureGet,
  secureDelete,
  STORAGE_KEYS,
} from "../../storage/secure-store";
import { SAAS_API, ORACLE_SERVER_API } from "../constants/apiUrls";

// ─────────────────────────────────────────────────────────────────
// Shared Axios instance for all SaaS API requests.
//
// Auto-attaches:
//   - Authorization: Bearer <jwt>     (for authenticated routes)
//   - x-app-version: <semver>         (for backend VersionGuard validation)
//
// The backend VersionGuard reads x-app-version and rejects requests
// from blocked versions with HTTP 426 Upgrade Required — even if
// someone bypasses the startup screen.
// ─────────────────────────────────────────────────────────────────

export const saasAxios = axios.create({
  baseURL: SAAS_API,
});

export const oracleAxios = axios.create({
  baseURL: ORACLE_SERVER_API,
});

// Attach version + JWT + User-Agent before every request
export const requestInterceptor = (config: any) => {
  const version = typeof app?.getVersion === "function" ? app.getVersion() : "0.1.7";
  config.headers = config.headers || {};
  config.headers["x-app-version"] = version;
  config.headers["User-Agent"] = `SkinOracle-Desktop/${version}`;

  const isAuthRoute = config.url?.includes("/auth/");
  const jwt = secureGet(STORAGE_KEYS.JWT);
  if (jwt && !isAuthRoute) {
    config.headers["Authorization"] = `Bearer ${jwt}`;
  }

  return config;
};

export interface NormalizedApiErrorDetails {
  statusCode: number;
  code?: string;
  errorId?: string;
  help?: string;
  minVersion?: string;
  rawMessage: string;
  displayMessage: string;
}

/**
 * Extracts and normalizes backend error responses into actionable diagnostic details.
 */
export function extractApiErrorDetails(err: any): NormalizedApiErrorDetails {
  const status: number = err?.response?.status || 500;
  const body = err?.response?.data;
  const errorObj = body?.error;

  const code: string | undefined =
    errorObj?.code || errorObj?.error || (typeof body?.error === "string" ? body.error : undefined);
  const errorId: string | undefined = errorObj?.errorId;
  const help: string | undefined = errorObj?.help;
  const minVersion: string | undefined = errorObj?.minVersion || body?.minVersion;

  const rawMessage: string =
    errorObj?.message ||
    (Array.isArray(body?.message) ? body.message.join("; ") : body?.message) ||
    err?.message ||
    "API request failed";

  let displayMessage = rawMessage;

  // For database schema errors or internal crashes with tracking errorId, present clear info with reference
  if (errorId && (code === "DATABASE_SCHEMA_ERROR" || code === "DATABASE_CONNECTION_ERROR" || code === "INTERNAL_SERVER_ERROR")) {
    displayMessage = `${rawMessage} (Ref: ${errorId})`;
  }

  return {
    statusCode: status,
    code,
    errorId,
    help,
    minVersion,
    rawMessage,
    displayMessage,
  };
}

// Normalize error messages and trigger app-level actions for IPC consumers.
// Backend returns: { success: false, error: { statusCode, message, code, errorId, help, minVersion } }
export const responseErrorInterceptor = (err: any) => {
  const errorDetails = extractApiErrorDetails(err);
  const { statusCode, code, rawMessage, displayMessage, minVersion, errorId, help } = errorDetails;

  // 1. Maintenance Mode (503 MAINTENANCE_MODE)
  if (statusCode === 503 && code === "MAINTENANCE_MODE") {
    // Broadcast to all renderer windows to immediately switch to MaintenanceScreen
    if (typeof BrowserWindow?.getAllWindows === "function") {
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("app:force-maintenance");
      });
    }

    const rejection = new Error(displayMessage);
    Object.assign(rejection, { statusCode, code, errorId, help, rawMessage });
    return Promise.reject(rejection);
  }

  // 2. Version Gating (426 Upgrade Required)
  if (statusCode === 426) {
    const appVer = typeof app?.getVersion === "function" ? app.getVersion() : "unknown";
    if (typeof BrowserWindow?.getAllWindows === "function") {
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("app:force-version-block", {
          allowed: false,
          reason: rawMessage,
          minVersion: minVersion,
          currentVersion: appVer,
        });
      });
    }

    const rejection = new Error(displayMessage);
    Object.assign(rejection, { statusCode, code, errorId, help, minVersion, rawMessage });
    return Promise.reject(rejection);
  }

  // 3. Auth Expiration (401 Unauthorized)
  if (statusCode === 401) {
    const isAuthRoute = err?.config?.url?.includes("/auth/");
    if (!isAuthRoute) {
      secureDelete(STORAGE_KEYS.JWT);
      if (typeof BrowserWindow?.getAllWindows === "function") {
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send("auth:session-expired");
        });
      }
    }

    const authMessage =
      isAuthRoute || (rawMessage && rawMessage !== "Unauthorized")
        ? rawMessage
        : "Authentication expired. Please log in again.";

    const rejection = new Error(authMessage);
    Object.assign(rejection, { statusCode, code, errorId, help, rawMessage: authMessage });
    return Promise.reject(rejection);
  }

  // 4. All other errors (Validation, Database Schema/Connection, Engine Restart Hold, etc.)
  const rejection = new Error(displayMessage);
  Object.assign(rejection, { statusCode, code, errorId, help, minVersion, rawMessage });
  return Promise.reject(rejection);
};

saasAxios.interceptors.request.use(requestInterceptor);
saasAxios.interceptors.response.use((res) => res, responseErrorInterceptor);

oracleAxios.interceptors.request.use(requestInterceptor);
oracleAxios.interceptors.response.use((res) => res, responseErrorInterceptor);
