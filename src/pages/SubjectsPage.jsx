import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'
import { INDEPENDENT_MATERIALS } from '../data/aula7Materials'
import { loadAllMaterialsProgress } from '../services/materialProgressStore'

export default function SubjectsPage() {
  const { mastery, loading } = useProgress()
  const materialsProgress = loadAllMaterialsProgress()
  if (loading) return <p className="muted">Carregando...</p>

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Materiais Independentes (Aula 7)</h2>
          <p>Separados por slide_id, com progresso e banco de questões próprios.</p>
        </div>
      </div>
      <div className="list" style={{ marginBottom: 24 }}>
        {INDEPENDENT_MATERIALS.map((mat) => {
          const prog = materialsProgress[mat.slide_id] || {}
          const vistas = prog.respondidasIds?.length || 0
          const totalResp = prog.totalRespostas || 0
          const pct = totalResp ? Math.round(((prog.acertos || 0) / totalResp) * 100) : 0
          return (
            <Link className="subject-card" key={mat.slide_id} to={`/materiais/${mat.slide_id}`}>
              <div className="row">
                <div>
                  <b>{mat.nome}</b>
                  <div className="muted">
                    Arquivo: {mat.file} · Identificador: {mat.slide_id}
                  </div>
                </div>
                <span className="tag ok">{mat.totalValidas} questões válidas</span>
              </div>
              <div className="mini-progress">
                <i style={{ width: `${Math.round((vistas / mat.totalValidas) * 100)}%` }} />
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                {vistas}/{mat.totalValidas} questões respondidas · {pct}% de aproveitamento
              </div>
            </Link>
          )
        })}
      </div>

      <div className="page-head">
        <div>
          <h2>Matérias de Bioquímica</h2>
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
