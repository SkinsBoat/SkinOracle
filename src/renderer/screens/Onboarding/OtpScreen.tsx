import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { KeyRound, ArrowLeft } from "lucide-react";
import { oracleLogo } from "../../../../assets/images";

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
  const [error, setError] = useState("");

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
            alt="SkinOracle"
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

          <button
            type="button"
            className="btn btn-outline"
            style={{ width: "100%", marginTop: "4px" }}
            onClick={() => navigate("/register")}
          >
            <ArrowLeft size={14} /> Back to Email Step
          </button>
        </form>
      </div>
    </div>
  );
}
