const MODES = [
  ['flashcard', '🃏', 'Flashcard', 'Flip through questions and answers at your own pace.', 'mode-btn-flashcard'],
  ['quiz', '⚡', 'Quiz', 'Answer all questions once. Get a score at the end.', 'mode-btn-quiz'],
  ['learn', '📖', 'Learn', 'Cycles until every question is answered correctly twice.', 'mode-btn-learn'],
  ['hardcore', '💀', 'Hardcore', 'Two correct in a row to master. Each wrong adds one more required.', 'mode-btn-hardcore'],
]

export default function DeckModeModal({ deck, onSelect, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem' }}>
            {deck.name}
          </h2>
          <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', marginBottom: 28 }}>
          {deck.questions?.length} questions · Choose your study mode
        </p>
        <div className="mode-list">
          {MODES.map(([mode, icon, name, desc, cls]) => (
            <button key={mode} className={`mode-btn ${cls}`} onClick={() => onSelect(mode)}>
              <div className="mode-icon">{icon}</div>
              <div>
                <div className="mode-name">{name}</div>
                <div className="mode-desc">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
