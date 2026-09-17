import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  LOCAL_USER,
  loginWithEmail,
  logoutFirebase,
  registerWithEmail,
  watchAuth,
} from '../firebase/auth'
import { isCloudSyncEnabled } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const cloudSync = isCloudSyncEnabled()
  const [user, setUser] = useState(LOCAL_USER)
  const [ready, setReady] = useState(!cloudSync)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cloudSync) {
      setUser(LOCAL_USER)
      setReady(true)
      return undefined
    }
    const unsub = watchAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          isDemo: false,
        })
      } else {
        setUser(LOCAL_USER)
      }
      setReady(true)
    })
    return unsub
  }, [cloudSync])

  const value = useMemo(
    () => ({
      user,
      ready,
      error,
      firebaseReady: cloudSync,
      cloudSync,
      async login(email, password) {
        setError('')
        await loginWithEmail(email, password)
      },
      async register(email, password, name) {
        setError('')
        await registerWithEmail(email, password, name)
      },
      enterDemo() {
        setUser(LOCAL_USER)
      },
      async logout() {
        setUser(LOCAL_USER)
        await logoutFirebase()
      },
    }),
    [user, ready, error, cloudSync],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
