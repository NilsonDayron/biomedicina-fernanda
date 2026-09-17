import { QUESTIONS, getQuestion, topicName } from '../data/questions'
import { EXPLAIN_DETAIL } from '../data/explain'

export function shuffle(list) {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function matchesStudyTopic(question, mode) {
  if (mode === 'ALL') return true
  const t = `${question.t} ${question.micro}`.toLowerCase()

  if (mode === 'ANAEROBICO') return t.includes('anaer') || t.includes('lactato') || t.includes('ferment')
  if (mode === 'ATP') return t.includes('atp') || t.includes('nad') || t.includes('fad') || t.includes('bioenerg')
  if (mode === 'CADEIA') {
    return (
      t.includes('cadeia respiratória') ||
      t.includes('cadeia respiratoria') ||
      t.includes('fosforilação oxidativa') ||
      t.includes('fosforilacao oxidativa') ||
      t.includes('lançadeira') ||
      t.includes('lancadeira')
    )
  }
  if (mode === 'CARBO') return t.includes('carboidrato') && !t.includes('digestão') && !t.includes('digestao')
  if (mode === 'DIGESTAO') {
    return (
      t.includes('digestão') ||
      t.includes('digestao') ||
      t.includes('amilase') ||
      t.includes('maltase') ||
      t.includes('sacarase') ||
      t.includes('lactase') ||
      t.includes('enterócito') ||
      t.includes('enterocito') ||
      t.includes('microvilos')
    )
  }
  if (mode === 'GLICOLISE') return t.includes('glicólise') || t.includes('glicolise')
  if (mode === 'INSULINA') {
    return t.includes('insulina') || t.includes('glut4') || t.includes('glicemia') || t.includes('diabetes')
  }
  if (mode === 'METABOLISMO') {
    return (
      t.includes('metabolismo') ||
      t.includes('glicogênese') ||
      t.includes('glicogenese') ||
      t.includes('glicogenólise') ||
      t.includes('glicogenolise') ||
      t.includes('gliconeogênese') ||
      t.includes('gliconeogenese')
    )
  }
  if (mode === 'MITO') {
    return t.includes('mitocôndria') || t.includes('mitocondria') || t.includes('respiração') || t.includes('respiracao')
  }
  if (mode === 'PIRUVATO_KREBS') return t.includes('piruvato') || t.includes('krebs') || t.includes('acetil')
  if (mode === 'FUNDAMENTOS') {
    return (
      t.includes('fundamentos') ||
      t.includes('bioquímica') ||
      t.includes('bioquimica') ||
      t.includes('anabolismo') ||
      t.includes('catabolismo') ||
      t.includes('polimer')
    )
  }
  return true
}

export function questionsForMode(mode) {
  return QUESTIONS.filter((question) => matchesStudyTopic(question, mode))
}

export function selectBalanced(source, n) {
  const limit = Math.min(n, source.length)
  const grouped = {}
  source.forEach((question) => {
    grouped[question.t] ??= []
    grouped[question.t].push(question)
  })

  const selected = []
  const topics = Object.keys(grouped)
  let i = 0
  while (selected.length < limit && selected.length < source.length) {
    const topic = topics[i % topics.length]
    const pool = grouped[topic].filter((question) => !selected.some((item) => item.id === question.id))
    if (pool.length) selected.push(pool[Math.floor(Math.random() * pool.length)])
    i += 1
    if (i > source.length * 10) break
  }
  return shuffle(selected)
}

export function buildQueueFromIds(ids) {
  return ids.map((id) => getQuestion(id)).filter(Boolean)
}

export function addRemediation(queue, usedIds, question, mode = 'ALL') {
  const used = new Set(usedIds)
  let pool = QUESTIONS.filter(
    (item) => matchesStudyTopic(item, mode) && item.micro === question.micro && !used.has(item.id),
  )
  if (pool.length < 2) {
    pool = [
      ...pool,
      ...QUESTIONS.filter(
        (item) =>
          matchesStudyTopic(item, mode) &&
          item.t === question.t &&
          !used.has(item.id) &&
          !pool.some((other) => other.id === item.id),
      ),
    ]
  }
  pool = shuffle(pool).slice(0, 2)
  if (pool.length < 2) {
    const fallback = shuffle(
      QUESTIONS.filter((item) => matchesStudyTopic(item, mode) && item.t === question.t && item.id !== question.id),
    ).slice(0, 2 - pool.length)
    pool.push(...fallback)
  }
  return [...queue, ...pool]
}

export function queueCounts(queue, fromIndex) {
  const counts = {}
  queue.slice(fromIndex).forEach((question) => {
    counts[question.t] = (counts[question.t] || 0) + 1
  })
  return Object.entries(counts).map(([topic, count]) => ({ topic, count }))
}

export function buildQuestionExplanation(question) {
  const base =
    EXPLAIN_DETAIL[question.v] ||
    'O enunciado está cobrando a relação central entre os elementos citados na pergunta. Identifique o processo, a molécula ou a etapa metabólica mencionada e relacione com a função que aparece nos slides.'
  const right = question.a[question.c]
  return `${base} Nesta questão, a resposta que completa corretamente o raciocínio é “${right}”.`
}

export function buildMemoryKey(question) {
  const right = question.a[question.c]
  const compact = right.length > 58 ? `${right.slice(0, 55)}…` : right
  return `Chave mental: ${compact}`
}

export function normalizeAnswer(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+\-²³⁺⁻]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isWrittenCorrectionOk(typed, expected) {
  const a = normalizeAnswer(typed)
  const b = normalizeAnswer(expected)
  if (!a) return false
  return a === b || (b.length > 14 && a.includes(b))
}

export function buildReport(history, extrasFromErrors) {
  const total = history.length
  const correct = history.filter((item) => item.ok).length
  const wrong = total - correct
  const byTopic = {}

  history.forEach((item) => {
    const key = item.t || topicName(item.topicId)
    if (!byTopic[key]) byTopic[key] = { c: 0, w: 0, explained: 0, topicId: item.topicId }
    if (item.ok) byTopic[key].c += 1
    else byTopic[key].w += 1
    if (item.explainedBefore) byTopic[key].explained += 1
  })

  const topics = Object.entries(byTopic)
    .map(([name, stats]) => ({
      name,
      topicId: stats.topicId,
      c: stats.c,
      w: stats.w,
      explained: stats.explained,
      p: Math.round((stats.c / (stats.c + stats.w)) * 100),
    }))
    .sort((a, b) => a.p - b.p)

  return {
    total,
    correct,
    wrong,
    extrasFromErrors,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    topics,
    hard: topics.filter((item) => item.p < 70).map((item) => item.name),
    easy: topics.filter((item) => item.p >= 85).map((item) => item.name),
    explainedCount: history.filter((item) => item.explainedBefore).length,
    history,
  }
}
