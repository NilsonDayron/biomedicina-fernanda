import { Link } from 'react-router-dom'
import { formatDuration } from '../engine/mastery'
import { QUESTIONS } from '../data/questions'
import { DISCIPLINES } from '../data/aula7Materials'
import { dueReviewIds, errorNotebookIds } from '../engine/progress'
import { useProgress } from '../context/ProgressContext'
import { loadAllMaterialsProgress } from '../services/materialProgressStore'

export default function ProgressPage() {
  const { state, totals, loading } = useProgress()
  const materialsProgress = loadAllMaterialsProgress()
  if (loading || !state) return <p className="muted">Carregando...</p>

  const due = dueReviewIds(state, QUESTIONS).length
  const errors = errorNotebookIds(state).length

  let totalAcertosMat = 0
  let totalRespMat = 0
  Object.values(materialsProgress).forEach((p) => {
    totalAcertosMat += p?.acertos || 0
    totalRespMat += p?.totalRespostas || 0
  })
  const pctGeral = totalRespMat
    ? Math.round((totalAcertosMat / totalRespMat) * 100)
    : totals.percent

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Progresso por Disciplina e Material</h2>
          <p>Acompanhamento de questões praticadas, aproveitamento e reflexões salvas em cada disciplina.</p>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b>{pctGeral}%</b>
          <span>aproveitamento geral</span>
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
          <b>{totalRespMat || totals.total || 0}</b>
          <span>respostas registradas</span>
        </div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Progresso por Disciplina</h3>
          {DISCIPLINES.map((disc) => (
            <div key={disc.id} style={{ marginBottom: 22 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <b>
                  {disc.icone} {disc.nome}
                </b>
                <span className="muted" style={{ fontSize: 12 }}>
                  {disc.totalMateriais} {disc.totalMateriais === 1 ? 'material' : 'materiais'} · {disc.totalQuestoes}{' '}
                  questões
                </span>
              </div>
              {disc.materials.map((mat) => {
                const prog = materialsProgress[mat.slide_id] || {}
                const vistas = prog.respondidasIds?.length || 0
                const pctVistas = mat.totalValidas ? Math.round((vistas / mat.totalValidas) * 100) : 0
                const pctAcerto = prog.totalRespostas
                  ? Math.round(((prog.acertos || 0) / prog.totalRespostas) * 100)
                  : 0
                return (
                  <div key={mat.slide_id} style={{ margin: '10px 0' }}>
                    <div className="row" style={{ fontSize: 13 }}>
                      <Link to={`/materiais/${mat.slide_id}`}>{mat.nome}</Link>
                      <b>
                        {vistas}/{mat.totalValidas} q. ({pctAcerto}% acerto)
                      </b>
                    </div>
                    <div className="mini-progress">
                      <i style={{ width: `${pctVistas}%` }} />
                    </div>
                  </div>
                )
              })}
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
  if (type === 'topic') return 'Material'
  return 'Sessão de estudo'
}
