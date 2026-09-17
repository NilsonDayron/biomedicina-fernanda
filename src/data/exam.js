/** Datas oficiais da agenda da Profa. Ana Cristina Alvarenga Luz (turma N1 2026/2). */
export const COURSE = {
  name: 'Fundamentos de Bioquímica',
  university: 'Universidade Salgado de Oliveira',
  professor: 'Ana Cristina Alvarenga Luz',
  classGroup: 'Turma N1 — 2026/2',
}

export const EVALUATION_DATES = [
  { id: 'v1', label: 'V1 presencial', date: '2026-10-10', weight: 'peso 2' },
  { id: 'r1', label: 'R1 presencial', date: '2026-10-31', weight: 'até 7,0' },
  { id: 'vt', label: 'VT on-line', date: '2026-11-07', weight: 'peso 1 · 10 questões' },
  { id: 'v2', label: 'V2 presencial', date: '2026-12-05', weight: 'peso 2' },
  { id: 'vs', label: 'VS presencial', date: '2026-12-19', weight: 'média final' },
]

export const DEFAULT_EXAM_DATE = '2026-10-10'

export function daysUntil(dateStr, now = new Date()) {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T23:59:59`)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / 86400000)
}

export function nextEvaluation(now = new Date()) {
  const today = now.toISOString().slice(0, 10)
  return EVALUATION_DATES.find((item) => item.date >= today) || EVALUATION_DATES.at(-1)
}
