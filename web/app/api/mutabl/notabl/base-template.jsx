function App() {
  // Read fresh data via context bridge (avoids react-live re-mount on data changes)
  const { documents, addDocument, updateDocument, deleteDocument, shareDocument, unshareDocument, refreshDocuments, exportMarkdown } = useContext(ScopeContext);

  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const contentRef = useRef("");
  const saveTimeoutRef = useRef(null);
  const contentCacheRef = useRef({});

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, []);

  const getDocHtml = (doc) => {
    if (!doc || !doc.blocks || doc.blocks.length === 0) return "";
    const first = doc.blocks[0];
    if (first.type === "richtext") return first.content || "";
    return doc.blocks.map(b => {
      if (b.type === "heading") {
        const lvl = (b.properties && b.properties.level) || 1;
        return "<h" + lvl + ">" + (b.content || "") + "</h" + lvl + ">";
      }
      return "<p>" + (b.content || "") + "</p>";
    }).join("");
  };

  const selectedDoc = documents.find(d => d.id === selectedId);

  useEffect(() => {
    if (selectedDoc) {
      const html = contentCacheRef.current[selectedDoc.id] || getDocHtml(selectedDoc);
      contentRef.current = html;
      setEditorContent(html);
      setShareUrl(null);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId && documents.length > 0) {
      setSelectedId(documents[0].id);
    }
  }, [documents, selectedId]);

  const handleEditorUpdate = (html) => {
    contentRef.current = html;
    if (selectedId) {
      contentCacheRef.current[selectedId] = html;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (selectedId) {
        updateDocument(selectedId, {
          blocks: [{ id: "body", type: "richtext", content: contentRef.current, properties: {} }]
        });
      }
    }, 600);
  };

  const handleNewDoc = async () => {
    const doc = await addDocument("Untitled");
    if (doc) {
      setSelectedId(doc.id);
      if (isMobile) setSidebarOpen(false);
    }
  };

  const handleDeleteFromSidebar = async (docId) => {
    delete contentCacheRef.current[docId];
    await deleteDocument(docId);
    if (selectedId === docId) { setSelectedId(null); setEditorContent(""); contentRef.current = ""; }
    setConfirmDeleteId(null);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    delete contentCacheRef.current[selectedId];
    await deleteDocument(selectedId);
    setSelectedId(null);
    setEditorContent("");
    contentRef.current = "";
  };

  const handleShare = async () => {
    if (!selectedId) return;
    const result = await shareDocument(selectedId);
    if (result) {
      const url = window.location.origin + "/mutabl/notabl/s/" + result.slug;
      setShareUrl(url);
      if (typeof navigator.share === "function") { try { navigator.share({ title: "notabl", url }); } catch {} }
    }
  };

  const handleTitleChange = (e) => {
    const title = e.currentTarget.textContent || "";
    if (selectedId) updateDocument(selectedId, { title });
  };

  const accent = "#FD79A8";

  const sidebar = (
    <div style={{
      width: isMobile ? "280px" : "240px",
      background: "#0c0c20",
      borderRight: "1px solid #1a1a2e",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      ...(isMobile ? {
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
      } : {}),
    }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: accent, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>NOTABL</span>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>✕</button>
        )}
      </div>
      <div style={{ padding: "8px" }}>
        <button onClick={handleNewDoc} style={{
          width: "100%", padding: "10px", background: accent + "15", border: "1px solid " + accent + "30",
          borderRadius: 6, color: accent, cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}>+ New Document</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {documents.map(doc => (
          <div key={doc.id} style={{ position: "relative", marginBottom: 2 }}>
            <div onClick={() => { setSelectedId(doc.id); if (isMobile) setSidebarOpen(false); }} style={{
              padding: "10px 44px 10px 12px", borderRadius: 6, cursor: "pointer",
              background: doc.id === selectedId ? accent + "15" : "transparent",
              borderLeft: doc.id === selectedId ? "2px solid " + accent : "2px solid transparent",
            }}>
              {renamingId === doc.id ? (
                <input
                  autoFocus
                  defaultValue={doc.title || ""}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val && val !== doc.title) updateDocument(doc.id, { title: val });
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.target.blur(); }
                    if (e.key === "Escape") { setRenamingId(null); }
                  }}
                  style={{
                    fontSize: 13, color: "#e0e0e0", fontWeight: 600,
                    background: "#0a0a1a", border: "1px solid " + accent,
                    borderRadius: 4, padding: "2px 6px", width: "100%",
                    outline: "none",
                  }}
                />
              ) : (
                <div style={{ fontSize: 13, color: doc.id === selectedId ? "#e0e0e0" : "#888", fontWeight: doc.id === selectedId ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {doc.title || "Untitled"}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                {new Date(doc.updated_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id); }}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#666", fontSize: 18,
                cursor: "pointer", padding: "8px", borderRadius: 4, lineHeight: 1,
              }}
            >⋯</button>
            {openMenuId === doc.id && (
              <div onClick={(e) => e.stopPropagation()} style={{
                position: "absolute", right: 8, top: "100%", marginTop: 4,
                background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 6,
                minWidth: 140, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", zIndex: 100,
              }}>
                <button onClick={(e) => { e.stopPropagation(); setRenamingId(doc.id); setOpenMenuId(null); }}
                  style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", color: "#ccc", fontSize: 13, cursor: "pointer", textAlign: "left", borderRadius: "6px 6px 0 0" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#252535"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >Rename</button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(doc.id); setOpenMenuId(null); }}
                  style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", color: "#d44", fontSize: 13, cursor: "pointer", textAlign: "left", borderRadius: "0 0 6px 6px" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#252535"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >Delete</button>
              </div>
            )}
          </div>
        ))}
      
      {confirmDeleteId && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 300,
        }}>
          <div style={{
            background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 8,
            padding: 24, maxWidth: 400, width: "calc(100% - 32px)", margin: 16,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e0e0e0", marginBottom: 12 }}>
              Delete document?
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #2a2a3e", borderRadius: 6, color: "#888", fontSize: 13, cursor: "pointer" }}
              >Cancel</button>
              <button onClick={() => handleDeleteFromSidebar(confirmDeleteId)}
                style={{ padding: "8px 16px", background: "#d44", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
</div>
    </div>
  );

  const backdrop = isMobile && sidebarOpen ? (
    <div onClick={() => setSidebarOpen(false)} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", zIndex: 199,
    }} />
  ) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a1a", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {!isMobile && sidebar}
      {backdrop}
      {isMobile && sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
          borderBottom: "1px solid #1a1a2e", flexShrink: 0,
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} style={{
              background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer", padding: "4px",
            }}>☰</button>
          )}
          <div style={{ flex: 1 }} />
          {selectedDoc && (
            <>
              <button onClick={handleShare} style={{
                background: "none", border: "1px solid #1a1a2e", borderRadius: 6,
                color: "#888", fontSize: 12, padding: "6px 12px", cursor: "pointer",
              }}>Share</button>
              <button onClick={() => exportMarkdown(selectedId)} style={{
                background: "none", border: "1px solid #1a1a2e", borderRadius: 6,
                color: "#888", fontSize: 12, padding: "6px 12px", cursor: "pointer",
              }}>Export</button>
              
            </>
          )}
        </div>

        {shareUrl && (
          <div style={{
            padding: "8px 16px", background: accent + "15", borderBottom: "1px solid " + accent + "30",
            fontSize: 12, color: accent, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>Link copied!</span>
            <span style={{ color: "#666", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>
            <button onClick={() => setShareUrl(null)} style={{ background: "none", border: "none", color: accent, cursor: "pointer" }}>✕</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "32px 48px" }}>
          {selectedDoc ? (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={handleTitleChange}
                style={{
                  fontSize: 32, fontWeight: 700, color: "#f0f0f0", outline: "none",
                  marginBottom: 24, lineHeight: 1.3, minHeight: "1.3em",
                }}
              >{selectedDoc.title}</div>

              <RichEditor
                content={editorContent}
                onUpdate={handleEditorUpdate}
                theme={{ accent }}
                editable={true}
              />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#333" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✎</div>
                <div style={{ fontSize: 14 }}>Select a document or create a new one</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
