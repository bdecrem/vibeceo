"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [appCss, setAppCss] = useState<string>("");
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

  const reloadConfig = useCallback(() => {
    fetch(CONFIG_ENDPOINT)
      .then((r) => r.json())
      .then((data) => {
        if (data.app_code) {
          setAppCode(data.app_code);
          setAppCss(data.app_css || "");
        }
        if (data.update_available) setUpdateAvailable(true);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(CONFIG_ENDPOINT).then((r) => r.json()),
      refreshTasks(),
    ]).then(([configData]) => {
      if (configData.app_code) {
        setAppCode(configData.app_code);
        setAppCss(configData.app_css || "");
      }
      if (configData.update_available) {
        setUpdateAvailable(true);
      }
    });
  }, [user, refreshTasks]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reloadConfig();
        refreshTasks();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, reloadConfig, refreshTasks]);

  const handleCodeUpdate = (newCode: string, css: string | undefined, _version: number) => {
    setAppCode(newCode);
    if (css !== undefined) setAppCss(css);
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
          height: "100dvh",
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
          height: "100dvh",
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
    <div style={{ height: "100dvh", overflow: "hidden", background: "#0a0a1a" }}>
      <SettingsMenu
        userHandle={user.handle}
        appCode={appCode}
        appCss={appCss}
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
        css={appCss}
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
