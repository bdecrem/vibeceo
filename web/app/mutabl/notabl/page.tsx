"use client";

import { useState, useEffect } from "react";
import AuthGate from "../components/AuthGate";
import AppRenderer from "../components/AppRenderer";
import ChatPanel from "../components/ChatPanel";
import SettingsMenu from "../components/SettingsMenu";
import RichEditor from "../components/RichEditor";
import { useDocumentApi } from "./useDocumentApi";

type User = { id: string; handle: string };

const AUTH_ENDPOINT = "/api/mutabl/notabl/auth";
const CONFIG_ENDPOINT = "/api/mutabl/notabl/config";
const AGENT_ENDPOINT = "/api/mutabl/notabl/agent";
const UPDATE_ENDPOINT = "/api/mutabl/notabl/update";
const CHANGES_ENDPOINT = "/api/mutabl/notabl/changes";

export default function NotablPage() {
  const [user, setUser] = useState<User | null>(null);
  const [appCode, setAppCode] = useState<string | null>(null);
  const [appCss, setAppCss] = useState<string>("");
  const [checking, setChecking] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const {
    documents,
    refreshDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    exportMarkdown,
  } = useDocumentApi();

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
      refreshDocuments(),
    ]).then(([configData]) => {
      if (configData.app_code) {
        setAppCode(configData.app_code);
        setAppCss(configData.app_css || "");
      }
      if (configData.update_available) {
        setUpdateAvailable(true);
      }
    });
  }, [user, refreshDocuments]);

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
        appName="notabl"
        tagline="documents that evolve"
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
        appCss={appCss}
        updateAvailable={updateAvailable}
        onUpdateSkip={() => setUpdateAvailable(false)}
        onUpdateAccept={() => setUpdateAvailable(false)}
        onLogout={logout}
        changesEndpoint={CHANGES_ENDPOINT}
        updateEndpoint={UPDATE_ENDPOINT}
        accentColor="#FD79A8"
      />
      <AppRenderer
        code={appCode}
        css={appCss}
        scope={{
          documents,
          addDocument,
          updateDocument,
          deleteDocument,
          shareDocument,
          unshareDocument,
          refreshDocuments,
          exportMarkdown,
          RichEditor,
          user: { handle: user.handle },
        }}
      />
      <ChatPanel
        onCodeUpdate={handleCodeUpdate}
        agentEndpoint={AGENT_ENDPOINT}
        title="notabl builder"
      />
    </div>
  );
}
