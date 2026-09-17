import { ProgressProvider } from '../../context/ProgressContext.jsx'
import AppShell from './AppShell.jsx'

export default function PrivateLayout() {
  return (
    <ProgressProvider>
      <AppShell />
    </ProgressProvider>
  )
}
