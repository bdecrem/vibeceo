"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
  createContext,
  memo,
} from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";

type AppRendererProps = {
  code: string;
  css?: string;
  scope: Record<string, unknown>;
};

// Context bridge: dynamic data flows here instead of through LiveProvider scope.
// This lets react-live keep a stable scope (no re-eval / re-mount) while the
// inner App component still sees fresh data via useContext (just a re-render).
export const ScopeContext = createContext<Record<string, unknown>>({});

// Memo'd so LiveProvider only re-evaluates when code/css changes, never on data updates
const LiveBlock = memo(
  function LiveBlock({
    code,
    scope,
  }: {
    code: string;
    scope: Record<string, unknown>;
  }) {
    const wrappedCode = `${code}\nrender(<App />)`;

    return (
      <LiveProvider code={wrappedCode} scope={scope} noInline>
        <LivePreview />
        <LiveError
          style={{
            padding: 16,
            margin: 16,
            borderRadius: 8,
            background: "#2d1117",
            color: "#f87171",
            fontFamily: "monospace",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        />
      </LiveProvider>
    );
  },
  (prev, next) => prev.code === next.code
);

// Tappable copy widget — shows text and copies on tap. Works on iOS Safari
// because the copy happens in the direct click handler (user gesture preserved).
function CopyLink({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleTap = () => {
    // execCommand in a direct click handler — most reliable on iOS
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, url.length);
    document.execCommand("copy");
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleTap}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        background: copied ? "#1a3a1a" : "#1a1a2e",
        border: `1px solid ${copied ? "#2d6a2d" : "#333"}`,
        borderRadius: 8,
        color: copied ? "#6fcf6f" : "#aaa",
        fontSize: 13,
        fontFamily: "monospace",
        cursor: "pointer",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Copied!" : (label || url)}
    </button>
  );
}

// Standalone copy function (also available in scope)
function copyToClipboard(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
  document.body.appendChild(ta);
  ta.focus();
  ta.setSelectionRange(0, text.length);
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function AppRenderer({ code, css, scope }: AppRendererProps) {
  // Inject app CSS via <style> tag, scoped with a unique class
  const scopeClass = "mutabl-app-scope";
  useEffect(() => {
    if (!css) return;
    let style = document.getElementById("mutabl-app-css") as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "mutabl-app-css";
      document.head.appendChild(style);
    }
    // Scope all rules under .mutabl-app-scope
    const scoped = css.replace(/(^|\})\s*([^@{}][^{]*)\{/g, (match, prefix, selector) => {
      const scopedSelectors = selector
        .split(",")
        .map((s: string) => `.${scopeClass} ${s.trim()}`)
        .join(", ");
      return `${prefix} ${scopedSelectors} {`;
    });
    style.textContent = scoped;
    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [css, scopeClass]);

  // Stable scope for LiveProvider — frozen when code changes, includes
  // initial snapshot of scope values + React hooks + context accessors.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableScope = useMemo(
    () => ({
      useState,
      useEffect,
      useRef,
      useMemo,
      useCallback,
      useContext,
      ScopeContext,
      copyToClipboard,
      CopyLink,
      ...scope,
    }),
    [code]
  );

  return (
    <ScopeContext.Provider value={scope}>
      <div className={scopeClass}>
        <LiveBlock code={code} scope={stableScope} />
      </div>
    </ScopeContext.Provider>
  );
}
