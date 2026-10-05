import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, CalendarCheck, CircleAlert, Download, FileText, Flame, Loader2, Send, Timer } from 'lucide-react'
import { api, download } from './api.js'
import { Badge, Card, DetailList, Modal, PageHead, StatCard } from './shared.jsx'

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—')
const fmtTime = (d) => (d ? new Date(d).toLocaleString() : '—')
const pad = (n) => String(n).padStart(2, '0')
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const STATUS_TONE = { New: 'amber', 'In progress': 'blue', Closed: 'green' }
const PRIORITY_TONE = { high: 'red', urgent: 'red', low: 'navy', normal: 'blue' }

function useLoad(path) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api(path).then(setData).catch((e) => setError(e.message)) }, [path])
  return { data, error }
}

function Loading({ error }) {
  if (error) return <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>
  return <div className="fb-center-inline"><Loader2 className="spin" /></div>
}

const goMatters = () => { window.location.hash = '#/app/advocate/matters' }
const openMatter = (id) => { window.location.hash = `#/app/advocate/matters/${id}` }

/* ---------------------------------------------------------------- Dashboard */
export function AdvocateOverview() {
  const { data, error } = useLoad('advocate/overview/')
  const [showAppointments, setShowAppointments] = useState(false)

  return (
    <>
      <PageHead title="Advocate dashboard" sub={data ? `${greeting()}, ${data.name.split(' ')[0]}` : ''} />
      {!data ? <Loading error={error} /> : (
        <>
          <div className="adv-cards">
            <button className="adv-card" onClick={goMatters}>
              <StatCard icon={Briefcase} label="New matters" value={pad(data.stats.new_matters)} hint="Waiting for you to start" tone="gold" />
            </button>
            <button className="adv-card" onClick={goMatters}>
              <StatCard icon={Timer} label="In progress" value={pad(data.stats.in_progress)} hint="Matters you are working on" tone="blue" delay={0.05} />
            </button>
            <button className="adv-card" onClick={goMatters}>
              <StatCard icon={Flame} label="High priority" value={pad(data.stats.high_priority)} hint="Need your attention first" tone="red" delay={0.1} />
            </button>
            <button className="adv-card" onClick={() => setShowAppointments(true)}>
              <StatCard icon={CalendarCheck} label="Appointments" value={pad(data.stats.appointments)} hint="Upcoming consultations" tone="navy" delay={0.15} />
            </button>
          </div>

          <h2 className="adv-heading">My assigned matters</h2>
          {data.matters.length === 0 && <Card><p className="fb-muted">No matters are assigned to you yet. They appear here when your firm assigns one.</p></Card>}
          <div className="adv-matters">
            {data.matters.map((m) => (
              <article key={m.id} className="adv-matter">
                <header>
                  <strong>{m.reference}</strong>
                  <Badge tone={STATUS_TONE[m.status_label]}>{m.status_label}</Badge>
                </header>
                <p className="adv-service">{m.service || 'Legal matter'}</p>
                <p className="adv-client">Client: <b>{m.client}</b></p>
                <button className="btn btn-outline-navy d-sm" onClick={() => openMatter(m.id)}>Open matter <ArrowRight size={14} /></button>
              </article>
            ))}
          </div>

          {showAppointments && <AppointmentsDialog onClose={() => setShowAppointments(false)} />}
        </>
      )}
    </>
  )
}

function AppointmentList({ rows }) {
  if (!rows.length) return <p className="fb-muted">No appointments are assigned to you.</p>
  return (
    <div className="d-table-wrap">
      <table className="d-table">
        <thead><tr><th>S/N</th><th>Reference</th><th>Client</th><th>Contact</th><th>Meeting</th><th>Date &amp; time</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.id}>
              <td>{i + 1}</td><td className="nowrap">{a.reference}</td>
              <td><strong>{a.full_name}</strong><small>{a.service}</small></td>
              <td>{a.phone}<small>{a.email}</small></td>
              <td>{a.meeting_label}</td>
              <td className="nowrap"><strong>{fmt(`${a.date}T00:00:00`)}</strong><small>{a.time} EAT</small></td>
              <td><Badge>{a.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AppointmentsDialog({ onClose }) {
  const { data, error } = useLoad('advocate/appointments/')
  return (
    <Modal wide title="My appointments" onClose={onClose} footer={<button className="btn btn-gold" onClick={onClose}>Close</button>}>
      {!data ? <Loading error={error} /> : <AppointmentList rows={data} />}
    </Modal>
  )
}

/* ---------------------------------------------------------------- My details (opened from the user menu) */
export function MyDetailsDialog({ onClose }) {
  const { data, error } = useLoad('advocate/overview/')
  const d = data?.details
  return (
    <Modal title="My details" onClose={onClose} footer={<button className="btn btn-gold" onClick={onClose}>Close</button>}>
      {!d ? <Loading error={error} /> : (
        <DetailList rows={[
          ['Full name', d.full_name], ['Law firm', d.law_firm], ['Email', d.email], ['Phone', d.phone],
          ['Roll number', d.roll_number], ['Practising certificate', d.practising_certificate],
          ['Certificate expires', fmt(d.certificate_expires_on)], ['Verified by CLC', d.verified ? 'Yes' : 'Not yet'],
          ['Areas of expertise', d.areas_of_expertise.join(', ')],
        ]} />
      )}
    </Modal>
  )
}

/* ---------------------------------------------------------------- Matters */
const MATTER = /^#\/app\/advocate\/matters\/([0-9a-f-]{36})/

export function AdvocateMatters() {
  const [id, setId] = useState(() => (window.location.hash.match(MATTER) || [])[1] || null)
  useEffect(() => {
    const on = () => setId((window.location.hash.match(MATTER) || [])[1] || null)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id ? <MatterPage key={id} id={id} /> : <MatterList />
}

function MatterList() {
  const { data, error } = useLoad('advocate/matters/')
  return (
    <>
      <PageHead title="Matters" sub="The matters assigned to you." />
      {!data ? <Loading error={error} /> : (
        <Card>
          {data.length === 0 ? <p className="fb-muted">No matters are assigned to you yet.</p> : (
            <div className="d-table-wrap">
              <table className="d-table">
                <thead><tr><th>S/N</th><th>Reference</th><th>Service</th><th>Client</th><th>Region</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {data.map((m, i) => (
                    <tr key={m.id} className="clickable-row" onClick={() => openMatter(m.id)}>
                      <td>{i + 1}</td>
                      <td className="nowrap"><strong>{m.reference}</strong></td>
                      <td>{m.service || '—'}</td>
                      <td className="nowrap">{m.client}</td>
                      <td>{m.region || '—'}</td>
                      <td><Badge tone={PRIORITY_TONE[m.priority]}>{m.priority}</Badge></td>
                      <td><Badge tone={STATUS_TONE[m.status_label]}>{m.status_label}</Badge></td>
                      <td onClick={(e) => e.stopPropagation()}><button className="btn btn-outline-navy d-sm" onClick={() => openMatter(m.id)}>Open <ArrowRight size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  )
}

const TABS = ['Client messages', 'Documents', 'Appointments', 'Notes', 'Matter status']

function MatterPage({ id }) {
  const [m, setM] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('Client messages')
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api(`advocate/matters/${id}/`).then(setM).catch((e) => setError(e.message)), [id])
  useEffect(() => { load() }, [load])

  const start = async () => {
    setBusy(true)
    try { await api(`advocate/matters/${id}/start/`, { method: 'POST' }); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <a href="#/app/advocate/matters" className="ap-back"><ArrowLeft size={16} /> Matters</a>
      {!m ? <Loading error={error} /> : (
        <>
          <PageHead title={m.reference} sub={`${m.service || 'Legal matter'} · Client ${m.client}`}>
            <Badge tone={STATUS_TONE[m.status_label]}>{m.status_label}</Badge>
            {m.status === 'advocate_assigned' && <button className="btn btn-gold" onClick={start} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Start work'}</button>}
            {m.status === 'active' && !m.ready_to_close_at && <button className="btn btn-outline-navy" onClick={() => setClosing(true)}>Mark ready to close</button>}
          </PageHead>
          {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
          <Card>
            <DetailList rows={[['Service', m.service], ['Region', m.region], ['Priority', m.priority], ['Assigned', fmt(m.assigned_at)], ['Summary', m.summary]]} />
          </Card>
          <Card>
            <div className="ap-tabs">{TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
            {tab === 'Client messages' && <Messages id={id} />}
            {tab === 'Documents' && <Documents id={id} />}
            {tab === 'Appointments' && <MatterAppointments id={id} />}
            {tab === 'Notes' && <Notes id={id} />}
            {tab === 'Matter status' && <Status m={m} />}
          </Card>
          {closing && <ReadyToClose id={id} onClose={() => setClosing(false)} onDone={() => { setClosing(false); load() }} />}
        </>
      )}
    </>
  )
}

function Messages({ id }) {
  const { data, error } = useLoad(`advocate/matters/${id}/messages/`)
  if (!data) return <Loading error={error} />
  if (!data.length) return <p className="fb-muted">There are no messages with the client yet.</p>
  return (
    <>
      <div className="adv-chat">
        {data.map((x) => (
          <div key={x.id} className={`adv-bubble ${x.direction === 'inbound' ? 'in' : 'out'}`}>
            <small>{x.sender === 'client' ? 'Client' : x.sender === 'bot' ? 'CLC bot' : 'CLC team'} · {fmtTime(x.at)}</small>
            <p>{x.body || `(${x.type})`}</p>
          </div>
        ))}
      </div>
      <p className="ap-muted">Messages are read-only here for now. Advocates communicate through the CLC platform, never from a personal WhatsApp number.</p>
    </>
  )
}

const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function Documents({ id }) {
  const { data, error } = useLoad(`advocate/matters/${id}/documents/`)
  if (!data) return <Loading error={error} />
  if (!data.length) return <p className="fb-muted">No documents have been shared on this matter yet.</p>
  return (
    <div className="d-table-wrap">
      <table className="d-table">
        <thead><tr><th>S/N</th><th>File</th><th>Type</th><th>Size</th><th>Added</th><th>Action</th></tr></thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.id}>
              <td>{i + 1}</td>
              <td><span className="adv-file"><FileText size={16} /> <strong>{d.file_name}</strong></span></td>
              <td>{d.category}</td><td>{size(d.size_bytes)}</td><td className="nowrap">{fmt(d.at)}</td>
              <td><button className="u-icon" title="Download" aria-label={`Download ${d.file_name}`} onClick={() => download(`advocate/matters/${id}/documents/${d.id}/download/`, d.file_name)}><Download size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatterAppointments({ id }) {
  const { data, error } = useLoad(`advocate/matters/${id}/appointments/`)
  return !data ? <Loading error={error} /> : <AppointmentList rows={data} />
}

function Notes({ id }) {
  const [notes, setNotes] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api(`advocate/matters/${id}/notes/`).then(setNotes).catch((e) => setError(e.message)) }, [id])

  const add = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try { setNotes(await api(`advocate/matters/${id}/notes/`, { method: 'POST', body: { body: text } })); setText('') } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <>
      <form className="adv-note-form" onSubmit={add}>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a note. Only your law firm can see it." />
        <button className="btn btn-gold" disabled={busy || !text.trim()}>{busy ? <Loader2 size={16} className="spin" /> : <><Send size={15} /> Add note</>}</button>
      </form>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
      {!notes ? <Loading /> : notes.length === 0 ? <p className="fb-muted">No notes yet.</p> : (
        <ul className="adv-notes">
          {notes.map((n) => <li key={n.id}><small>{n.author} · {fmtTime(n.at)}</small><p>{n.body}</p></li>)}
        </ul>
      )}
    </>
  )
}

function Status({ m }) {
  return (
    <>
      <div className="ap-top"><Badge tone={STATUS_TONE[m.status_label]}>{m.status_label}</Badge>
        {m.ready_to_close_at && <span className="ap-muted">Marked ready to close on {fmt(m.ready_to_close_at)}: CLC will close it.</span>}</div>
      {m.ready_to_close_summary && <p className="d-text">{m.ready_to_close_summary}</p>}
      <h4 className="d-sub">History</h4>
      {m.history.length === 0 ? <p className="fb-muted">No changes yet.</p> : (
        <ul className="d-timeline">
          {[...m.history].reverse().map((h, i) => <li key={i}><span>{fmtTime(h.at)} · {h.by}</span>{h.note || `${h.from || 'new'} → ${h.to}`}</li>)}
        </ul>
      )}
    </>
  )
}

function ReadyToClose({ id, onClose, onDone }) {
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => {
    setBusy(true)
    setError('')
    try { await api(`advocate/matters/${id}/ready-to-close/`, { method: 'POST', body: { summary } }); onDone() } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Modal title="Mark ready to close" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" onClick={submit} disabled={busy || !summary.trim()}>{busy ? <Loader2 size={16} className="spin" /> : 'Mark ready to close'}</button></>}>
      <p className="d-text">Tell CLC the work is finished. CLC reviews it and closes the matter.</p>
      <div className="d-form"><label className="d-field"><span>Short summary of the outcome</span><textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} /></label></div>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
    </Modal>
  )
}

/* ---------------------------------------------------------------- Subscription plans */
export function AdvocateSubscription() {
  const { data, error } = useLoad('advocate/subscription/')
  const sub = data?.subscription
  return (
    <>
      <PageHead title="Subscription plans" sub="Your law firm's plan on the CLC platform." />
      {!data ? <Loading error={error} /> : (
        <Card title={data.law_firm}>
          {!sub ? <p className="fb-muted">No subscription details are on record for your firm yet.</p> : (
            <>
              <div className="ap-top"><Badge>{sub.status}</Badge>{sub.in_trial && <span className="ap-muted">{sub.trial_days_left} days of trial left</span>}</div>
              <DetailList rows={[
                ['Plan status', sub.status_label], ['Trial start', fmt(sub.trial_start)], ['Trial end', fmt(sub.trial_end)],
                ['Billing starts', fmt(sub.billing_effective)],
              ]} />
              <p className="ap-muted adv-hint"><CalendarCheck size={15} /> Every newly approved law firm receives a 2-month trial. Any agreed financial terms start after the trial unless CLC sets another date.</p>
            </>
          )}
        </Card>
      )}
    </>
  )
}
