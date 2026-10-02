// Calls to the Django API with the signed-in user's portal token.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.detail || data?.error || `Request failed (${status})`)
    this.status = status
    this.data = data
  }
}

function token() {
  try {
    return JSON.parse(sessionStorage.getItem('clc_auth'))?.access || null
  } catch {
    return null
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const t = token()
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
