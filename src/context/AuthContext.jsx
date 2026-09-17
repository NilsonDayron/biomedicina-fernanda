import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEMO_USER,
  loginWithEmail,
  logoutFirebase,
  registerWithEmail,
  watchAuth,
} from '../firebase/auth'
import { isFirebaseConfigured } from '../firebase/config'

const AuthContext = createContext(null)
const DEMO_FLAG = 'biomedicina.demo.v1'

export function AuthProvider({ children }) {
  const firebaseReady = isFirebaseConfigured()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseReady) {
      if (localStorage.getItem(DEMO_FLAG) === '1') setUser(DEMO_USER)
      setReady(true)
      return undefined
    }
    const unsub = watchAuth((firebaseUser) => {
      if (firebaseUser) {
        localStorage.removeItem(DEMO_FLAG)
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          isDemo: false,
        })
      } else if (localStorage.getItem(DEMO_FLAG) === '1') {
        setUser(DEMO_USER)
      } else {
        setUser(null)
      }
      setReady(true)
    })
    return unsub
  }, [firebaseReady])

  const value = useMemo(
    () => ({
      user,
      ready,
      error,
      firebaseReady,
      async login(email, password) {
        setError('')
        await loginWithEmail(email, password)
      },
      async register(email, password, name) {
        setError('')
        await registerWithEmail(email, password, name)
      },
      enterDemo() {
        localStorage.setItem(DEMO_FLAG, '1')
        setUser(DEMO_USER)
      },
      async logout() {
        localStorage.removeItem(DEMO_FLAG)
        setUser(null)
        await logoutFirebase()
      },
    }),
    [user, ready, error, firebaseReady],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
