function App() {
  const { people, interactions, tags, reconnectQueue, addPerson, updatePerson, deletePerson, addInteraction, updateInteraction, deleteInteraction, addTag, snooze, skipReconnect, refreshAll, user } = useContext(ScopeContext);
  const [view, setView] = useState("reconnect");
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showLogInteraction, setShowLogInteraction] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: "", email: "", phone: "", social_links: "", how_we_met: "", notes: "", desired_frequency: "monthly", tags: "" });
  const [newInteraction, setNewInteraction] = useState({ date: new Date().toISOString().split("T")[0], type: "coffee", note: "", person_ids: [] });

  const accent = "#00CEC9";
  const accentDim = "#00CEC920";
  const accentMid = "#00CEC960";
  const bg = "#0a0a1a";
  const card = "#111125";
  const border = "#1e1e3a";
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
    if (days > 90) return "It\'s been a while";
    if (days > 30) return "Time to reconnect";
    if (days > 7) return "A quick hello?";
    return "Check in soon";
  };

  const btn = (active) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: active ? `1px solid ${accent}` : "1px solid transparent",
    background: active ? accentDim : "transparent",
    color: active ? accent : textSecondary,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    fontFamily: "system-ui",
  });

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: card,
    color: textPrimary,
    fontSize: 14,
    fontFamily: "system-ui",
    outline: "none",
    boxSizing: "border-box",
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

  // Person detail view
  if (selectedPerson) {
    const p = people.find(x => x.id === selectedPerson.id) || selectedPerson;
    return (
      <div style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "system-ui", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setSelectedPerson(null)} style={{ background: "none", border: "none", color: textSecondary, cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0, fontFamily: "system-ui" }}>
          \u2190 back
        </button>
        <h2 style={{ color: textPrimary, margin: "0 0 4px", fontSize: 24, fontWeight: 700 }}>{p.name}</h2>
        {p.how_we_met && <div style={{ color: textSecondary, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{p.how_we_met}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {p.tags.map(t => (
            <span key={t.id} style={{ padding: "3px 10px", borderRadius: 12, background: accentDim, color: accent, fontSize: 11, fontWeight: 500 }}>
              {t.label}
            </span>
          ))}
        </div>
        {(p.email || p.phone || (p.social_links && Object.keys(p.social_links).length > 0)) && (
          <div style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 12, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 6 }}>
            {p.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>email</span>
                <a href={"mailto:" + p.email} style={{ color: accent, fontSize: 13, textDecoration: "none" }}>{p.email}</a>
              </div>
            )}
            {p.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>phone</span>
                <a href={"tel:" + p.phone} style={{ color: accent, fontSize: 13, textDecoration: "none" }}>{p.phone}</a>
              </div>
            )}
            {p.social_links && Object.entries(p.social_links).map(([platform, url]) => (
              <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: textDim, fontSize: 11, width: 44, flexShrink: 0 }}>{platform}</span>
                <a href={String(url).startsWith("http") ? url : "https://" + url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontSize: 13, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(url).replace(/^https?:\/\/(www\.)?/, "")}</a>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: textDim }}>
          <span>Last contact: {timeSince(p.last_contacted)}</span>
          <span>Frequency: {frequencyLabel[p.desired_frequency] || p.desired_frequency}</span>
        </div>
        {p.notes && (
          <div style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 20, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 11, color: textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Notes</div>
            <div style={{ color: textSecondary, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.notes}</div>
          </div>
        )}
        <div style={{ fontSize: 11, color: textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Interactions</div>
        {personInteractions.length === 0 ? (
          <div style={{ color: textDim, fontSize: 13 }}>No interactions logged yet.</div>
        ) : (
          personInteractions.map(i => (
            <div key={i.id} style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 8, border: `1px solid ${border}` }}>
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
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 100px" }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: textPrimary, margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>contxt</h1>
          <div style={{ color: textDim, fontSize: 12 }}>Hi, {user.handle}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          <button onClick={() => setView("reconnect")} style={btn(view === "reconnect")}>Reconnect</button>
          <button onClick={() => setView("people")} style={btn(view === "people")}>People ({people.length})</button>
          <button onClick={() => setView("interactions")} style={btn(view === "interactions")}>Activity</button>
        </div>

        {/* Reconnect Queue */}
        {view === "reconnect" && (
          <div>
            {reconnectQueue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>\u2728</div>
                <div style={{ color: textSecondary, fontSize: 15, marginBottom: 6 }}>You\'re all caught up!</div>
                <div style={{ color: textDim, fontSize: 13 }}>No one is waiting for a hello right now.</div>
              </div>
            ) : (
              reconnectQueue.map(item => (
                <div key={item.id} style={{ background: card, borderRadius: 12, padding: 16, marginBottom: 10, border: `1px solid ${border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: textPrimary, fontSize: 15, fontWeight: 600, marginBottom: 2, cursor: "pointer" }} onClick={() => setSelectedPerson(item)}>
                        {item.name}
                      </div>
                      <div style={{ color: accent, fontSize: 12, marginBottom: 4 }}>
                        {warmMessage(item.overdue_days)} \u2022 {timeSince(item.last_contacted)}
                      </div>
                      {item.how_we_met && <div style={{ color: textDim, fontSize: 12, lineHeight: 1.4 }}>{item.how_we_met}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => { setNewInteraction(prev => ({ ...prev, person_ids: [item.id] })); setShowLogInteraction(true); }} style={{ padding: "5px 12px", borderRadius: 6, background: accent, border: "none", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      log it
                    </button>
                    <button onClick={() => snooze(item.id, 7)} style={{ padding: "5px 12px", borderRadius: 6, background: "none", border: `1px solid ${border}`, color: textSecondary, cursor: "pointer", fontSize: 12 }}>
                      snooze 1w
                    </button>
                    <button onClick={() => skipReconnect(item.id)} style={{ padding: "5px 12px", borderRadius: 6, background: "none", border: `1px solid ${border}`, color: textDim, cursor: "pointer", fontSize: 12 }}>
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
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={() => setShowAddPerson(true)} style={{ padding: "10px 16px", borderRadius: 8, background: accent, border: "none", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                + Add
              </button>
            </div>
            {filteredPeople.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: textDim, fontSize: 13 }}>
                {people.length === 0 ? "Add your first person to get started." : "No matches found."}
              </div>
            ) : (
              filteredPeople.map(p => (
                <div key={p.id} onClick={() => setSelectedPerson(p)} style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 8, border: `1px solid ${border}`, cursor: "pointer" }}>
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
                        <span key={t.id} style={{ padding: "2px 8px", borderRadius: 10, background: accentDim, color: accent, fontSize: 10 }}>
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
              <button onClick={() => setShowLogInteraction(true)} style={{ padding: "8px 14px", borderRadius: 8, background: accent, border: "none", color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                + Log
              </button>
            </div>
            {interactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: textDim, fontSize: 13 }}>
                No interactions yet. Log your first one!
              </div>
            ) : (
              interactions.map(i => (
                <div key={i.id} style={{ background: card, borderRadius: 10, padding: 14, marginBottom: 8, border: `1px solid ${border}` }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: card, borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, border: `1px solid ${border}` }}>
            <h3 style={{ color: textPrimary, margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Add a person</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="Name" value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Email" value={newPerson.email} onChange={e => setNewPerson(p => ({ ...p, email: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                <input placeholder="Phone" value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
              </div>
              <input placeholder="Social links (comma-separated URLs)" value={newPerson.social_links} onChange={e => setNewPerson(p => ({ ...p, social_links: e.target.value }))} style={inputStyle} />
              <input placeholder="How did you meet?" value={newPerson.how_we_met} onChange={e => setNewPerson(p => ({ ...p, how_we_met: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Notes" value={newPerson.notes} onChange={e => setNewPerson(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              <input placeholder="Tags (comma-separated)" value={newPerson.tags} onChange={e => setNewPerson(p => ({ ...p, tags: e.target.value }))} style={inputStyle} />
              <select value={newPerson.desired_frequency} onChange={e => setNewPerson(p => ({ ...p, desired_frequency: e.target.value }))} style={inputStyle}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="none">No reminder</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAddPerson(false)} style={{ padding: "8px 16px", borderRadius: 8, background: "none", border: `1px solid ${border}`, color: textSecondary, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleAddPerson} style={{ padding: "8px 16px", borderRadius: 8, background: accent, border: "none", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Interaction Modal */}
      {showLogInteraction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: card, borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, border: `1px solid ${border}`, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ color: textPrimary, margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Log interaction</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="date" value={newInteraction.date} onChange={e => setNewInteraction(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
              <select value={newInteraction.type} onChange={e => setNewInteraction(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                <option value="coffee">Coffee</option>
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
              <textarea placeholder="What did you talk about?" value={newInteraction.note} onChange={e => setNewInteraction(p => ({ ...p, note: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              <div>
                <div style={{ fontSize: 12, color: textDim, marginBottom: 8 }}>Who was involved?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                  {people.map(p => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: newInteraction.person_ids.includes(p.id) ? accentDim : "transparent", cursor: "pointer" }}>
                      <input type="checkbox" checked={newInteraction.person_ids.includes(p.id)} onChange={() => togglePersonInInteraction(p.id)} style={{ accentColor: accent }} />
                      <span style={{ color: textPrimary, fontSize: 13 }}>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLogInteraction(false)} style={{ padding: "8px 16px", borderRadius: 8, background: "none", border: `1px solid ${border}`, color: textSecondary, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={handleLogInteraction} disabled={newInteraction.person_ids.length === 0} style={{ padding: "8px 16px", borderRadius: 8, background: newInteraction.person_ids.length > 0 ? accent : textDim, border: "none", color: "#000", cursor: newInteraction.person_ids.length > 0 ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600 }}>Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}