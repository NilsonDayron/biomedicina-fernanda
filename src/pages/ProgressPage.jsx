import { Link } from 'react-router-dom'
import { formatDuration } from '../engine/mastery'
import { DISCIPLINES } from '../data/aula7Materials'
import { useProgress } from '../context/ProgressContext'
import { loadAllMaterialsProgress } from '../services/materialProgressStore'

export default function ProgressPage() {
  const { state, totals, loading } = useProgress()
  const materialsProgress = loadAllMaterialsProgress()
  if (loading || !state) return <p className="muted">Carregando...</p>

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
          <h2>Meu progresso</h2>
          <p>Acompanhe as questões respondidas e seu aproveitamento em cada disciplina do 2º período.</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="stat">
          <b>{pctGeral}%</b>
          <span>aproveitamento geral</span>
        </div>
        <div className="stat">
          <b>{totalRespMat || totals.total || 0}</b>
          <span>questões respondidas</span>
        </div>
        <div className="stat">
          <b>{formatDuration(state.progress.totalStudyMs)}</b>
          <span>tempo de estudo</span>
        </div>
      </div>

      <div className="list" style={{ gap: 16 }}>
        {DISCIPLINES.map((disc) => (
          <section key={disc.id} className="drive-shell" style={{ marginBottom: 0 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <b style={{ fontSize: 17 }}>📁 {disc.nome}</b>
              <span className="muted" style={{ fontSize: 12 }}>
                {disc.totalMateriais === 0
                  ? 'Sem apostilas'
                  : `${disc.totalMateriais} ${disc.totalMateriais === 1 ? 'apostila' : 'apostilas'}`}
              </span>
            </div>

            {disc.materials.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                Nenhuma apostila disponível no momento.
              </div>
            ) : (
              <div className="drive-list">
                {disc.materials.map((mat) => {
                  const prog = materialsProgress[mat.slide_id] || {}
                  const vistas = prog.respondidasIds?.length || 0
                  const pctAcerto = prog.totalRespostas
                    ? Math.round(((prog.acertos || 0) / prog.totalRespostas) * 100)
                    : 0
                  return (
                    <Link
                      key={mat.slide_id}
                      to={`/materiais/${mat.slide_id}`}
                      className="drive-row"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="drive-row-left">
                        <div className="drive-row-icon" aria-hidden="true">
                          📄
                        </div>
                        <div className="drive-row-main">
                          <div className="drive-row-title">{mat.nome}</div>
                          <div className="drive-row-sub">
                            {vistas} de {mat.totalValidas} questões praticadas
                            {prog.totalRespostas ? ` · ${pctAcerto}% de acerto` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="drive-row-right">
                        <span className="drive-row-action">Estudar</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
