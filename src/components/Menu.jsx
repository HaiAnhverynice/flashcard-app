import { useState, useEffect, useRef } from 'react'
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

// ─── Change this to your preferred admin password ───────────────────────────
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD
// ────────────────────────────────────────────────────────────────────────────

export default function Menu({ onStartQuiz }) {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [firebaseError, setFirebaseError] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [search, setSearch] = useState('')

  // Admin gate: null | { type: 'delete', deckId } | { type: 'rename', deck }
  const [pendingAction, setPendingAction] = useState(null)
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState('')
  const adminInputRef = useRef(null)

  // Rename flow
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameName, setRenameName] = useState('')

  const filteredDecks = decks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const loadDecks = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'decks'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setDecks(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
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

  useEffect(() => {
    if (pendingAction && adminInputRef.current) {
      setTimeout(() => adminInputRef.current?.focus(), 50)
    }
  }, [pendingAction])

  // ── Admin gate ──────────────────────────────────────────────────────────────

  const requestAdmin = (e, action) => {
    e.stopPropagation()
    setAdminPass('')
    setAdminError('')
    setPendingAction(action)
  }

  const confirmAdmin = async () => {
    if (adminPass !== ADMIN_PASS) {
      setAdminError('Incorrect password.')
      setAdminPass('')
      adminInputRef.current?.focus()
      return
    }
    const action = pendingAction
    setPendingAction(null)
    setAdminPass('')
    setAdminError('')
    if (action.type === 'delete') {
      await execDelete(action.deckId)
    } else if (action.type === 'rename') {
      setRenameTarget(action.deck)
      setRenameName(action.deck.name)
    }
  }

  const cancelAdmin = () => {
    setPendingAction(null)
    setAdminPass('')
    setAdminError('')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  const execDelete = async (deckId) => {
    try {
      if (!firebaseError) {
        await deleteDoc(doc(db, 'decks', deckId))
      } else {
        const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
        localStorage.setItem('flashcard_decks', JSON.stringify(local.filter((d) => d.id !== deckId)))
      }
      setDecks(prev => prev.filter(d => d.id !== deckId))
      if (selectedDeck?.id === deckId) setSelectedDeck(null)
    } catch (e) {
      alert('Failed to delete deck.')
    }
  }

  // ── Rename ──────────────────────────────────────────────────────────────────

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
      if (selectedDeck?.id === renameTarget.id) setSelectedDeck(sd => ({ ...sd, name: newName }))
    } catch (e) {
      alert('Failed to rename deck.')
    }
    setRenameTarget(null)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleDeckUploaded = (deck) => {
    setDecks(prev => [deck, ...prev])
    setShowUpload(false)
  }

  const downloadDemo = () => {
    const base = import.meta.env.BASE_URL || './'
    const a = document.createElement('a')
    a.href = base + 'demo_questions.csv'
    a.download = 'demo_questions.csv'
    a.click()
  }

  return (
    <>
      <div className="app-header">
        <span className="logo-text">
          Home/<span style={{ color: 'var(--accent)', WebkitTextStroke: '1.5px var(--fg)' }}>haianh</span>
          <span className="logo-dot" />
        </span>
      </div>

      {firebaseError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠️ Firebase not configured — decks are stored locally in this browser only.
          See <strong>README.md</strong> to set up Firebase.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <h1 className="section-title">Your Decks</h1>
          <p className="section-subtitle">Choose a deck to start studying</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn-ghost" onClick={downloadDemo} title="Download demo CSV">
            ⬇ Demo
          </button>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            + Upload Deck
          </button>
        </div>
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search decks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')} title="Clear">✕</button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="empty-state">
          {decks.length === 0 ? (
            <>
              <div className="empty-icon">📚</div>
              <div className="empty-title">No decks yet</div>
              <div className="empty-sub">
                Upload a .csv or .xlsx file to create your first deck.
                <br />
                Download the demo file to see the required format.
              </div>
              <br />
              <button className="btn-primary" onClick={() => setShowUpload(true)}>
                + Upload Your First Deck
              </button>
            </>
          ) : (
            <>
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No decks match "{search}"</div>
              <div className="empty-sub">Try a different name.</div>
              <br />
              <button className="btn-ghost" onClick={() => setSearch('')}>Clear search</button>
            </>
          )}
        </div>
      ) : (
        <div className="deck-grid">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="deck-card" onClick={() => setSelectedDeck(deck)}>
              <div className="deck-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="deck-card-action-btn"
                  onClick={e => requestAdmin(e, { type: 'rename', deck })}
                  title="Rename deck"
                >✎</button>
                <button
                  className="deck-card-action-btn deck-card-delete"
                  onClick={e => requestAdmin(e, { type: 'delete', deckId: deck.id })}
                  title="Delete deck"
                >✕</button>
              </div>
              <div className="deck-card-name">{deck.name}</div>
              <div className="deck-card-meta">
                {deck.questions?.length ?? 0} questions
                {deck.createdAt && <> · {new Date(deck.createdAt).toLocaleDateString()}</>}
              </div>
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

      {/* ── Mode picker modal ── */}
      {selectedDeck && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setSelectedDeck(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>
                {selectedDeck.name}
              </h2>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setSelectedDeck(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: 28 }}>
              {selectedDeck.questions?.length} questions · Choose your study mode
            </p>

            <div className="mode-list">
              <button className="mode-btn mode-btn-flashcard" onClick={() => { onStartQuiz(selectedDeck, 'flashcard'); setSelectedDeck(null) }}>
                <div className="mode-icon">🃏</div>
                <div>
                  <div className="mode-name">Flashcard</div>
                  <div className="mode-desc">Flip through questions and answers at your own pace.</div>
                </div>
              </button>

              <button className="mode-btn mode-btn-quiz" onClick={() => { onStartQuiz(selectedDeck, 'quiz'); setSelectedDeck(null) }}>
                <div className="mode-icon">⚡</div>
                <div>
                  <div className="mode-name">Quiz</div>
                  <div className="mode-desc">Answer all questions once. Get a score at the end.</div>
                </div>
              </button>

              <button className="mode-btn mode-btn-learn" onClick={() => { onStartQuiz(selectedDeck, 'learn'); setSelectedDeck(null) }}>
                <div className="mode-icon">📖</div>
                <div>
                  <div className="mode-name">Learn</div>
                  <div className="mode-desc">Cycles wrong answers back in until every question is correct.</div>
                </div>
              </button>

              <button className="mode-btn mode-btn-hardcore" onClick={() => { onStartQuiz(selectedDeck, 'hardcore'); setSelectedDeck(null) }}>
                <div className="mode-icon">💀</div>
                <div>
                  <div className="mode-name">Hardcore</div>
                  <div className="mode-desc">Wrong answers come back n+1 times. Each mistake costs more.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin password modal ── */}
      {pendingAction && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && cancelAdmin()}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                🔒 Admin Required
              </h2>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={cancelAdmin}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: 16 }}>
              Enter the admin password to{' '}
              <strong>{pendingAction.type === 'delete' ? 'delete this deck' : 'rename this deck'}</strong>.
            </p>
            <input
              ref={adminInputRef}
              type="password"
              placeholder="Password"
              value={adminPass}
              onChange={e => { setAdminPass(e.target.value); setAdminError('') }}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmAdmin()
                if (e.key === 'Escape') cancelAdmin()
              }}
              style={{ marginBottom: 8 }}
            />
            {adminError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>{adminError}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={cancelAdmin}>Cancel</button>
              <button
                className={pendingAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}
                style={{ flex: 1 }}
                onClick={confirmAdmin}
              >
                {pendingAction.type === 'delete' ? 'Delete' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename modal ── */}
      {renameTarget && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setRenameTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                ✎ Rename Deck
              </h2>
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
          onClose={() => setShowUpload(false)}
          onUploaded={handleDeckUploaded}
          useLocalFallback={firebaseError}
        />
      )}
    </>
  )
}
