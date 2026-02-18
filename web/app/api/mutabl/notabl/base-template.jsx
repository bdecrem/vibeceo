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

  const renameRef = useRef(null);
  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      const val = renameRef.current.value;
      renameRef.current.setSelectionRange(val.length, val.length);
    }
  }, [renamingId]);

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
      contentRef.current = "";
      contentCacheRef.current[doc.id] = "";
      setEditorContent("");
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
    <div className="nb-sidebar" style={{
      width: isMobile ? "280px" : "240px",
      ...(isMobile ? {
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
      } : {}),
    }}>
      <div className="nb-sidebar-header">
        <span className="nb-logo">NOTABL</span>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="nb-btn-icon" style={{ fontSize: 20 }}>✕</button>
        )}
      </div>
      <div style={{ padding: "8px" }}>
        <button onClick={handleNewDoc} className="nb-btn-new">+ New Document</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {openMenuId !== null && (
          <div className="nb-menu-overlay" onClick={() => setOpenMenuId(null)} />
        )}
        {documents.map(doc => (
          <div key={doc.id} style={{ position: "relative", marginBottom: 2 }}>
            <div onClick={() => { if (renamingId === doc.id) return; setSelectedId(doc.id); if (isMobile) setSidebarOpen(false); }}
              className={"nb-doc-item" + (doc.id === selectedId ? " nb-doc-item-active" : "")}>
              {renamingId === doc.id ? (
                <input
                  ref={renameRef}
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
                  className="nb-rename-input"
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
              onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
              className="nb-btn-menu"
            >⋯</button>
            {openMenuId === doc.id && (
              <div className="nb-menu">
                <button onClick={() => { setRenamingId(doc.id); setOpenMenuId(null); }}
                  className="nb-menu-item">Rename</button>
                <button onClick={() => { setConfirmDeleteId(doc.id); setOpenMenuId(null); }}
                  className="nb-menu-item nb-menu-item-danger">Delete</button>
              </div>
            )}
          </div>
        ))}

      {confirmDeleteId && (
        <div onClick={(e) => e.stopPropagation()} className="nb-backdrop">
          <div className="nb-modal">
            <div className="nb-modal-title">Delete document?</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)} className="nb-btn-cancel">Cancel</button>
              <button onClick={() => handleDeleteFromSidebar(confirmDeleteId)} className="nb-btn-delete">Delete</button>
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
    <div className="nb-root">
      {!isMobile && sidebar}
      {backdrop}
      {isMobile && sidebar}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 56px 10px 16px",
          borderBottom: "1px solid #1a1a2e", flexShrink: 0,
        }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(true)} className="nb-btn-icon" style={{ fontSize: 20 }}>☰</button>
          )}
          <div style={{ flex: 1 }} />
          {selectedDoc && (
            <>
              <button onClick={handleShare} className="nb-btn-toolbar">Share</button>
              <button onClick={() => exportMarkdown(selectedId)} className="nb-btn-toolbar">Export</button>
            </>
          )}
        </div>

        {shareUrl && (
          <div className="nb-share-bar">
            <span>Link copied!</span>
            <span style={{ color: "#666", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareUrl}</span>
            <button onClick={() => setShareUrl(null)} className="nb-btn-icon" style={{ color: accent }}>✕</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "32px 48px" }}>
          {selectedDoc ? (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={handleTitleChange}
                className="nb-title-editor"
              >{selectedDoc.title}</div>

              <RichEditor
                key={selectedId}
                content={editorContent}
                onUpdate={handleEditorUpdate}
                theme={{ accent }}
                editable={true}
              />
            </div>
          ) : (
            <div onClick={handleNewDoc} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555", cursor: "pointer" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✎</div>
                <div style={{ fontSize: 18 }}>Start writing</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
