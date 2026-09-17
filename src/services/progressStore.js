import { DEMO_UID } from '../firebase/auth'
import { isCloudSyncEnabled } from '../firebase/config'
import { loadRemoteProgress, saveRemoteProgress, subscribeRemoteProgress } from '../firebase/firestore'
import { createEmptyProgress } from '../engine/progress'
import { DEFAULT_EXAM_DATE } from '../data/exam'

const PREFIX = 'biomedicina.progress.v1.'

function storageKey(uid) {
  return PREFIX + uid
}

function readLocal(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeLocal(uid, state) {
  localStorage.setItem(storageKey(uid), JSON.stringify(state))
}

export function newProgressState(uid) {
  return { uid, ...createEmptyProgress(), examDate: DEFAULT_EXAM_DATE }
}

export async function loadProgress(uid) {
  const fallback = newProgressState(uid)
  const local = readLocal(uid)
  const base = local ? { ...fallback, ...local, uid } : fallback
  if (uid === DEMO_UID || !isCloudSyncEnabled()) return base
  try {
    const remote = await loadRemoteProgress(uid, base)
    writeLocal(uid, remote)
    return remote
  } catch (error) {
    console.warn('Falha ao ler Firestore, usando cache local.', error)
    return base
  }
}

export async function saveProgress(uid, state) {
  const next = { ...state, uid, updatedAt: Date.now() }
  writeLocal(uid, next)
  if (uid === DEMO_UID || !isCloudSyncEnabled()) return next
  try {
    await saveRemoteProgress(uid, next)
  } catch (error) {
    console.warn('Falha ao salvar no Firestore. O progresso permanece neste dispositivo.', error)
  }
  return next
}

export function subscribeProgress(uid, onData) {
  if (uid === DEMO_UID || !isCloudSyncEnabled()) return () => {}
  const fallback = newProgressState(uid)
  return subscribeRemoteProgress(uid, fallback, (state) => {
    writeLocal(uid, state)
    onData(state)
  })
}
