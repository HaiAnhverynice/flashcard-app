import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase.js'
import { useAuth } from './hooks/useAuth.js'
import Menu from './components/Menu.jsx'
import Quiz from './components/Quiz.jsx'
import LearnQuiz from './components/LearnQuiz.jsx'
import Flashcard from './components/Flashcard.jsx'
import ScoreScreen from './components/ScoreScreen.jsx'
import HomePage from './components/HomePage.jsx'
import UserProfile from './components/UserProfile.jsx'
import AuthModal from './components/AuthModal.jsx'

const STUDY_SCREENS = new Set(['quiz', 'learn', 'hardcore', 'flashcard', 'score'])

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function App() {
  const user = useAuth() // undefined=loading, null=signed out, object=signed in
  const [screen, setScreen] = useState('home')
  const [activeDeck, setActiveDeck] = useState(null)
  const [activeMode, setActiveMode] = useState('quiz')
  const [quizResults, setQuizResults] = useState(null)
  const [learnRetryCount, setLearnRetryCount] = useState(0)
  const [viewUser, setViewUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)

  const startQuiz = (deck, mode = 'quiz') => {
    const shuffled = {
      ...deck,
      questions: shuffle([...deck.questions]).map(q =>
        q.type === 'MCQ' ? { ...q, choices: shuffle([...q.choices]) } : q
      ),
    }
    setActiveDeck(shuffled)
    setActiveMode(mode)
    setQuizResults(null)
    setScreen(mode)
  }

  const handleQuizFinish = results => {
    if (!results) { setScreen('menu'); return }
    setQuizResults(results)
    setScreen('score')
  }

  const handleLearnFinish = action => {
    if (!action) setScreen('menu')
    else if (action === 'retry') { setLearnRetryCount(c => c + 1); startQuiz(activeDeck, activeMode) }
  }

  const navigateUser = (userId, displayName) => {
    setViewUser({ userId, displayName })
    setScreen('user-profile')
  }

  const isStudying = STUDY_SCREENS.has(screen)
  const userName = user?.displayName || user?.email?.split('@')[0] || 'Me'

  return (
    <>
      {!isStudying && (
        <header className="global-header">
          <div className="global-header-inner">
            <button className="logo-btn" onClick={() => setScreen('home')}>
              <span className="logo-text">
                Flash<span style={{ color: 'var(--accent)', WebkitTextStroke: '1.5px var(--fg)' }}>cards</span>
                <span className="logo-dot" />
              </span>
            </button>
            <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn-ghost"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                onClick={() => setScreen('menu')}
              >
                Browse
              </button>
              {user === undefined ? null : user ? (
                <>
                  <button
                    className="btn-ghost user-chip"
                    style={{ padding: '5px 12px' }}
                    onClick={() => navigateUser(user.uid, userName)}
                  >
                    <span className="user-avatar user-avatar-sm">{userName[0].toUpperCase()}</span>
                    {userName}
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                    onClick={() => signOut(auth).then(() => setScreen('home'))}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  onClick={() => setShowAuth(true)}
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </header>
      )}

      <div className="app-container">
        {screen === 'home' && (
          <HomePage
            onStartQuiz={startQuiz}
            onNavigateUser={navigateUser}
          />
        )}
        {screen === 'menu' && (
          <Menu
            user={user ?? null}
            onStartQuiz={startQuiz}
            onNavigateUser={navigateUser}
            onShowAuth={() => setShowAuth(true)}
          />
        )}
        {screen === 'user-profile' && viewUser && (
          <UserProfile
            userId={viewUser.userId}
            currentUser={user ?? null}
            onBack={() => setScreen('menu')}
            onStartQuiz={startQuiz}
            onNavigateUser={navigateUser}
          />
        )}
        {screen === 'quiz' && activeDeck && (
          <Quiz deck={activeDeck} onFinish={handleQuizFinish} />
        )}
        {screen === 'flashcard' && activeDeck && (
          <Flashcard
            key={`${activeDeck.name}-flashcard`}
            deck={activeDeck}
            onFinish={() => setScreen('menu')}
          />
        )}
        {(screen === 'learn' || screen === 'hardcore') && activeDeck && (
          <LearnQuiz
            key={`${activeDeck.name}-${screen}-${learnRetryCount}`}
            deck={activeDeck}
            mode={screen}
            onFinish={handleLearnFinish}
          />
        )}
        {screen === 'score' && quizResults && (
          <ScoreScreen
            deck={activeDeck}
            results={quizResults}
            onRetry={() => startQuiz(activeDeck, 'quiz')}
            onMenu={() => setScreen('menu')}
          />
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
