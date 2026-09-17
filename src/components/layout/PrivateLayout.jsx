import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { ProgressProvider } from '../../context/ProgressContext.jsx'
import AppShell from './AppShell.jsx'

export default function PrivateLayout() {
  const { user, ready } = useAuth()
  if (!ready) {
    return (
      <div className="auth-wrap">
        <div className="card">Carregando sessão...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return (
    <ProgressProvider>
      <AppShell />
    </ProgressProvider>
  )
}
