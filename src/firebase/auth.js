import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { getFirebase, isCloudSyncEnabled } from './config'

export const DEMO_UID = 'local-demo'
export const DEMO_USER = {
  uid: DEMO_UID,
  email: 'local@navegador',
  displayName: 'Fernanda',
  isDemo: true,
}
export const LOCAL_USER = DEMO_USER

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
  if (!isCloudSyncEnabled()) {
    callback(null)
    return () => {}
  }
  const { auth } = getFirebase()
  return onAuthStateChanged(auth, callback)
}

export async function registerWithEmail(email, password, displayName) {
  if (!isCloudSyncEnabled()) throw new Error('Sincronização na nuvem desligada.')
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
  if (!isCloudSyncEnabled()) throw new Error('Sincronização na nuvem desligada.')
  const { auth } = getFirebase()
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    return cred.user
  } catch (error) {
    throw new Error(mapAuthError(error))
  }
}

export async function logoutFirebase() {
  if (!isCloudSyncEnabled()) return
  const { auth } = getFirebase()
  await signOut(auth)
}
