// ── Step 4 Lookup Result → PNG Export (modern-screenshot) ────────────
// Captures the live, rendered result card DOM node into a PNG so the export
// stays pixel-faithful to the UI (badges, metric groups, sparkline, target
// box, and the market breakdown table) without hand-drawn layout code.
//
// Cross-origin marketplace imagery is handled by modern-screenshot's fetch
// placeholder fallback (failed images render empty instead of throwing).

import { domToBlob } from "modern-screenshot";

function slugify(value: string): string {
  return (
    value
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "item"
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Resolves remote imagery through the main process, which is not subject to
 * CORS. Returns `false` to let modern-screenshot fall back to its default
 * fetch (and placeholder) behaviour.
 */
async function fetchMediaDataUrl(url: string): Promise<string | false> {
  const media = window.electronAPI?.media;
  if (!media?.fetchDataUrl) {
    console.warn(
      "[lookupImageExport] window.electronAPI.media is unavailable — restart the app so the updated preload/main process load. Images will fall back to placeholders.",
    );
    return false;
  }
  if (!/^https?:/i.test(url)) return false;
  try {
    const dataUrl = await media.fetchDataUrl(url);
    if (!/^data:/i.test(dataUrl)) {
      console.warn(
        "[lookupImageExport] media fetch returned no data URL:",
        url,
      );
      return false;
    }
    return dataUrl;
  } catch (err: any) {
    console.warn(
      "[lookupImageExport] media fetch failed:",
      url,
      err?.message || err,
    );
    return false;
  }
}

export interface ExportNodeOptions {
  scale?: number;
  backgroundColor?: string | null;
}

export async function exportNodeAsPng(
  node: HTMLElement,
  nameHint: string,
  options?: ExportNodeOptions,
): Promise<void> {
  const cssBackground = getComputedStyle(document.documentElement)
    .getPropertyValue("--so-bg")
    .trim();
  const backgroundColor =
    options?.backgroundColor ?? (cssBackground || "#090d16");

  const blob = await domToBlob(node, {
    scale: options?.scale ?? 2,
    backgroundColor,
    timeout: 15000,
    fetchFn: (url) => fetchMediaDataUrl(url),
    filter: (el) =>
      !(el instanceof HTMLElement && el.dataset.exportIgnore === "true"),
  });

  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `skin-oracle-${slugify(nameHint)}-${stamp}.png`);
}
