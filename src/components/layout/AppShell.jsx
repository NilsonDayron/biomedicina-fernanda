import { NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Treino', icon: '🧬' },
  { to: '/materias', label: 'Matérias', icon: '📚' },
  { to: '/revisao', label: 'Revisão', icon: '🔁' },
  { to: '/erros', label: 'Erros', icon: '📝' },
  { to: '/simulado', label: 'Simulado', icon: '📋' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
]

export default function AppShell() {
  return (
    <div className="wrap">
      <header className="site-header">
        <div className="brand">
          <div className="logo">⚕️</div>
          <div>
            <h1>Bioquímica — Treino Adaptativo</h1>
            <div className="sub">Carboidratos · digestão · glicemia · bioenergética · glicólise · Krebs · cadeia respiratória</div>
          </div>
        </div>
        <div className="header-tools">
          <nav className="top-nav">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/conta">Prova</NavLink>
          </nav>
          <div className="pill">salvo neste navegador</div>
        </div>
      </header>
      <Outlet />
      <nav className="mobile-nav">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}>
            {link.icon}
            <div>{link.label}</div>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
