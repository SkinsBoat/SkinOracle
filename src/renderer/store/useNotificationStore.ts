import { create } from "zustand";

const STORAGE_KEY = "skin_oracle_notification_settings_v1";

export interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  desktopNotificationsEnabled: boolean;
  onlyNotifyInBackground: boolean;
  notifyOnCacheComplete: boolean;
  notifyOnNewDeals: boolean;
  dealSoundCooldownSeconds: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 0.7,
  desktopNotificationsEnabled: true,
  onlyNotifyInBackground: true,
  notifyOnCacheComplete: true,
  notifyOnNewDeals: true,
  dealSoundCooldownSeconds: 10,
};

function loadSettings(): NotificationSettings {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    }
  } catch (err) {
    console.warn("[NotificationStore] Failed to load from localStorage:", err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: NotificationSettings) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.warn("[NotificationStore] Failed to save to localStorage:", err);
  }
}

interface NotificationStoreState extends NotificationSettings {
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setDesktopNotificationsEnabled: (enabled: boolean) => void;
  setOnlyNotifyInBackground: (enabled: boolean) => void;
  setNotifyOnCacheComplete: (enabled: boolean) => void;
  setNotifyOnNewDeals: (enabled: boolean) => void;
  setDealSoundCooldownSeconds: (seconds: number) => void;
  resetDefaults: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => {
  const initial = loadSettings();

  return {
    ...initial,

    setSoundEnabled: (soundEnabled) =>
      set((state) => {
        const next = { ...state, soundEnabled };
        saveSettings(next);
        return { soundEnabled };
      }),

    setSoundVolume: (soundVolume) =>
      set((state) => {
        const clamped = Math.max(0, Math.min(1, soundVolume));
        const next = { ...state, soundVolume: clamped };
        saveSettings(next);
        return { soundVolume: clamped };
      }),

    setDesktopNotificationsEnabled: (desktopNotificationsEnabled) =>
      set((state) => {
        const next = { ...state, desktopNotificationsEnabled };
        saveSettings(next);
        return { desktopNotificationsEnabled };
      }),

    setOnlyNotifyInBackground: (onlyNotifyInBackground) =>
      set((state) => {
        const next = { ...state, onlyNotifyInBackground };
        saveSettings(next);
        return { onlyNotifyInBackground };
      }),

    setNotifyOnCacheComplete: (notifyOnCacheComplete) =>
      set((state) => {
        const next = { ...state, notifyOnCacheComplete };
        saveSettings(next);
        return { notifyOnCacheComplete };
      }),

    setNotifyOnNewDeals: (notifyOnNewDeals) =>
      set((state) => {
        const next = { ...state, notifyOnNewDeals };
        saveSettings(next);
        return { notifyOnNewDeals };
      }),

    setDealSoundCooldownSeconds: (dealSoundCooldownSeconds) =>
      set((state) => {
        const next = { ...state, dealSoundCooldownSeconds };
        saveSettings(next);
        return { dealSoundCooldownSeconds };
      }),

    resetDefaults: () =>
      set(() => {
        saveSettings(DEFAULT_SETTINGS);
        return { ...DEFAULT_SETTINGS };
      }),
  };
});
