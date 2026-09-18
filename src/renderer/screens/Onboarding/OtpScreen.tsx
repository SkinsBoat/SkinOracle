import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, ArrowLeft, RotateCcw } from "lucide-react";
import { oracleLogo, skinsBoatLogo } from "../../../../assets/images";

interface Props {
  onSuccess: () => void;
}

export default function OtpScreen({ onSuccess }: Props) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = (state as any)?.email || "";
  const autoFillCode = (state as any)?.autoFillCode || "";
  const [code, setCode] = useState(autoFillCode);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [error, setError] = useState("");

  // Live 60-second OTP cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendCode = async () => {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setError("");
    const toastId = toast.loading("Resending verification code...");

    try {
      await window.electronAPI.auth.register(email);
      toast.success("New verification code sent! (Check inbox & spam folder)", {
        id: toastId,
      });
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.message || "Failed to resend code. Please wait.";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const toastId = toast.loading("Verifying code...");

    try {
      await window.electronAPI.auth.verify(email, code);
      toast.success("Authenticated successfully!", { id: toastId });
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || "Invalid or expired verification code";
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo-badge" style={{ background: "transparent" }}>
          <img
            src={oracleLogo}
            alt="Skin Oracle"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 10px rgba(37, 99, 235, 0.4))",
            }}
          />
        </div>
        <h1 className="auth-title">Verify Authentication</h1>
        <p className="auth-subtitle">
          Enter 6-digit verification code sent to{" "}
          <strong style={{ color: "var(--so-text-primary)" }}>{email}</strong>
        </p>
        <p
          style={{
            color: "var(--so-text-tertiary, #a0a0a0)",
            fontSize: "12px",
            marginTop: "-12px",
            marginBottom: "16px",
          }}
        >
          💡 Don't see the email? Please check your{" "}
          <strong>spam/junk folder</strong>.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <KeyRound size={14} /> 6-Digit Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              maxLength={6}
              className="tabular-nums"
              style={{
                fontSize: "20px",
                letterSpacing: "4px",
                textAlign: "center",
                fontWeight: 800,
              }}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="auth-btn"
          >
            {loading ? "Verifying Code..." : "Verify Code & Access Workstation"}
          </button>

          <div style={styles.actionRow}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={cooldown > 0 || resending || loading}
              onClick={handleResendCode}
              style={styles.actionBtn}
            >
              <RotateCcw size={13} className={resending ? "animate-spin" : ""} />
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={styles.actionBtn}
              onClick={() => navigate("/register")}
            >
              <ArrowLeft size={13} /> Back
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "11px",
            color: "var(--so-text-muted)",
          }}
        >
          <span>A product of</span>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: "1px",
            }}
          >
            <img
              src={skinsBoatLogo}
              alt="SkinsBoat"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <span style={{ fontWeight: 700, color: "var(--so-text-secondary)" }}>
            SkinsBoat
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  actionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  actionBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "12px",
  },
} as const;
