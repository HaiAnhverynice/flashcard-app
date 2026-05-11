import { useState } from 'react'
import Menu from './components/Menu.jsx'
import Quiz from './components/Quiz.jsx'
import ScoreScreen from './components/ScoreScreen.jsx'

/*
  Screens:
    'menu'   → deck list
    'quiz'   → active quiz
    'score'  → results after quiz
*/

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [activeDeck, setActiveDeck] = useState(null)
  const [quizResults, setQuizResults] = useState(null)

  // Shuffle questions when starting quiz
  const startQuiz = (deck) => {
    const shuffled = {
      ...deck,
      questions: shuffle([...deck.questions]),
    }
    setActiveDeck(shuffled)
    setQuizResults(null)
    setScreen('quiz')
  }

  const handleQuizFinish = (results) => {
    if (!results) {
      // User quit early
      setScreen('menu')
      return
    }
    setQuizResults(results)
    setScreen('score')
  }

  const handleRetry = () => {
    // Re-shuffle and restart same deck
    startQuiz(activeDeck)
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
