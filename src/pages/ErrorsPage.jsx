import { getQuestion, topicName } from '../data/questions'
import { errorNotebookIds } from '../engine/progress'
import QuizBoard from '../components/quiz/QuizBoard'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

export default function ErrorsPage() {
  const { state, recordAnswer, saveSession, loading } = useProgress()
  useStudyTimer()
  if (loading || !state) return <p className="muted">Carregando...</p>
  const ids = errorNotebookIds(state)

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Caderno de erros</h2>
          <p>Ficam aqui as questões que ainda não tiveram dois acertos seguidos depois do erro.</p>
        </div>
      </div>
      {ids.length ? (
        <>
          <div className="list" style={{ marginBottom: 16 }}>
            {ids.map((id) => {
              const question = getQuestion(id)
              const record = state.answers[id]
              if (!question) return null
              return (
                <div className="list-item" key={id}>
                  <span className="tag bad">erro</span>
                  <span className="tag">{topicName(question.topicId)}</span>
                  <div style={{ marginTop: 6 }}>{question.q}</div>
                  <div className="muted">
                    {record.errorCount} erro(s) · próxima revisão {record.nextReviewAt || 'hoje'}
                  </div>
                </div>
              )
            })}
          </div>
          <QuizBoard
            key={ids.join('|')}
            title="Retreinar o caderno de erros"
            intro="As mesmas questões voltam com a regra adaptativa. Dois acertos seguidos tiram o item do caderno."
            startIds={ids}
            adaptive
            onAnswer={(question, payload) => recordAnswer(question, payload)}
            onFinished={(report) =>
              saveSession({
                type: 'errors',
                endedAt: Date.now(),
                correct: report.correct,
                wrong: report.wrong,
                explainedCount: report.explainedCount,
              })
            }
          />
        </>
      ) : (
        <section className="card start">
          <h2>Caderno limpo</h2>
          <p>Nenhum erro em aberto. Quando você errar, a questão aparece aqui automaticamente.</p>
        </section>
      )}
    </div>
  )
}
