"use client"

import { useEffect, useRef, useState } from "react"

/** Brief highlight pulse when `value` changes (e.g. RSVP status update). */
export function useChangePulse<T>(value: T, durationMs = 500): boolean {
  const [active, setActive] = useState(false)
  const prev = useRef(value)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      prev.current = value
      return
    }
    if (prev.current === value) return
    prev.current = value
    setActive(true)
    const timer = window.setTimeout(() => setActive(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [value, durationMs])

  return active
}
