"use client";

import { useState, useCallback } from "react";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  properties: Record<string, unknown>;
  created_at: string;
};

const BASE = "/api/mutabl/todoit/tasks";

export function useTaskApi() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const refreshTasks = useCallback(async () => {
    const res = await fetch(BASE);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks);
    }
  }, []);

  const addTask = useCallback(
    async (title: string, properties?: Record<string, unknown>) => {
      const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, properties }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [data.task, ...prev]);
      }
    },
    []
  );

  const toggleTask = useCallback(async (id: string) => {
    setTasks((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) {
        fetch(`${BASE}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !t.completed }),
        });
      }
      return prev.map((x) =>
        x.id === id ? { ...x, completed: !x.completed } : x
      );
    });
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`${BASE}/${id}`, { method: "DELETE" });
  }, []);

  const updateTask = useCallback(
    async (
      id: string,
      updates: {
        title?: string;
        completed?: boolean;
        properties?: Record<string, unknown>;
      }
    ) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      await fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    []
  );

  return { tasks, setTasks, refreshTasks, addTask, toggleTask, deleteTask, updateTask };
}
