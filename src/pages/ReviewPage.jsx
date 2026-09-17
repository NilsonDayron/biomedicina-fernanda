import { QUESTIONS } from '../data/questions'
import { dueReviewIds } from '../engine/progress'
import QuizBoard from '../components/quiz/QuizBoard'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

export default function ReviewPage() {
  const { state, recordAnswer, saveSession, loading } = useProgress()
  useStudyTimer()
  if (loading || !state) return <p className="muted">Carregando...</p>
  const ids = dueReviewIds(state, QUESTIONS)

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Revisão espaçada</h2>
          <p>
            As cartas voltam em 1, 3 e 7 dias (e depois alongam) quando você acerta. Errou: volta para 1 dia e entra no
            caderno de erros.
          </p>
        </div>
      </div>
      {ids.length ? (
        <QuizBoard
          key={ids.join('|')}
          title="Revisar o que já venceu"
          intro="Só entram questões com data de revisão para hoje ou atrasadas. A compensação +2 continua valendo se você errar."
          startIds={ids}
          adaptive
          onAnswer={(question, payload) => recordAnswer(question, payload)}
          onFinished={(report) =>
            saveSession({
              type: 'review',
              endedAt: Date.now(),
              correct: report.correct,
              wrong: report.wrong,
              explainedCount: report.explainedCount,
            })
          }
        />
      ) : (
        <section className="card start">
          <h2>Nada vencido agora</h2>
          <p>Estude no modo adaptativo ou abra o caderno de erros. As cartas de revisão aparecem aqui no dia certo.</p>
        </section>
      )}
    </div>
  )
}
