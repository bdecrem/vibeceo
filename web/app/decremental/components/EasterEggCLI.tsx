"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../ThemeContext";

type ContactState = "message" | "email" | "sending" | "sent";

export function EasterEggCLI({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  const t = useTheme();
  const [input, setInput] = useState("");
  const [state, setState] = useState<ContactState>("message");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) inputRef.current.focus();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) { setInput(""); setState("message"); setMessage(""); }
  }, [isVisible]);

  const handleSubmit = useCallback(async () => {
    const value = input.trim();
    if (!value) return;
    if (state === "message") { setMessage(value); setState("email"); setInput(""); }
    else if (state === "email") {
      setState("sending");
      try { await fetch("/api/kochitolabs/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, email: value }) }); } catch {}
      setState("sent"); setInput("");
    }
  }, [input, state, message]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }, [handleSubmit, onClose]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden transition-all duration-300" style={{ backgroundColor: t.pageBg + "f2", borderTop: `1px solid ${t.terminalBorder}`, backdropFilter: "blur(8px)" }}>
      {state === "email" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: t.textMuted }}>&quot;{message}&quot; — now drop your email</div>}
      {state === "sending" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: t.textMuted }}>sending...</div>}
      {state === "sent" && <div className="px-4 sm:px-6 py-2 text-sm" style={{ color: t.accent }}>sent. i&apos;ll be in touch.</div>}
      {state !== "sending" && state !== "sent" && (
        <div className="px-4 sm:px-6 py-3 flex items-center gap-2">
          <input ref={inputRef} type={state === "email" ? "email" : "text"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-30" style={{ color: t.textPrimary, caretColor: t.accent }}
            placeholder={state === "message" ? "you found it. what's up?" : "your email"} autoComplete={state === "email" ? "email" : "off"} autoCorrect="off" autoCapitalize="off" spellCheck={false}
          />
          <span className="text-xs" style={{ color: t.textGhost }}>esc</span>
        </div>
      )}
      {state === "sent" && <div className="px-4 sm:px-6 py-3 flex justify-end"><span className="text-xs" style={{ color: t.textGhost }}>esc</span></div>}
    </div>
  );
}
