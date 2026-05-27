import { useState, useEffect } from 'react'
import { db } from '../firebase.js'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import DeckModeModal from './DeckModeModal.jsx'
import UploadModal from './UploadModal.jsx'

export default function UserProfile({ userId, currentUser, onBack, onStartQuiz, onNavigateUser }) {
  const [profile, setProfile] = useState(null)
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingDeck, setPendingDeck] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const isOwn = currentUser?.uid === userId

  const loadData = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [profileSnap, decksSnap] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(collection(db, 'decks'), where('uid', '==', userId))),
      ])
      setProfile(profileSnap.exists() ? profileSnap.data() : null)
      const all = decksSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => isOwn || d.isPublic !== false)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setDecks(all)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [userId, isOwn])

  const displayName = profile?.displayName ?? currentUser?.displayName ?? 'User'

  return (
    <div>
      <button
        className="btn-ghost"
        style={{ padding: '6px 14px', fontSize: '0.8rem', marginBottom: 24 }}
        onClick={onBack}
      >
        ← Back
      </button>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
            <div className="user-avatar user-avatar-lg">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1.8rem',
                letterSpacing: '-0.02em',
              }}>
                {displayName}
              </h1>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                {decks.length} deck{decks.length !== 1 ? 's' : ''}
                {profile?.createdAt && (
                  <> · Joined {new Date(profile.createdAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
            {isOwn && (
              <button className="btn-primary" onClick={() => setShowUpload(true)}>
                + Upload Deck
              </button>
            )}
          </div>

          {decks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <div className="empty-title">{isOwn ? 'No decks yet' : 'No public decks'}</div>
              {isOwn && (
                <div className="empty-sub">Upload a .csv or .xlsx file to create your first deck.</div>
              )}
            </div>
          ) : (
            <div className="deck-grid">
              {decks.map(deck => (
                <div key={deck.id} className="deck-card" onClick={() => setPendingDeck(deck)}>
                  {isOwn && deck.isPublic === false && (
                    <span className="tag tag-private" style={{ marginBottom: 6, display: 'inline-block' }}>
                      🔒 Private
                    </span>
                  )}
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
        </>
      )}

      {pendingDeck && (
        <DeckModeModal
          deck={pendingDeck}
          onSelect={mode => { onStartQuiz(pendingDeck, mode); setPendingDeck(null) }}
          onClose={() => setPendingDeck(null)}
        />
      )}

      {showUpload && (
        <UploadModal
          user={currentUser}
          onClose={() => setShowUpload(false)}
          onUploaded={deck => { setDecks(prev => [deck, ...prev]); setShowUpload(false) }}
          useLocalFallback={false}
        />
      )}
    </div>
  )
}
