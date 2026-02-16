"use client";

import { useState, useEffect, useRef } from "react";

type Change = { id: string; request: string; summary: string; created_at: string };

type SettingsMenuProps = {
  userHandle: string;
  appCode: string;
  updateAvailable: boolean;
  onUpdateSkip: () => void;
  onUpdateAccept: () => void;
  onLogout: () => void;
  changesEndpoint: string;
  updateEndpoint: string;
  accentColor?: string;
};

export default function SettingsMenu({
  userHandle,
  appCode,
  updateAvailable,
  onUpdateSkip,
  onUpdateAccept,
  onLogout,
  changesEndpoint,
  updateEndpoint,
  accentColor = "#6366f1",
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadingChanges(true);
    fetch(changesEndpoint)
      .then((r) => r.json())
      .then((data) => setChanges(data.changes || []))
      .finally(() => setLoadingChanges(false));
  }, [open, changesEndpoint]);

  const handleUpdate = async (action: "skip" | "accept") => {
    setUpdatingAction(action);
    const res = await fetch(updateEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      if (action === "accept") {
        onUpdateAccept();
        window.location.reload();
      } else {
        onUpdateSkip();
      }
    }
    setUpdatingAction(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const month = d.toLocaleString("en", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en", { hour: "numeric", minute: "2-digit" });
    return `${month} ${day}, ${time}`;
  };

  return (
    <div ref={menuRef} style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, fontFamily: "system-ui" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: open ? "#2a2a4a" : "rgba(255,255,255,0.06)",
          border: updateAvailable ? `1px solid ${accentColor}` : "1px solid transparent",
          color: "#aaa",
          cursor: "pointer",
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
        aria-label="Settings"
      >
        &#x2699;
        {updateAvailable && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accentColor,
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 300,
            maxHeight: "80vh",
            background: "#141428",
            border: "1px solid #2a2a4a",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* User handle */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #2a2a4a", fontSize: 14, color: "#eee", fontWeight: 600 }}>
            {userHandle}
          </div>

          {/* Update section */}
          {updateAvailable && (
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #2a2a4a" }}>
              <div style={{ fontSize: 13, color: "#ccc", marginBottom: 10, fontWeight: 600 }}>
                Update available
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleUpdate("skip")}
                  disabled={updatingAction !== null}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    background: "none",
                    border: "1px solid #444",
                    color: "#888",
                    cursor: updatingAction ? "wait" : "pointer",
                    fontSize: 12,
                  }}
                >
                  skip
                </button>
                <button
                  onClick={() => handleUpdate("accept")}
                  disabled={updatingAction !== null}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    background: accentColor,
                    border: "none",
                    color: "#fff",
                    cursor: updatingAction ? "wait" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  update
                </button>
              </div>
            </div>
          )}

          {/* Change log */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 320 }}>
            <div
              style={{
                padding: "10px 16px 6px",
                fontSize: 11,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 600,
              }}
            >
              Change log
            </div>
            {loadingChanges ? (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                loading...
              </div>
            ) : changes.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 12, color: "#555" }}>
                No changes yet. Use the chat to customize your app.
              </div>
            ) : (
              changes.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #1a1a2e",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#ddd", marginBottom: 3, lineHeight: 1.4 }}>
                    {c.request}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>
                    {c.summary.length > 100 ? c.summary.slice(0, 100) + "..." : c.summary}
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
                    {formatDate(c.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Source */}
          <div style={{ borderTop: "1px solid #2a2a4a" }}>
            <button
              onClick={() => setShowSource(!showSource)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Source code</span>
              <span style={{ fontSize: 10, color: "#555" }}>{showSource ? "▲" : "▼"}</span>
            </button>
            {showSource && (
              <div style={{ padding: "0 16px 12px" }}>
                <pre
                  style={{
                    background: "#0a0a1a",
                    border: "1px solid #2a2a4a",
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 11,
                    color: "#aaa",
                    overflow: "auto",
                    maxHeight: 200,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: "0 0 8px",
                    lineHeight: 1.5,
                  }}
                >
                  {appCode}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(appCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 0",
                    borderRadius: 6,
                    background: copied ? "#10b981" : "#2a2a4a",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {copied ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <div style={{ borderTop: "1px solid #2a2a4a" }}>
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "none",
                border: "none",
                color: "#888",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
