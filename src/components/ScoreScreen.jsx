export default function ScoreScreen({ deck, results, onRetry, onMenu }) {
  const score = results.filter((r) => r.correct).length
  const total = results.length
  const pct = Math.round((score / total) * 100)

  const grade =
    pct >= 90 ? { label: 'S — Excellent!', bg: '#FFE600', color: '#0D0D0D' }
    : pct >= 75 ? { label: 'A — Great Job!', bg: '#00C853', color: '#fff' }
    : pct >= 60 ? { label: 'B — Good Work', bg: '#2979FF', color: '#fff' }
    : pct >= 45 ? { label: 'C — Keep Going', bg: '#FF9100', color: '#fff' }
    : { label: 'D — Need More Practice', bg: '#FF4D4D', color: '#fff' }

  const wrong = results.filter((r) => !r.correct)

  return (
    <div>
      <div className="score-screen">
        <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-display)' }}>
          {deck.name}
        </div>
        <div className="score-big">
          {score}
          <span className="score-denom">/{total}</span>
        </div>
        <div className="score-label">{pct}% correct</div>
        <div
          className="score-grade"
          style={{ background: grade.bg, color: grade.color }}
        >
          {grade.label}
        </div>

        <div className="score-actions">
          <button className="btn-secondary" onClick={onMenu}>← Back to Menu</button>
          <button className="btn-primary" onClick={onRetry}>↺ Retry Deck</button>
        </div>
      </div>

      {wrong.length > 0 && (
        <div className="score-breakdown">
          <div className="score-breakdown-title">
            Review — {wrong.length} Missed Question{wrong.length > 1 ? 's' : ''}
          </div>
          {wrong.map((r, i) => (
            <div className="breakdown-item" key={i}>
              <span className="breakdown-icon">✗</span>
              <div>
                <div className="breakdown-q">{r.question}</div>
                <div className="breakdown-a">
                  Your answer: <em>{r.userAnswer || '(blank)'}</em>
                  &nbsp;·&nbsp;
                  Correct: <strong>{r.answer}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {wrong.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '1.5rem' }}>🎉 Perfect score!</div>
      )}
    </div>
  )
}
