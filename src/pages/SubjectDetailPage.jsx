import { Link, useParams } from 'react-router-dom'
import { questionsByTopic } from '../data/questions'
import { getTopic } from '../data/topics'
import QuizBoard from '../components/quiz/QuizBoard'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'
import { masteryForTopic } from '../engine/mastery'

export default function SubjectDetailPage() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)
  const { state, recordAnswer, saveSession } = useProgress()
  useStudyTimer()
  const items = questionsByTopic(topicId)
  const mastery = state ? masteryForTopic(state.answers, topicId) : null

  if (!topic) {
    return (
      <p>
        Assunto não encontrado. <Link to="/materias">Voltar</Link>
      </p>
    )
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/materias" className="muted">
            ← Matérias
          </Link>
          <h2>{topic.name}</h2>
          <p>
            Fonte: {topic.source}. {mastery ? `${mastery.label} · ${mastery.percent}%` : ''}
          </p>
        </div>
      </div>
      <QuizBoard
        key={topicId}
        title={topic.name}
        intro={`${topic.blurb} O treino deste assunto também usa a regra 1 erro = +2 extras relacionadas.`}
        startIds={items.map((item) => item.id)}
        adaptive
        onAnswer={(question, payload) => recordAnswer(question, payload)}
        onFinished={(report) =>
          saveSession({
            type: 'topic',
            topicId,
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
