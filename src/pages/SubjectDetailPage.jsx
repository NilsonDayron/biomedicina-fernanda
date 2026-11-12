import { useParams } from 'react-router-dom'
import IndependentMaterialsHub from '../components/quiz/IndependentMaterialsHub'
import { useProgress } from '../context/ProgressContext'
import { useStudyTimer } from '../hooks/useStudyTimer'

export default function SubjectDetailPage() {
  const { topicId } = useParams()
  const { recordAnswer } = useProgress()
  useStudyTimer()

  return (
    <div>
      <IndependentMaterialsHub
        key={topicId || 'detail'}
        initialSlideId={topicId || null}
        onLegacyAnswer={(question, payload) => recordAnswer(question, payload)}
      />
    </div>
  )
}
