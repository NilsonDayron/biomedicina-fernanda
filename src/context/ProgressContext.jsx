import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { loadProgress, saveProgress, subscribeProgress } from '../services/progressStore'
import { addSession, addStudyTime, applyAnswer, setExamDate } from '../engine/progress'
import { allMastery, overallAccuracy } from '../engine/mastery'

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)
  const skipRemote = useRef(false)

  useEffect(() => {
    if (!user) {
      setState(null)
      setLoading(false)
      return undefined
    }
    let alive = true
    setLoading(true)
    loadProgress(user.uid).then((data) => {
      if (alive) {
        setState(data)
        setLoading(false)
      }
    })
    const unsub = subscribeProgress(user.uid, (remote) => {
      if (skipRemote.current) return
      setState(remote)
    })
    return () => {
      alive = false
      unsub()
    }
  }, [user])

  const persist = useCallback(
    (next) => {
      if (!user) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        skipRemote.current = true
        saveProgress(user.uid, next).finally(() => {
          setTimeout(() => {
            skipRemote.current = false
          }, 800)
        })
      }, 350)
    },
    [user],
  )

  const update = useCallback(
    (updater) => {
      setState((current) => {
        if (!current) return current
        const next = typeof updater === 'function' ? updater(current) : updater
        persist(next)
        return next
      })
    },
    [persist],
  )

  const value = useMemo(() => {
    if (!state) {
      return { state: null, loading, update, recordAnswer() {}, recordTime() {}, saveSession() {}, changeExamDate() {} }
    }
    return {
      state,
      loading,
      update,
      mastery: allMastery(state.answers),
      totals: overallAccuracy(state.answers),
      recordAnswer(question, payload) {
        let result
        update((current) => {
          const next = applyAnswer(current, question, payload)
          result = next
          return next
        })
        return result
      },
      recordTime(ms) {
        if (!ms) return
        update((current) => addStudyTime(current, ms))
      },
      saveSession(session) {
        update((current) => addSession(current, session))
      },
      changeExamDate(date) {
        update((current) => setExamDate(current, date))
      },
    }
  }, [state, loading, update])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress fora do ProgressProvider')
  return ctx
}
