import QuizBoard from '../components/quiz/QuizBoard'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

export default function HomePage() {
  const { recordAnswer, saveSession } = useProgress()
  useStudyTimer()

  return (
    <QuizBoard
      trainer
      adaptive
      onAnswer={(question, payload) => recordAnswer(question, payload)}
      onFinished={(report) =>
        saveSession({
          type: 'study',
          endedAt: Date.now(),
          correct: report.correct,
          wrong: report.wrong,
          explainedCount: report.explainedCount,
        })
      }
    />
  )
}
