import { ipcMain } from "electron";
import { extractApiErrorDetails, saasAxios } from "../services/saasAxios";
import type { WebRtcSessionInitResult } from "../../shared/types/webrtc.types";

/**
 * Creates a paid Live Negotiation Table session.
 *
 * The JWT and Cloudflare secrets remain in the main process / backend. The
 * renderer only receives the room id, guest token, short-lived ICE servers, and
 * the remaining balance. A 402 is returned as a structured result so the modal
 * can render the Top Up prompt without parsing IPC error strings.
 */
export function setupWebRtcIPC() {
  ipcMain.handle(
    "webrtc:create-session",
    async (
      _,
      idempotencyKey?: string,
      itemCount?: number,
    ): Promise<WebRtcSessionInitResult> => {
      try {
        const res = await saasAxios.post("/webrtc/session-init", {
          idempotencyKey,
          itemCount,
        });
        return res.data as WebRtcSessionInitResult;
      } catch (err) {
        const details = extractApiErrorDetails(err);
        if (
          details.statusCode === 402 ||
          details.code === "INSUFFICIENT_BALANCE"
        ) {
          const requiredCents = Number(details.details?.requiredCents ?? 20);
          const balanceCents = Number(details.details?.balanceCents ?? 0);
          return {
            success: false,
            code: "INSUFFICIENT_BALANCE",
            message: details.displayMessage,
            requiredCents: Number.isFinite(requiredCents)
              ? requiredCents
              : 20,
            balanceCents: Number.isFinite(balanceCents) ? balanceCents : 0,
          };
        }
        throw err;
      }
    },
  );
}
