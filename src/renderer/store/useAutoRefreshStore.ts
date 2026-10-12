import { create } from "zustand";
import type { AutoRefreshStatus } from "../../shared/types/autoRefresh.types";

interface AutoRefreshStoreState {
  /** Latest scheduler status mirrored from the main process. */
  status: AutoRefreshStatus | null;
  setStatus: (status: AutoRefreshStatus | null) => void;
}

/**
 * Shared mirror of the main-process auto-refresh scheduler status.
 * The scheduler itself lives in the main process; this store lets collapsed
 * surfaces (e.g. the Step 1 header badge) reflect the live timer state.
 */
export const useAutoRefreshStore = create<AutoRefreshStoreState>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
