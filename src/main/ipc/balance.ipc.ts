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

  // Initiate NOWPayments deposit
  ipcMain.handle("balance:create-deposit", async (_, amountUsd: number) => {
    const res = await saasAxios.post("/payments/deposit", { amountUsd });
    return res.data;
  });

  // Query deposit status
  ipcMain.handle("balance:get-deposit-status", async (_, depositId: string) => {
    const res = await saasAxios.get(`/payments/deposit/${depositId}`);
    return res.data;
  });

  // Get user's deposit invoice history (NOWPayments)
  ipcMain.handle(
    "balance:get-deposit-history",
    async (_, page = 1, limit = 10) => {
      const res = await saasAxios.get("/payments/history", {
        params: { page, limit },
      });
      return res.data;
    },
  );

  // Authoritatively sync deposit status with gateway (1-hour anti-spam)
  ipcMain.handle("balance:sync-deposit", async (_, depositId: string) => {
    const res = await saasAxios.post(`/payments/deposit/${depositId}/sync`);
    return res.data;
  });
}

