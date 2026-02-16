"use client";

import { useState, useEffect } from "react";
import AuthGate from "./components/AuthGate";
import AppRenderer from "./components/AppRenderer";
import ChatPanel from "./components/ChatPanel";
import { useTaskApi } from "./components/useTaskApi";

type User = { id: string; handle: string };

export default function TodoitPage() {
  const [user, setUser] = useState<User | null>(null);
  const [appCode, setAppCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const { tasks, refreshTasks, addTask, toggleTask, deleteTask, updateTask } =
    useTaskApi();

  // Check session on mount
  useEffect(() => {
    fetch("/api/todoit/auth")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setChecking(false));
  }, []);

  // Load config + tasks once authenticated
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/todoit/config").then((r) => r.json()),
      refreshTasks(),
    ]).then(([configData]) => {
      if (configData.app_code) {
        setAppCode(configData.app_code);
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
    return <AuthGate onAuth={setUser} />;
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
      <AppRenderer
        code={appCode}
        tasks={tasks}
        addTask={addTask}
        toggleTask={toggleTask}
        deleteTask={deleteTask}
        updateTask={updateTask}
        user={{ handle: user.handle }}
      />
      <ChatPanel onCodeUpdate={handleCodeUpdate} />
    </div>
  );
}
