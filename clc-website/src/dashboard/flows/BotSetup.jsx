import { useEffect, useRef, useState } from 'react'
import { CircleAlert, FileText, Image as ImageIcon, Loader2, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { api } from '../api.js'

/* Bot-wide setup shared by every flow: the files the bot can send, opening hours, staff emails. */

const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']]
export const ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx'

export function size(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export async function uploadBotFile(file, name) {
  const form = new FormData()
  form.append('file', file)
  if (name) form.append('name', name)
  return api('chatbot/media/', { method: 'POST', body: form })
}

export function FileThumb({ file, big = false }) {
  if (file.kind === 'image') return <img className={`fb-thumb ${big ? 'big' : ''}`} src={file.url} alt="" />
  return <span className={`fb-thumb doc ${big ? 'big' : ''}`}><FileText size={big ? 26 : 18} /></span>
}

/* ---------- file library (drawer on the flows page) ---------- */

export function BotFiles({ files, onChange }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)

  const upload = async (list) => {
    setError('')
    setBusy(true)
    try {
      for (const f of list) await uploadBotFile(f)
      onChange()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const rename = async (f, name) => {
    setEditing(null)
    if (!name.trim() || name === f.name) return
    try { await api(`chatbot/media/${f.id}/`, { method: 'PATCH', body: { name } }); onChange() } catch (e) { setError(e.message) }
  }
  const replace = async (f, file) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api(`chatbot/media/${f.id}/`, { method: 'POST', body: form })
      onChange()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const remove = async (f) => {
    setError('')
    try { await api(`chatbot/media/${f.id}/`, { method: 'DELETE' }); onChange() } catch (e) { setError(e.message) }
  }

  return (
    <div className="fb-files">
      <p className="d-hint">Pictures and documents the bot can send with the <b>Send file or image</b> block. WhatsApp allows JPG/PNG pictures up to 5 MB and PDF, Word or Excel documents up to 100 MB.</p>
      <label className={`fb-drop ${busy ? 'busy' : ''}`}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload([...e.dataTransfer.files]) }}>
        <input ref={input} type="file" multiple accept={ACCEPT} onChange={(e) => upload([...e.target.files])} hidden />
        {busy ? <Loader2 className="spin" size={20} /> : <Upload size={20} />}
        <span>{busy ? 'Uploading…' : 'Drop files here or click to upload'}</span>
      </label>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
      {files === null && <Loader2 className="spin" />}
      {files?.length === 0 && <p className="fb-muted">No files yet.</p>}
      <ul className="fb-file-list">
        {files?.map((f) => (
          <li key={f.id} className={f.name.includes('PLACEHOLDER') ? 'placeholder' : ''}>
            <a href={f.url} target="_blank" rel="noreferrer"><FileThumb file={f} /></a>
            <div>
              {editing === f.id
                ? <input autoFocus defaultValue={f.name} onBlur={(e) => rename(f, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null) }} />
                : <strong>{f.name.replace(' – PLACEHOLDER', '')}{f.name.includes('PLACEHOLDER') && <span className="fb-tag">Replace me</span>}</strong>}
              <small>{f.kind === 'image' ? <ImageIcon size={12} /> : <FileText size={12} />} {f.file_name} · {size(f.size_bytes)}</small>
            </div>
            <label className="fb-icon" title="Replace the file (flows that send it get the new one)">
              <input type="file" accept={ACCEPT} hidden onChange={(e) => replace(f, e.target.files[0])} /><RefreshCw size={15} />
            </label>
            <button type="button" className="fb-icon" title="Rename" onClick={() => setEditing(f.id)}><Pencil size={15} /></button>
            <button type="button" className="fb-icon" title="Delete" onClick={() => remove(f)}><Trash2 size={15} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- picker used by the Send file block ---------- */

export function MediaPicker({ field, value, onChange, langs, lang, setLang, files, onFilesChange, LangTabs }) {
  const v = value || {}
  const current = files?.find((f) => f.id === v[lang])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pick = (id) => onChange({ ...v, [lang]: id })
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const f = await uploadBotFile(file)
      await onFilesChange()
      pick(f.id)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="fb-field">
      <div className="fb-field-head">
        <label>{field.label}{field.required && <b> *</b>}</label>
        <LangTabs langs={langs} lang={lang} setLang={setLang} value={v} />
      </div>
      <select value={v[lang] || ''} onChange={(e) => pick(e.target.value)}>
        <option value="">{langs.some((l) => l !== lang && v[l]) ? 'Same file as the other language' : 'Choose a file…'}</option>
        {files?.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.kind === 'image' ? 'picture' : 'document'})</option>)}
      </select>
      {current && (
        <div className="fb-media-preview">
          <FileThumb file={current} big />
          <div><strong>{current.name}</strong><small>{current.file_name} · {size(current.size_bytes)}</small></div>
        </div>
      )}
      <label className="fb-add fb-upload">
        <input type="file" accept={ACCEPT} hidden onChange={(e) => upload(e.target.files[0])} />
        {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Upload a new file
      </label>
      {error && <p className="fb-error"><CircleAlert size={14} /> {error}</p>}
      {field.help && <small className="fb-help">{field.help}</small>}
    </div>
  )
}

/* ---------- opening hours and staff emails (drawer on the flows page) ---------- */

export function BotSettingsForm({ id, onSaved }) {
  const [data, setData] = useState(null)
  const [emails, setEmails] = useState('')
  const [dates, setDates] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('chatbot/settings/').then((d) => {
      setData(d)
      setEmails(d.staff_emails.join(', '))
      setDates(d.business_hours.closed_dates.join(', '))
    }).catch((e) => setError(e.message))
  }, [])
  if (!data) return error ? <p className="fb-error"><CircleAlert size={16} /> {error}</p> : <Loader2 className="spin" />

  const days = data.business_hours.days
  const setDay = (d, periods) => setData({ ...data, business_hours: { ...data.business_hours, days: { ...days, [d]: periods } } })
  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const saved = await api('chatbot/settings/', {
        method: 'PUT',
        body: {
          business_hours: { ...data.business_hours, closed_dates: dates.split(/[\s,]+/).filter(Boolean) },
          staff_emails: emails,
        },
      })
      setData(saved)
      onSaved?.(saved)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form id={id} className="d-form" onSubmit={save}>
      <h4 className="fb-sub">Opening hours <span className="fb-muted">(East Africa Time)</span></h4>
      <p className="d-hint">Used by every <b>Business hours</b> block. Right now CLC is <b>{data.open_now ? 'open' : 'closed'}</b>.</p>
      <table className="fb-hours">
        <tbody>
          {DAYS.map(([d, label]) => {
            const p = days[d]?.[0]
            return (
              <tr key={d} className={p ? '' : 'closed'}>
                <th>{label}</th>
                <td><label className="fb-switch small"><input type="checkbox" checked={!!p} onChange={(e) => setDay(d, e.target.checked ? [['09:00', '17:00']] : [])} /><span>{p ? 'Open' : 'Closed'}</span></label></td>
                <td>{p && <><input type="time" value={p[0]} onChange={(e) => setDay(d, [[e.target.value, p[1]], ...days[d].slice(1)])} /> – <input type="time" value={p[1]} onChange={(e) => setDay(d, [[p[0], e.target.value], ...days[d].slice(1)])} /></>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <label className="d-field"><span>Closed on these dates (public holidays)</span>
        <input value={dates} onChange={(e) => setDates(e.target.value)} placeholder="2026-12-25, 2026-12-26" /></label>

      <h4 className="fb-sub">Staff emails</h4>
      <label className="d-field"><span>Who receives <b>Notify staff</b> emails when a block doesn’t name anyone</span>
        <textarea rows={2} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="name@clc.tz, other@clc.tz" /></label>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
      <p className="d-hint">Last saved: {data.hours_summary}</p>
    </form>
  )
}
