"use client";

import { useState, useEffect, useRef } from "react";
import AuthGate from "../components/AuthGate";
import AppRenderer from "../components/AppRenderer";
import ChatPanel from "../components/ChatPanel";
import { useTaskApi } from "./useTaskApi";

type User = { id: string; handle: string };
type Change = { id: string; request: string; summary: string; created_at: string };

const AUTH_ENDPOINT = "/api/mutabl/todoit/auth";
const CONFIG_ENDPOINT = "/api/mutabl/todoit/config";
const AGENT_ENDPOINT = "/api/mutabl/todoit/agent";
const UPDATE_ENDPOINT = "/api/mutabl/todoit/update";
const CHANGES_ENDPOINT = "/api/mutabl/todoit/changes";

function SettingsMenu({
  updateAvailable,
  onUpdateSkip,
  onUpdateAccept,
  onLogout,
}: {
  updateAvailable: boolean;
  onUpdateSkip: () => void;
  onUpdateAccept: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
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
    fetch(CHANGES_ENDPOINT)
      .then((r) => r.json())
      .then((data) => setChanges(data.changes || []))
      .finally(() => setLoadingChanges(false));
  }, [open]);

  const handleUpdate = async (action: "skip" | "accept") => {
    setUpdatingAction(action);
    const res = await fetch(UPDATE_ENDPOINT, {
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
          border: updateAvailable ? "1px solid #6366f1" : "1px solid transparent",
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
              background: "#6366f1",
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
                    background: "#6366f1",
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

export default function TodoitPage() {
  const [user, setUser] = useState<User | null>(null);
  const [appCode, setAppCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { tasks, refreshTasks, addTask, toggleTask, deleteTask, updateTask } =
    useTaskApi();

  useEffect(() => {
    fetch(AUTH_ENDPOINT)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(CONFIG_ENDPOINT).then((r) => r.json()),
      refreshTasks(),
    ]).then(([configData]) => {
      if (configData.app_code) {
        setAppCode(configData.app_code);
      }
      if (configData.update_available) {
        setUpdateAvailable(true);
      }
    });
  }, [user, refreshTasks]);

  const handleCodeUpdate = (newCode: string, _version: number) => {
    setAppCode(newCode);
  };

  const logout = async () => {
    await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.reload();
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
          color: "#555",
          fontFamily: "system-ui",
        }}
      >
        loading...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        onAuth={setUser}
        authEndpoint={AUTH_ENDPOINT}
        appName="todoit"
        tagline="your personal todo app — shaped by AI"
      />
    );
  }

  if (!appCode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
          color: "#555",
          fontFamily: "system-ui",
        }}
      >
        loading your app...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a1a" }}>
      <SettingsMenu
        updateAvailable={updateAvailable}
        onUpdateSkip={() => setUpdateAvailable(false)}
        onUpdateAccept={() => setUpdateAvailable(false)}
        onLogout={logout}
      />
      <AppRenderer
        code={appCode}
        scope={{
          tasks,
          addTask,
          toggleTask,
          deleteTask,
          updateTask,
          user: { handle: user.handle },
        }}
      />
      <ChatPanel
        onCodeUpdate={handleCodeUpdate}
        agentEndpoint={AGENT_ENDPOINT}
        title="todoit builder"
      />
    </div>
  );
}
