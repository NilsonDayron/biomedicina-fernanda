import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { getFirebase, isCloudSyncEnabled } from './config'

const ALLOWED_TOP = ['uid', 'examDate', 'createdAt', 'updatedAt', 'progress', 'answers', 'sessions']

export function userDocRef(uid) {
  const { db } = getFirebase()
  return doc(db, 'users', uid)
}

function toMillis(value) {
  if (!value) return Date.now()
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  return Date.now()
}

export function serializeState(uid, state) {
  return {
    uid,
    examDate: String(state.examDate || '2026-10-10').slice(0, 10),
    createdAt: state.createdAt || Date.now(),
    updatedAt: serverTimestamp(),
    progress: {
      totalStudyMs: Number(state.progress?.totalStudyMs || 0),
      lastStudyDate: state.progress?.lastStudyDate || null,
      streak: Number(state.progress?.streak || 0),
      longestStreak: Number(state.progress?.longestStreak || 0),
      studyDates: Array.isArray(state.progress?.studyDates) ? state.progress.studyDates.slice(-400) : [],
    },
    answers: state.answers || {},
    sessions: Array.isArray(state.sessions) ? state.sessions.slice(0, 40) : [],
  }
}

export function deserializeState(uid, data, fallback) {
  if (!data) return { ...fallback, uid }
  return {
    uid,
    examDate: data.examDate || fallback.examDate,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    progress: {
      totalStudyMs: Number(data.progress?.totalStudyMs || 0),
      lastStudyDate: data.progress?.lastStudyDate || null,
      streak: Number(data.progress?.streak || 0),
      longestStreak: Number(data.progress?.longestStreak || 0),
      studyDates: Array.isArray(data.progress?.studyDates) ? data.progress.studyDates : [],
    },
    answers: data.answers && typeof data.answers === 'object' ? data.answers : {},
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
  }
}

export async function loadRemoteProgress(uid, fallback) {
  if (!isCloudSyncEnabled()) return fallback
  const snap = await getDoc(userDocRef(uid))
  if (!snap.exists()) return fallback
  return deserializeState(uid, snap.data(), fallback)
}

export async function saveRemoteProgress(uid, state) {
  if (!isCloudSyncEnabled()) return
  const payload = serializeState(uid, state)
  Object.keys(payload).forEach((key) => {
    if (!ALLOWED_TOP.includes(key)) delete payload[key]
  })
  await setDoc(userDocRef(uid), payload, { merge: true })
}

export function subscribeRemoteProgress(uid, fallback, onData) {
  if (!isCloudSyncEnabled()) return () => {}
  return onSnapshot(userDocRef(uid), (snap) => {
    if (!snap.exists()) {
      onData(fallback)
      return
    }
    onData(deserializeState(uid, snap.data(), fallback))
  })
}
