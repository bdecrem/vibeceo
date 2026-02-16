"use client";

import { useState, useEffect } from "react";
import AuthGate from "../components/AuthGate";
import AppRenderer from "../components/AppRenderer";
import ChatPanel from "../components/ChatPanel";
import { useTaskApi } from "./useTaskApi";

type User = { id: string; handle: string };

const AUTH_ENDPOINT = "/api/mutabl/todoit/auth";
const CONFIG_ENDPOINT = "/api/mutabl/todoit/config";
const AGENT_ENDPOINT = "/api/mutabl/todoit/agent";
const UPDATE_ENDPOINT = "/api/mutabl/todoit/update";

function UpdateBanner({
  onSkip,
  onAccept,
}: {
  onSkip: () => void;
  onAccept: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handle = async (action: "skip" | "accept") => {
    setLoading(true);
    const res = await fetch(UPDATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      if (action === "accept") {
        const data = await res.json();
        onAccept();
        // Force reload to get new code
        if (data.app_code) {
          window.location.reload();
        }
      } else {
        onSkip();
      }
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#1a1a2e",
        border: "1px solid #6366f1",
        borderRadius: 10,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 9999,
        fontFamily: "system-ui",
        fontSize: 13,
        color: "#ccc",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ fontSize: 16 }}>&#x1F514;</span>
      <span>A new version of todoit is available</span>
      <button
        onClick={() => handle("skip")}
        disabled={loading}
        style={{
          background: "none",
          border: "1px solid #444",
          color: "#888",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: loading ? "wait" : "pointer",
          fontSize: 12,
        }}
      >
        skip
      </button>
      <button
        onClick={() => handle("accept")}
        disabled={loading}
        style={{
          background: "#6366f1",
          border: "none",
          color: "#fff",
          borderRadius: 6,
          padding: "4px 12px",
          cursor: loading ? "wait" : "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        update
      </button>
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
      {updateAvailable && (
        <UpdateBanner
          onSkip={() => setUpdateAvailable(false)}
          onAccept={() => setUpdateAvailable(false)}
        />
      )}
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
