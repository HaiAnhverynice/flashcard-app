import { useState, useEffect, useRef, useCallback } from 'react'
import MathText from '../utils/MathText.jsx'
import MathInput from '../utils/MathInput.jsx'

/**
 * LearnQuiz — two modes:
 *
 * LEARN: cycle questions, wrong ones go back to the queue.
 *   Ends when every question has been answered correctly.
 *
 * HARDCORE: like learn, but each wrong answer adds n+1 required repeats.
 *   First wrong: must answer correctly 2 more times.
 *   Wrong again: must answer correctly 3 more times. Etc.
 */

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build initial queue entries
function buildQueue(questions) {
  return shuffle(questions).map((q, i) => ({
    ...q,
    qid: i,         // stable id
    wrongCount: 0,  // how many times wrong so far
    requiredCorrect: 1, // how many consecutive corrects needed (hardcore)
    correctStreak: 0,
  }))
}

export default function LearnQuiz({ deck, mode, onFinish }) {
  // mode: 'learn' | 'hardcore'
  const isHardcore = mode === 'hardcore'

  const [queue, setQueue] = useState(() => buildQueue(deck.questions))
  const [mastered, setMastered] = useState([]) // fully done questions
  const [current, setCurrent] = useState(0)    // index into queue
  const [phase, setPhase] = useState('answering') // 'answering' | 'feedback'
  const [selectedOption, setSelectedOption] = useState(null)
  const [writtenInput, setWrittenInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [answeredQ, setAnsweredQ] = useState(null) // snapshot for feedback display
  const [done, setDone] = useState(false)
  const [roundStats, setRoundStats] = useState({ correct: 0, wrong: 0 })

  const currentQ = queue[current]
  const isMCQ = currentQ?.type === 'MCQ'
  const total = deck.questions.length
  const masteredCount = mastered.length

  // Focus on mount
  const inputRef = useRef()

  const submitAnswer = useCallback((userAnswer) => {
    const correct =
      userAnswer.trim().toLowerCase() === currentQ.answer.trim().toLowerCase()

    setIsCorrect(correct)
    setAnsweredQ(currentQ) // snapshot before queue mutation
    setPhase('feedback')
    setRoundStats(s => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }))

    setQueue(prev => {
      const updated = [...prev]
      const entry = { ...updated[current] }

      if (correct) {
        entry.correctStreak += 1
        const needed = isHardcore ? entry.requiredCorrect : 1
        if (entry.correctStreak >= needed) {
          // This question is mastered — remove from queue after feedback
          entry._mastered = true
        }
      } else {
        entry.wrongCount += 1
        entry.correctStreak = 0
        if (isHardcore) {
          // Increase required correct count by 1 each time wrong
          entry.requiredCorrect = entry.wrongCount + 1
        }
      }
      updated[current] = entry
      return updated
    })
  }, [current, currentQ, isHardcore])

  const goNext = useCallback(() => {
    setQueue(prev => {
      let q = [...prev]
      const entry = q[current]

      if (entry._mastered) {
        // Move to mastered list
        const masteredEntry = { ...entry }
        delete masteredEntry._mastered
        q.splice(current, 1)

        setMastered(m => [...m, masteredEntry])

        if (q.length === 0) {
          setDone(true)
          return q
        }

        // Wrap index
        const next = current >= q.length ? 0 : current
        setCurrent(next)
      } else {
        // Move wrong answer to end of queue (with some shuffle to avoid repetition)
        const wrongEntry = q.splice(current, 1)[0]
        // Insert at a random position in the remaining queue (at least 1 away)
        const insertAt = q.length === 0 ? 0 : Math.max(1, Math.floor(Math.random() * q.length) + 1)
        q.splice(Math.min(insertAt, q.length), 0, wrongEntry)

        if (current >= q.length) setCurrent(0)
        // current stays same (next item has shifted into current position)
      }

      return q
    })

    setPhase('answering')
    setSelectedOption(null)
    setWrittenInput('')
    setIsCorrect(null)
    setAnsweredQ(null)
  }, [current])

  // Keyboard handler
  useEffect(() => {
    if (done) return
    const handler = (e) => {
      if (!currentQ) return
      if (e.target.tagName === 'INPUT' && e.key !== 'Enter') return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'feedback') { goNext(); return }
        if (phase === 'answering') {
          if (isMCQ && selectedOption !== null) {
            submitAnswer(currentQ.choices[selectedOption])
          } else if (!isMCQ && writtenInput.trim()) {
            submitAnswer(writtenInput.trim())
          }
        }
        return
      }

      if (isMCQ && phase === 'answering') {
        const num = parseInt(e.key)
        if (num >= 1 && num <= currentQ.choices.length) {
          e.preventDefault()
          setSelectedOption(num - 1)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [done, phase, isMCQ, selectedOption, writtenInput, currentQ, submitAnswer, goNext])

  if (done) {
    return <CongratsScreen
      deck={deck}
      mode={mode}
      stats={roundStats}
      total={total}
      onMenu={() => onFinish(null)}
      onRetry={() => onFinish('retry')}
    />
  }

  if (!currentQ) return null

  const progress = masteredCount / total
  // Hardcore: show required vs streak
  const hardcoreNeeded = isHardcore ? currentQ.requiredCorrect : 1
  const hardcoreStreak = currentQ.correctStreak

  return (
    <div>
      {/* Header */}
      <div className="quiz-header">
        <button
          className="btn-ghost"
          style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0 }}
          onClick={() => {
            if (confirm('Quit? Progress will be lost.')) onFinish(null)
          }}
        >
          ← Menu
        </button>
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="quiz-counter">
          {masteredCount}/{total} mastered
        </div>
      </div>

      {/* Mode label + deck name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className={`tag ${isHardcore ? 'tag-hardcore' : 'tag-learn'}`}>
          {isHardcore ? '💀 Hardcore' : '📖 Learn'}
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{deck.name}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
          {queue.length} remaining
        </span>
      </div>

      {/* Hardcore streak indicator */}
      {isHardcore && phase === 'answering' && currentQ.wrongCount > 0 && (
        <div className="hardcore-streak">
          <span>Needs {hardcoreNeeded} correct in a row</span>
          <div className="streak-dots">
            {Array.from({ length: hardcoreNeeded }).map((_, i) => (
              <div key={i} className={`streak-dot ${i < hardcoreStreak ? 'filled' : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* Question card */}
      <div className="question-card" key={`${currentQ.qid}-${currentQ.correctStreak}`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <span className={`tag ${isMCQ ? 'tag-mcq' : 'tag-written'}`}>
            {isMCQ ? 'MCQ' : 'Written'}
          </span>
          {currentQ.wrongCount > 0 && (
            <span className="tag tag-retry">↺ attempt {currentQ.wrongCount + 1}</span>
          )}
        </div>
        <div className="question-text">
          <MathText text={currentQ.question} />
        </div>

        {isMCQ ? (
          <div className="options-list">
            {currentQ.choices.map((choice, i) => {
              const q = answeredQ || currentQ
              let cls = 'option-btn'
              if (phase === 'feedback') {
                if (choice === q.answer) cls += ' correct'
                else if (i === selectedOption && !isCorrect) cls += ' wrong'
              } else {
                if (i === selectedOption) cls += ' selected'
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={phase === 'feedback'}
                  onClick={() => phase === 'answering' && setSelectedOption(i)}
                >
                  <span className="option-key">{i + 1}</span>
                  <MathText text={choice} />
                  {phase === 'feedback' && choice === q.answer && (
                    <span style={{ marginLeft: 'auto' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="written-area">
            <MathInput
              value={writtenInput}
              onChange={setWrittenInput}
              onSubmit={(v) => phase === 'answering' && v && submitAnswer(v)}
              disabled={phase === 'feedback'}
              style={phase === 'feedback' ? {
                '--input-bg': isCorrect ? '#E8FFE8' : '#FFE8E8'
              } : {}}
            />
            {phase === 'answering' && (
              <button
                className="btn-primary"
                disabled={!writtenInput.trim()}
                onClick={() => submitAnswer(writtenInput.trim())}
              >
                Submit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback */}
      {phase === 'feedback' && answeredQ && (
        <div className={`feedback-banner ${isCorrect ? 'correct' : 'wrong'}`}>
          <span className="feedback-icon">{isCorrect ? '✓' : '✗'}</span>
          <span>
            {isCorrect
              ? isHardcore && answeredQ.correctStreak < answeredQ.requiredCorrect
                ? `Correct! ${answeredQ.requiredCorrect - answeredQ.correctStreak} more needed.`
                : 'Correct! Mastered ✦'
              : <span>Wrong — correct: <MathText text={answeredQ.answer} /></span>
            }
          </span>
        </div>
      )}

      <div className="enter-hint" style={{ marginTop: 16 }}>
        {phase === 'answering' && isMCQ && selectedOption === null && (
          <>Press <kbd>1</kbd>–<kbd>{currentQ.choices.length}</kbd> to select</>
        )}
        {phase === 'answering' && isMCQ && selectedOption !== null && (
          <>Press <kbd>Enter</kbd> to confirm</>
        )}
        {phase === 'feedback' && (
          <>Press <kbd>Enter</kbd> to continue</>
        )}
      </div>
    </div>
  )
}

function CongratsScreen({ deck, mode, stats, total, onMenu, onRetry }) {
  const isHardcore = mode === 'hardcore'
  const accuracy = Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)

  return (
    <div className="congrats-screen">
      <div className="congrats-fireworks">🎉</div>
      <div className="congrats-badge">
        {isHardcore ? '💀 HARDCORE COMPLETE' : '📖 LEARNED'}
      </div>
      <h1 className="congrats-title">All {total} Questions Mastered!</h1>
      <p className="congrats-sub">
        {isHardcore
          ? "You survived the hardcore grind. Respect."
          : "Every question answered correctly. Well done!"}
      </p>

      <div className="congrats-stats">
        <div className="congrats-stat">
          <div className="congrats-stat-val">{stats.correct}</div>
          <div className="congrats-stat-label">Correct answers</div>
        </div>
        <div className="congrats-stat">
          <div className="congrats-stat-val">{stats.wrong}</div>
          <div className="congrats-stat-label">Wrong attempts</div>
        </div>
        <div className="congrats-stat">
          <div className="congrats-stat-val">{accuracy}%</div>
          <div className="congrats-stat-label">Accuracy</div>
        </div>
      </div>

      <div className="congrats-actions">
        <button className="btn-secondary" onClick={onMenu}>← Back to Menu</button>
        <button className="btn-primary" onClick={onRetry}>
          {isHardcore ? '💀 Retry Hardcore' : '↺ Study Again'}
        </button>
      </div>
    </div>
  )
}
