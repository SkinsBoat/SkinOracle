import { ipcMain } from 'electron';
import axios from 'axios';
import { secureGet, STORAGE_KEYS } from '../../storage/secure-store';
import { SKINSCOM_BUY_ORDERS, SKINSCOM_BUY_ORDER_BY_ID } from '../constants/apiUrls';

// ─────────────────────────────────────────────────────────────────
// Skins.com buy order IPC handlers
//
// All requests go DIRECTLY from the trader's machine to Skins.com.
// Zero traffic through our SaaS backend.
// ─────────────────────────────────────────────────────────────────

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

ipcMain.handle('skinscom:get-orders', async () => {
  const token = secureGet(STORAGE_KEYS.SKINSCOM);
  if (!token) throw new Error('Skins.com token not set');

  const res = await axios.get(SKINSCOM_BUY_ORDERS, {
    headers: getHeaders(token),
  });
  return res.data;
});

ipcMain.handle('skinscom:create-buy-order', async (_, marketHashName: string, price: number) => {
  const token = secureGet(STORAGE_KEYS.SKINSCOM);
  if (!token) throw new Error('Skins.com token not set');

  const res = await axios.post(
    SKINSCOM_BUY_ORDERS,
    { market_hash_name: marketHashName, price },
    { headers: getHeaders(token) },
  );
  return res.data;
});

ipcMain.handle('skinscom:delete-order', async (_, orderId: string) => {
  const token = secureGet(STORAGE_KEYS.SKINSCOM);
  if (!token) throw new Error('Skins.com token not set');

  await axios.delete(SKINSCOM_BUY_ORDER_BY_ID(orderId), {
    headers: getHeaders(token),
  });
  return { success: true };
});
