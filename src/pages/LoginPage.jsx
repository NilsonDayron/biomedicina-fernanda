import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { QUESTIONS } from '../data/questions'

export default function LoginPage() {
  const { user, firebaseReady, login, register, enterDemo } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, name)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand" style={{ marginBottom: 8 }}>
          <div className="logo">⚕️</div>
          <div>
            <h1>Bioquímica</h1>
            <p className="sub">Treino adaptativo V4 · {QUESTIONS.length} questões</p>
          </div>
        </div>
        <h2>Estudar fazendo questões.</h2>
        <p>
          Filtro por matéria, animação didática, correção escrita depois do erro e +2 do mesmo
          microtema. O progresso sincroniza quando o Firebase está configurado.
        </p>
        {!firebaseReady ? (
          <div className="banner" style={{ margin: '14px 0' }}>
            Firebase ainda não está configurado neste ambiente. Você pode estudar agora no <b>modo local</b>.
          </div>
        ) : (
          <div className="banner" style={{ margin: '14px 0' }}>
            Conta com e-mail e senha: o caderno de erros, o domínio e o tempo de estudo acompanham você em qualquer aparelho.
          </div>
        )}
        {firebaseReady ? (
          <form className="form" onSubmit={submit}>
            {mode === 'register' ? (
              <label>
                Nome
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer ser chamado" />
              </label>
            ) : null}
            <label>
              E-mail
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Senha
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error ? <div className="error-text">{error}</div> : null}
            <button className="primary" disabled={busy}>
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Quero criar conta' : 'Já tenho conta'}
            </button>
          </form>
        ) : null}
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="ghost" onClick={enterDemo}>
            Continuar em modo local
          </button>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Modo foco TDAH: uma questão por vez. NADH = 3 ATP · FADH = 2 ATP · 1 volta de Krebs = 12 ATP.
        </p>
      </div>
    </div>
  )
}
