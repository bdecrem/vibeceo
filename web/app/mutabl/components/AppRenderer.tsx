"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";

type AppRendererProps = {
  code: string;
  scope: Record<string, unknown>;
};

export default function AppRenderer({ code, scope }: AppRendererProps) {
  const fullScope = {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    ...scope,
  };

  const wrappedCode = `${code}\nrender(<App />)`;

  return (
    <LiveProvider code={wrappedCode} scope={fullScope} noInline>
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
}
