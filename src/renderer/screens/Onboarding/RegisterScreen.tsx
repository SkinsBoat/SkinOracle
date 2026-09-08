import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Zap, Mail } from "lucide-react";
import { oracleLogo } from "../../../../assets/images";

interface Props {
  onSuccess: () => void;
}

export default function RegisterScreen({ onSuccess }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const toastId = toast.loading("Sending verification code...");

    try {
      await window.electronAPI.auth.register(email);
      toast.success("Verification code sent! (Check inbox & spam folder)", {
        id: toastId,
      });
      navigate("/verify", { state: { email } });
    } catch (err: any) {
      const msg =
        err?.message || "Failed to send code. Check your email address.";
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
            alt="SkinOracle"
            style={{
              width: 56,
              height: 56,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 10px rgba(37, 99, 235, 0.4))",
            }}
          />
        </div>
        <h1 className="auth-title">SkinOracle</h1>
        <p className="auth-subtitle">
          Enter your trader email to authenticate workstation access
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Mail size={14} /> Trader Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@domain.com"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading
              ? "Sending Verification Code..."
              : "Send Verification Code"}
          </button>

          {import.meta.env.DEV && (
            <div
              style={{
                marginTop: "14px",
                paddingTop: "14px",
                borderTop: "1px solid var(--so-border-subtle)",
              }}
            >
              <button
                type="button"
                className="btn btn-cyan"
                style={{ width: "100%" }}
                onClick={async () => {
                  const devEmail = email.trim() || "dev@trader.com";
                  setLoading(true);
                  try {
                    await window.electronAPI.auth.register(devEmail);
                  } catch (e) {
                    // ignore errors if register endpoint has issue
                  } finally {
                    setLoading(false);
                  }
                  toast.success("Bypassed dev login (Code: 111111)");
                  navigate("/verify", {
                    state: { email: devEmail, autoFillCode: "111111" },
                  });
                }}
              >
                <Zap size={14} /> Quick Dev Bypass (Code: 111111)
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
