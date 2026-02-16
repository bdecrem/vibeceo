"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useCallback, useEffect, useId, useRef } from "react";

type RichEditorProps = {
  content: string;
  onUpdate: (html: string) => void;
  theme?: { accent?: string };
  editable?: boolean;
};

export default function RichEditor({
  content,
  onUpdate,
  theme,
  editable = true,
}: RichEditorProps) {
  const accent = theme?.accent || "#FD79A8";
  const scopeId = useId().replace(/:/g, "");
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      isInternalUpdate.current = true;
      onUpdate(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: `nb-ed-${scopeId}`,
        style: "outline: none; min-height: 40vh;",
      },
    },
  });

  // Sync content from outside (e.g. switching documents) — skip if from typing
  useEffect(() => {
    if (editor && !isInternalUpdate.current && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  const ToolBtn = useCallback(
    ({
      active,
      onAction,
      children,
      label,
    }: {
      active: boolean;
      onAction: () => void;
      children: React.ReactNode;
      label: string;
    }) => (
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onAction();
        }}
        aria-label={label}
        style={{
          background: active ? `${accent}18` : "transparent",
          border: "none",
          color: active ? accent : "#777",
          borderRadius: 4,
          padding: "5px 9px",
          fontSize: 13,
          cursor: "pointer",
          fontWeight: active ? 700 : 500,
          WebkitTapHighlightColor: "transparent",
          lineHeight: 1,
          fontFamily: "system-ui",
        }}
      >
        {children}
      </button>
    ),
    [accent]
  );

  if (!editor) return null;

  return (
    <div>
      <style>{`
        .nb-ed-${scopeId} {
          font-size: 16.5px;
          line-height: 1.75;
          color: #c8c8d0;
          caret-color: ${accent};
        }
        .nb-ed-${scopeId} h1 { font-size: 32px; font-weight: 700; color: #f0f0f0; margin: 24px 0 8px; line-height: 1.3; }
        .nb-ed-${scopeId} h2 { font-size: 24px; font-weight: 600; color: #e8e8e8; margin: 20px 0 6px; line-height: 1.35; }
        .nb-ed-${scopeId} h3 { font-size: 19px; font-weight: 600; color: #e0e0e0; margin: 16px 0 4px; line-height: 1.4; }
        .nb-ed-${scopeId} p { margin: 3px 0; }
        .nb-ed-${scopeId} strong { color: #e8e8e8; font-weight: 600; }
        .nb-ed-${scopeId} em { font-style: italic; }
        .nb-ed-${scopeId} u { text-decoration: underline; text-decoration-color: ${accent}60; text-underline-offset: 3px; }
        .nb-ed-${scopeId} ::selection { background: ${accent}30; }
        .nb-ed-${scopeId} p.is-editor-empty:first-child::before {
          content: 'Start writing...';
          color: #333;
          float: left;
          pointer-events: none;
          height: 0;
        }
      `}</style>

      {/* Toolbar */}
      {editable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 0",
            marginBottom: 8,
          }}
        >
          <ToolBtn
            active={editor.isActive("bold")}
            onAction={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          >
            <span style={{ fontWeight: 700 }}>B</span>
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("italic")}
            onAction={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <span style={{ fontStyle: "italic" }}>I</span>
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("underline")}
            onAction={() => editor.chain().focus().toggleUnderline().run()}
            label="Underline"
          >
            <span style={{ textDecoration: "underline" }}>U</span>
          </ToolBtn>

          <div
            style={{
              width: 1,
              height: 18,
              background: "#1e1e35",
              margin: "0 6px",
              flexShrink: 0,
            }}
          />

          <ToolBtn
            active={editor.isActive("heading", { level: 1 })}
            onAction={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            label="Heading 1"
          >
            H1
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("heading", { level: 2 })}
            onAction={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            label="Heading 2"
          >
            H2
          </ToolBtn>
          <ToolBtn
            active={editor.isActive("heading", { level: 3 })}
            onAction={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            label="Heading 3"
          >
            H3
          </ToolBtn>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
