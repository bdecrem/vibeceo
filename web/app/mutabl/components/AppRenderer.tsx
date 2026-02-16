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
  scope: Record<string, unknown>;
};

// Context bridge: dynamic data flows here instead of through LiveProvider scope.
// This lets react-live keep a stable scope (no re-eval / re-mount) while the
// inner App component still sees fresh data via useContext (just a re-render).
export const ScopeContext = createContext<Record<string, unknown>>({});

// Memo'd so LiveProvider only re-evaluates when code changes, never on data updates
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

export default function AppRenderer({ code, scope }: AppRendererProps) {
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
      ...scope,
    }),
    [code]
  );

  return (
    <ScopeContext.Provider value={scope}>
      <LiveBlock code={code} scope={stableScope} />
    </ScopeContext.Provider>
  );
}
