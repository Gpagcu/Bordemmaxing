import { useEffect, useState } from 'react'
import { listQuests, createQuest, deleteQuest, generateQuestIdea, toggleQuestActive } from '../api'

const EMPTY_FORM = { text: '', category: '' }

export default function AddQuestScreen() {
  const [status, setStatus] = useState('loading')   // loading | ready | error
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedQuest, setGeneratedQuest] = useState(null)

  async function load() {
    setStatus('loading')
    setError(null)
    try {
      const all = await listQuests()
      setRows(all.filter((row) => !row.is_preset))
      setStatus('ready')
    } catch (caught) {
      setError(caught)
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.text.trim()) return

    setSaving(true)
    try {
      const created = await createQuest({
        text: form.text.trim(),
        category: form.category.trim() || null,
      })
      setRows([created, ...rows])
      setForm(EMPTY_FORM)
    } catch (caught) {
      setError(caught)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const idea = await generateQuestIdea()
      const created = await createQuest({
        text: idea.text,
        category: idea.category || null,
      })
      setRows([created, ...rows])
      setGeneratedQuest(created)
    } catch (caught) {
      setError(caught)
    } finally {
      setGenerating(false)
    }
  }

  async function handleToggleActive(id) {
    const previous = rows
    // Optimistic flip, so the toggle feels instant.
    setRows(rows.map((row) => (row.id === id ? { ...row, is_active: !row.is_active } : row)))
    try {
      await toggleQuestActive(id)
    } catch (caught) {
      setRows(previous)   // put it back on failure
      setError(caught)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this quest? This removes it permanently — it cannot be undone.')) {
      return
    }
    const previous = rows
    setRows(rows.filter((row) => row.id !== id))   // optimistic
    if (generatedQuest?.id === id) setGeneratedQuest(null)
    try {
      await deleteQuest(id)
    } catch (caught) {
      setRows(previous)                            // put it back on failure
      setError(caught)
    }
  }

  return (
    <section>
      {error && (
        <p className="error" role="alert">
          {error.message} <button onClick={load}>Try again</button>
        </p>
      )}

      <form onSubmit={handleSubmit} className="card">
        <h2>Add a quest</h2>
        <p className="muted">
          Your own quests get pulled into the spin alongside the presets.
        </p>

        <label htmlFor="text">Quest</label>
        <input
          id="text"
          value={form.text}
          onChange={(event) => setForm({ ...form, text: event.target.value })}
          maxLength={200}
          placeholder="e.g. Learn to juggle three items"
          required
        />

        <label htmlFor="category">Category (optional)</label>
        <input
          id="category"
          value={form.category}
          onChange={(event) => setForm({ ...form, category: event.target.value })}
          maxLength={40}
          placeholder="creative, physical, social, weird..."
        />

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add quest'}
          </button>
          <button type="button" onClick={handleGenerate} disabled={generating} className="secondary">
            {generating ? 'Generating...' : '✨ Generate & add with AI'}
          </button>
        </div>
      </form>

      {generatedQuest && (
        <div className="modal-overlay" onClick={() => setGeneratedQuest(null)}>
          <div
            className="modal quest-result rarity-unique"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setGeneratedQuest(null)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="rarity-badge rarity-unique">unique · AI-generated</span>
            <p className="quest-text">{generatedQuest.text}</p>
            {generatedQuest.category && <p className="muted">Category: {generatedQuest.category}</p>}
            <p className="muted">✓ Added to your quests</p>
          </div>
        </div>
      )}

      {status === 'loading' && <p className="muted">Loading your quests...</p>}

      {status === 'ready' && rows.length === 0 && (
        <p className="muted">You haven't added any quests yet.</p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ul className="list">
          {rows.map((row) => (
            <li key={row.id} className={row.is_active ? 'card' : 'card collapsed'}>
              <div className="row-head">
                <p className="quest-text">{row.text}</p>
                <span className="rarity-badge rarity-unique">
                  {row.is_active ? 'unique' : 'unique · hidden'}
                </span>
              </div>
              <div className="quest-details">
                {row.category && <p className="muted">Category: {row.category}</p>}
              </div>
              <footer>
                <button onClick={() => handleToggleActive(row.id)} className="secondary">
                  {row.is_active ? 'Hide from spins' : 'Unhide'}
                </button>
                <button onClick={() => handleDelete(row.id)}>Delete</button>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

