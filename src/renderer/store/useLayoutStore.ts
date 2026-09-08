import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LayoutState {
  isSidebarExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarExpanded: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
      setSidebarExpanded: (expanded: boolean) =>
        set({ isSidebarExpanded: expanded }),
    }),
    {
      name: "skin_oracle_layout",
    },
  ),
);
