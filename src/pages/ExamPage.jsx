import { examQuestionIds } from '../data/questions'
import QuizBoard from '../components/quiz/QuizBoard'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

const EXAM_IDS = examQuestionIds(20)

export default function ExamPage() {
  const { recordAnswer, saveSession } = useProgress()
  useStudyTimer()

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Simulado</h2>
          <p>
            20 questões misturadas do banco V4. Sem +2 extras: o tamanho é fixo. Se errar, ainda precisa escrever a resposta correta.
          </p>
        </div>
      </div>
      <QuizBoard
        key="simulado"
        title="Simulado da apostila"
        intro="20 questões do banco com 145 itens. Sem compensação de fila: termine e veja o Raio X. A correção escrita continua valendo se você errar."
        startIds={EXAM_IDS}
        adaptive={false}
        onAnswer={(question, payload) => recordAnswer(question, payload)}
        onFinished={(report) =>
          saveSession({
            type: 'exam',
            endedAt: Date.now(),
            correct: report.correct,
            wrong: report.wrong,
            explainedCount: report.explainedCount,
          })
        }
      />
    </div>
  )
}
