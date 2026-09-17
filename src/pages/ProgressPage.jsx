import { Link } from 'react-router-dom'
import { formatDuration } from '../engine/mastery'
import { QUESTIONS } from '../data/questions'
import { dueReviewIds, errorNotebookIds } from '../engine/progress'
import { useProgress } from '../context/ProgressContext'

export default function ProgressPage() {
  const { state, mastery, totals, loading } = useProgress()
  if (loading || !state) return <p className="muted">Carregando...</p>

  const due = dueReviewIds(state, QUESTIONS).length
  const errors = errorNotebookIds(state).length

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Progresso</h2>
          <p>Domínio por assunto, tempo, sequência de dias e uso da explicação antes de responder.</p>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b>{totals.percent}%</b>
          <span>acerto geral</span>
        </div>
        <div className="stat">
          <b>{formatDuration(state.progress.totalStudyMs)}</b>
          <span>tempo de estudo</span>
        </div>
        <div className="stat">
          <b>{state.progress.streak}</b>
          <span>sequência de dias</span>
        </div>
        <div className="stat">
          <b>{totals.explained}</b>
          <span>explicações antes da resposta</span>
        </div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Domínio por assunto</h3>
          {mastery.map((topic) => (
            <div key={topic.id} style={{ margin: '14px 0' }}>
              <div className="row" style={{ fontSize: 13 }}>
                <Link to={`/materias/${topic.id}`}>{topic.name}</Link>
                <b className={`level-${topic.level}`}>
                  {topic.percent}% · {topic.label}
                </b>
              </div>
              <div className="mini-progress">
                <i style={{ width: `${topic.percent}%` }} />
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Filas ativas</h3>
          <p>
            Revisão vencida: <b>{due}</b>
            <br />
            Caderno de erros: <b>{errors}</b>
            <br />
            Dias estudados: <b>{state.progress.studyDates?.length || 0}</b>
          </p>
          <h3>Sessões recentes</h3>
          <div className="list">
            {(state.sessions || []).slice(0, 8).map((session, index) => (
              <div className="list-item" key={session.endedAt || index}>
                <b>{labelType(session.type)}</b>
                <div className="muted">
                  {session.correct}A / {session.wrong}E · explicou {session.explainedCount || 0} vez(es)
                </div>
              </div>
            ))}
            {state.sessions?.length ? null : <div className="muted">Ainda não há sessões salvas.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

function labelType(type) {
  if (type === 'exam') return 'Simulado'
  if (type === 'review') return 'Revisão'
  if (type === 'errors') return 'Caderno de erros'
  if (type === 'topic') return 'Matéria'
  return 'Treino adaptativo'
}
