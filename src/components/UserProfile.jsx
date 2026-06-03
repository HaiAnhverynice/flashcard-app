import { useState, useEffect, useMemo } from 'react'
import { db } from '../firebase.js'
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import DeckModeModal from './DeckModeModal.jsx'
import UploadModal from './UploadModal.jsx'

export default function UserProfile({ userId, currentUser, onBack, onStartQuiz, onNavigateUser }) {
  const [profile, setProfile] = useState(null)
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingDeck, setPendingDeck] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [openFolder, setOpenFolder] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null) // deck being assigned to a folder
  const [newFolder, setNewFolder] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null) // deck pending deletion

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

  // ── Derived: search filter + folder grouping ──────────────────────────────────
  const term = search.trim().toLowerCase()
  const filteredDecks = useMemo(
    () => (term ? decks.filter(d => d.name?.toLowerCase().includes(term)) : decks),
    [decks, term]
  )

  const { folders, ungrouped } = useMemo(() => {
    const folders = {}
    const ungrouped = []
    for (const d of filteredDecks) {
      const f = (d.folder || '').trim()
      if (f) (folders[f] ||= []).push(d)
      else ungrouped.push(d)
    }
    return { folders, ungrouped }
  }, [filteredDecks])

  const folderNames = Object.keys(folders).sort((a, b) => a.localeCompare(b))
  // All folder names (unfiltered) — for the move-to-folder picker
  const allFolderNames = useMemo(
    () => [...new Set(decks.map(d => (d.folder || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [decks]
  )

  // ── Move deck to folder (own profile only) ────────────────────────────────────
  const assignFolder = async (deck, folderName) => {
    const value = (folderName || '').trim()
    try {
      if (!String(deck.id).startsWith('local_')) {
        await updateDoc(doc(db, 'decks', deck.id), { folder: value })
      }
      setDecks(prev => prev.map(d => d.id === deck.id ? { ...d, folder: value } : d))
    } catch (e) {
      alert('Failed to move deck.')
    }
    setMoveTarget(null)
    setNewFolder('')
  }

  // ── Delete own deck ───────────────────────────────────────────────────────────
  const execDelete = async deck => {
    try {
      if (!String(deck.id).startsWith('local_')) {
        await deleteDoc(doc(db, 'decks', deck.id))
      }
      setDecks(prev => prev.filter(d => d.id !== deck.id))
    } catch (e) {
      alert('Failed to delete deck.')
    }
    setDeleteTarget(null)
  }

  // ── Deck card renderer ────────────────────────────────────────────────────────
  const renderDeckCard = deck => (
    <div key={deck.id} className="deck-card" onClick={() => setPendingDeck(deck)}>
      {isOwn && (
        <div className="deck-card-actions" onClick={e => e.stopPropagation()}>
          <button
            className="deck-card-action-btn"
            onClick={() => setMoveTarget(deck)}
            title="Move to folder"
          >📁</button>
          <button
            className="deck-card-action-btn deck-card-delete"
            onClick={() => setDeleteTarget(deck)}
            title="Delete deck"
          >✕</button>
        </div>
      )}
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
  )

  // ── Folder page ───────────────────────────────────────────────────────────────
  if (openFolder !== null) {
    const folderDecks = (folders[openFolder] || [])
    const combinedQuestions = folderDecks.flatMap(d => d.questions || [])
    return (
      <div>
        <button
          className="btn-ghost"
          style={{ padding: '6px 14px', fontSize: '0.8rem', marginBottom: 24 }}
          onClick={() => setOpenFolder(null)}
        >
          ← {displayName}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>
              📁 {openFolder}
            </h1>
            <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              {folderDecks.length} deck{folderDecks.length !== 1 ? 's' : ''} · {combinedQuestions.length} questions
            </div>
          </div>
          {combinedQuestions.length > 0 && (
            <button
              className="btn-primary"
              onClick={() => setPendingDeck({ id: 'folder_' + openFolder, name: openFolder, questions: combinedQuestions })}
            >
              ▶ Study whole folder
            </button>
          )}
        </div>

        <div className="deck-grid">
          {folderDecks.map(renderDeckCard)}
        </div>

        {pendingDeck && (
          <DeckModeModal
            deck={pendingDeck}
            onSelect={mode => { onStartQuiz(pendingDeck, mode); setPendingDeck(null) }}
            onClose={() => setPendingDeck(null)}
          />
        )}
        {moveTarget && renderMoveModal()}
        {deleteTarget && renderDeleteModal()}
      </div>
    )
  }

  // ── Move-to-folder modal ──────────────────────────────────────────────────────
  function renderMoveModal() {
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setMoveTarget(null)}>
        <div className="modal" style={{ maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>📁 Move to Folder</h2>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setMoveTarget(null)}>✕</button>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: 16 }}>
            Move <strong>{moveTarget.name}</strong> to a folder.
          </p>

          {allFolderNames.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {allFolderNames.map(name => (
                <button
                  key={name}
                  className="btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  disabled={(moveTarget.folder || '').trim() === name}
                  onClick={() => assignFolder(moveTarget, name)}
                >
                  📁 {name}
                </button>
              ))}
            </div>
          )}

          <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>
            NEW FOLDER
          </label>
          <input
            autoFocus
            type="text"
            value={newFolder}
            placeholder="Folder name"
            onChange={e => setNewFolder(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newFolder.trim()) assignFolder(moveTarget, newFolder)
              if (e.key === 'Escape') setMoveTarget(null)
            }}
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            {(moveTarget.folder || '').trim() && (
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => assignFolder(moveTarget, '')}>
                Remove from folder
              </button>
            )}
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              disabled={!newFolder.trim()}
              onClick={() => assignFolder(moveTarget, newFolder)}
            >
              Move
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Delete confirm modal ──────────────────────────────────────────────────────
  function renderDeleteModal() {
    return (
      <div className="overlay" onClick={e => e.target === e.currentTarget && setDeleteTarget(null)}>
        <div className="modal" style={{ maxWidth: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>⚠️ Delete Deck</h2>
            <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setDeleteTarget(null)}>✕</button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginBottom: 16 }}>
            Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-danger" style={{ flex: 1 }} onClick={() => execDelete(deleteTarget)}>Delete</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main profile view ─────────────────────────────────────────────────────────
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
                {folderNames.length > 0 && <> · {allFolderNames.length} folder{allFolderNames.length !== 1 ? 's' : ''}</>}
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
            <>
              <div className="search-wrap">
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search this user's decks…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="search-clear" onClick={() => setSearch('')}>✕</button>
                )}
              </div>

              {filteredDecks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">No decks match "{search}"</div>
                  <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setSearch('')}>Clear search</button>
                </div>
              ) : (
                <>
                  {/* Folders */}
                  {folderNames.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <div className="results-label">Folders</div>
                      <div className="deck-grid">
                        {folderNames.map(name => {
                          const fd = folders[name]
                          const qCount = fd.reduce((n, d) => n + (d.questions?.length ?? 0), 0)
                          return (
                            <div key={name} className="deck-card" onClick={() => setOpenFolder(name)}>
                              <div className="deck-card-name">📁 {name}</div>
                              <div className="deck-card-meta">
                                {fd.length} deck{fd.length !== 1 ? 's' : ''} · {qCount} questions
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ungrouped decks */}
                  {ungrouped.length > 0 && (
                    <div>
                      {folderNames.length > 0 && <div className="results-label">Decks</div>}
                      <div className="deck-grid">
                        {ungrouped.map(renderDeckCard)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
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

      {moveTarget && renderMoveModal()}

      {deleteTarget && renderDeleteModal()}

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
