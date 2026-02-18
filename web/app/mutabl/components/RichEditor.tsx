"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ResizableImage from "./ResizableImage";
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
  // image is handled specially — triggers file input, not in this array
];

type RichEditorProps = {
  content: string;
  onUpdate: (html: string) => void;
  theme?: { accent?: string };
  editable?: boolean;
  features?: string[];
  onImageUpload?: (file: File) => Promise<string>;
};

export default function RichEditor({
  content,
  onUpdate,
  theme,
  editable = true,
  features,
  onImageUpload,
}: RichEditorProps) {
  const accent = theme?.accent || "#FD79A8";
  const scopeId = useId().replace(/:/g, "");
  const isInternalUpdate = useRef(false);
  const activeFeatures = features || DEFAULT_FEATURES;
  const hasLink = activeFeatures.includes("link");
  const hasImage = activeFeatures.includes("image") && !!onImageUpload;
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

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
      ResizableImage.configure({
        inline: false,
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

  // Focus the URL input when popup opens
  useEffect(() => {
    if (linkInputOpen && linkUrlRef.current) {
      linkUrlRef.current.focus();
    }
  }, [linkInputOpen]);

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      setLinkInputOpen(false);
    } else {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "");
      const existing = editor.getAttributes("link").href || "";
      setLinkText(selectedText);
      setLinkUrl(existing);
      setLinkInputOpen(true);
    }
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      setLinkInputOpen(false);
      setLinkUrl("");
      setLinkText("");
      return;
    }
    const text = linkText.trim();
    const { from, to } = editor.state.selection;
    const currentText = editor.state.doc.textBetween(from, to, "");

    if (text && text !== currentText) {
      // Text was changed — replace selection with new text + link
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(`<a href="${url}">${text}</a>`)
        .run();
    } else {
      // Only URL changed
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
    setLinkInputOpen(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText]);

  const cancelLink = useCallback(() => {
    setLinkInputOpen(false);
    setLinkUrl("");
    setLinkText("");
    editor?.chain().focus().run();
  }, [editor]);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor || !onImageUpload) return;
      e.target.value = "";
      setImageUploading(true);
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error("Image upload failed:", err);
      } finally {
        setImageUploading(false);
      }
    },
    [editor, onImageUpload]
  );

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
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
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
  // Link & image are injected as their own group (1.5) between headings and lists
  const toolbarElements: React.ReactNode[] = [];
  let lastGroup = -1;
  let linkImageInserted = false;

  const insertLinkImage = () => {
    if (linkImageInserted) return;
    linkImageInserted = true;
    if (!(hasLink || hasImage)) return;
    if (lastGroup !== -1) toolbarElements.push(<Divider key="div-li" />);
    if (hasLink) {
      toolbarElements.push(
        <ToolBtn key="link" active={editor.isActive("link") || linkInputOpen} onAction={handleLinkToggle} label="Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </ToolBtn>
      );
    }
    if (hasImage) {
      toolbarElements.push(
        <ToolBtn key="image" active={imageUploading} onAction={() => imageInputRef.current?.click()} label="Insert image">
          {imageUploading ? <span style={{ opacity: 0.5 }}>...</span> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          )}
        </ToolBtn>
      );
    }
    lastGroup = 1.5;
  };

  registryButtons.forEach((f, i) => {
    // Insert link/image before group 2 (lists)
    if (!linkImageInserted && f.group >= 2) {
      insertLinkImage();
    }
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
  // If no group >= 2 existed, append at end
  insertLinkImage();

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
        .nb-ed-${scopeId} .nb-img-wrap:hover .nb-resize-handle {
          opacity: 1 !important;
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

          {/* Link text + URL popup */}
          {linkInputOpen && (
            <div
              style={{
                background: "#12122a",
                border: "1px solid #2a2a45",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#888", width: 36, flexShrink: 0, fontFamily: "system-ui" }}>Text</label>
                <input
                  type="text"
                  placeholder="Display text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.preventDefault(); cancelLink(); }
                  }}
                  style={{
                    flex: 1,
                    background: "#0d0d20",
                    border: "1px solid #2a2a45",
                    borderRadius: 4,
                    padding: "5px 10px",
                    fontSize: 13,
                    color: "#c8c8d0",
                    outline: "none",
                    fontFamily: "system-ui",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#888", width: 36, flexShrink: 0, fontFamily: "system-ui" }}>URL</label>
                <input
                  ref={linkUrlRef}
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                    else if (e.key === "Escape") { e.preventDefault(); cancelLink(); }
                  }}
                  style={{
                    flex: 1,
                    background: "#0d0d20",
                    border: "1px solid #2a2a45",
                    borderRadius: 4,
                    padding: "5px 10px",
                    fontSize: 13,
                    color: "#c8c8d0",
                    outline: "none",
                    fontFamily: "system-ui",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); cancelLink(); }}
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
                <button
                  onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
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
              </div>
            </div>
          )}
        </div>
      )}

      {hasImage && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: "none" }}
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
