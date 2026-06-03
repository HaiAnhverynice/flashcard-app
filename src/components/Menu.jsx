import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import UploadModal from './UploadModal.jsx'
import DeckModeModal from './DeckModeModal.jsx'

export default function Menu({ user, onStartQuiz, onNavigateUser, onShowAuth }) {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [firebaseError, setFirebaseError] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [search, setSearch] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  // pendingAction: { type, deckId?, deck }
  const [pendingAction, setPendingAction] = useState(null)

  const [renameTarget, setRenameTarget] = useState(null)
  const [renameName, setRenameName] = useState('')

  const visibleDecks = decks.filter(d => d.isPublic !== false || d.uid === user?.uid)
  const filteredDecks = visibleDecks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const loadDecks = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'decks'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error('Firebase error:', e)
      setFirebaseError(true)
      const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
      setDecks(local)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDecks() }, [])

  // ── Owner-only action gate ────────────────────────────────────────────────────

  const requestAction = (e, action) => {
    e.stopPropagation()
    // Owner check — only the uploader may rename/delete their deck.
    if (!(user?.uid && action.deck?.uid && action.deck.uid === user.uid)) return
    setPendingAction(action)
  }

  const confirmAction = async () => {
    const action = pendingAction
    setPendingAction(null)
    if (action.type === 'delete') {
      await execDelete(action.deckId)
    } else if (action.type === 'rename') {
      setRenameTarget(action.deck)
      setRenameName(action.deck.name)
    }
  }

  const cancelAction = () => setPendingAction(null)

  // ── Delete ────────────────────────────────────────────────────────────────────

  const execDelete = async (deckId) => {
    try {
      if (!firebaseError) {
        await deleteDoc(doc(db, 'decks', deckId))
      } else {
        const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
        localStorage.setItem('flashcard_decks', JSON.stringify(local.filter(d => d.id !== deckId)))
      }
      setDecks(prev => prev.filter(d => d.id !== deckId))
      if (selectedDeck?.id === deckId) setSelectedDeck(null)
    } catch (e) {
      alert('Failed to delete deck.')
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────────

  const execRename = async () => {
    if (!renameName.trim() || renameName.trim() === renameTarget.name) {
      setRenameTarget(null)
      return
    }
    const newName = renameName.trim()
    try {
      if (!firebaseError) {
        await updateDoc(doc(db, 'decks', renameTarget.id), { name: newName })
      } else {
        const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
        localStorage.setItem('flashcard_decks', JSON.stringify(
          local.map(d => d.id === renameTarget.id ? { ...d, name: newName } : d)
        ))
      }
      setDecks(prev => prev.map(d => d.id === renameTarget.id ? { ...d, name: newName } : d))
    } catch (e) {
      alert('Failed to rename deck.')
    }
    setRenameTarget(null)
  }

  // ── Upload ────────────────────────────────────────────────────────────────────

  const handleUploadClick = () => {
    if (!user) { onShowAuth(); return }
    setShowUpload(true)
  }

  const handleDeckUploaded = deck => {
    setDecks(prev => [deck, ...prev])
    setShowUpload(false)
  }

  const demoRows = [
    ['Question', 'Type', 'Answer', 'Choice A', 'Choice B', 'Choice C', 'Choice D'],
    ['What is the capital of France?', 'MCQ', '3', 'London', 'Berlin', 'Paris', 'Madrid'],
    ['Which planet is closest to the Sun?', 'MCQ', '4', 'Venus', 'Earth', 'Mars', 'Mercury'],
    ['What does HTML stand for?', 'MCQ', '1', 'HyperText Markup Language', 'Hyper Transfer Markup Language', 'High Text Machine Language', 'HyperText Machine Link'],
    ['What is the boiling point of water in Celsius?', 'written', '100', '', '', '', ''],
    ['What year did World War II end?', 'written', '1945', '', '', '', ''],
  ]

  const wordDefRows = [
    ['Word', 'Definition'],
    ['Ephemeral', 'Lasting for a very short time'],
    ['Ubiquitous', 'Present everywhere at once'],
    ['Pragmatic', 'Dealing with things sensibly and realistically'],
    ['Ambiguous', 'Open to more than one interpretation'],
  ]

  const downloadDemo = (name = 'demo_questions.csv') => {
    const base = import.meta.env.BASE_URL || './'
    const a = document.createElement('a')
    a.href = base + name
    a.download = name
    a.click()
  }

  return (
    <>
      {firebaseError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ Firebase not configured — decks stored locally in this browser only.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h1 className="section-title">Browse Decks</h1>
          <p className="section-subtitle">Public decks{user ? ' and your private decks' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn-ghost" onClick={() => setShowDemo(v => !v)} title="Preview demo CSV format">{showDemo ? '✕ Hide Demo' : '👁 Demo'}</button>
          <button className="btn-primary" onClick={handleUploadClick}>+ Upload Deck</button>
        </div>
      </div>

      {showDemo && (
        <div className="demo-preview" style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border, #ddd)', borderRadius: 8, background: 'var(--bg-subtle, #f7f7f8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>Format 1 — Full (MCQ + Written)</strong>
            <button className="btn-ghost" onClick={() => downloadDemo('demo_questions.csv')} title="Download demo CSV">⬇ demo_questions.csv</button>
          </div>
          <p className="section-subtitle" style={{ marginTop: 0, marginBottom: 10 }}>
            For MCQ rows, <code>Answer</code> is the 1-based index of the correct choice. Written rows leave Choice columns empty.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {demoRows[0].map((h, i) => (
                    <th key={i} style={{ border: '1px solid var(--border, #ddd)', padding: '6px 10px', textAlign: 'left', background: 'var(--bg, #fff)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demoRows.slice(1).map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ border: '1px solid var(--border, #ddd)', padding: '6px 10px', whiteSpace: 'nowrap' }}>{cell || <span style={{ color: 'var(--fg-muted, #999)' }}>—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
            <strong>Format 2 — Word / Definition (auto MCQ)</strong>
            <button className="btn-ghost" onClick={() => downloadDemo('demo_words.csv')} title="Download demo words CSV">⬇ demo_words.csv</button>
          </div>
          <p className="section-subtitle" style={{ marginTop: 0, marginBottom: 10 }}>
            Just two columns. Each word becomes a multiple-choice question — its definition is the correct answer and the other definitions are shuffled in as distractors.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {wordDefRows[0].map((h, i) => (
                    <th key={i} style={{ border: '1px solid var(--border, #ddd)', padding: '6px 10px', textAlign: 'left', background: 'var(--bg, #fff)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wordDefRows.slice(1).map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ border: '1px solid var(--border, #ddd)', padding: '6px 10px', whiteSpace: 'nowrap' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search decks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : filteredDecks.length === 0 ? (
        <div className="empty-state">
          {decks.length === 0 ? (
            <>
              <div className="empty-icon">📚</div>
              <div className="empty-title">No decks yet</div>
              <div className="empty-sub">Upload a .csv or .xlsx file to create your first deck.</div>
              <br />
              <button className="btn-primary" onClick={handleUploadClick}>+ Upload Your First Deck</button>
            </>
          ) : (
            <>
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No decks match "{search}"</div>
              <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setSearch('')}>Clear search</button>
            </>
          )}
        </div>
      ) : (
        <div className="deck-grid">
          {filteredDecks.map(deck => (
            <div key={deck.id} className="deck-card" onClick={() => setSelectedDeck(deck)}>
              {deck.uid && deck.uid === user?.uid && (
                <div className="deck-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="deck-card-action-btn"
                    onClick={e => requestAction(e, { type: 'rename', deck })}
                    title="Rename deck"
                  >✎</button>
                  <button
                    className="deck-card-action-btn deck-card-delete"
                    onClick={e => requestAction(e, { type: 'delete', deckId: deck.id, deck })}
                    title="Delete deck"
                  >✕</button>
                </div>
              )}
              {deck.uid === user?.uid && deck.isPublic === false && (
                <span className="tag tag-private" style={{ marginBottom: 4, display: 'inline-block' }}>🔒 Private</span>
              )}
              <div className="deck-card-name">{deck.name}</div>
              <div className="deck-card-meta">
                {deck.questions?.length ?? 0} questions
                {deck.createdAt && <> · {new Date(deck.createdAt).toLocaleDateString()}</>}
              </div>
              {deck.uploaderName && (
                <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                  by{' '}
                  <span
                    className="uploader-link"
                    onClick={e => { e.stopPropagation(); onNavigateUser(deck.uid, deck.uploaderName) }}
                  >
                    {deck.uploaderName}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {deck.questions?.filter(q => q.type === 'MCQ').length > 0 && (
                  <span className="tag tag-mcq">MCQ ×{deck.questions.filter(q => q.type === 'MCQ').length}</span>
                )}
                {deck.questions?.filter(q => q.type === 'WRITTEN').length > 0 && (
                  <span className="tag tag-written">Written ×{deck.questions.filter(q => q.type === 'WRITTEN').length}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mode picker */}
      {selectedDeck && (
        <DeckModeModal
          deck={selectedDeck}
          onSelect={mode => { onStartQuiz(selectedDeck, mode); setSelectedDeck(null) }}
          onClose={() => setSelectedDeck(null)}
        />
      )}

      {/* Owner confirm modal */}
      {pendingAction && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && cancelAction()}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>⚠️ Confirm</h2>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={cancelAction}>✕</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: 16 }}>
              {pendingAction.type === 'delete'
                ? `Delete "${pendingAction.deck?.name}"? This cannot be undone.`
                : `Rename "${pendingAction.deck?.name}"?`}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={cancelAction}>Cancel</button>
              <button
                className={pendingAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}
                style={{ flex: 1 }}
                onClick={confirmAction}
              >
                {pendingAction.type === 'delete' ? 'Delete' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameTarget && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setRenameTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>✎ Rename Deck</h2>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setRenameTarget(null)}>✕</button>
            </div>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') execRename()
                if (e.key === 'Escape') setRenameTarget(null)
              }}
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setRenameTarget(null)}>Cancel</button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={!renameName.trim() || renameName.trim() === renameTarget.name}
                onClick={execRename}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal
          user={user}
          onClose={() => setShowUpload(false)}
          onUploaded={handleDeckUploaded}
          useLocalFallback={firebaseError}
        />
      )}
    </>
  )
}
