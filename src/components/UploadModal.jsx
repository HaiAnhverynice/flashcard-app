import { useState, useRef } from 'react'
import { db } from '../firebase.js'
import { collection, addDoc } from 'firebase/firestore'
import { parseFile } from '../utils/parseFile.js'

export default function UploadModal({ onClose, onUploaded, useLocalFallback }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [deckName, setDeckName] = useState('')
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef()

  const handleFile = async (f) => {
    setError('')
    setQuestions(null)
    setFile(f)
    // Pre-fill deck name from filename
    setDeckName(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    try {
      const parsed = await parseFile(f)
      setQuestions(parsed)
    } catch (e) {
      setError(e.message)
      setFile(null)
      setQuestions(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSave = async () => {
    if (!questions || !deckName.trim()) return
    setSaving(true)
    const deck = {
      name: deckName.trim(),
      questions,
      createdAt: new Date().toISOString(),
    }
    try {
      if (!useLocalFallback) {
        const ref = await addDoc(collection(db, 'decks'), deck)
        onUploaded({ id: ref.id, ...deck })
      } else {
        // localStorage fallback
        const id = 'local_' + Date.now()
        const local = JSON.parse(localStorage.getItem('flashcard_decks') || '[]')
        const newDeck = { id, ...deck }
        localStorage.setItem('flashcard_decks', JSON.stringify([newDeck, ...local]))
        onUploaded(newDeck)
      }
    } catch (e) {
      setError('Failed to save deck: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
            Upload Deck
          </h2>
          <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>

        {!file ? (
          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
            <div className="drop-zone-icon">📂</div>
            <div className="drop-zone-text">Drop your file here or click to browse</div>
            <div className="drop-zone-sub">.csv or .xlsx — see demo file for format</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>{file.name.endsWith('.csv') ? '📋' : '📊'}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{file.name}</div>
                {questions && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                    ✓ {questions.length} questions parsed
                  </div>
                )}
              </div>
              <button
                className="btn-ghost"
                style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => { setFile(null); setQuestions(null); setError('') }}
              >
                Change
              </button>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                DECK NAME
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="e.g. Biology Chapter 3"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            {questions && (
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', display: 'flex', gap: 12 }}>
                <span>MCQ: {questions.filter(q => q.type === 'MCQ').length}</span>
                <span>Written: {questions.filter(q => q.type === 'WRITTEN').length}</span>
              </div>
            )}
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!questions || !deckName.trim() || saving}
          >
            {saving ? 'Saving…' : 'Save Deck'}
          </button>
        </div>
      </div>
    </div>
  )
}
