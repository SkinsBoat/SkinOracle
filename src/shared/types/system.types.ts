// System, Updater, VersionGate, and User Balance Types

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
}

export interface UpdateProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export type UpdateStateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatusState {
  status: UpdateStateStatus;
  info?: UpdateInfo | null;
  progress?: UpdateProgressInfo | null;
  error?: string | null;
}

export interface VersionGateState {
  allowed: boolean;
  reason?: string;
  minVersion?: string;
  latestVersion?: string;
  currentVersion?: string;
}

export interface BalanceTransactionItem {
  id: string;
  type: "credit" | "debit";
  category: string;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}
