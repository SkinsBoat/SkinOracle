import { ipcMain } from "electron";
import {
  secureGet,
  secureSet,
  secureDelete,
  STORAGE_KEYS,
} from "../../storage/secure-store";
import { saasAxios } from "../services/saasAxios";

// ── Register: send email, receive OTP ─────────────────────────────
ipcMain.handle("auth:register", async (_, email: string) => {
  secureDelete(STORAGE_KEYS.JWT);
  const res = await saasAxios.post("/auth/register", { email });
  return res.data; // { message: "Verification code sent" }
});

// ── Verify OTP: receive JWT ────────────────────────────────────────
ipcMain.handle("auth:verify", async (_, email: string, code: string) => {
  const res = await saasAxios.post("/auth/verify", { email, code });
  const { accessToken } = res.data;
  if (accessToken) secureSet(STORAGE_KEYS.JWT, accessToken);
  return res.data;
});

// ── Logout: delete stored JWT ──────────────────────────────────────
ipcMain.handle("auth:logout", () => {
  secureDelete(STORAGE_KEYS.JWT);
  return { success: true };
});

// ── Check auth status ──────────────────────────────────────────────
ipcMain.handle("auth:get-status", () => {
  const jwt = secureGet(STORAGE_KEYS.JWT);
  return { isLoggedIn: !!jwt };
});
