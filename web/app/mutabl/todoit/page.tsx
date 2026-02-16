"use client";

import { useState, useEffect } from "react";
import AuthGate from "../components/AuthGate";
import AppRenderer from "../components/AppRenderer";
import ChatPanel from "../components/ChatPanel";
import SettingsMenu from "../components/SettingsMenu";
import { useTaskApi } from "./useTaskApi";

type User = { id: string; handle: string };

const AUTH_ENDPOINT = "/api/mutabl/todoit/auth";
const CONFIG_ENDPOINT = "/api/mutabl/todoit/config";
const AGENT_ENDPOINT = "/api/mutabl/todoit/agent";
const UPDATE_ENDPOINT = "/api/mutabl/todoit/update";
const CHANGES_ENDPOINT = "/api/mutabl/todoit/changes";

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
        userHandle={user.handle}
        appCode={appCode}
        updateAvailable={updateAvailable}
        onUpdateSkip={() => setUpdateAvailable(false)}
        onUpdateAccept={() => setUpdateAvailable(false)}
        onLogout={logout}
        changesEndpoint={CHANGES_ENDPOINT}
        updateEndpoint={UPDATE_ENDPOINT}
        accentColor="#6366f1"
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
