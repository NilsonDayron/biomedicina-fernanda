import { useEffect, useRef } from 'react'
import { useProgress } from '../context/ProgressContext'

export function useStudyTimer() {
  const { recordTime } = useProgress()
  const recordTimeRef = useRef(recordTime)
  recordTimeRef.current = recordTime
  const acc = useRef(0)
  const last = useRef(0)

  useEffect(() => {
    last.current = Date.now()
    const tick = setInterval(() => {
      const now = Date.now()
      acc.current += now - last.current
      last.current = now
      if (acc.current >= 15000) {
        recordTimeRef.current(acc.current)
        acc.current = 0
      }
    }, 5000)
    return () => {
      clearInterval(tick)
      const leftover = acc.current + (Date.now() - last.current)
      if (leftover > 2000) recordTimeRef.current(leftover)
    }
  }, [])
}
