function App() {
  const { people, interactions, tags, reconnectQueue, addPerson, updatePerson, deletePerson, addInteraction, updateInteraction, deleteInteraction, addTag, snooze, skipReconnect, refreshAll, user } = useContext(ScopeContext);
  const [view, setView] = useState("reconnect");
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", email: "", phone: "", social_links: "", how_we_met: "", notes: "", desired_frequency: "monthly", tags: "" });
  const [newInteraction, setNewInteraction] = useState({ date: new Date().toISOString().split("T")[0], type: "coffee", note: "", person_ids: [] });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accent = "#00CEC9";
  const textPrimary = "#e0e0e0";
  const textSecondary = "#888";
  const textDim = "#555";

  const frequencyLabel = { weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", none: "No reminder" };

  const filteredPeople = people.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").toLowerCase().includes(q) ||
      (p.how_we_met || "").toLowerCase().includes(q) ||
      (p.notes || "").toLowerCase().includes(q) ||
      p.tags.some(t => t.label.toLowerCase().includes(q));
  });

  const personInteractions = selectedPerson
    ? interactions.filter(i => i.people.some(p => p.id === selectedPerson.id))
    : [];

  const timeSince = (dateStr) => {
    if (!dateStr) return "never";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + "d ago";
    if (days < 30) return Math.floor(days / 7) + "w ago";
    if (days < 365) return Math.floor(days / 30) + "mo ago";
    return Math.floor(days / 365) + "y ago";
  };

  const warmMessage = (days) => {
    if (days > 90) return "It's been a while";
    if (days > 30) return "Time to reconnect";
    if (days > 7) return "A quick hello?";
    return "Check in soon";
  };

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) return;
    const tagList = newPerson.tags.split(",").map(t => t.trim()).filter(Boolean);
    const socialObj = {};
    newPerson.social_links.split(",").map(s => s.trim()).filter(Boolean).forEach(link => {
      if (link.includes("twitter.com") || link.includes("x.com")) socialObj.twitter = link;
      else if (link.includes("linkedin.com")) socialObj.linkedin = link;
      else if (link.includes("instagram.com")) socialObj.instagram = link;
      else if (link.includes("github.com")) socialObj.github = link;
      else socialObj.other = link;
    });
    await addPerson({
      name: newPerson.name.trim(),
      email: newPerson.email.trim() || undefined,
      phone: newPerson.phone.trim() || undefined,
      social_links: Object.keys(socialObj).length > 0 ? socialObj : undefined,
      how_we_met: newPerson.how_we_met.trim() || undefined,
      notes: newPerson.notes.trim() || undefined,
      desired_frequency: newPerson.desired_frequency,
      tags: tagList.length > 0 ? tagList : undefined,
    });
    setNewPerson({ name: "", email: "", phone: "", social_links: "", how_we_met: "", notes: "", desired_frequency: "monthly", tags: "" });
    setShowAddPerson(false);
  };

  const handleLogInteraction = async () => {
    if (newInteraction.person_ids.length === 0) return;
    await addInteraction({
      date: newInteraction.date,
      type: newInteraction.type,
      note: newInteraction.note.trim() || undefined,
      person_ids: newInteraction.person_ids,
    });
    setNewInteraction({ date: new Date().toISOString().split("T")[0], type: "coffee", note: "", person_ids: [] });
    setShowLogInteraction(false);
  };

  const togglePersonInInteraction = (id) => {
    setNewInteraction(prev => ({
      ...prev,
      person_ids: prev.person_ids.includes(id)
        ? prev.person_ids.filter(p => p !== id)
        : [...prev.person_ids, id],
    }));
  };

  const startEditing = (p) => {
    setEditData({
      name: p.name,
      email: p.email || "",
      phone: p.phone || "",
      social_links: p.social_links ? Object.values(p.social_links).join(", ") : "",
      how_we_met: p.how_we_met || "",
      notes: p.notes || "",
      desired_frequency: p.desired_frequency,
      tags: p.tags.map(t => t.label).join(", "),
    });
    setEditing(true);
    setConfirmDelete(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setConfirmDelete(false);
  };

  const saveEdits = async (id) => {
    if (!editData.name.trim()) return;
    const socialObj = {};
    editData.social_links.split(",").map(s => s.trim()).filter(Boolean).forEach(link => {
      if (link.includes("twitter.com") || link.includes("x.com")) socialObj.twitter = link;
      else if (link.includes("linkedin.com")) socialObj.linkedin = link;
      else if (link.includes("instagram.com")) socialObj.instagram = link;
      else if (link.includes("github.com")) socialObj.github = link;
      else socialObj.other = link;
    });
    const tagList = editData.tags.split(",").map(t => t.trim()).filter(Boolean);
    await updatePerson(id, {
      name: editData.name.trim(),
      email: editData.email.trim() || undefined,
      phone: editData.phone.trim() || undefined,
      social_links: Object.keys(socialObj).length > 0 ? socialObj : undefined,
      how_we_met: editData.how_we_met.trim() || undefined,
      notes: editData.notes.trim() || undefined,
      desired_frequency: editData.desired_frequency,
      tags: tagList.length > 0 ? tagList : undefined,
    });
    setEditing(false);
  };

  const handleDeletePerson = async (id) => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deletePerson(id);
    setEditing(false);
    setConfirmDelete(false);
    setSelectedPerson(null);
  };

  // Person detail view
  if (selectedPerson) {
    const p = people.find(x => x.id === selectedPerson.id) || selectedPerson;

    if (editing) {
      return (
        <div className="cx-root" style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
          <button onClick={cancelEditing} className="cx-back">
            ← cancel
          </button>
          <h2 className="cx-title-lg" style={{ marginBottom: 20 }}>Edit person</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="cx-edit-label">Name</div>
              <input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} className="cx-input" />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="cx-edit-label">Email</div>
                <input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} className="cx-input" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="cx-edit-label">Phone</div>
                <input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} className="cx-input" />
              </div>
            </div>
            <div>
              <div className="cx-edit-label">Social links</div>
              <input placeholder="Comma-separated URLs" value={editData.social_links} onChange={e => setEditData(d => ({ ...d, social_links: e.target.value }))} className="cx-input" />
            </div>
            <div>
              <div className="cx-edit-label">How did you meet?</div>
              <input value={editData.how_we_met} onChange={e => setEditData(d => ({ ...d, how_we_met: e.target.value }))} className="cx-input" />
            </div>
            <div>
              <div className="cx-edit-label">Reconnect frequency</div>
              <select value={editData.desired_frequency} onChange={e => setEditData(d => ({ ...d, desired_frequency: e.target.value }))} className="cx-input">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="none">No reminder</option>
              </select>
            </div>
            <div>
              <div className="cx-edit-label">Tags</div>
              <input placeholder="Comma-separated" value={editData.tags} onChange={e => setEditData(d => ({ ...d, tags: e.target.value }))} className="cx-input" />
            </div>
            <div>
              <div className="cx-edit-label">Notes</div>
              <textarea value={editData.notes} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={4} className="cx-input" style={{ resize: "vertical" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => handleDeletePerson(p.id)} className={"cx-btn-danger" + (confirmDelete ? " cx-btn-danger-confirm" : "")}>
              {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={cancelEditing} className="cx-btn-secondary-lg">Cancel</button>
              <button onClick={() => saveEdits(p.id)} className="cx-btn-primary">Save</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="cx-root" style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => { setSelectedPerson(null); setEditing(false); }} className="cx-back">
          ← back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 className="cx-title-lg">{p.name}</h2>
          <button onClick={() => startEditing(p)} className="cx-btn-icon" style={{ fontSize: 12, padding: "2px 6px" }}>&#9998;</button>
        </div>
        {p.how_we_met && <div style={{ color: textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{p.how_we_met}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {p.tags.map(t => (
            <span key={t.id} className="cx-tag">
              {t.label}
            </span>
          ))}
        </div>
        {(p.email || p.phone || (p.social_links && Object.keys(p.social_links).length > 0)) && (
          <div className="cx-card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {p.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>email</span>
                <a href={"mailto:" + p.email} className="cx-link">{p.email}</a>
              </div>
            )}
            {p.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>phone</span>
                <a href={"tel:" + p.phone} className="cx-link">{p.phone}</a>
              </div>
            )}
            {p.social_links && Object.entries(p.social_links).map(([platform, url]) => (
              <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>{platform}</span>
                <a href={String(url).startsWith("http") ? url : "https://" + url} target="_blank" rel="noopener noreferrer" className="cx-link" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(url).replace(/^https?:\/\/(www\.)?/, "")}</a>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: textDim }}>
          <span>Last contact: {timeSince(p.last_contacted)}</span>
          <span>Frequency: {frequencyLabel[p.desired_frequency] || p.desired_frequency}</span>
        </div>
        {p.notes && (
          <div className="cx-card" style={{ marginBottom: 20 }}>
            <div className="cx-section-label" style={{ marginBottom: 6 }}>Notes</div>
            <div style={{ color: textSecondary, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.notes}</div>
          </div>
        )}
        <div className="cx-section-label">Interactions</div>
        {personInteractions.length === 0 ? (
          <div style={{ color: textDim, fontSize: 13 }}>No interactions logged yet.</div>
        ) : (
          personInteractions.map((i, idx) => (
            <div key={i.id} className="cx-card cx-card-enter" style={{ animationDelay: idx * 40 + "ms" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: accent, fontSize: 12, fontWeight: 500 }}>{i.type}</span>
                <span style={{ color: textDim, fontSize: 11 }}>{i.date}</span>
              </div>
              {i.note && <div style={{ color: textSecondary, fontSize: 13, lineHeight: 1.5 }}>{i.note}</div>}
              {i.people.length > 1 && (
                <div style={{ fontSize: 11, color: textDim, marginTop: 4 }}>
                  with {i.people.filter(x => x.id !== p.id).map(x => x.name).join(", ")}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="cx-root">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 100px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 className="cx-title">contxt</h1>
          <div className="cx-subtitle">Hi, {user.handle}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          <button onClick={() => setView("reconnect")} className={"cx-tab" + (view === "reconnect" ? " cx-tab-active" : "")}>Reconnect</button>
          <button onClick={() => setView("people")} className={"cx-tab" + (view === "people" ? " cx-tab-active" : "")}>People ({people.length})</button>
          <button onClick={() => setView("interactions")} className={"cx-tab" + (view === "interactions" ? " cx-tab-active" : "")}>Activity</button>
        </div>

        {/* Reconnect Queue */}
        {view === "reconnect" && (
          <div>
            {reconnectQueue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
                <div style={{ color: textSecondary, fontSize: 15, marginBottom: 6 }}>You're all caught up!</div>
                <div style={{ color: textDim, fontSize: 13 }}>No one is waiting for a hello right now.</div>
              </div>
            ) : (
              reconnectQueue.map((item, i) => (
                <div key={item.id} className="cx-card cx-card-lg cx-card-enter" style={{ animationDelay: i * 40 + "ms" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: textPrimary, fontSize: 15, fontWeight: 600, marginBottom: 2, cursor: "pointer" }} onClick={() => setSelectedPerson(item)}>
                        {item.name}
                      </div>
                      <div style={{ color: accent, fontSize: 12, marginBottom: 4 }}>
                        {warmMessage(item.overdue_days)} • {timeSince(item.last_contacted)}
                      </div>
                      {item.how_we_met && <div style={{ color: textDim, fontSize: 12, lineHeight: 1.4 }}>{item.how_we_met}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => { setNewInteraction(prev => ({ ...prev, person_ids: [item.id] })); setShowLogInteraction(true); }} className="cx-btn-primary-sm">
                      log it
                    </button>
                    <button onClick={() => snooze(item.id, 7)} className="cx-btn-secondary">
                      snooze 1w
                    </button>
                    <button onClick={() => skipReconnect(item.id)} className="cx-btn-ghost">
                      skip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* People List */}
        {view === "people" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search people, tags, notes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="cx-input"
                style={{ flex: 1 }}
              />
              <button onClick={() => setShowAddPerson(true)} className="cx-btn-primary" style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                + Add
              </button>
            </div>
            {filteredPeople.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: textDim, fontSize: 13 }}>
                {people.length === 0 ? "Add your first person to get started." : "No matches found."}
              </div>
            ) : (
              filteredPeople.map((p, i) => (
                <div key={p.id} onClick={() => setSelectedPerson(p)} className="cx-card cx-card-clickable cx-card-enter" style={{ animationDelay: i * 40 + "ms" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: textDim, fontSize: 11 }}>{timeSince(p.last_contacted)}</div>
                  </div>
                  {(p.email || p.phone) && (
                    <div style={{ color: textDim, fontSize: 11, marginTop: 3, display: "flex", gap: 10 }}>
                      {p.email && <span>{p.email}</span>}
                      {p.phone && <span>{p.phone}</span>}
                    </div>
                  )}
                  {p.how_we_met && <div style={{ color: textDim, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{p.how_we_met.length > 60 ? p.how_we_met.slice(0, 60) + "..." : p.how_we_met}</div>}
                  {p.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {p.tags.map(t => (
                        <span key={t.id} className="cx-tag-sm">
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Interactions / Activity */}
        {view === "interactions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ color: textDim, fontSize: 12 }}>{interactions.length} interactions</div>
              <button onClick={() => setShowLogInteraction(true)} className="cx-btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}>
                + Log
              </button>
            </div>
            {interactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: textDim, fontSize: 13 }}>
                No interactions yet. Log your first one!
              </div>
            ) : (
              interactions.map((i, idx) => (
                <div key={i.id} className="cx-card cx-card-enter" style={{ animationDelay: idx * 40 + "ms" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: accent, fontSize: 12, fontWeight: 500 }}>{i.type}</span>
                      <span style={{ color: textDim, fontSize: 11 }}>
                        {i.people.map(p => p.name).join(", ")}
                      </span>
                    </div>
                    <span style={{ color: textDim, fontSize: 11 }}>{i.date}</span>
                  </div>
                  {i.note && <div style={{ color: textSecondary, fontSize: 13, lineHeight: 1.5 }}>{i.note}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      {showAddPerson && (
        <div className="cx-backdrop">
          <div className="cx-modal">
            <h3 className="cx-modal-title">Add a person</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Name" value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))} className="cx-input" />
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Email" value={newPerson.email} onChange={e => setNewPerson(p => ({ ...p, email: e.target.value }))} className="cx-input" style={{ flex: 1 }} />
                <input placeholder="Phone" value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} className="cx-input" style={{ flex: 1 }} />
              </div>
              <input placeholder="Social links (comma-separated URLs)" value={newPerson.social_links} onChange={e => setNewPerson(p => ({ ...p, social_links: e.target.value }))} className="cx-input" />
              <input placeholder="How did you meet?" value={newPerson.how_we_met} onChange={e => setNewPerson(p => ({ ...p, how_we_met: e.target.value }))} className="cx-input" />
              <textarea placeholder="Notes" value={newPerson.notes} onChange={e => setNewPerson(p => ({ ...p, notes: e.target.value }))} rows={3} className="cx-input" style={{ resize: "vertical" }} />
              <input placeholder="Tags (comma-separated)" value={newPerson.tags} onChange={e => setNewPerson(p => ({ ...p, tags: e.target.value }))} className="cx-input" />
              <select value={newPerson.desired_frequency} onChange={e => setNewPerson(p => ({ ...p, desired_frequency: e.target.value }))} className="cx-input">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="none">No reminder</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddPerson(false)} className="cx-btn-secondary-lg">Cancel</button>
              <button onClick={handleAddPerson} className="cx-btn-primary">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Interaction Modal */}
      {showLogInteraction && (
        <div className="cx-backdrop">
          <div className="cx-modal cx-modal-scroll">
            <h3 className="cx-modal-title">Log interaction</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="date" value={newInteraction.date} onChange={e => setNewInteraction(p => ({ ...p, date: e.target.value }))} className="cx-input" />
              <select value={newInteraction.type} onChange={e => setNewInteraction(p => ({ ...p, type: e.target.value }))} className="cx-input">
                <option value="coffee">Coffee</option>
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
              <textarea placeholder="What did you talk about?" value={newInteraction.note} onChange={e => setNewInteraction(p => ({ ...p, note: e.target.value }))} rows={3} className="cx-input" style={{ resize: "vertical" }} />
              <div>
                <div style={{ fontSize: 12, color: textDim, marginBottom: 8 }}>Who was involved?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {people.map(p => (
                    <label key={p.id} className={"cx-checkbox-row" + (newInteraction.person_ids.includes(p.id) ? " cx-checkbox-active" : "")}>
                      <input type="checkbox" checked={newInteraction.person_ids.includes(p.id)} onChange={() => togglePersonInInteraction(p.id)} />
                      <span style={{ color: textPrimary, fontSize: 13 }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLogInteraction(false)} className="cx-btn-secondary-lg">Cancel</button>
              <button onClick={handleLogInteraction} disabled={newInteraction.person_ids.length === 0} className="cx-btn-primary">Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
