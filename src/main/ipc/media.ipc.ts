import { ipcMain, net } from "electron";
import { getAppUserAgent } from "../constants/userAgent";

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

/**
 * CORS-free asset fetch for renderer exports (image embedding).
 *
 * The renderer cannot fetch cross-origin marketplace imagery (e.g. Steam item
 * thumbnails, which redirect through steamstatic) due to CORS. The main
 * process is not same-origin restricted, so it fetches the asset (following
 * redirects) and returns it as a base64 data URL. Only http(s) URLs with an
 * `image/*` content type under the size cap are accepted.
 */
export function setupMediaIPC() {
  ipcMain.handle("media:fetch-data-url", async (_, rawUrl: string) => {
    if (typeof rawUrl !== "string") {
      throw new Error("Invalid media URL");
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error("Invalid media URL");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Unsupported media protocol");
    }

    const response = await net.fetch(rawUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": getAppUserAgent(),
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Media fetch failed (${response.status})`);
    }

    const contentType = (response.headers.get("content-type") || "image/png")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new Error(`Unsupported media type: ${contentType}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_MEDIA_BYTES) {
      throw new Error("Media asset too large");
    }

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  });
}
