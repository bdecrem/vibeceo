function App() {
  const { tasks, addTask, toggleTask, deleteTask, updateTask, user } = useContext(ScopeContext);
  const [newTitle, setNewTitle] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)

  const extractHashtags = (title) => {
    const regex = /#[\w]+/g
    return title.match(regex) || []
  }

  const allHashtags = useMemo(() => {
    const tagSet = new Set()
    tasks.forEach(task => {
      extractHashtags(task.title).forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (!selectedTag) return tasks
    return tasks.filter(task => extractHashtags(task.title).includes(selectedTag))
  }, [tasks, selectedTag])

  const activeTasks = filteredTasks.filter(t => !t.completed)
  const doneTasks = filteredTasks.filter(t => t.completed)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    await addTask(newTitle.trim())
    setNewTitle('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  const renderTitle = (title) => {
    const hashtags = extractHashtags(title)
    const clean = title.replace(/#[\w]+/g, '').trim()
    return (
      <span>
        {clean}
        {hashtags.length > 0 && (
          <span style={{ marginLeft: 8 }}>
            {hashtags.map(tag => (
              <span key={tag} style={{ background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 8, fontSize: 11, marginRight: 4, fontWeight: 500, display: 'inline-block' }}>
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'system-ui', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>hey {user.handle}</h1>
        <span style={{ fontSize: 12, color: '#666' }}>
          {activeTasks.length} active{doneTasks.length > 0 ? `, ${doneTasks.length} done` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs doing? (use #tags)"
          style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #333', background: '#1a1a2e', color: '#eee', fontSize: 16, boxSizing: 'border-box', minWidth: 0 }}
        />
        <button onClick={handleAdd} style={{ padding: '10px 16px', borderRadius: 6, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
          Add
        </button>
      </div>

      {allHashtags.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setSelectedTag(null)}
            style={{ padding: '5px 10px', borderRadius: 12, background: selectedTag === null ? '#6366f1' : '#1a1a2e', color: selectedTag === null ? '#fff' : '#aaa', border: 'none', cursor: 'pointer', fontSize: 12, WebkitTapHighlightColor: 'transparent' }}
          >
            All
          </button>
          {allHashtags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{ padding: '5px 10px', borderRadius: 12, background: selectedTag === tag ? '#6366f1' : '#1a1a2e', color: selectedTag === tag ? '#fff' : '#aaa', border: 'none', cursor: 'pointer', fontSize: 12, WebkitTapHighlightColor: 'transparent' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div>
        {activeTasks.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #222' }}>
            <input type="checkbox" checked={false} onChange={() => toggleTask(task.id)} style={{ cursor: 'pointer', flexShrink: 0, width: 18, height: 18 }} />
            <span style={{ flex: 1, color: '#eee', fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word', minWidth: 0 }}>{renderTitle(task.title)}</span>
            <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 22, padding: 4, flexShrink: 0, lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}>x</button>
          </div>
        ))}

        {doneTasks.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Done</div>
            {doneTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #222', opacity: 0.5 }}>
                <input type="checkbox" checked={true} onChange={() => toggleTask(task.id)} style={{ cursor: 'pointer', flexShrink: 0, width: 18, height: 18 }} />
                <span style={{ flex: 1, color: '#888', fontSize: 15, textDecoration: 'line-through', lineHeight: 1.4, wordBreak: 'break-word', minWidth: 0 }}>{renderTitle(task.title)}</span>
                <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 22, padding: 4, flexShrink: 0, lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}>x</button>
              </div>
            ))}
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div style={{ textAlign: 'center', color: '#555', padding: 32, fontSize: 14 }}>
            {selectedTag ? `No tasks with ${selectedTag}` : 'No tasks yet. Add one above.'}
          </div>
        )}
      </div>
    </div>
  )
}
