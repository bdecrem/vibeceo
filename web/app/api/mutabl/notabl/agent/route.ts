import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { agentLoop } from "../../agent-loop";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function verifySessionToken(
  token: string
): { userId: string; handle: string } | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_KEY!.slice(0, 32);
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");
    if (parts.length < 4) return null;
    const signature = parts[parts.length - 1];
    const timestamp = parts[parts.length - 2];
    const handle = parts[parts.length - 3];
    const userId = parts.slice(0, parts.length - 3).join(":");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${handle}:${timestamp}`)
      .digest("hex")
      .slice(0, 16);
    if (signature !== expectedSig) return null;
    if (Date.now() - parseInt(timestamp) > 30 * 24 * 60 * 60 * 1000)
      return null;
    return { userId, handle };
  } catch {
    return null;
  }
}

function getSession(request: NextRequest) {
  const token = request.cookies.get("nb_session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const NOTABL_SCOPE_DOCS = `AVAILABLE IN SCOPE (injected by the wrapper — do NOT import these):
- React hooks: useState, useEffect, useRef, useMemo, useCallback, useContext
- ScopeContext: React context that provides fresh dynamic data. CRITICAL: your App MUST read
  dynamic data from context to avoid react-live re-mount flicker:
  const { documents, addDocument, updateDocument, deleteDocument, shareDocument, unshareDocument, refreshDocuments, exportMarkdown } = useContext(ScopeContext);
  Put this line at the TOP of your App function, before any other hooks.
- documents: array of {id, title, blocks, share_slug, is_public, created_at, updated_at}
- Document operations: addDocument(title), updateDocument(id, {title?, blocks?}), deleteDocument(id)
- Share operations: shareDocument(id) → returns {slug, url}, unshareDocument(id)
- Export: exportMarkdown(id) → converts blocks to .md and triggers browser download
- Refresh: refreshDocuments()
- User info: user ({handle}) — available directly from scope (stable, no context needed)
- CopyLink component: <CopyLink url="https://..." label="optional label" /> — renders a tappable button that copies URL to clipboard on tap (works on iOS Safari). Shows "✓ Copied!" feedback. Use this for share links instead of navigator.clipboard.
- copyToClipboard(text) — function that copies text to clipboard (iOS-safe). Use this instead of navigator.clipboard.writeText().
- RichEditor component: <RichEditor content={html} onUpdate={fn} theme={{accent:"#color"}} editable={bool} features={[...]} />
  - content: HTML string (TipTap format)
  - onUpdate: called with HTML string on every edit
  - theme: { accent } — controls toolbar highlight, caret, selection color
  - editable: boolean (default true)
  - features: optional string[] — controls which toolbar buttons appear
    Default (no prop): ['bold','italic','underline','h1','h2','h3']
    Valid feature names: bold, italic, underline, strike, h1, h2, h3, bulletList, orderedList, blockquote, codeBlock, horizontalRule, link
    Example: <RichEditor features={['bold','italic','underline','h1','bulletList','orderedList','link']} ... />
  - Customize the toolbar via the features prop — do NOT build your own formatting toolbar
- Block format: { id: "body", type: "richtext", content: "<h1>Title</h1><p>text</p>" }
  - Single richtext block per document, content is HTML
  - Save: updateDocument(id, { blocks: [{ id: "body", type: "richtext", content: html }] })

NOTE: Logout and settings are handled by the app wrapper — do NOT add logout buttons to the component.`;

const NOTABL_CSS_RULES = `CSS STYLING:
- You can use inline styles (style={{ }}) OR CSS classes (className="...") OR both
- If using CSS classes, return them in a separate \`\`\`css code block AFTER the \`\`\`jsx block
- CSS classes should use a descriptive prefix (e.g., .app-header, .doc-sidebar)
- CSS enables: hover states, transitions, animations, media queries, pseudo-elements
- If no CSS changes needed, omit the \`\`\`css block entirely — existing CSS will be preserved`;

const NOTABL_CODE_RULES = `RULES:
- Output a SINGLE React component named App (function App() { ... })
- You can use inline styles (style={{ }}) OR CSS classes (className="...") OR both
- Do NOT import anything — all dependencies are in scope
- The component must be self-contained in one function
- FIRST LINE of App must be: const { documents, addDocument, updateDocument, deleteDocument, shareDocument, unshareDocument, refreshDocuments, exportMarkdown } = useContext(ScopeContext);
- Use <RichEditor> for ALL document editing — NEVER use contentEditable divs or build your own text editor
- To add/remove toolbar buttons, pass the features prop to RichEditor — never build a custom formatting toolbar
- Your job is layout, features, and theming AROUND the editor — not reimplementing the editor
- Save document content as a single richtext block: { id: "body", type: "richtext", content: html }
- When loading a doc, handle legacy blocks (type "paragraph"/"heading") by converting them to HTML
- You can add features like: word count, themes, sidebar customization, document organization, focus mode, AI tools
- Keep the app functional and visually coherent after changes
- Preserve existing functionality unless the user explicitly asks to remove it
- The pink color scheme (#FD79A8) is the default accent — respect it unless user asks for a different theme

${NOTABL_CSS_RULES}

OUTPUT FORMAT:
Return the complete updated component code in a \`\`\`jsx code block, followed by a brief explanation of what you changed.
Optionally, return CSS in a \`\`\`css code block after the JSX block. Only include CSS if you're using className in the component.`;

const NOTABL_SYSTEM_PROMPT = `You are the NOTABL builder agent. You modify a user's personal document editor by rewriting their React component code.

NOTABL is a rich text document editor powered by TipTap. It has a pre-built <RichEditor> component in scope that handles all text editing (bold, italic, underline, headings). Users create documents, write rich content, and share them via clean public links. Your role is to customize the layout, features, and theming AROUND the editor — never reimplement it.

${NOTABL_SCOPE_DOCS}

${NOTABL_CODE_RULES}`;

export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const [configResult, docsResult] = await Promise.all([
      supabase
        .from("notabl_config")
        .select("app_code, app_css, version")
        .eq("id", session.userId)
        .single(),
      supabase
        .from("notabl_documents")
        .select("id, title, blocks, is_public")
        .eq("user_id", session.userId)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    if (!configResult.data) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const currentCode = configResult.data.app_code;
    const currentCss = configResult.data.app_css || "";
    const currentVersion = configResult.data.version;
    const docs = docsResult.data || [];

    const docSummary = docs.map(d => ({
      id: d.id,
      title: d.title,
      blockCount: Array.isArray(d.blocks) ? d.blocks.length : 0,
      is_public: d.is_public,
    }));

    const cssSection = currentCss ? `\nCURRENT APP CSS:\n\`\`\`css\n${currentCss}\n\`\`\`\n` : "";

    const userPrompt = `CURRENT APP CODE:
\`\`\`jsx
${currentCode}
\`\`\`
${cssSection}
CURRENT DOCUMENTS (${docSummary.length} shown, most recent):
${docSummary.length > 0 ? JSON.stringify(docSummary, null, 2) : "(no documents yet)"}

USER REQUEST: ${message.trim()}`;

    const result = await agentLoop({
      systemPrompt: NOTABL_SYSTEM_PROMPT,
      userMessage: userPrompt,
      currentCode,
      currentCss,
      maxTokens: 16384,
    });

    if (!result.ok) {
      return NextResponse.json({
        app_code: currentCode,
        message: result.error,
        version: currentVersion,
      });
    }

    const newVersion = currentVersion + 1;
    const updatePayload: Record<string, unknown> = {
      app_code: result.code,
      version: newVersion,
      modified: true,
      updated_at: new Date().toISOString(),
    };
    if (result.css !== undefined) {
      updatePayload.app_css = result.css;
    }
    const { error: updateError } = await supabase
      .from("notabl_config")
      .update(updatePayload)
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save changes" },
        { status: 500 }
      );
    }

    await supabase.from("notabl_changes").insert({
      user_id: session.userId,
      request: message.trim(),
      summary: result.message,
    });

    return NextResponse.json({
      app_code: result.code,
      app_css: result.css !== undefined ? result.css : currentCss,
      message: result.message,
      version: newVersion,
    });
  } catch (err) {
    console.error("Agent error:", err);
    return NextResponse.json(
      { error: "Agent failed. Try again." },
      { status: 500 }
    );
  }
}
