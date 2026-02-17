"use client";

import { useState, useCallback } from "react";

export type Person = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string>;
  how_we_met: string | null;
  notes: string | null;
  last_contacted: string | null;
  desired_frequency: string;
  properties: Record<string, unknown>;
  tags: { id: string; label: string }[];
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: string;
  date: string;
  type: string;
  note: string | null;
  people: { id: string; name: string }[];
  created_at: string;
};

export type Tag = {
  id: string;
  label: string;
};

export type ReconnectItem = {
  id: string;
  name: string;
  how_we_met: string | null;
  last_contacted: string | null;
  desired_frequency: string;
  overdue_days: number;
  tags: { id: string; label: string }[];
};

const BASE = "/api/mutabl/contxt";

export function useContxtApi() {
  const [people, setPeople] = useState<Person[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [reconnectQueue, setReconnectQueue] = useState<ReconnectItem[]>([]);

  const refreshPeople = useCallback(async () => {
    const res = await fetch(`${BASE}/people`);
    if (res.ok) {
      const data = await res.json();
      setPeople(data.people);
    }
  }, []);

  const refreshInteractions = useCallback(async () => {
    const res = await fetch(`${BASE}/interactions`);
    if (res.ok) {
      const data = await res.json();
      setInteractions(data.interactions);
    }
  }, []);

  const refreshTags = useCallback(async () => {
    const res = await fetch(`${BASE}/tags`);
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags);
    }
  }, []);

  const refreshReconnect = useCallback(async () => {
    const res = await fetch(`${BASE}/reconnect`);
    if (res.ok) {
      const data = await res.json();
      setReconnectQueue(data.queue);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshPeople(), refreshInteractions(), refreshTags(), refreshReconnect()]);
  }, [refreshPeople, refreshInteractions, refreshTags, refreshReconnect]);

  const addPerson = useCallback(
    async (person: {
      name: string;
      email?: string;
      phone?: string;
      social_links?: Record<string, string>;
      how_we_met?: string;
      notes?: string;
      desired_frequency?: string;
      tags?: string[];
    }) => {
      const res = await fetch(`${BASE}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      if (res.ok) {
        const data = await res.json();
        setPeople((prev) => [data.person, ...prev]);
        refreshReconnect();
      }
    },
    [refreshReconnect]
  );

  const updatePerson = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        email?: string;
        phone?: string;
        social_links?: Record<string, string>;
        how_we_met?: string;
        notes?: string;
        desired_frequency?: string;
        properties?: Record<string, unknown>;
        tags?: string[];
      }
    ) => {
      const res = await fetch(`${BASE}/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.person } : p)));
        refreshReconnect();
      }
    },
    [refreshReconnect]
  );

  const deletePerson = useCallback(async (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    await fetch(`${BASE}/people/${id}`, { method: "DELETE" });
  }, []);

  const addInteraction = useCallback(
    async (interaction: {
      date?: string;
      type?: string;
      note?: string;
      person_ids: string[];
    }) => {
      const res = await fetch(`${BASE}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interaction),
      });
      if (res.ok) {
        const data = await res.json();
        setInteractions((prev) => [data.interaction, ...prev]);
        // Refresh people (last_contacted changed) and reconnect queue
        refreshPeople();
        refreshReconnect();
      }
    },
    [refreshPeople, refreshReconnect]
  );

  const updateInteraction = useCallback(
    async (
      id: string,
      updates: {
        date?: string;
        type?: string;
        note?: string;
        person_ids?: string[];
      }
    ) => {
      const res = await fetch(`${BASE}/interactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await refreshAll();
      }
    },
    [refreshAll]
  );

  const deleteInteraction = useCallback(
    async (id: string) => {
      setInteractions((prev) => prev.filter((i) => i.id !== id));
      await fetch(`${BASE}/interactions/${id}`, { method: "DELETE" });
      refreshPeople();
      refreshReconnect();
    },
    [refreshPeople, refreshReconnect]
  );

  const addTag = useCallback(async (label: string) => {
    const res = await fetch(`${BASE}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const data = await res.json();
      setTags((prev) => {
        if (prev.some((t) => t.id === data.tag.id)) return prev;
        return [...prev, data.tag].sort((a, b) => a.label.localeCompare(b.label));
      });
    }
  }, []);

  const snooze = useCallback(
    async (personId: string, days?: number) => {
      await fetch(`${BASE}/reconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, action: "snooze", snooze_days: days || 7 }),
      });
      refreshReconnect();
      refreshPeople();
    },
    [refreshReconnect, refreshPeople]
  );

  const skipReconnect = useCallback(
    async (personId: string) => {
      await fetch(`${BASE}/reconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: personId, action: "skip" }),
      });
      refreshReconnect();
      refreshPeople();
    },
    [refreshReconnect, refreshPeople]
  );

  return {
    people,
    interactions,
    tags,
    reconnectQueue,
    refreshAll,
    addPerson,
    updatePerson,
    deletePerson,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    addTag,
    snooze,
    skipReconnect,
  };
}
