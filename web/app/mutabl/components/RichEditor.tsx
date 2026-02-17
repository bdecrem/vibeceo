"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const DEFAULT_FEATURES = ["bold", "italic", "underline", "h1", "h2", "h3"];

type FeatureEntry = {
  key: string;
  group: number;
  ariaLabel: string;
  isActive: (editor: any) => boolean;
  command: (editor: any) => void;
  renderLabel: () => React.ReactNode;
};

const FEATURE_REGISTRY: FeatureEntry[] = [
  {
    key: "bold",
    group: 0,
    ariaLabel: "Bold",
    isActive: (e) => e.isActive("bold"),
    command: (e) => e.chain().focus().toggleBold().run(),
    renderLabel: () => <span style={{ fontWeight: 700 }}>B</span>,
  },
  {
    key: "italic",
    group: 0,
    ariaLabel: "Italic",
    isActive: (e) => e.isActive("italic"),
    command: (e) => e.chain().focus().toggleItalic().run(),
    renderLabel: () => <span style={{ fontStyle: "italic" }}>I</span>,
  },
  {
    key: "underline",
    group: 0,
    ariaLabel: "Underline",
    isActive: (e) => e.isActive("underline"),
    command: (e) => e.chain().focus().toggleUnderline().run(),
    renderLabel: () => <span style={{ textDecoration: "underline" }}>U</span>,
  },
  {
    key: "strike",
    group: 0,
    ariaLabel: "Strikethrough",
    isActive: (e) => e.isActive("strike"),
    command: (e) => e.chain().focus().toggleStrike().run(),
    renderLabel: () => <span style={{ textDecoration: "line-through" }}>S</span>,
  },
  {
    key: "h1",
    group: 1,
    ariaLabel: "Heading 1",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    renderLabel: () => <>H1</>,
  },
  {
    key: "h2",
    group: 1,
    ariaLabel: "Heading 2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    renderLabel: () => <>H2</>,
  },
  {
    key: "h3",
    group: 1,
    ariaLabel: "Heading 3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    renderLabel: () => <>H3</>,
  },
  {
    key: "bulletList",
    group: 2,
    ariaLabel: "Bullet list",
    isActive: (e) => e.isActive("bulletList"),
    command: (e) => e.chain().focus().toggleBulletList().run(),
    renderLabel: () => <>&#8226;&#8801;</>,
  },
  {
    key: "orderedList",
    group: 2,
    ariaLabel: "Numbered list",
    isActive: (e) => e.isActive("orderedList"),
    command: (e) => e.chain().focus().toggleOrderedList().run(),
    renderLabel: () => <>1.</>,
  },
  {
    key: "blockquote",
    group: 3,
    ariaLabel: "Blockquote",
    isActive: (e) => e.isActive("blockquote"),
    command: (e) => e.chain().focus().toggleBlockquote().run(),
    renderLabel: () => <>&ldquo;</>,
  },
  {
    key: "codeBlock",
    group: 3,
    ariaLabel: "Code block",
    isActive: (e) => e.isActive("codeBlock"),
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
    renderLabel: () => <>&lt;/&gt;</>,
  },
  {
    key: "horizontalRule",
    group: 3,
    ariaLabel: "Horizontal rule",
    isActive: () => false,
    command: (e) => e.chain().focus().setHorizontalRule().run(),
    renderLabel: () => <>&#8212;</>,
  },
  // link is handled specially — not in this array
];

type RichEditorProps = {
  content: string;
  onUpdate: (html: string) => void;
  theme?: { accent?: string };
  editable?: boolean;
  features?: string[];
};

export default function RichEditor({
  content,
  onUpdate,
  theme,
  editable = true,
  features,
}: RichEditorProps) {
  const accent = theme?.accent || "#FD79A8";
  const scopeId = useId().replace(/:/g, "");
  const isInternalUpdate = useRef(false);
  const activeFeatures = features || DEFAULT_FEATURES;
  const hasLink = activeFeatures.includes("link");
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "nb-link" },
      }),
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

  useEffect(() => {
    if (editor && !isInternalUpdate.current && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  // Focus the link input when it opens
  useEffect(() => {
    if (linkInputOpen && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [linkInputOpen]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      setLinkInputOpen(false);
    } else {
      const existing = editor.getAttributes("link").href || "";
      setLinkUrl(existing);
      setLinkInputOpen(true);
    }
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkInputOpen(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setLinkInputOpen(false);
    setLinkUrl("");
    editor?.chain().focus().run();
  }, [editor]);

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

  const Divider = () => (
    <div
      style={{
        width: 1,
        height: 18,
        background: "#1e1e35",
        margin: "0 6px",
        flexShrink: 0,
      }}
    />
  );

  if (!editor) return null;

  // Build toolbar buttons from registry, filtered by features
  const registryButtons = FEATURE_REGISTRY.filter((f) =>
    activeFeatures.includes(f.key)
  );

  // Group and insert dividers
  const toolbarElements: React.ReactNode[] = [];
  let lastGroup = -1;
  registryButtons.forEach((f, i) => {
    if (lastGroup !== -1 && f.group !== lastGroup) {
      toolbarElements.push(<Divider key={`div-${i}`} />);
    }
    lastGroup = f.group;
    toolbarElements.push(
      <ToolBtn
        key={f.key}
        active={f.isActive(editor)}
        onAction={() => f.command(editor)}
        label={f.ariaLabel}
      >
        {f.renderLabel()}
      </ToolBtn>
    );
  });

  // Link button (special)
  if (hasLink) {
    if (registryButtons.length > 0) {
      toolbarElements.push(<Divider key="div-link" />);
    }
    toolbarElements.push(
      <ToolBtn
        key="link"
        active={editor.isActive("link") || linkInputOpen}
        onAction={handleLinkToggle}
        label="Link"
      >
        &#128279;
      </ToolBtn>
    );
  }

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
        .nb-ed-${scopeId} ul { list-style: disc; padding-left: 24px; margin: 4px 0; }
        .nb-ed-${scopeId} ol { list-style: decimal; padding-left: 24px; margin: 4px 0; }
        .nb-ed-${scopeId} li { margin: 2px 0; }
        .nb-ed-${scopeId} li p { margin: 0; }
        .nb-ed-${scopeId} blockquote {
          border-left: 3px solid ${accent}60;
          padding-left: 16px;
          margin: 8px 0;
          color: #999;
          font-style: italic;
        }
        .nb-ed-${scopeId} pre {
          background: #0d0d20;
          border-radius: 6px;
          padding: 14px 16px;
          margin: 8px 0;
          overflow-x: auto;
        }
        .nb-ed-${scopeId} pre code {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 14px;
          color: #a0a0b0;
          background: none;
          padding: 0;
        }
        .nb-ed-${scopeId} code {
          background: #1a1a30;
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 14px;
          color: #c0c0d0;
        }
        .nb-ed-${scopeId} hr {
          border: none;
          border-top: 1px solid #1e1e35;
          margin: 16px 0;
        }
        .nb-ed-${scopeId} a.nb-link {
          color: ${accent};
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
      `}</style>

      {/* Toolbar */}
      {editable && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "6px 0",
              marginBottom: linkInputOpen ? 0 : 8,
              flexWrap: "wrap",
            }}
          >
            {toolbarElements}
          </div>

          {/* Link URL input bar */}
          {linkInputOpen && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                marginBottom: 8,
              }}
            >
              <input
                ref={linkInputRef}
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelLink();
                  }
                }}
                style={{
                  flex: 1,
                  background: "#0d0d20",
                  border: `1px solid ${accent}40`,
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 13,
                  color: "#c8c8d0",
                  outline: "none",
                  fontFamily: "system-ui",
                }}
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyLink();
                }}
                style={{
                  background: accent,
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 12px",
                  fontSize: 12,
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "system-ui",
                  fontWeight: 600,
                }}
              >
                Apply
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  cancelLink();
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 4,
                  padding: "5px 10px",
                  fontSize: 12,
                  color: "#777",
                  cursor: "pointer",
                  fontFamily: "system-ui",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
