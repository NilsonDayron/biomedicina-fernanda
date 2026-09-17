import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { getFirebase, isFirebaseConfigured } from './config'

export const DEMO_UID = 'local-demo'
export const DEMO_USER = {
  uid: DEMO_UID,
  email: 'demo@local',
  displayName: 'Modo local',
  isDemo: true,
}

function mapAuthError(error) {
  const code = error?.code || ''
  if (code.includes('email-already-in-use')) return 'Este e-mail já possui conta.'
  if (code.includes('invalid-email')) return 'E-mail inválido.'
  if (code.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'E-mail ou senha incorretos.'
  }
  if (code.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco.'
  if (code.includes('network')) return 'Falha de rede ao falar com o Firebase.'
  return error?.message || 'Não foi possível autenticar.'
}

export function watchAuth(callback) {
  if (!isFirebaseConfigured()) {
    callback(null)
    return () => {}
  }
  const { auth } = getFirebase()
  return onAuthStateChanged(auth, callback)
}

export async function registerWithEmail(email, password, displayName) {
  if (!isFirebaseConfigured()) throw new Error('Firebase não configurado.')
  const { auth } = getFirebase()
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    if (displayName) await updateProfile(cred.user, { displayName })
    return cred.user
  } catch (error) {
    throw new Error(mapAuthError(error))
  }
}

export async function loginWithEmail(email, password) {
  if (!isFirebaseConfigured()) throw new Error('Firebase não configurado.')
  const { auth } = getFirebase()
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    return cred.user
  } catch (error) {
    throw new Error(mapAuthError(error))
  }
}

export async function logoutFirebase() {
  if (!isFirebaseConfigured()) return
  const { auth } = getFirebase()
  await signOut(auth)
}
