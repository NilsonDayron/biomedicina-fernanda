import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const PRIMARY_LINKS = [
  { to: '/', label: 'Materiais', icon: '📁' },
  { to: '/progresso', label: 'Meu progresso', icon: '📈' },
]

const SECONDARY_LINKS = [
  { to: '/revisao', label: 'Revisão espaçada', icon: '🔁' },
  { to: '/erros', label: 'Caderno de erros', icon: '📝' },
  { to: '/simulado', label: 'Simulado', icon: '📋' },
  { to: '/conta', label: 'Data da prova', icon: '📅' },
]

export default function AppShell() {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMaterialsActive =
    location.pathname === '/' ||
    location.pathname.startsWith('/disciplinas') ||
    location.pathname.startsWith('/materiais') ||
    location.pathname.startsWith('/materias') ||
    location.pathname.startsWith('/estudar')

  const isSecondaryActive = SECONDARY_LINKS.some((link) =>
    location.pathname.startsWith(link.to),
  )

  return (
    <div className="wrap">
      <header className="site-header" data-testid="site-header">
        <NavLink to="/" className="brand" style={{ textDecoration: 'none' }}>
          <div className="logo" aria-hidden="true">
            ⚕️
          </div>
          <div>
            <h1 data-testid="site-header-title">Biomedicina</h1>
            <div className="sub" data-testid="site-header-subtitle">
              2º período · Materiais e apostilas
            </div>
          </div>
        </NavLink>

        <div className="header-tools">
          <nav className="top-nav" aria-label="Navegação principal">
            <NavLink
              to="/"
              end
              className={() => (isMaterialsActive ? 'active' : '')}
              data-testid="nav-materiais"
            >
              📁 Materiais
            </NavLink>
            <NavLink to="/progresso" data-testid="nav-progresso">
              📈 Meu progresso
            </NavLink>

            <div className="secondary-menu-wrap">
              <button
                type="button"
                className={`ghost ${isSecondaryActive || moreOpen ? 'active' : ''}`}
                data-testid="nav-mais-ferramentas"
                onClick={() => setMoreOpen((prev) => !prev)}
              >
                Mais opções ▾
              </button>
              {moreOpen ? (
                <div className="secondary-dropdown" data-testid="secondary-nav-dropdown">
                  {SECONDARY_LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className="secondary-dropdown-item"
                      onClick={() => setMoreOpen(false)}
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      <Outlet />

      {/* Área secundária discreta no rodapé para acesso rápido às demais ferramentas */}
      <footer className="secondary-footer" aria-label="Outras ferramentas de estudo">
        <span className="muted" style={{ fontSize: 12 }}>
          Outras ferramentas:
        </span>
        <div className="secondary-footer-links">
          {SECONDARY_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className="secondary-footer-link">
              {link.icon} {link.label}
            </NavLink>
          ))}
        </div>
      </footer>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {PRIMARY_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              (link.to === '/' && isMaterialsActive) || isActive ? 'active' : ''
            }
          >
            <span>{link.icon}</span>
            <div>{link.label}</div>
          </NavLink>
        ))}
        <button
          type="button"
          className={`mobile-more-btn ${isSecondaryActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen((prev) => !prev)}
        >
          <span>⋯</span>
          <div>Mais</div>
        </button>
      </nav>
    </div>
  )
}
