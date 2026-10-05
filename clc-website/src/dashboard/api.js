// Calls to the Django API with the signed-in user's portal tokens.
// The access token is short-lived (15 min). When the API answers 401 we trade the refresh
// token for a new pair once and retry; if that fails the user is sent back to the login page.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.detail || data?.error || `Request failed (${status})`)
    this.status = status
    this.data = data
  }
}

const KEY = 'clc_auth'

export function readAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function clearAuth() {
  sessionStorage.removeItem(KEY)
}

let refreshing = null // one refresh at a time, shared by every request that hits a 401

function refreshTokens() {
  if (!refreshing) {
    refreshing = (async () => {
      const auth = readAuth()
      if (!auth?.refresh) return false
      try {
        const res = await fetch('/api/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: auth.refresh }),
        })
        if (!res.ok) return false
        const data = await res.json()
        sessionStorage.setItem(KEY, JSON.stringify({ ...auth, access: data.access, refresh: data.refresh }))
        return true
      } catch {
        return false
      }
    })().finally(() => { refreshing = null })
  }
  return refreshing
}

function sessionExpired() {
  clearAuth()
  window.location.hash = '#/login'
}

async function send(path, method, body) {
  const access = readAuth()?.access
  return fetch(`/api/${path}`, {
    method,
    // FormData (file uploads) sets its own multipart header
    headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(access ? { Authorization: `Bearer ${access}` } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  })
}

export async function api(path, { method = 'GET', body } = {}) {
  let res = await send(path, method, body)
  if (res.status === 401 && readAuth()?.refresh) {
    if (await refreshTokens()) res = await send(path, method, body)
    else sessionExpired()
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

// Downloads a protected file (the browser cannot send our token on a plain link).
export async function download(path, filename) {
  let res = await send(path, 'GET')
  if (res.status === 401 && (await refreshTokens())) res = await send(path, 'GET')
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})))
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

// Ends the portal session on the server and revokes the refresh token, then clears the browser.
export async function signOut() {
  const auth = readAuth()
  try {
    if (auth?.access) await api('auth/logout/', { method: 'POST', body: { refresh: auth.refresh } })
  } catch { /* offline or already expired: still sign out locally */ }
  clearAuth()
  window.location.hash = '#/login'
}
