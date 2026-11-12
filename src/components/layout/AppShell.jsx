import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { getDisciplineById, getMaterialBySlideId } from '../../data/aula7Materials'
import { UI_STATE_CHANGE_EVENT, loadSavedUiState } from '../../services/materialProgressStore'

const LINKS = [
  { to: '/', label: 'Disciplinas', icon: '🏛️' },
  { to: '/materias', label: 'Materiais', icon: '📚' },
  { to: '/revisao', label: 'Revisão', icon: '🔁' },
  { to: '/erros', label: 'Erros', icon: '📝' },
  { to: '/simulado', label: 'Simulado', icon: '📋' },
  { to: '/progresso', label: 'Progresso', icon: '📈' },
]

export default function AppShell() {
  const location = useLocation()
  const [uiState, setUiState] = useState(() => loadSavedUiState())

  useEffect(() => {
    function handleUiChange(event) {
      if (event?.detail) {
        setUiState(event.detail)
      } else {
        setUiState(loadSavedUiState())
      }
    }
    window.addEventListener(UI_STATE_CHANGE_EVENT, handleUiChange)
    return () => window.removeEventListener(UI_STATE_CHANGE_EVENT, handleUiChange)
  }, [])

  const headerContext = useMemo(() => {
    const currentUiState = uiState || loadSavedUiState()
    const path = location.pathname || '/'
    const matMatch = path.match(/^\/(?:materiais|materias)\/([^/]+)/)
    const discMatch = path.match(/^\/disciplinas\/([^/]+)/)

    let activeMaterial = null
    let activeDiscipline = null

    if (matMatch?.[1]) {
      activeMaterial = getMaterialBySlideId(decodeURIComponent(matMatch[1]))
      if (activeMaterial) {
        activeDiscipline = getDisciplineById(activeMaterial.disciplineId)
      }
    } else if (discMatch?.[1]) {
      activeDiscipline = getDisciplineById(decodeURIComponent(discMatch[1]))
    } else if (path === '/' || path === '/estudar') {
      if (
        currentUiState?.selectedSlideId &&
        currentUiState?.viewMode !== 'disciplines' &&
        currentUiState?.viewMode !== 'discipline'
      ) {
        activeMaterial = getMaterialBySlideId(currentUiState.selectedSlideId)
        if (activeMaterial) {
          activeDiscipline = getDisciplineById(activeMaterial.disciplineId)
        }
      } else if (
        currentUiState?.selectedDisciplineId &&
        currentUiState?.viewMode &&
        currentUiState.viewMode !== 'disciplines'
      ) {
        activeDiscipline = getDisciplineById(currentUiState.selectedDisciplineId)
      }
    }

    if (activeMaterial && activeDiscipline) {
      return {
        logo: activeDiscipline.icone || '⚕️',
        title: `Central de Estudos — ${activeDiscipline.nome}`,
        subtitle: `${activeDiscipline.nome} · ${activeMaterial.nome}`,
        disciplineName: activeDiscipline.nome,
        materialName: activeMaterial.nome,
      }
    }

    if (activeDiscipline) {
      return {
        logo: activeDiscipline.icone || '⚕️',
        title: `Central de Estudos — ${activeDiscipline.nome}`,
        subtitle: activeDiscipline.resumoCabecalho,
        disciplineName: activeDiscipline.nome,
        materialName: null,
      }
    }

    return {
      logo: '⚕️',
      title: 'Central de Estudos',
      subtitle: 'Biomedicina · Bioquímica · Bromatologia · Biofísica',
      disciplineName: null,
      materialName: null,
    }
  }, [location.pathname, uiState])

  useEffect(() => {
    if (headerContext.materialName && headerContext.disciplineName) {
      document.title = `${headerContext.disciplineName} · ${headerContext.materialName} | Central de Estudos`
    } else if (headerContext.disciplineName) {
      document.title = `${headerContext.disciplineName} | Central de Estudos`
    } else {
      document.title = 'Central de Estudos — Biomedicina'
    }
  }, [headerContext])

  return (
    <div className="wrap">
      <header className="site-header" data-testid="site-header">
        <div className="brand">
          <div className="logo">{headerContext.logo}</div>
          <div>
            <h1 data-testid="site-header-title">{headerContext.title}</h1>
            <div className="sub" data-testid="site-header-subtitle">
              {headerContext.subtitle}
            </div>
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
