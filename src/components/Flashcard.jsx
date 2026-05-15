import { useState, useEffect, useCallback } from 'react'
import MathText from '../utils/MathText.jsx'

export default function Flashcard({ deck, onFinish }) {
  const questions = deck.questions
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const currentQ = questions[index]

  const flip = useCallback(() => setFlipped(f => !f), [])

  const next = useCallback(() => {
    if (index + 1 < questions.length) {
      setIndex(i => i + 1)
      setFlipped(false)
    }
  }, [index, questions.length])

  const prev = useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1)
      setFlipped(false)
    }
  }, [index])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'Escape') { onFinish(null); return }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); return }
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [flip, next, prev, onFinish])

  const progress = ((index + 1) / questions.length) * 100

  return (
    <div>
      {/* Header */}
      <div className="quiz-header">
        <button
          className="btn-ghost"
          style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0 }}
          onClick={() => onFinish(null)}
        >
          ← Menu
        </button>
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="quiz-counter">{index + 1} / {questions.length}</div>
      </div>

      {/* Deck name */}
      <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginBottom: 16 }}>
        {deck.name} · <span style={{ color: 'var(--accent)', WebkitTextStroke: '0.5px var(--fg)' }}>Flashcard</span>
      </div>

      {/* Flip card */}
      <div className={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={flip}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <div className="flashcard-side-label">Q</div>
            <div className="flashcard-text">
              <MathText text={currentQ.question} />
            </div>
            <div className="flashcard-hint">click · space · enter to flip</div>
          </div>
          <div className="flashcard-back">
            <div className="flashcard-side-label">A</div>
            <div className="flashcard-text">
              <MathText text={currentQ.answer} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <button className="btn-ghost" onClick={prev} disabled={index === 0}>
          ← Prev
        </button>
        <button className="btn-secondary" onClick={flip}>
          Flip
        </button>
        {index + 1 >= questions.length ? (
          <button className="btn-primary" onClick={() => onFinish(null)}>
            Done ✓
          </button>
        ) : (
          <button className="btn-ghost" onClick={next}>
            Next →
          </button>
        )}
      </div>

      <div className="enter-hint" style={{ marginTop: 16 }}>
        <kbd>Space</kbd> to flip · <kbd>←</kbd> <kbd>→</kbd> to navigate · <kbd>Esc</kbd> to go back
      </div>
    </div>
  )
}
