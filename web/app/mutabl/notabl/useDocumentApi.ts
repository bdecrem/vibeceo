"use client";

import { useState, useCallback, useRef } from "react";

export type Block = {
  id: string;
  type: "paragraph" | "heading" | "richtext";
  content: string;
  properties: Record<string, unknown>;
};

export type Document = {
  id: string;
  title: string;
  blocks: Block[];
  share_slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

const BASE = "/api/mutabl/notabl/documents";

export function useDocumentApi() {
  const [documents, setDocuments] = useState<Document[]>([]);
  // Cache latest blocks per doc so export works even though block saves
  // don't update documents state (to avoid react-live re-mount flicker)
  const blocksCacheRef = useRef<Record<string, Block[]>>({});

  const refreshDocuments = useCallback(async () => {
    const res = await fetch(BASE);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
  }, []);

  const addDocument = useCallback(async (title: string) => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      setDocuments((prev) => [data.document, ...prev]);
      return data.document;
    }
  }, []);

  const updateDocument = useCallback(
    async (id: string, updates: { title?: string; blocks?: Block[] }) => {
      // Only optimistically update state for title changes.
      // Block saves are fire-and-forget — updating documents state would
      // cause react-live to re-mount the entire App (new scope → new eval),
      // destroying TipTap and causing visible flicker.
      if (updates.blocks) {
        blocksCacheRef.current[id] = updates.blocks;
      }
      if (updates.title !== undefined) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, title: updates.title!, updated_at: new Date().toISOString() } : d
          )
        );
      }
      await fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    },
    []
  );

  const deleteDocument = useCallback(async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await fetch(`${BASE}/${id}`, { method: "DELETE" });
  }, []);

  const shareDocument = useCallback(async (id: string) => {
    const res = await fetch(`${BASE}/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "share" }),
    });
    if (res.ok) {
      const data = await res.json();
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, share_slug: data.slug, is_public: true } : d
        )
      );
      return { slug: data.slug, url: data.url };
    }
  }, []);

  const unshareDocument = useCallback(async (id: string) => {
    await fetch(`${BASE}/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unshare" }),
    });
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_public: false } : d))
    );
  }, []);

  const exportMarkdown = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;

      // Use cached blocks if available (block saves don't update documents state)
      const blocks = blocksCacheRef.current[id] || doc.blocks;
      let md: string;
      const hasRichtext = blocks.some((b) => b.type === "richtext");

      if (hasRichtext) {
        // Convert HTML → markdown
        const html = blocks
          .filter((b) => b.type === "richtext")
          .map((b) => b.content)
          .join("");
        md = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
          .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
          .replace(/<em>(.*?)<\/em>/gi, "*$1*")
          .replace(/<u>(.*?)<\/u>/gi, "$1")
          .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      } else {
        // Legacy block format
        const lines: string[] = [];
        for (const block of blocks) {
          if (block.type === "heading") {
            const level = (block.properties.level as number) || 1;
            lines.push(`${"#".repeat(level)} ${block.content}`);
          } else {
            lines.push(block.content);
          }
          lines.push("");
        }
        md = lines.join("\n").trim();
      }

      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "document"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [documents]
  );

  return {
    documents,
    refreshDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    exportMarkdown,
  };
}
