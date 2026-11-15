import { safeGetItem, safeSetItem } from "./storage";

export const AUTO_REFRESH_INTERVAL_KEY = "so_auto_refresh_interval";

export type CustomUnit = "minutes" | "hours";

export interface IntervalPreference {
  selectedMinutes: number | null;
  customValue: number;
  customUnit: CustomUnit;
}

export const PRESET_MINUTES = [15, 30, 60, 120];

export function loadIntervalPreference(): IntervalPreference | null {
  const raw = safeGetItem(AUTO_REFRESH_INTERVAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<IntervalPreference>;
    if (!parsed || typeof parsed !== "object") return null;

    const customValue =
      typeof parsed.customValue === "number" &&
      Number.isFinite(parsed.customValue)
        ? Math.max(1, Math.round(parsed.customValue))
        : 4;
    const customUnit: CustomUnit =
      parsed.customUnit === "minutes" ? "minutes" : "hours";
    const selectedMinutes =
      typeof parsed.selectedMinutes === "number" &&
      Number.isFinite(parsed.selectedMinutes) &&
      PRESET_MINUTES.includes(parsed.selectedMinutes)
        ? parsed.selectedMinutes
        : null;

    return { selectedMinutes, customValue, customUnit };
  } catch {
    return null;
  }
}

export function saveIntervalPreference(preference: IntervalPreference): void {
  safeSetItem(AUTO_REFRESH_INTERVAL_KEY, JSON.stringify(preference));
}

export function loadSavedIntervalMinutes(): number {
  const parsed = loadIntervalPreference();
  if (!parsed) return 5;

  const selectedMinutes =
    typeof parsed.selectedMinutes === "number" && Number.isFinite(parsed.selectedMinutes)
      ? parsed.selectedMinutes
      : null;

  if (selectedMinutes) return selectedMinutes;

  return Math.max(
    1,
    Math.round(parsed.customValue * (parsed.customUnit === "hours" ? 60 : 1)),
  );
}

export const formatInterval = (minutes: number): string => {
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} min`;
};
