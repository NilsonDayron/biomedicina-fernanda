import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { QUESTIONS } from '../data/questions'
import { isCloudSyncEnabled } from '../firebase/config'

export default function LoginPage() {
  const { user, login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isCloudSyncEnabled()) return <Navigate to="/" replace />
  if (user && !user.isDemo) return <Navigate to="/" replace />

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
        <h2>Sincronizar entre aparelhos</h2>
        <p>O treino já funciona neste navegador. Entre só se quiser ligar a conta na nuvem.</p>
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
          <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Quero criar conta' : 'Já tenho conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
