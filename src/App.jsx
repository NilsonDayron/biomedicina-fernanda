import { Navigate, Route, Routes } from 'react-router-dom'
import PrivateLayout from './components/layout/PrivateLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import HomePage from './pages/HomePage.jsx'
import StudyPage from './pages/StudyPage.jsx'
import SubjectsPage from './pages/SubjectsPage.jsx'
import SubjectDetailPage from './pages/SubjectDetailPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import ErrorsPage from './pages/ErrorsPage.jsx'
import ExamPage from './pages/ExamPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import AccountPage from './pages/AccountPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/estudar" element={<StudyPage />} />
        <Route path="/materias" element={<SubjectsPage />} />
        <Route path="/materias/:topicId" element={<SubjectDetailPage />} />
        <Route path="/revisao" element={<ReviewPage />} />
        <Route path="/erros" element={<ErrorsPage />} />
        <Route path="/simulado" element={<ExamPage />} />
        <Route path="/progresso" element={<ProgressPage />} />
        <Route path="/conta" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
