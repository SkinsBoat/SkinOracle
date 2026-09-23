import { alertOneSound } from "../../../assets/audio";

class SoundService {
  private audioElement: HTMLAudioElement | null = null;
  private lastPlayedTimestamp = 0;
  private defaultCooldownMs = 1500; // 1.5s spam protection by default

  constructor() {
    try {
      if (typeof Audio !== "undefined") {
        this.audioElement = new Audio(alertOneSound);
        this.audioElement.preload = "auto";
      }
    } catch (err) {
      console.warn("[SoundService] Failed to initialize audio element:", err);
    }
  }

  /**
   * Plays the primary alert chime (Alert One) with cooldown protection to avoid audio stacking
   */
  public playAlertSound(options?: {
    volume?: number;
    minCooldownMs?: number;
    force?: boolean;
  }): void {
    const now = Date.now();
    const cooldown = options?.minCooldownMs ?? this.defaultCooldownMs;

    if (!options?.force && now - this.lastPlayedTimestamp < cooldown) {
      // Cooldown active, throttle playback
      return;
    }

    try {
      if (!this.audioElement && typeof Audio !== "undefined") {
        this.audioElement = new Audio(alertOneSound);
      }
      if (!this.audioElement) return;

      // Fast rewind and set volume
      const targetVolume =
        typeof options?.volume === "number"
          ? Math.max(0, Math.min(1, options.volume))
          : 0.7;

      this.audioElement.volume = targetVolume;
      this.audioElement.currentTime = 0;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.lastPlayedTimestamp = now;
          })
          .catch((err) => {
            // Browser autoplay restrictions may block until first user gesture
            console.warn("[SoundService] Audio playback hindered:", err);
          });
      }
    } catch (err) {
      console.warn("[SoundService] Play error:", err);
    }
  }

  /**
   * Test audio immediately, bypassing cooldown
   */
  public testSound(volume = 0.7): void {
    this.playAlertSound({ volume, force: true });
  }
}

export const soundService = new SoundService();
