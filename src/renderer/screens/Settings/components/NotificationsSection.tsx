import React from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { soundService } from "../../../services/soundService";
import { notificationManager } from "../../../services/notificationManager";

export const NotificationsSection: React.FC = () => {
  const {
    soundEnabled,
    soundVolume,
    desktopNotificationsEnabled,
    onlyNotifyInBackground,
    notifyOnCacheComplete,
    notifyOnNewDeals,
    dealSoundCooldownSeconds,
    setSoundEnabled,
    setSoundVolume,
    setDesktopNotificationsEnabled,
    setOnlyNotifyInBackground,
    setNotifyOnCacheComplete,
    setNotifyOnNewDeals,
    setDealSoundCooldownSeconds,
    resetDefaults,
  } = useNotificationStore();

  const handleTestSound = () => {
    soundService.testSound(soundVolume);
  };

  const handleTestFullNotification = () => {
    notificationManager.testNotification();
  };

  return (
    <div style={styles.container}>
      {/* Top Banner Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIconBox}>
            <Bell size={18} style={{ color: "var(--so-primary)" }} />
          </div>
          <div>
            <h2 style={styles.cardTitle}>Auditory &amp; Desktop Notifications</h2>
            <p style={styles.cardSubtitle}>
              Configure audio alerts, sound volume, and native OS desktop notifications for market milestones and live sniping.
            </p>
          </div>
        </div>

        {/* Action Testing Buttons */}
        <div style={styles.topActionsRow}>
          <button
            type="button"
            onClick={handleTestSound}
            style={styles.primaryActionBtn}
            title="Play alert chime"
          >
            <Volume2 size={14} />
            Test Sound Alert
          </button>

          <button
            type="button"
            onClick={handleTestFullNotification}
            style={styles.secondaryActionBtn}
            title="Test complete sound + OS notification banner"
          >
            <Sparkles size={14} />
            Test Full Notification
          </button>

          <button
            type="button"
            onClick={resetDefaults}
            style={styles.ghostActionBtn}
            title="Restore default notification preferences"
          >
            <RotateCcw size={13} />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Audio Preferences Card */}
      <div style={styles.card}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionIconRow}>
            {soundEnabled ? (
              <Volume2 size={16} style={{ color: "var(--so-success, #22c55e)" }} />
            ) : (
              <VolumeX size={16} style={{ color: "var(--so-text-muted)" }} />
            )}
            <h3 style={styles.sectionTitle}>Audio Cues &amp; Volume</h3>
          </div>
          <span style={getStatusBadgeStyle(soundEnabled, "green")}>
            <span style={getDotStyle(soundEnabled, "green")} />
            {soundEnabled ? "Sound Enabled" : "Muted"}
          </span>
        </div>

        <div style={styles.controlRow}>
          <div style={styles.labelCol}>
            <span style={styles.controlLabel}>Enable Auditory Chimes</span>
            <span style={styles.controlDesc}>
              Play distinct, lightweight audio alerts when important events complete.
            </span>
          </div>
          <label style={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              style={styles.hiddenCheckbox}
            />
            <span style={getSwitchTrackStyle(soundEnabled)}>
              <span style={getSwitchThumbStyle(soundEnabled)} />
            </span>
          </label>
        </div>

        {soundEnabled && (
          <div style={styles.controlRow}>
            <div style={styles.labelCol}>
              <div style={styles.volumeLabelRow}>
                <span style={styles.controlLabel}>Alert Volume</span>
                <span style={styles.volumePercentBadge}>
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
              <span style={styles.controlDesc}>
                Adjust the master volume level for notification chimes.
              </span>
            </div>
            <div style={styles.sliderBox}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                style={styles.rangeInput}
              />
            </div>
          </div>
        )}
      </div>

      {/* System OS Notifications Card */}
      <div style={styles.card}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionIconRow}>
            <Monitor size={16} style={{ color: "var(--so-primary)" }} />
            <h3 style={styles.sectionTitle}>Desktop OS Notifications</h3>
          </div>
          <span style={getStatusBadgeStyle(desktopNotificationsEnabled, "blue")}>
            <span style={getDotStyle(desktopNotificationsEnabled, "blue")} />
            {desktopNotificationsEnabled ? "OS Banners Active" : "Disabled"}
          </span>
        </div>

        <div style={styles.controlRow}>
          <div style={styles.labelCol}>
            <span style={styles.controlLabel}>Native System Banners</span>
            <span style={styles.controlDesc}>
              Deliver native OS notification toasts when critical events happen. Clicking the banner immediately focuses the app.
            </span>
          </div>
          <label style={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={desktopNotificationsEnabled}
              onChange={(e) => setDesktopNotificationsEnabled(e.target.checked)}
              style={styles.hiddenCheckbox}
            />
            <span style={getSwitchTrackStyle(desktopNotificationsEnabled)}>
              <span style={getSwitchThumbStyle(desktopNotificationsEnabled)} />
            </span>
          </label>
        </div>

        {desktopNotificationsEnabled && (
          <div style={styles.controlRow}>
            <div style={styles.labelCol}>
              <span style={styles.controlLabel}>Background Only Banners</span>
              <span style={styles.controlDesc}>
                Only deliver native OS banners when Skin Oracle is in the background or minimized, preventing desktop clutter when actively using the app.
              </span>
            </div>
            <label style={styles.switchWrapper}>
              <input
                type="checkbox"
                checked={onlyNotifyInBackground}
                onChange={(e) => setOnlyNotifyInBackground(e.target.checked)}
                style={styles.hiddenCheckbox}
              />
              <span style={getSwitchTrackStyle(onlyNotifyInBackground)}>
                <span style={getSwitchThumbStyle(onlyNotifyInBackground)} />
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Event Triggers & Cooldowns */}
      <div style={styles.card}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionIconRow}>
            <Sliders size={16} style={{ color: "var(--so-primary)" }} />
            <h3 style={styles.sectionTitle}>Event Specific Triggers &amp; Anti-Spam</h3>
          </div>
        </div>

        {/* Milestone Trigger */}
        <div style={styles.controlRow}>
          <div style={styles.labelCol}>
            <span style={styles.controlLabel}>Market Cache Scan Complete</span>
            <span style={styles.controlDesc}>
              Notify when Step 1 Market Cache or CS2CAP bulk price streaming finishes, so you can safely browse elsewhere while caching.
            </span>
          </div>
          <label style={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={notifyOnCacheComplete}
              onChange={(e) => setNotifyOnCacheComplete(e.target.checked)}
              style={styles.hiddenCheckbox}
            />
            <span style={getSwitchTrackStyle(notifyOnCacheComplete)}>
              <span style={getSwitchThumbStyle(notifyOnCacheComplete)} />
            </span>
          </label>
        </div>

        {/* DealMaker Trigger */}
        <div style={styles.controlRow}>
          <div style={styles.labelCol}>
            <span style={styles.controlLabel}>DealMaker Floor &amp; Target Matches</span>
            <span style={styles.controlDesc}>
              Alert when new targets within your buy ceilings drop on the floor. Includes automatic deduplication so existing listings never trigger repeatedly.
            </span>
          </div>
          <label style={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={notifyOnNewDeals}
              onChange={(e) => setNotifyOnNewDeals(e.target.checked)}
              style={styles.hiddenCheckbox}
            />
            <span style={getSwitchTrackStyle(notifyOnNewDeals)}>
              <span style={getSwitchThumbStyle(notifyOnNewDeals)} />
            </span>
          </label>
        </div>

        {/* Cooldown setting */}
        {notifyOnNewDeals && (
          <div style={styles.controlRow}>
            <div style={styles.labelCol}>
              <span style={styles.controlLabel}>Deal Sound Cooldown</span>
              <span style={styles.controlDesc}>
                Minimum delay between consecutive deal sound alerts to protect against rapid audio fatigue.
              </span>
            </div>
            <select
              value={dealSoundCooldownSeconds}
              onChange={(e) => setDealSoundCooldownSeconds(parseInt(e.target.value, 10))}
              style={styles.selectInput}
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds (Recommended)</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
            </select>
          </div>
        )}
      </div>

      {/* Information strip */}
      <div style={styles.infoStrip}>
        <ShieldCheck size={16} style={{ color: "var(--so-primary)", flexShrink: 0 }} />
        <span style={styles.infoText}>
          Sound files are bundled locally (4.8 KB). No audio streaming or external network connections are required. All preferences are preserved across app restarts.
        </span>
      </div>
    </div>
  );
};

// ── Pure Dynamic Style Helpers ─────────────────────────────────────
function getStatusBadgeStyle(
  isActive: boolean,
  variant: "green" | "blue" = "green",
): React.CSSProperties {
  if (!isActive) {
    return {
      fontSize: "11px",
      fontWeight: 700,
      padding: "3px 9px",
      borderRadius: "4px",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      color: "#9ca3af",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      letterSpacing: "0.3px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };
  }

  if (variant === "blue") {
    return {
      fontSize: "11px",
      fontWeight: 700,
      padding: "3px 9px",
      borderRadius: "4px",
      backgroundColor: "rgba(37, 99, 235, 0.22)",
      color: "#93c5fd",
      border: "1px solid rgba(96, 165, 250, 0.45)",
      letterSpacing: "0.3px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };
  }

  return {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.22)",
    color: "#4ade80",
    border: "1px solid rgba(34, 197, 94, 0.45)",
    letterSpacing: "0.3px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };
}

function getDotStyle(
  isActive: boolean,
  variant: "green" | "blue" = "green",
): React.CSSProperties {
  let bg = "#6b7280";
  if (isActive) {
    bg = variant === "blue" ? "#60a5fa" : "#22c55e";
  }
  return {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: bg,
    boxShadow: isActive
      ? `0 0 6px ${variant === "blue" ? "rgba(96, 165, 250, 0.8)" : "rgba(34, 197, 94, 0.8)"}`
      : "none",
    flexShrink: 0,
  };
}

function getSwitchTrackStyle(checked: boolean): React.CSSProperties {
  return {
    position: "relative",
    display: "inline-block",
    width: "40px",
    height: "22px",
    borderRadius: "12px",
    backgroundColor: checked ? "var(--so-primary)" : "rgba(255, 255, 255, 0.12)",
    transition: "background-color 0.2s ease",
    cursor: "pointer",
  };
}

function getSwitchThumbStyle(checked: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: "3px",
    left: checked ? "21px" : "3px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
    transition: "left 0.2s ease",
  };
}

// ── Static Styles ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-md, 8px)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  cardIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  cardSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
  },
  topActionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    paddingTop: "4px",
    borderTop: "1px solid var(--so-border-subtle)",
  },
  primaryActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    border: "1px solid var(--so-primary)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  ghostActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    color: "var(--so-text-muted)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: "auto",
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  sectionIconRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "6px 0",
  },
  labelCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
  },
  controlLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  controlDesc: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    lineHeight: 1.4,
  },
  volumeLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  volumePercentBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-primary)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  sliderBox: {
    width: "160px",
    display: "flex",
    alignItems: "center",
  },
  rangeInput: {
    width: "100%",
    cursor: "pointer",
    accentColor: "var(--so-primary)",
  },
  switchWrapper: {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
  },
  hiddenCheckbox: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
  },
  selectInput: {
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-sm)",
    color: "var(--so-text-primary)",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  },
  infoStrip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    padding: "12px 16px",
  },
  infoText: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
  },
};
