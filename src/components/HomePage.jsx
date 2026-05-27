import { useState } from 'react'
import { db } from '../firebase.js'
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore'
import DeckModeModal from './DeckModeModal.jsx'

export default function HomePage({ onStartQuiz, onNavigateUser }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [pendingDeck, setPendingDeck] = useState(null)

  const doSearch = async () => {
    const term = search.trim().toLowerCase()
    if (!term) return
    setSearching(true)
    try {
      const [deckSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'decks'), orderBy('createdAt', 'desc'), limit(300))),
        getDocs(collection(db, 'users')),
      ])
      const decks = deckSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.isPublic !== false && d.name?.toLowerCase().includes(term))
      const users = userSnap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u => u.displayName?.toLowerCase().includes(term))
      setResults({ decks, users })
    } catch (e) {
      console.error(e)
      setResults({ decks: [], users: [] })
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '2.8rem',
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          marginBottom: 12,
        }}>
          Study smarter.
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.92rem', maxWidth: 460, lineHeight: 1.6 }}>
          Upload CSV or Excel flashcard decks, share publicly, and master any subject with four study modes.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="search-wrap" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search decks or users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            {search && (
              <button className="search-clear" onClick={() => { setSearch(''); setResults(null) }}>✕</button>
            )}
          </div>
          <button
            className="btn-primary"
            style={{ flexShrink: 0 }}
            onClick={doSearch}
            disabled={searching || !search.trim()}
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>

        {results && (
          <div style={{ marginTop: 24 }}>
            {results.users.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="results-label">Users</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {results.users.map(u => (
                    <button
                      key={u.uid}
                      className="btn-ghost user-chip"
                      onClick={() => onNavigateUser(u.uid, u.displayName)}
                    >
                      <span className="user-avatar user-avatar-sm">{u.displayName?.[0]?.toUpperCase() ?? '?'}</span>
                      {u.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.decks.length > 0 && (
              <div>
                <div className="results-label">Decks</div>
                <div className="deck-grid">
                  {results.decks.map(deck => (
                    <div key={deck.id} className="deck-card" onClick={() => setPendingDeck(deck)}>
                      <div className="deck-card-name">{deck.name}</div>
                      <div className="deck-card-meta">
                        {deck.questions?.length ?? 0} questions
                        {deck.uploaderName && (
                          <>
                            {' · by '}
                            <span
                              className="uploader-link"
                              onClick={e => { e.stopPropagation(); onNavigateUser(deck.uid, deck.uploaderName) }}
                            >
                              {deck.uploaderName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.decks.length === 0 && results.users.length === 0 && (
              <div className="empty-state" style={{ padding: '32px 24px' }}>
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No results for "{search}"</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* How-to guide */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 16 }}>
          How it works
        </div>
        <div style={{ display: 'grid', gap: 14 }}>

          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>1. Upload a CSV or Excel file</div>
            <p style={{ fontSize: '0.83rem', color: 'var(--fg-muted)', marginBottom: 12 }}>
              Your file must have these columns (a header row is optional — it's auto-detected):
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: 'var(--border)' }}>
                    {['Col', 'Header', 'Description'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 10px', fontFamily: 'var(--font-display)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['A', 'Question', 'The question text'],
                    ['B', 'Type', '"MCQ" or "written"'],
                    ['C', 'Answer', 'The correct answer'],
                    ['D+', 'Choices', 'MCQ options (include the correct answer here too)'],
                  ].map(([col, hdr, desc]) => (
                    <tr key={col} style={{ borderBottom: '1px solid #0000001a' }}>
                      <td style={{ padding: '5px 10px' }}><code>{col}</code></td>
                      <td style={{ padding: '5px 10px' }}><code>{hdr}</code></td>
                      <td style={{ padding: '5px 10px', color: 'var(--fg-muted)' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>2. Choose a study mode</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
              {[
                ['🃏', 'Flashcard', 'Flip through Q&A at your own pace.'],
                ['⚡', 'Quiz', 'Answer all questions once and get a score.'],
                ['📖', 'Learn', 'Cycles wrong answers back until every question is mastered twice.'],
                ['💀', 'Hardcore', 'Must answer correctly twice in a row. Each wrong adds one more required.'],
              ].map(([icon, name, desc]) => (
                <div key={name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{name} </span>
                    <span style={{ color: 'var(--fg-muted)' }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 10 }}>3. Keyboard shortcuts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {['1', '2', '3', '4'].map(k => <kbd key={k}>{k}</kbd>)}
                </span>
                <span style={{ color: 'var(--fg-muted)' }}>Select MCQ option</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <kbd>Enter</kbd>
                <span style={{ color: 'var(--fg-muted)' }}>Confirm answer / next question</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {pendingDeck && (
        <DeckModeModal
          deck={pendingDeck}
          onSelect={mode => { onStartQuiz(pendingDeck, mode); setPendingDeck(null) }}
          onClose={() => setPendingDeck(null)}
        />
      )}
    </div>
  )
}
