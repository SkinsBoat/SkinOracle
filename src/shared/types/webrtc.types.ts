export interface WebRtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRtcSessionInitSuccess {
  success: true;
  roomId: string;
  guestToken: string;
  iceServers: WebRtcIceServer[];
  /** Fixed session price in cents ($0.20 = 20). */
  amountCents: number;
  remainingBalance: number;
  remainingBalanceCents: number;
  expiresAt: string;
}

export interface WebRtcSessionInitFailure {
  success: false;
  code: string;
  message: string;
  requiredCents?: number;
  balanceCents?: number;
}

export type WebRtcSessionInitResult =
  | WebRtcSessionInitSuccess
  | WebRtcSessionInitFailure;
