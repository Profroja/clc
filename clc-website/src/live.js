import { useEffect, useState } from 'react'

// Is CLC live on YouTube right now? The API answers from the YouTube channel (or the admin's manual switch).
// One shared check runs every minute while any component is watching.
const POLL_MS = 60 * 1000
let current = null // null until the first answer
const listeners = new Set()
let timer = null

async function check() {
  try {
    const res = await fetch('/api/live/')
    if (!res.ok) return
    current = await res.json()
    listeners.forEach((fn) => fn(current))
  } catch {
    /* offline: keep the last answer */
  }
}

export function useLive() {
  const [live, setLive] = useState(current)
  useEffect(() => {
    listeners.add(setLive)
    if (current) setLive(current)
    if (!timer) {
      check()
      timer = setInterval(check, POLL_MS)
    }
    return () => {
      listeners.delete(setLive)
      if (!listeners.size) { clearInterval(timer); timer = null }
    }
  }, [])
  return { live, loading: live === null }
}
