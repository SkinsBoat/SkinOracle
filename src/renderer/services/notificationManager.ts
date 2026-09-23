import toast from "react-hot-toast";
import { soundService } from "./soundService";
import { useNotificationStore } from "../store/useNotificationStore";

export interface NotificationPayload {
  title: string;
  body: string;
  subtitle?: string;
  type?: "milestone" | "deal" | "info" | "error";
  forceSound?: boolean;
}

export interface GenericAlertOptions {
  title: string;
  body: string;
  dedupKey?: string;
  cooldownMs?: number;
  playSound?: boolean;
  showToast?: boolean;
  showOSNotification?: boolean;
}

// In-memory cache for seen deal/item IDs to prevent same-item audio spam
const seenDealIds = new Set<string>();
let lastDealSoundTimestamp = 0;

class NotificationManager {
  /**
   * Dispatches a milestone notification (e.g. Cache Scan Finished, Batch Export Ready)
   */
  public notifyMilestone(payload: { title: string; body: string }) {
    const {
      soundEnabled,
      soundVolume,
      desktopNotificationsEnabled,
      onlyNotifyInBackground,
      notifyOnCacheComplete,
    } = useNotificationStore.getState();

    if (!notifyOnCacheComplete) return;

    // 1. Auditory chime
    if (soundEnabled) {
      soundService.playAlertSound({ volume: soundVolume, force: true });
    }

    // 2. In-App Toast
    toast.success(payload.body, {
      duration: 5000,
      position: "bottom-right",
      style: {
        background: "#0c0d12",
        color: "#ffffff",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "8px",
        fontSize: "13px",
      },
    });

    // 3. Native OS Notification
    if (desktopNotificationsEnabled) {
      const isWindowHidden = document.hidden || !document.hasFocus();
      if (!onlyNotifyInBackground || isWindowHidden) {
        if (window.electronAPI?.notifications?.show) {
          window.electronAPI.notifications.show({
            title: payload.title,
            body: payload.body,
            silent: true, // Audio already played via soundService
          });
        }
      }
    }
  }

  /**
   * Dispatches deal alerts with automatic deduplication (alert ONLY on genuinely new listings)
   */
  public notifyNewDeals(deals: Array<{ id: string; name: string; price?: number }>) {
    const {
      soundEnabled,
      soundVolume,
      desktopNotificationsEnabled,
      onlyNotifyInBackground,
      notifyOnNewDeals,
      dealSoundCooldownSeconds,
    } = useNotificationStore.getState();

    if (!notifyOnNewDeals || deals.length === 0) return;

    // Filter only deals we haven't seen in this session
    const novelDeals = deals.filter((d) => !seenDealIds.has(d.id));
    if (novelDeals.length === 0) {
      // All deals currently displayed were already alerted, avoid repetitive noise!
      return;
    }

    // Mark them as seen
    novelDeals.forEach((d) => seenDealIds.add(d.id));

    // Cap the seen set to prevent unbounded memory growth over days of running
    if (seenDealIds.size > 5000) {
      const toRemove = seenDealIds.size - 2000;
      let count = 0;
      for (const id of seenDealIds) {
        seenDealIds.delete(id);
        count++;
        if (count >= toRemove) break;
      }
    }

    const now = Date.now();
    const cooldownMs = dealSoundCooldownSeconds * 1000;

    // Check audio cooldown
    if (soundEnabled && now - lastDealSoundTimestamp >= cooldownMs) {
      lastDealSoundTimestamp = now;
      soundService.playAlertSound({ volume: soundVolume });
    }

    const count = novelDeals.length;
    const firstDeal = novelDeals[0];
    const title = count === 1 ? "Target Match Detected" : `${count} New Target Matches`;
    const body =
      count === 1
        ? `${firstDeal.name}${firstDeal.price ? ` - $${firstDeal.price.toFixed(2)}` : ""}`
        : `${firstDeal.name} and ${count - 1} other item${count - 1 > 1 ? "s" : ""}`;

    // Show Native OS notification if app is in background
    if (desktopNotificationsEnabled) {
      const isWindowHidden = document.hidden || !document.hasFocus();
      if (!onlyNotifyInBackground || isWindowHidden) {
        if (window.electronAPI?.notifications?.show) {
          window.electronAPI.notifications.show({
            title,
            body,
            silent: true,
          });
        }
      }
    }
  }

  /**
   * Universal alert trigger for ANY section in the application.
   * Can be configured with custom cooldown, deduplication key, sound, and toast toggles.
   */
  public triggerAlert(options: GenericAlertOptions) {
    const {
      soundEnabled,
      soundVolume,
      desktopNotificationsEnabled,
      onlyNotifyInBackground,
    } = useNotificationStore.getState();

    // Deduplication check
    if (options.dedupKey) {
      if (seenDealIds.has(options.dedupKey)) {
        return; // Already seen/alerted
      }
      seenDealIds.add(options.dedupKey);
      if (seenDealIds.size > 5000) {
        const first = seenDealIds.values().next().value;
        if (first) seenDealIds.delete(first);
      }
    }

    // Play Sound
    const shouldPlaySound = options.playSound !== false && soundEnabled;
    if (shouldPlaySound) {
      soundService.playAlertSound({
        volume: soundVolume,
        minCooldownMs: options.cooldownMs ?? 3000,
      });
    }

    // Display In-App Toast
    if (options.showToast !== false) {
      toast(options.body, {
        icon: "🔔",
        duration: 4000,
        position: "bottom-right",
        style: {
          background: "#0c0d12",
          color: "#ffffff",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          fontSize: "13px",
        },
      });
    }

    // Deliver OS Desktop Banner
    const shouldShowOS = options.showOSNotification !== false && desktopNotificationsEnabled;
    if (shouldShowOS) {
      const isWindowHidden = document.hidden || !document.hasFocus();
      if (!onlyNotifyInBackground || isWindowHidden) {
        if (window.electronAPI?.notifications?.show) {
          window.electronAPI.notifications.show({
            title: options.title,
            body: options.body,
            silent: true,
          });
        }
      }
    }
  }

  /**
   * Test current notification and audio settings
   */
  public testNotification() {
    const { soundVolume } = useNotificationStore.getState();

    // 1. Play test sound
    soundService.testSound(soundVolume);

    // 2. In-app toast
    toast("Test Alert: Sound & System Notification", {
      icon: "🔔",
      duration: 3500,
      position: "bottom-right",
      style: {
        background: "#0c0d12",
        color: "#ffffff",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "8px",
        fontSize: "13px",
      },
    });

    // 3. System banner
    if (window.electronAPI?.notifications?.show) {
      window.electronAPI.notifications.show({
        title: "Skin Oracle - Test Alert",
        body: "Notifications and audio alerts are working properly!",
        silent: true,
      });
    }
  }
}

export const notificationManager = new NotificationManager();
