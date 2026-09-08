import { ipcMain } from "electron";
import { saasAxios } from "../services/saasAxios";

export function setupBalanceIPC() {
  // Get current user's balance
  ipcMain.handle("balance:get-balance", async () => {
    const res = await saasAxios.get("/balance");
    return res.data;
  });

  // Get user's transaction history
  ipcMain.handle(
    "balance:get-history",
    async (_, page = 1, limit = 50, filters?: any) => {
      const res = await saasAxios.get("/balance/history", {
        params: { page, limit, ...filters },
      });
      return res.data;
    },
  );
}
