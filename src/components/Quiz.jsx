import { useState, useEffect, useRef, useCallback } from 'react'
import MathText from '../utils/MathText.jsx'

/*
  Quiz states per question:
  - 'answering'  → user is picking / typing
  - 'feedback'   → answer submitted, showing result, waiting for Enter
*/

export default function Quiz({ deck, onFinish }) {
  const questions = deck.questions
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('answering') // 'answering' | 'feedback'
  const [selectedOption, setSelectedOption] = useState(null) // index in choices[]
  const [writtenInput, setWrittenInput] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [results, setResults] = useState([]) // { question, type, answer, userAnswer, correct }
  const inputRef = useRef()

  const currentQ = questions[index]
  const isMCQ = currentQ.type === 'MCQ'

  // Focus written input on each question
  useEffect(() => {
    if (!isMCQ && phase === 'answering') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [index, isMCQ, phase])

  const submitAnswer = useCallback((userAnswer) => {
    const correct =
      userAnswer.trim().toLowerCase() === currentQ.answer.trim().toLowerCase()
    setIsCorrect(correct)
    setPhase('feedback')
    setResults((prev) => [
      ...prev,
      {
        question: currentQ.question,
        type: currentQ.type,
        answer: currentQ.answer,
        userAnswer,
        correct,
      },
    ])
  }, [currentQ])

  const goNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      onFinish(
        results.concat(/* already added in submitAnswer, handled below */[])
      )
    } else {
      setIndex((i) => i + 1)
      setPhase('answering')
      setSelectedOption(null)
      setWrittenInput('')
      setIsCorrect(null)
    }
  }, [index, questions.length, onFinish, results])

  // Central keyboard handler
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' && e.key !== 'Enter') return

      // Enter key logic
      if (e.key === 'Enter') {
        e.preventDefault()
        if (phase === 'feedback') {
          if (index + 1 >= questions.length) {
            // Pass current results including the last answer
            onFinish(results)
          } else {
            goNext()
          }
          return
        }
        if (phase === 'answering') {
          if (isMCQ) {
            if (selectedOption !== null) {
              submitAnswer(currentQ.choices[selectedOption])
            }
          } else {
            if (writtenInput.trim()) {
              submitAnswer(writtenInput.trim())
            }
          }
        }
        return
      }

      // 1-4 for MCQ option selection
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
  }, [phase, isMCQ, selectedOption, writtenInput, currentQ, index, questions.length, submitAnswer, goNext, onFinish, results])

  const progress = ((index) / questions.length) * 100

  return (
    <div>
      {/* Header */}
      <div className="quiz-header">
        <button
          className="btn-ghost"
          style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0 }}
          onClick={() => {
            if (confirm('Quit this quiz? Progress will be lost.')) onFinish(null)
          }}
        >
          ← Menu
        </button>
        <div className="quiz-progress-wrap">
          <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="quiz-counter">
          {index + 1} / {questions.length}
        </div>
      </div>

      {/* Deck name */}
      <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginBottom: 12 }}>
        {deck.name}
      </div>

      {/* Question Card */}
      <div className="question-card" key={index}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <span className={`tag ${isMCQ ? 'tag-mcq' : 'tag-written'}`}>
            {isMCQ ? 'MCQ' : 'Written'}
          </span>
        </div>
        <div className="question-text"><MathText text={currentQ.question} /></div>

        {isMCQ ? (
          <div className="options-list">
            {currentQ.choices.map((choice, i) => {
              let cls = 'option-btn'
              if (phase === 'feedback') {
                if (choice === currentQ.answer) cls += ' correct'
                else if (i === selectedOption && !isCorrect) cls += ' wrong'
              } else {
                if (i === selectedOption) cls += ' selected'
              }
              return (
                <button
                  key={i}
                  className={cls}
                  disabled={phase === 'feedback'}
                  onClick={() => {
                    if (phase === 'answering') setSelectedOption(i)
                  }}
                >
                  <span className="option-key">{i + 1}</span>
                  <MathText text={choice} />
                  {phase === 'feedback' && choice === currentQ.answer && (
                    <span style={{ marginLeft: 'auto', fontSize: '1rem' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="written-area">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your answer…"
              value={writtenInput}
              onChange={(e) => setWrittenInput(e.target.value)}
              disabled={phase === 'feedback'}
              style={
                phase === 'feedback'
                  ? { background: isCorrect ? '#E8FFE8' : '#FFE8E8' }
                  : {}
              }
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
      {phase === 'feedback' && (
        <div className={`feedback-banner ${isCorrect ? 'correct' : 'wrong'}`}>
          <span className="feedback-icon">{isCorrect ? '✓' : '✗'}</span>
          <span>
            {isCorrect
              ? 'Correct!'
              : <span>Wrong — correct answer: <MathText text={currentQ.answer} /></span>}
          </span>
        </div>
      )}

      {/* Hint */}
      <div className="enter-hint" style={{ marginTop: 16 }}>
        {phase === 'answering' && isMCQ && selectedOption === null && (
          <>Press <kbd>1</kbd>–<kbd>{currentQ.choices.length}</kbd> to select an option</>
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
