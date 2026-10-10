import { ipcMain, Notification } from "electron";
import * as path from "path";
import { focusMainWindow } from "../windowManager";

export interface ShowNotificationPayload {
  title: string;
  body: string;
  subtitle?: string;
  silent?: boolean;
}

export function setupNotificationIPC() {
  ipcMain.handle(
    "notification:show",
    async (_, payload: ShowNotificationPayload) => {
      if (!Notification.isSupported()) {
        return { success: false, reason: "NOT_SUPPORTED" };
      }

      try {
        const iconPath = path.join(__dirname, "../../assets/icon.png");
        const notification = new Notification({
          title: payload.title || "Skin Oracle",
          body: payload.body || "",
          subtitle: payload.subtitle,
          icon: iconPath,
          silent: payload.silent !== false, // OS level silent so custom sound alerts handle the audio smoothly
        });

        notification.on("click", () => {
          // Restore & focus the existing window. Never create a new one.
          focusMainWindow();
        });

        notification.show();
        return { success: true };
      } catch (err: any) {
        console.warn("[NotificationIPC] Error showing notification:", err);
        return { success: false, error: err?.message };
      }
    }
  );
}
