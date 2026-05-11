import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore'
import UploadModal from './UploadModal.jsx'

export default function Menu({ onStartQuiz }) {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [firebaseError, setFirebaseError] = useState(false)
  const [selectedDeck, setSelectedDeck] = useState(null) // deck waiting for mode pick

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

  useEffect(() => {
    loadDecks()
  }, [])

  const handleDelete = async (e, deckId) => {
    e.stopPropagation()
    if (!confirm('Delete this deck?')) return
    try {
      if (!firebaseError) {
        await deleteDoc(doc(db, 'decks', deckId))
      } else {
        const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
        localStorage.setItem('flashcard_decks', JSON.stringify(local.filter((d) => d.id !== deckId)))
      }
      setDecks((prev) => prev.filter((d) => d.id !== deckId))
    } catch (e) {
      alert('Failed to delete deck.')
    }
  }

  const handleDeckUploaded = (deck) => {
    setDecks((prev) => [deck, ...prev])
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
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

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : decks.length === 0 ? (
        <div className="empty-state">
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
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((deck) => (
            <div key={deck.id} className="deck-card" onClick={() => setSelectedDeck(deck)}>
              <button
                className="deck-card-delete"
                onClick={(e) => handleDelete(e, deck.id)}
                title="Delete deck"
              >
                ✕
              </button>
              <div className="deck-card-name">{deck.name}</div>
              <div className="deck-card-meta">
                {deck.questions?.length ?? 0} questions
                {deck.createdAt && (
                  <> · {new Date(deck.createdAt).toLocaleDateString()}</>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {deck.questions?.filter((q) => q.type === 'MCQ').length > 0 && (
                  <span className="tag tag-mcq">
                    MCQ ×{deck.questions.filter((q) => q.type === 'MCQ').length}
                  </span>
                )}
                {deck.questions?.filter((q) => q.type === 'WRITTEN').length > 0 && (
                  <span className="tag tag-written">
                    Written ×{deck.questions.filter((q) => q.type === 'WRITTEN').length}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mode picker modal */}
      {selectedDeck && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSelectedDeck(null)}>
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
