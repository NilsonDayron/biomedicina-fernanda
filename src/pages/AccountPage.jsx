import { useState } from 'react'
import { DEFAULT_EXAM_DATE, EVALUATION_DATES } from '../data/exam'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'

export default function AccountPage() {
  const { user, firebaseReady, logout } = useAuth()
  const { state, changeExamDate, loading } = useProgress()
  const [date, setDate] = useState(state?.examDate || DEFAULT_EXAM_DATE)

  if (loading || !state) return <p className="muted">Carregando...</p>

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Conta e prova</h2>
          <p>Marque a data da prova para a contagem regressiva do dashboard.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Sessão</h3>
          <p>
            {user.displayName || user.email}
            <br />
            <span className="muted">{user.isDemo ? 'Modo local neste dispositivo' : user.email}</span>
          </p>
          <div className="banner" style={{ margin: '12px 0' }}>
            {firebaseReady && !user.isDemo
              ? 'Seu progresso está no Firestore e acompanha o login em outros aparelhos.'
              : 'Modo local: os dados ficam neste navegador até o Firebase ser configurado.'}
          </div>
          <button className="ghost" onClick={logout}>
            Sair
          </button>
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
