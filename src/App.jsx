import { useState } from 'react'
import Menu from './components/Menu.jsx'
import Quiz from './components/Quiz.jsx'
import LearnQuiz from './components/LearnQuiz.jsx'
import Flashcard from './components/Flashcard.jsx'
import ScoreScreen from './components/ScoreScreen.jsx'

/*
  Screens:
    'menu'      → deck list
    'quiz'      → classic timed quiz
    'learn'     → learn mode (cycle until all correct)
    'hardcore'  → hardcore learn mode
    'flashcard' → simple Q&A flip cards
    'score'     → results after classic quiz
*/

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [activeDeck, setActiveDeck] = useState(null)
  const [activeMode, setActiveMode] = useState('quiz')
  const [quizResults, setQuizResults] = useState(null)
  const [learnRetryCount, setLearnRetryCount] = useState(0)

  const startQuiz = (deck, mode = 'quiz') => {
    const shuffled = {
      ...deck,
      questions: shuffle([...deck.questions]),
    }
    setActiveDeck(shuffled)
    setActiveMode(mode)
    setQuizResults(null)
    setScreen(mode)
  }

  const handleQuizFinish = (results) => {
    if (!results) {
      setScreen('menu')
      return
    }
    setQuizResults(results)
    setScreen('score')
  }

  const handleLearnFinish = (action) => {
    if (!action) {
      setScreen('menu')
    } else if (action === 'retry') {
      setLearnRetryCount(c => c + 1)
      startQuiz(activeDeck, activeMode)
    }
  }

  const handleRetry = () => {
    startQuiz(activeDeck, 'quiz')
  }

  return (
    <div className="app-container">
      {screen === 'menu' && (
        <Menu onStartQuiz={startQuiz} />
      )}
      {screen === 'quiz' && activeDeck && (
        <Quiz
          deck={activeDeck}
          onFinish={handleQuizFinish}
        />
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
          onRetry={handleRetry}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  )
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
