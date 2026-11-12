import raw from './questions.raw.json'
import { TOPICS, getTopic, topicIdFromName } from './topics'

export const QUESTIONS = raw.map((question) => {
  const topicId = topicIdFromName(question.t)
  const topic = getTopic(topicId)
  return {
    ...question,
    id: String(question.id),
    topicId,
    disciplineId: topic?.disciplineId || 'bioquimica',
  }
})

export const BIOQUIMICA_QUESTIONS = QUESTIONS.filter((q) => q.disciplineId === 'bioquimica')
export const BIOFISICA_QUESTIONS = QUESTIONS.filter((q) => q.disciplineId === 'biofisica')

const BY_ID = Object.fromEntries(QUESTIONS.map((question) => [question.id, question]))

export function getQuestion(id) {
  return BY_ID[String(id)]
}

export function topicName(topicId) {
  return TOPICS.find((topic) => topic.id === topicId)?.name || topicId
}

export function questionsByTopic(topicId) {
  return QUESTIONS.filter((question) => question.topicId === topicId)
}

export function examQuestionIds(count = 20, disciplineId = 'bioquimica') {
  const sourcePool = disciplineId
    ? QUESTIONS.filter((question) => question.disciplineId === disciplineId)
    : QUESTIONS
  const grouped = {}
  sourcePool.forEach((question) => {
    grouped[question.t] ??= []
    grouped[question.t].push(question)
  })
  const topics = Object.keys(grouped)
  const selected = []
  let i = 0
  while (selected.length < count && selected.length < sourcePool.length) {
    const topic = topics[i % topics.length]
    const pool = grouped[topic].filter((question) => !selected.some((item) => item.id === question.id))
    if (pool.length) selected.push(pool[Math.floor(Math.random() * pool.length)])
    i += 1
    if (i > sourcePool.length * 10) break
  }
  return selected.map((question) => question.id)
}
