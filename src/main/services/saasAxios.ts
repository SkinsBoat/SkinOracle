import axios from "axios";
import { app, BrowserWindow } from "electron";
import {
  secureGet,
  secureDelete,
  STORAGE_KEYS,
} from "../../storage/secure-store";
import { SAAS_API } from "../constants/apiUrls";

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

// Attach version + JWT + User-Agent before every request
saasAxios.interceptors.request.use((config) => {
  const version = app.getVersion();
  config.headers["x-app-version"] = version;
  config.headers["User-Agent"] = `SkinOracle-Desktop/${version}`;

  const isAuthRoute = config.url?.includes("/auth/");
  const jwt = secureGet(STORAGE_KEYS.JWT);
  if (jwt && !isAuthRoute) {
    config.headers["Authorization"] = `Bearer ${jwt}`;
  }

  return config;
});

// Normalize error messages for IPC consumers.
// Backend now returns: { success: false, error: { statusCode, message } }
saasAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status: number = err.response?.status;
    const body = err.response?.data;

    // Extract message from normalized backend shape, fall back to raw message
    const message: string =
      body?.error?.message ||
      (Array.isArray(body?.message)
        ? body.message.join("; ")
        : body?.message) ||
      err.message ||
      "SaaS API request failed";

    if (status === 503 && body?.error?.error === "MAINTENANCE_MODE") {
      // Broadcast to all renderer windows to immediately switch to MaintenanceScreen
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("app:force-maintenance");
      });

      return Promise.reject(new Error(message));
    }

    if (status === 426) {
      // Broadcast to all renderer windows to immediately switch to VersionBlockedScreen
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("app:force-version-block", {
          allowed: false,
          reason: message,
          minVersion: body?.error?.minVersion || body?.minVersion,
          currentVersion: app.getVersion(),
        });
      });
      return Promise.reject(new Error(message));
    }

    if (status === 401) {
      const isAuthRoute = err.config?.url?.includes("/auth/");
      if (!isAuthRoute) {
        secureDelete(STORAGE_KEYS.JWT);
        // Broadcast to all windows that the session has expired so the renderer resets cleanly
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send("auth:session-expired");
        });
      }
      // On auth routes or when the server returned a specific message (not generic "Unauthorized"), return that message
      if (
        isAuthRoute ||
        (body?.error?.message && body.error.message !== "Unauthorized")
      ) {
        return Promise.reject(new Error(message));
      }
      return Promise.reject(
        new Error("Authentication expired. Please log in again."),
      );
    }

    return Promise.reject(new Error(message));
  },
);
