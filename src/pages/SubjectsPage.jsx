import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'
import { DISCIPLINES } from '../data/aula7Materials'
import { loadAllMaterialsProgress } from '../services/materialProgressStore'

export default function SubjectsPage() {
  const { loading } = useProgress()
  const materialsProgress = loadAllMaterialsProgress()
  if (loading) return <p className="muted">Carregando...</p>

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="tag ok" style={{ fontSize: 12, padding: '4px 10px', marginBottom: 8 }}>
            Catálogo Geral por Disciplina
          </span>
          <h2>Materiais e Apostilas por Disciplina</h2>
          <p>
            Todos os materiais separados por disciplina (<b>Bioquímica</b>, <b>Bromatologia</b> e <b>Biofísica</b>) e
            por identificador <code>slide_id</code>, com quantidades reais de questões e progresso individual.
          </p>
        </div>
      </div>

      {DISCIPLINES.map((disc) => (
        <section key={disc.id} style={{ marginBottom: 28 }} data-testid={`catalog-disciplina-${disc.id}`}>
          <div className="page-head" style={{ marginBottom: 12 }}>
            <div>
              <h3>
                {disc.icone} {disc.nome}{' '}
                <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
                  ({disc.totalMateriais} {disc.totalMateriais === 1 ? 'material' : 'materiais'} · {disc.totalQuestoes}{' '}
                  questões)
                </span>
              </h3>
              <p className="muted" style={{ fontSize: 13 }}>
                {disc.descricao}
              </p>
            </div>
            <Link className="ghost" to={`/disciplinas/${disc.id}`} style={{ textDecoration: 'none' }}>
              Abrir disciplina {disc.nome} →
            </Link>
          </div>

          <div className="list">
            {disc.materials.map((mat) => {
              const prog = materialsProgress[mat.slide_id] || {}
              const vistas = prog.respondidasIds?.length || 0
              const totalResp = prog.totalRespostas || 0
              const pctAcerto = totalResp ? Math.round(((prog.acertos || 0) / totalResp) * 100) : 0
              const pctVistas = mat.totalValidas ? Math.round((vistas / mat.totalValidas) * 100) : 0

              return (
                <Link className="subject-card" key={mat.slide_id} to={`/materiais/${mat.slide_id}`}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span className="pill" style={{ fontSize: 11, marginRight: 8 }}>
                        {disc.nome}
                      </span>
                      <b>{mat.nome}</b>
                      <div className="muted" style={{ marginTop: 4 }}>
                        Fonte/Arquivo: <code>{mat.file}</code> · Identificador: <code>{mat.slide_id}</code>
                      </div>
                    </div>
                    <span className="tag ok">{mat.totalValidas} questões válidas</span>
                  </div>
                  <div className="mini-progress" style={{ marginTop: 10 }}>
                    <i style={{ width: `${pctVistas}%` }} />
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    {vistas}/{mat.totalValidas} questões respondidas ({pctVistas}%) · {pctAcerto}% de aproveitamento
                    {prog.sessaoAtiva ? ' · ● Sessão em andamento salva' : ''}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
