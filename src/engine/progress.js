const DAY_MS = 86400000

export function startOfDayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function yesterdayKey(date = new Date()) {
  return startOfDayKey(new Date(date.getTime() - DAY_MS))
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return startOfDayKey(date)
}

export function createEmptyProgress() {
  return {
    examDate: '2026-10-10',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    progress: {
      totalStudyMs: 0,
      lastStudyDate: null,
      streak: 0,
      longestStreak: 0,
      studyDates: [],
    },
    answers: {},
    sessions: [],
  }
}

export function emptyAnswer(questionId) {
  return {
    questionId,
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastResult: null,
    lastAnsweredAt: null,
    explanationBeforeCount: 0,
    lastExplanationBefore: false,
    nextReviewAt: null,
    intervalDays: 0,
    ease: 2.5,
    inErrorNotebook: false,
    errorCount: 0,
    consecutiveCorrect: 0,
  }
}

function nextInterval(record, ok) {
  if (!ok) {
    return { intervalDays: 1, ease: Math.max(1.3, (record.ease || 2.5) - 0.2) }
  }
  const ease = Math.min(2.8, (record.ease || 2.5) + 0.1)
  if (!record.intervalDays) return { intervalDays: 1, ease }
  if (record.intervalDays === 1) return { intervalDays: 3, ease }
  if (record.intervalDays === 3) return { intervalDays: 7, ease }
  return { intervalDays: Math.round(record.intervalDays * ease), ease }
}

export function applyAnswer(state, question, { ok, explainedBefore, now = Date.now() }) {
  const answers = { ...state.answers }
  const current = { ...emptyAnswer(question.id), ...(answers[question.id] || {}) }
  const schedule = nextInterval(current, ok)
  const today = startOfDayKey(new Date(now))

  current.attempts += 1
  current.lastResult = ok ? 'correct' : 'wrong'
  current.lastAnsweredAt = now
  current.lastExplanationBefore = Boolean(explainedBefore)
  if (explainedBefore) current.explanationBeforeCount += 1

  if (ok) {
    current.correct += 1
    current.consecutiveCorrect += 1
    if (current.consecutiveCorrect >= 2) current.inErrorNotebook = false
  } else {
    current.wrong += 1
    current.errorCount += 1
    current.consecutiveCorrect = 0
    current.inErrorNotebook = true
  }

  current.intervalDays = schedule.intervalDays
  current.ease = schedule.ease
  current.nextReviewAt = addDays(today, schedule.intervalDays)
  answers[question.id] = current

  const progress = applyStudyDay(state.progress, now)
  const sessionPatch = {
    lastQuestionId: question.id,
    lastOk: ok,
  }

  return {
    ...state,
    answers,
    progress,
    updatedAt: now,
    sessionPatch,
  }
}

export function applyStudyDay(progress, now = Date.now()) {
  const today = startOfDayKey(new Date(now))
  const studyDates = progress.studyDates?.includes(today)
    ? progress.studyDates
    : [...(progress.studyDates || []), today].slice(-400)

  let streak = progress.streak || 0
  if (progress.lastStudyDate === today) {
    streak = progress.streak || 1
  } else if (progress.lastStudyDate === yesterdayKey(new Date(now))) {
    streak = (progress.streak || 0) + 1
  } else {
    streak = 1
  }

  return {
    ...progress,
    lastStudyDate: today,
    studyDates,
    streak,
    longestStreak: Math.max(progress.longestStreak || 0, streak),
  }
}

export function addStudyTime(state, ms, now = Date.now()) {
  if (!ms || ms < 0) return state
  return {
    ...state,
    progress: {
      ...applyStudyDay(state.progress, now),
      totalStudyMs: (state.progress.totalStudyMs || 0) + ms,
    },
    updatedAt: now,
  }
}

export function setExamDate(state, examDate) {
  return { ...state, examDate, updatedAt: Date.now() }
}

export function addSession(state, session) {
  const sessions = [session, ...(state.sessions || [])].slice(0, 40)
  return { ...state, sessions, updatedAt: Date.now() }
}

export function dueReviewIds(state, questions, now = new Date()) {
  const today = startOfDayKey(now)
  return questions
    .filter((question) => {
      const record = state.answers[question.id]
      if (!record?.nextReviewAt) return false
      return record.nextReviewAt <= today
    })
    .sort((a, b) => {
      const ra = state.answers[a.id]
      const rb = state.answers[b.id]
      if (ra.inErrorNotebook !== rb.inErrorNotebook) return ra.inErrorNotebook ? -1 : 1
      return String(ra.nextReviewAt).localeCompare(String(rb.nextReviewAt))
    })
    .map((question) => question.id)
}

export function errorNotebookIds(state) {
  return Object.values(state.answers)
    .filter((record) => record.inErrorNotebook)
    .sort((a, b) => (b.lastAnsweredAt || 0) - (a.lastAnsweredAt || 0))
    .map((record) => record.questionId)
}
