"use client";

import { useState } from "react";

type AuthGateProps = {
  onAuth: (user: { id: string; handle: string }) => void;
  authEndpoint?: string;
  appName?: string;
  tagline?: string;
};

export default function AuthGate({
  onAuth,
  authEndpoint = "/api/mutabl/todoit/auth",
  appName = "todoit",
  tagline = "your personal todo app — shaped by AI",
}: AuthGateProps) {
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"handle" | "login" | "register">("handle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkHandle = async () => {
    if (!handle.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", handle: handle.trim() }),
      });
      const data = await res.json();
      setStep(data.exists ? "login" : "register");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const action = step === "login" ? "login" : "register";
      const res = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, handle: handle.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onAuth(data.user);
      } else {
        setError(data.error || "Failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === "Enter") fn();
  };

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a1a",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ width: 320, textAlign: "center" }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#eee",
            marginBottom: 8,
          }}
        >
          {appName}
        </h1>
        <p style={{ color: "#666", fontSize: 13, marginBottom: 32 }}>
          {tagline}
        </p>

        {step === "handle" && (
          <>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, checkHandle)}
              placeholder="pick a handle"
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "#1a1a2e",
                color: "#eee",
                fontSize: 16,
                marginBottom: 12,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <button
              onClick={checkHandle}
              disabled={loading || !handle.trim()}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                background: "#6366f1",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity: loading || !handle.trim() ? 0.5 : 1,
              }}
            >
              {loading ? "..." : "Continue"}
            </button>
          </>
        )}

        {(step === "login" || step === "register") && (
          <>
            <div
              style={{
                color: "#999",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {step === "login"
                ? `Welcome back, ${handle}`
                : `New here? Pick a 4-char code for ${handle}`}
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, submit)}
              placeholder="4-char code"
              maxLength={4}
              autoFocus
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #333",
                background: "#1a1a2e",
                color: "#eee",
                fontSize: 16,
                marginBottom: 12,
                boxSizing: "border-box",
                textAlign: "center",
                letterSpacing: 6,
                outline: "none",
              }}
            />
            <button
              onClick={submit}
              disabled={loading || code.length < 4}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                background: "#6366f1",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity: loading || code.length < 4 ? 0.5 : 1,
              }}
            >
              {loading ? "..." : step === "login" ? "Log in" : "Create account"}
            </button>
            <button
              onClick={() => {
                setStep("handle");
                setCode("");
                setError("");
              }}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              back
            </button>
          </>
        )}

        {error && (
          <div
            style={{
              color: "#f87171",
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
