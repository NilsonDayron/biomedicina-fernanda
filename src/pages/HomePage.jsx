import { useParams } from 'react-router-dom'
import IndependentMaterialsHub from '../components/quiz/IndependentMaterialsHub'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

export default function HomePage() {
  const { disciplineId, slideId } = useParams()
  const { recordAnswer } = useProgress()
  useStudyTimer()

  return (
    <div>
      <IndependentMaterialsHub
        key={`${disciplineId || ''}__${slideId || ''}`}
        initialDisciplineId={disciplineId || null}
        initialSlideId={slideId || null}
        onLegacyAnswer={(question, payload) => recordAnswer(question, payload)}
      />
    </div>
  )
}
