"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "agent";
  text: string;
};

type ChatPanelProps = {
  onCodeUpdate: (newCode: string, css: string | undefined, version: number) => void;
  agentEndpoint?: string;
  title?: string;
  placeholder?: string;
};

export default function ChatPanel({
  onCodeUpdate,
  agentEndpoint = "/api/mutabl/todoit/agent",
  title = "builder",
  placeholder = "change my app...",
}: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await fetch(agentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.app_code) {
        onCodeUpdate(data.app_code, data.app_css || undefined, data.version);
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: data.message || "Done!" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: data.error || "Something went wrong" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Failed to reach agent" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          zIndex: 1000,
        }}
      >
        AI
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 360,
        maxHeight: 480,
        borderRadius: 12,
        background: "#12122a",
        border: "1px solid #2a2a4a",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        zIndex: 1000,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #2a2a4a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>
          {title}
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          x
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 12,
          minHeight: 200,
          maxHeight: 320,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 24 }}>
            Ask me to change your app. I can add features, change the look, add
            filters, priorities — anything.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.4,
                background: m.role === "user" ? "#6366f1" : "#1e1e3a",
                color: m.role === "user" ? "#fff" : "#ccc",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "#1e1e3a",
                color: "#888",
                fontSize: 13,
              }}
            >
              thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: 12,
          borderTop: "1px solid #2a2a4a",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#1a1a2e",
            color: "#eee",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
