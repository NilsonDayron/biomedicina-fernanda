import { QUESTIONS } from '../data/questions'
import { TOPICS } from '../data/topics'

export function masteryForTopic(answers, topicId) {
  const ids = QUESTIONS.filter((item) => item.topicId === topicId).map((item) => item.id)
  let correct = 0
  let wrong = 0
  let attempts = 0
  let explained = 0
  let errorsOpen = 0

  ids.forEach((id) => {
    const record = answers[id]
    if (!record) return
    correct += record.correct || 0
    wrong += record.wrong || 0
    attempts += record.attempts || 0
    explained += record.explanationBeforeCount || 0
    if (record.inErrorNotebook) errorsOpen += 1
  })

  const seen = ids.filter((id) => answers[id]?.attempts).length
  const total = ids.length
  const ratio = correct + wrong ? correct / (correct + wrong) : 0
  const percent = Math.round(ratio * 100)

  let level = 'nao-iniciado'
  let label = 'Não iniciado'
  if (attempts > 0 && percent < 50) {
    level = 'fragil'
    label = 'Frágil'
  } else if (attempts > 0 && percent < 70) {
    level = 'construcao'
    label = 'Em construção'
  } else if (attempts >= 3 && percent < 85) {
    level = 'consistente'
    label = 'Consistente'
  } else if (attempts >= 3 && percent >= 85) {
    level = 'dominio'
    label = 'Domínio'
  } else if (attempts > 0) {
    level = 'construcao'
    label = 'Em construção'
  }

  return {
    topicId,
    correct,
    wrong,
    attempts,
    explained,
    errorsOpen,
    seen,
    total,
    percent: attempts ? percent : 0,
    level,
    label,
  }
}

export function allMastery(answers) {
  return TOPICS.map((topic) => ({ ...topic, ...masteryForTopic(answers, topic.id) }))
}

export function overallAccuracy(answers) {
  const values = Object.values(answers || {})
  const correct = values.reduce((sum, item) => sum + (item.correct || 0), 0)
  const wrong = values.reduce((sum, item) => sum + (item.wrong || 0), 0)
  const total = correct + wrong
  return {
    correct,
    wrong,
    total,
    percent: total ? Math.round((correct / total) * 100) : 0,
    explained: values.reduce((sum, item) => sum + (item.explanationBeforeCount || 0), 0),
    errorCards: values.filter((item) => item.inErrorNotebook).length,
  }
}

export function formatDuration(ms) {
  const totalMinutes = Math.floor((ms || 0) / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${minutes} min`
}
