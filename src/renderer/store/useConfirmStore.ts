import React from "react";
import { create } from "zustand";

export type ConfirmVariant = "danger" | "warning" | "info" | "primary";

export interface ConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolveRef: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolveRef: null,
  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const prevResolve = get().resolveRef;
      if (prevResolve) {
        prevResolve(false);
      }
      set({
        isOpen: true,
        options,
        resolveRef: resolve,
      });
    });
  },
  handleConfirm: () => {
    const { resolveRef } = get();
    if (resolveRef) resolveRef(true);
    set({ isOpen: false, options: null, resolveRef: null });
  },
  handleCancel: () => {
    const { resolveRef } = get();
    if (resolveRef) resolveRef(false);
    set({ isOpen: false, options: null, resolveRef: null });
  },
}));

/**
 * Direct imperative caller that can be used anywhere in the application.
 * Replaces window.confirm with a beautiful native-styled dark modal.
 *
 * @example
 * const confirmed = await confirmModal({
 *   title: "Wipe Database?",
 *   message: "This will delete all historical snapshots.",
 *   confirmText: "Wipe Database",
 *   variant: "danger"
 * });
 * if (!confirmed) return;
 */
export const confirmModal = (options: ConfirmOptions): Promise<boolean> => {
  return useConfirmStore.getState().confirm(options);
};

export const useConfirm = () => {
  const confirm = useConfirmStore((s) => s.confirm);
  return { confirm };
};
