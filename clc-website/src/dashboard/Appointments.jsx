import { useEffect, useState } from 'react'
import { Check, CircleAlert, Loader2, UserX, X } from 'lucide-react'
import { api } from './api.js'
import { Badge, Card, DetailList, Field, Modal, PageHead } from './shared.jsx'

const TABS = [['upcoming', 'Upcoming'], ['all', 'All'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]
const TONE = { scheduled: 'blue', completed: 'green', cancelled: 'red', no_show: 'amber' }
const LABEL = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show' }
const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function Appointments() {
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [viewing, setViewing] = useState(null) // the appointment whose details are open
  const [busy, setBusy] = useState(null)

  const load = () => api('admin/appointments/').then(setRows).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const setStatus = async (a, status, note = '') => {
    setBusy(a.id)
    setError('')
    try {
      const updated = await api(`admin/appointments/${a.id}/`, { method: 'PATCH', body: { status, note } })
      setRows((cur) => cur.map((r) => (r.id === a.id ? updated : r)))
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy(null)
    }
  }

  const shown = (rows || []).filter((r) => tab === 'all' || (tab === 'upcoming' ? r.status === 'scheduled' : r.status === tab))
  const upcoming = (rows || []).filter((r) => r.status === 'scheduled').length

  return (
    <>
      <PageHead title="Appointments" sub="Consultations booked by visitors on the website. Each booking is emailed to the client and to you." />
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      <div className="d-tabs">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'upcoming' && rows ? ` (${upcoming})` : ''}</button>)}
      </div>
      {!rows && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {rows && (
        <Card>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>S/N</th><th>Reference</th><th>Client</th><th>Meeting</th><th>Date &amp; time</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {shown.map((a, i) => (
                  <tr key={a.id} className="clickable-row" onClick={() => setViewing(a)}>
                    <td>{i + 1}</td>
                    <td className="nowrap">{a.reference}</td>
                    <td><strong>{a.full_name}</strong></td>
                    <td>{a.meeting_label}</td>
                    <td className="nowrap"><strong>{fmtDate(a.date)}</strong><small>{a.time} EAT</small></td>
                    <td><Badge tone={TONE[a.status]}>{LABEL[a.status]}</Badge></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {a.status === 'scheduled' ? (
                        <div className="u-icons">
                          <button className="u-icon" title="Mark as done" aria-label="Mark as done" disabled={busy === a.id} onClick={() => setStatus(a, 'completed')}><Check size={16} /></button>
                          <button className="u-icon" title="Mark as no show" aria-label="Mark as no show" disabled={busy === a.id} onClick={() => setStatus(a, 'no_show')}><UserX size={16} /></button>
                          <button className="u-icon danger" title="Cancel appointment" aria-label="Cancel appointment" disabled={busy === a.id} onClick={() => setCancelling(a)}><X size={16} /></button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={7} className="fb-muted">No appointments here.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewing && <Details appt={rows.find((r) => r.id === viewing.id) || viewing} onClose={() => setViewing(null)} onUpdated={(u) => setRows((cur) => cur.map((r) => (r.id === u.id ? u : r)))} />}
      {cancelling && <CancelDialog appt={cancelling} onClose={() => setCancelling(null)} onConfirm={async (note) => { if (await setStatus(cancelling, 'cancelled', note)) setCancelling(null) }} />}
    </>
  )
}

function CancelDialog({ appt, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Cancel appointment" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Keep it</button>
        <button className="btn btn-danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(note); setBusy(false) }}>{busy ? <Loader2 size={16} className="spin" /> : 'Cancel appointment'}</button></>}>
      <p className="d-text"><strong>{appt.full_name}</strong> — {appt.reference}, {fmtDate(appt.date)} at {appt.time}. They will be emailed that it was cancelled, and the time becomes free again.</p>
      <div className="d-form"><Field label="Reason (optional, included in the email)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
    </Modal>
  )
}

function Details({ appt: a, onClose, onUpdated }) {
  const [advocates, setAdvocates] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    api('admin/users/').then((rows) => setAdvocates(rows.filter((r) => r.role === 'advocate' && r.is_active && r.status === 'active'))).catch(() => setAdvocates([]))
  }, [])

  const assign = async (advocateId) => {
    setBusy(true)
    setError('')
    try { onUpdated(await api(`admin/appointments/${a.id}/`, { method: 'PATCH', body: { advocate_id: advocateId || null } })) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <Modal wide title="Appointment details" onClose={onClose} footer={<button className="btn btn-gold" onClick={onClose}>Close</button>}>
      <div className="ap-top"><Badge tone={TONE[a.status]}>{LABEL[a.status]}</Badge><span className="ap-num">{a.reference}</span></div>
      <h4 className="d-sub">When and how</h4>
      <DetailList rows={[['Date', fmtDate(a.date)], ['Time', `${a.time} EAT`], ['Meeting', a.meeting_label], ['Service', a.service]]} />
      <h4 className="d-sub">Assigned advocate</h4>
      {!advocates ? <Loader2 className="spin" size={18} /> : (
        <div className="d-form">
          <select value={a.advocate_id || ''} disabled={busy} onChange={(e) => assign(e.target.value)}>
            <option value="">Not assigned</option>
            {advocates.map((v) => <option key={v.id} value={v.id}>{v.full_name} — {v.organization}</option>)}
          </select>
          <small className="d-hint">The advocate sees this appointment, with the client's contact details, on their dashboard.</small>
          {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
        </div>
      )}
      <h4 className="d-sub">Client</h4>
      <DetailList rows={[['Full name', a.full_name], ['Phone', a.phone], ['Email', a.email], ['Language', { sw: 'Kiswahili', en: 'English', zh: '中文' }[a.language] || a.language]]} />
      {a.note && (<><h4 className="d-sub">Note from the client</h4><p className="d-text">{a.note}</p></>)}
      {a.status_note && (<><h4 className="d-sub">{a.status === 'cancelled' ? 'Reason for cancelling' : 'Note'}</h4><p className="d-text">{a.status_note}</p></>)}
      <h4 className="d-sub">Booked</h4>
      <DetailList rows={[['Booked on', new Date(a.created_at).toLocaleString()]]} />
    </Modal>
  )
}
