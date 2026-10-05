// Public law firm application API. The applicant has no account: a secret token
// (sent by email after submission) identifies the application.
export class JoinError extends Error {
  constructor(status, data) {
    super(data?.detail || `Request failed (${status})`)
    this.status = status
    this.data = data || {}
  }
}

const KEY = 'clc_join'

export const saved = {
  get() {
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  },
  set(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private mode */ }
  },
  clear() {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  },
}

export async function jreq(path, { method = 'GET', body, form, token } = {}) {
  const res = await fetch(`/api/onboarding/${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Applicant-Token': token } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new JoinError(res.status, data)
  return data
}

// Turns the API's field errors into readable lines.
export function errorLines(err) {
  if (err.data?.problems) return err.data.problems
  if (err.data?.errors) {
    const out = []
    const walk = (v, path) => {
      if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'string' ? out.push(`${path}: ${x}`) : walk(x, `${path} ${i + 1}`)))
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path} / ${k.replace(/_/g, ' ')}` : k.replace(/_/g, ' ')))
      else if (v) out.push(`${path}: ${v}`)
    }
    walk(err.data.errors, '')
    return out
  }
  return [err.message]
}

export const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi', 'Manyara',
  'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma',
  'Shinyanga', 'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Unguja North', 'Unguja South', 'Urban West',
]

export const LANGUAGES = [['sw', 'Kiswahili'], ['en', 'English'], ['zh', '中文']]
