import { useState } from 'react'
import { DEFAULT_EXAM_DATE, EVALUATION_DATES } from '../data/exam'
import { useProgress } from '../context/ProgressContext'

export default function AccountPage() {
  const { state, changeExamDate, loading } = useProgress()
  const [date, setDate] = useState(state?.examDate || DEFAULT_EXAM_DATE)

  if (loading || !state) return <p className="muted">Carregando...</p>

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Data da prova</h2>
          <p>A contagem e o progresso ficam salvos neste navegador (localStorage). Não é preciso login.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Armazenamento</h3>
          <p>
            Tudo que você responde — acertos, erros, revisão e tempo de estudo — permanece neste aparelho.
            <br />
            <span className="muted">Se limpar os dados do site no Chrome/Safari, o histórico some.</span>
          </p>
          <div className="banner" style={{ margin: '12px 0' }}>
            A sincronização na nuvem (Firebase) está desligada de propósito. O código continua no projeto para ser
            religado no futuro com <code>VITE_CLOUD_SYNC=true</code>.
          </div>
        </section>
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Data da prova</h3>
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault()
              changeExamDate(date)
            }}
          >
            <label>
              Contagem regressiva
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="primary">Salvar data</button>
          </form>
          <p className="muted" style={{ marginTop: 12 }}>
            Padrão da agenda: V1 em {DEFAULT_EXAM_DATE.split('-').reverse().join('/')}.
          </p>
          <div className="list" style={{ marginTop: 12 }}>
            {EVALUATION_DATES.map((item) => (
              <button
                key={item.id}
                className="ghost"
                type="button"
                onClick={() => {
                  setDate(item.date)
                  changeExamDate(item.date)
                }}
              >
                Usar {item.label} ({item.date.split('-').reverse().join('/')})
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
