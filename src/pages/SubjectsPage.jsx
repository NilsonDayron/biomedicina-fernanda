import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

export default function SubjectsPage() {
  const { mastery, loading } = useProgress()
  if (loading) return <p className="muted">Carregando...</p>

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Matérias</h2>
          <p>Assuntos das aulas da professora, com domínio calculado pelas suas respostas.</p>
        </div>
      </div>
      <div className="list">
        {mastery.map((topic) => (
          <Link className="subject-card" key={topic.id} to={`/materias/${topic.id}`}>
            <div className="row">
              <div>
                <b>{topic.name}</b>
                <div className="muted">{topic.blurb}</div>
              </div>
              <span className={`tag level-${topic.level}`}>{topic.label}</span>
            </div>
            <div className="mini-progress">
              <i style={{ width: `${topic.percent}%` }} />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              {topic.seen}/{topic.total} questões vistas · {topic.percent}% · {topic.errorsOpen} no caderno de erros
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
