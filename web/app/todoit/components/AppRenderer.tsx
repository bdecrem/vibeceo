"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { LiveProvider, LivePreview, LiveError } from "react-live";
import type { Task } from "./useTaskApi";

type AppRendererProps = {
  code: string;
  tasks: Task[];
  addTask: (title: string, properties?: Record<string, unknown>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: { title?: string; completed?: boolean; properties?: Record<string, unknown> }) => Promise<void>;
  user: { handle: string };
};

export default function AppRenderer({
  code,
  tasks,
  addTask,
  toggleTask,
  deleteTask,
  updateTask,
  user,
}: AppRendererProps) {
  const scope = {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    user,
  };

  // react-live expects code that ends with render(<Component />)
  // But with noInline=false, it auto-renders the last expression.
  // We wrap the user's function so it renders automatically.
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
}
