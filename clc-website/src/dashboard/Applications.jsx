import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, Building2, CalendarClock, Check, CircleAlert, Download, FileText, Loader2, ShieldAlert, Star, Upload } from 'lucide-react'
import { api, download } from './api.js'
import { Avatar, Badge, Card, DetailList, PageHead, StatCard } from './shared.jsx'

const GROUPS = [
  ['all', 'All', null],
  ['new', 'New', ['submitted']],
  ['review', 'In review', ['under_review', 'correction_required', 'meeting_pending', 'agreements_pending']],
  ['live', 'Trial & active', ['approved_for_trial', 'active']],
  ['closed', 'Suspended / rejected', ['suspended', 'rejected']],
]
const TOPICS = ['Platform use', 'Client handling', 'Confidentiality', 'Conflicts of interest', 'Financial / tax arrangements', 'Trial period', 'General working terms']
const DOC_TYPES = [
  ['brela_certificate', 'BRELA Certificate'], ['brela_extract', 'BRELA Extract'], ['partnership_deed', 'Partnership Deed'],
  ['business_licence', 'Business Licence'], ['tin_certificate', 'TIN Certificate'], ['office_proof', 'Proof of office address'],
  ['office_photos', 'Office photographs'], ['rep_id', 'Representative ID'], ['practising_certificate', 'Practising Certificate'], ['other', 'Other'],
]
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—')
const fmtTime = (d) => (d ? new Date(d).toLocaleString() : '—')

function Problems({ items }) {
  if (!items?.length) return null
  return (
    <ul className="ap-problems">
      {items.map((p) => <li key={p}><AlertTriangle size={15} /> {p}</li>)}
    </ul>
  )
}

const DETAIL = /^#\/app\/admin\/firms\/([0-9a-f-]{36})/

export default function AdminFirmsLive() {
  const [id, setId] = useState(() => (window.location.hash.match(DETAIL) || [])[1] || null)
  useEffect(() => {
    const on = () => setId((window.location.hash.match(DETAIL) || [])[1] || null)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id ? <ApplicationPage key={id} id={id} /> : <FirmsList />
}

function FirmsList() {
  const [list, setList] = useState(null)
  const [group, setGroup] = useState('all')
  const [error, setError] = useState('')
  const [compliance, setCompliance] = useState([])

  const load = useCallback(() => {
    api('onboarding/admin/applications/').then(setList).catch((e) => setError(e.message))
    api('onboarding/admin/compliance/').then(setCompliance).catch(() => {})
  }, [])
  useEffect(load, [load])

  const statuses = GROUPS.find(([k]) => k === group)[2]
  const shown = (list || []).filter((a) => !statuses || statuses.includes(a.status))
  const count = (k) => (list || []).filter((a) => !GROUPS.find(([g]) => g === k)[2] || GROUPS.find(([g]) => g === k)[2].includes(a.status)).length
  const expired = compliance.filter((c) => c.expired).length

  return (
    <>
      <PageHead title="Law firms" sub="Applications, registration details and onboarding for every law firm." />
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      <div className="d-stats">
        <StatCard icon={Building2} label="New applications" value={count('new')} hint="Waiting to be reviewed" tone="gold" />
        <StatCard icon={FileText} label="In review" value={count('review')} hint="Documents, meeting, agreements" tone="blue" delay={0.05} />
        <StatCard icon={Check} label="Trial & active" value={count('live')} tone="green" delay={0.1} />
        <StatCard icon={ShieldAlert} label="Expiring soon" value={compliance.length} hint={expired ? `${expired} already expired` : 'Next 60 days'} tone={expired ? 'red' : 'amber'} delay={0.15} />
      </div>

      {compliance.length > 0 && (
        <Card title="Licences and certificates to renew">
          {compliance.slice(0, 6).map((c, i) => (
            <div key={i} className="d-row">
              <Avatar name={c.name} />
              <div className="d-row-main"><strong>{c.name}</strong><small>{c.kind === 'business_licence' ? 'Business licence' : 'Practising certificate'} · {c.firm}</small></div>
              <Badge tone={c.expired ? 'red' : 'amber'}>{c.expired ? 'Expired' : `${c.days_left} days left`}</Badge>
            </div>
          ))}
        </Card>
      )}

      <div className="d-tabs">
        {GROUPS.map(([k, label]) => <button key={k} className={group === k ? 'on' : ''} onClick={() => setGroup(k)}>{label}</button>)}
      </div>

      {!list && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {list && shown.length === 0 && <Card><p className="fb-muted">No applications here yet. Firms apply from “Join the CLC Team” on the website.</p></Card>}
      {shown.length > 0 && (
        <Card>
          <div className="d-table-wrap">
            <table className="d-table clickable">
              <thead>
                <tr><th>S/N</th><th>Application no.</th><th>Law firm</th><th>Region</th><th>Advocates</th><th>Submitted</th><th>Status</th></tr>
              </thead>
              <tbody>
                {shown.map((a, i) => (
                  <tr key={a.id} onClick={() => { window.location.hash = `#/app/admin/firms/${a.id}` }}>
                    <td>{i + 1}</td>
                    <td>{a.application_number}</td>
                    <td><strong>{a.firm_name}</strong></td>
                    <td>{a.region}</td>
                    <td>{a.advocates}</td>
                    <td>{fmt(a.submitted_at)}</td>
                    <td><Badge>{a.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

const TABS = ['Overview', 'Documents', 'Meeting', 'Agreements', 'Decision', 'History']

function ApplicationPage({ id }) {
  const [app, setApp] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [error, setError] = useState(null)

  useEffect(() => { api(`onboarding/admin/applications/${id}/`).then(setApp).catch((e) => setError({ message: e.message })) }, [id])

  // Runs a workflow action and shows the refreshed application, or the reasons it was refused.
  const act = async (path, body, method = 'POST') => {
    setError(null)
    try { setApp(await api(`onboarding/admin/applications/${id}/${path}`, { method, body: body || {} })); return true } catch (e) {
      setError({ message: e.message, problems: e.data?.problems }); return false
    }
  }

  return (
    <>
      <a href="#/app/admin/firms" className="ap-back"><ArrowLeft size={16} /> Law firms</a>
      <PageHead title={app ? app.firm_name : 'Application'} sub={app ? `${app.application_number} · submitted ${fmtTime(app.submitted_at)}` : ''}>
        {app && <Badge>{app.status}</Badge>}
      </PageHead>
      {!app && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {!app && error && <Card><p className="fb-error"><CircleAlert size={16} /> {error.message}</p></Card>}
      {app && (
        <Card>
          <div className="ap-tabs">{TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
          {error && (
            <div className="fb-error ap-error"><CircleAlert size={16} /> <div>{error.message}<Problems items={error.problems} /></div></div>
          )}
          {tab === 'Overview' && <Overview app={app} />}
          {tab === 'Documents' && <Documents app={app} act={act} />}
          {tab === 'Meeting' && <Meeting app={app} act={act} />}
          {tab === 'Agreements' && <Agreements app={app} act={act} />}
          {tab === 'Decision' && <Decision app={app} act={act} />}
          {tab === 'History' && <History app={app} />}
        </Card>
      )}
    </>
  )
}
function Panel({ title, children, wide = false }) {
  return (
    <section className={`ap-panel ${wide ? 'wide' : ''}`}>
      <h4>{title}</h4>
      {children}
    </section>
  )
}

function Overview({ app }) {
  return (
    <div className="ap-grid">
      <Panel title="Registration">
        <DetailList rows={[
          ['Firm name', app.firm_name], ['BRELA number', app.brela_number], ['Registration date', app.registration_date], ['TIN', app.tin],
          ['Business licence', app.licence_number], ['Licence expires', app.licence_expiry],
        ]} />
      </Panel>

      <Panel title="Office">
        <DetailList rows={[
          ['Region', app.region], ['District', app.district], ['Ward', app.ward], ['Street / building', app.street],
          ['Postal address', app.postal_address], ['Map location', app.map_location],
        ]} />
      </Panel>

      <Panel title="Contacts">
        <DetailList rows={[
          ['Phone', app.phone_e164], ['WhatsApp', app.whatsapp_e164], ['Email', app.email], ['Website', app.website],
          ['Contact person', app.contact_person], ['Contact phone', app.contact_person_phone],
        ]} />
      </Panel>

      <Panel title="Firm expertise">
        <div className="d-chips">
          {app.practice_areas.map((a) => <span key={a.code}>{a.code.replace(/_/g, ' ')}</span>)}
          {app.other_areas && <span>{app.other_areas}</span>}
        </div>
        <DetailList rows={[['Regions served', app.regions_served.join(', ')], ['Languages', app.languages.join(', ')]]} />
      </Panel>

      <Panel title={`Partners / proprietors (${app.partners.length})`} wide>
        <div className="ap-people">
          {app.partners.map((p) => (
            <div key={p.id} className="ap-person">
              <strong>{p.full_name}</strong>
              <DetailList rows={[['Email', p.email], ['Phone', p.phone_e164], ['ID number', p.id_number]]} />
              <div className="ap-badges">
                {p.is_managing_partner && <Badge tone="blue">Managing partner</Badge>}
                {p.is_authorized_rep && <Badge tone="green">Authorized rep</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Advocates (${app.advocates.length})`} wide>
        <div className="ap-people">
          {app.advocates.map((a) => (
            <div key={a.id} className="ap-person">
              <strong>{a.full_name}</strong>
              <DetailList rows={[
                ['Roll number', a.roll_number], ['Email', a.email], ['Phone', a.phone_e164],
                ['Practising certificate', a.practising_certificate], ['Certificate expires', a.certificate_expiry],
              ]} />
              <span className="ap-label">Areas of expertise</span>
              <div className="d-chips">{[...a.practice_areas.map((x) => x.replace(/_/g, ' ')), a.other_areas].filter(Boolean).map((x) => <span key={x}>{x}</span>)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
function Documents({ app, act }) {
  const [note, setNote] = useState({})
  const [req, setReq] = useState({ kind: 'document', doc_type: 'other', message: '' })
  const reviewable = ['under_review', 'meeting_pending', 'agreements_pending'].includes(app.status)
  const canAsk = ['under_review', 'correction_required', 'meeting_pending', 'agreements_pending'].includes(app.status)
  return (
    <>
      {app.documents.map((d) => (
        <div key={d.id} className="ap-doc">
          <div className="ap-doc-head">
            <div><strong>{d.type_label}</strong>{d.advocate_name && <small> · {d.advocate_name}</small>}<small>{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB</small></div>
            <Badge>{d.status}</Badge>
            <button className="d-icon-btn" aria-label="Download" onClick={() => download(`onboarding/admin/applications/${app.id}/documents/${d.id}/download/`, d.file_name)}><Download size={16} /></button>
          </div>
          {d.reviewer_note && <p className="ap-muted">Note: {d.reviewer_note}</p>}
          {reviewable && d.status !== 'accepted' && (
            <div className="ap-doc-actions">
              <input placeholder="Reason (needed to request a replacement)" value={note[d.id] || ''} onChange={(e) => setNote({ ...note, [d.id]: e.target.value })} />
              <button className="btn btn-ghost d-sm" onClick={() => act(`documents/${d.id}/review/`, { decision: 'request_replacement', note: note[d.id] })}>Request replacement</button>
              <button className="btn btn-navy d-sm" onClick={() => act(`documents/${d.id}/review/`, { decision: 'accept' })}><Check size={14} /> Accept</button>
            </div>
          )}
        </div>
      ))}
      {app.requests.length > 0 && (
        <>
          <h4 className="d-sub">Requests to the firm</h4>
          {app.requests.map((r) => <p key={r.id} className={`ap-request ${r.resolved_at ? 'done' : ''}`}>{r.message} <small>{r.resolved_at ? 'resolved' : 'open'}</small></p>)}
        </>
      )}
      {canAsk && (
        <>
          <h4 className="d-sub">Ask the firm for a correction or an additional document</h4>
          <div className="d-form">
            <select value={req.kind} onChange={(e) => setReq({ ...req, kind: e.target.value })}>
              <option value="document">Replacement / additional document</option><option value="correction">Correction to the form</option>
            </select>
            {req.kind === 'document' && <select value={req.doc_type} onChange={(e) => setReq({ ...req, doc_type: e.target.value })}>{DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
            <textarea rows={3} placeholder="What does the firm need to fix or provide?" value={req.message} onChange={(e) => setReq({ ...req, message: e.target.value })} />
            <button className="btn btn-gold" onClick={async () => { if (await act('requests/', req)) setReq({ ...req, message: '' }) }}>Send request</button>
          </div>
        </>
      )}
    </>
  )
}

function Meeting({ app, act }) {
  const [form, setForm] = useState({ scheduled_at: '', meeting_type: 'online', location_or_link: '', participants: '' })
  const [edit, setEdit] = useState({})
  const canMeet = ['under_review', 'meeting_pending', 'agreements_pending'].includes(app.status)
  const [adding, setAdding] = useState(false)
  const showForm = adding || app.meetings.length === 0 // the form only shows by default when there is no meeting yet
  return (
    <>
      <p className="ap-muted">One onboarding meeting (physical or online) is required before approval. Discuss platform use, client handling, confidentiality, conflicts of interest, financial/tax arrangements, the trial period and working terms.</p>
      {app.meetings.map((m) => {
        const e = edit[m.id] || { notes: m.notes, participants: m.participants, topics: m.topics, outcome: m.outcome }
        const set = (patch) => setEdit({ ...edit, [m.id]: { ...e, ...patch } })
        return (
          <div key={m.id} className="ap-doc">
            <div className="ap-doc-head">
              <div><strong><CalendarClock size={15} /> {fmtTime(m.scheduled_at)}</strong><small>{m.meeting_type} {m.location_or_link && `· ${m.location_or_link}`}</small></div>
              <Badge>{m.outcome}</Badge>
            </div>
            {m.outcome === 'completed' && (
              <div className="ap-summary">
                <DetailList rows={[['Participants', m.participants], ['Notes', m.notes]]} />
                {m.topics.length > 0 && (
                  <>
                    <span className="ap-label">Topics discussed</span>
                    <div className="d-chips">{m.topics.map((x) => <span key={x}>{x}</span>)}</div>
                  </>
                )}
              </div>
            )}
            {canMeet && m.outcome !== 'completed' && (
              <div className="d-form">
                <input placeholder="Participants" value={e.participants} onChange={(x) => set({ participants: x.target.value })} />
                <div className="d-chips ap-topics">
                  {TOPICS.map((t) => <button key={t} type="button" className={e.topics.includes(t) ? 'on' : ''} onClick={() => set({ topics: e.topics.includes(t) ? e.topics.filter((x) => x !== t) : [...e.topics, t] })}>{t}</button>)}
                </div>
                <textarea rows={3} placeholder="Notes" value={e.notes} onChange={(x) => set({ notes: x.target.value })} />
                <select value={e.outcome} onChange={(x) => set({ outcome: x.target.value })}>
                  <option value="scheduled">Scheduled</option><option value="completed">Completed</option>
                  <option value="not_satisfactory">Not satisfactory</option><option value="cancelled">Cancelled</option>
                </select>
                <button className="btn btn-navy d-sm" onClick={() => act(`meetings/${m.id}/`, e, 'PATCH')}>Save meeting</button>
              </div>
            )}
          </div>
        )
      })}
      {canMeet && !showForm && (
        <button className="btn btn-outline-navy" onClick={() => setAdding(true)}><CalendarClock size={16} /> Schedule another meeting</button>
      )}
      {canMeet && showForm && (
        <>
          <h4 className="d-sub">{app.meetings.length ? 'Schedule another meeting' : 'Schedule a meeting'}</h4>
          <div className="d-form">
            <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            <select value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}><option value="online">Online</option><option value="physical">Physical</option></select>
            <input placeholder="Link or address" value={form.location_or_link} onChange={(e) => setForm({ ...form, location_or_link: e.target.value })} />
            <input placeholder="Participants" value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
            <div className="ap-doc-actions">
              <button className="btn btn-gold" onClick={async () => { if (await act('meetings/', form)) { setForm({ ...form, scheduled_at: '' }); setAdding(false) } }}>Schedule</button>
              {app.meetings.length > 0 && <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>}
            </div>
          </div>
        </>
      )}
    </>
  )
}
function Agreements({ app, act }) {
  const [busy, setBusy] = useState(null)
  const canUpload = app.status === 'agreements_pending'
  const upload = async (type, file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setBusy(type)
    await act(`agreements/${type}/upload/`, fd)
    setBusy(null)
  }
  return (
    <>
      <p className="ap-muted">Upload the signed copy of each of the four agreements. The firm can be approved once all four are uploaded. Uploading opens once the meeting is completed.</p>
      {app.agreements.map((a) => (
        <div key={a.type} className="ap-doc">
          <div className="ap-doc-head">
            <div><strong>{a.label}</strong>{a.has_file && <small>{a.file_name} · uploaded {a.signed_at}</small>}</div>
            <Badge tone={a.has_file ? 'green' : 'amber'}>{a.has_file ? 'uploaded' : 'pending'}</Badge>
            {a.has_file && (
              <button className="d-icon-btn" aria-label="Download" onClick={() => download(`onboarding/admin/applications/${app.id}/agreements/${a.type}/download/`, a.file_name)}><Download size={16} /></button>
            )}
          </div>
          {canUpload && (
            <label className="btn btn-outline-navy d-sm ap-upload">
              {busy === a.type ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} {a.has_file ? 'Replace file' : 'Upload signed agreement'}
              <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { upload(a.type, e.target.files[0]); e.target.value = '' }} />
            </label>
          )}
        </div>
      ))}
    </>
  )
}
function Decision({ app, act }) {
  const [reason, setReason] = useState('')
  const [dates, setDates] = useState({ trial_start: '', billing_effective: '' })
  const s = app.status
  return (
    <>
      {app.trial.start && (
        <DetailList rows={[['Trial start', app.trial.start], ['Trial end', app.trial.end], ['Billing effective', app.trial.billing_effective]]} />
      )}
      {app.status_reason && <p className="ap-muted">Reason on record: {app.status_reason}</p>}

      {s === 'submitted' && <button className="btn btn-gold" onClick={() => act('start-review/')}>Start review</button>}

      {s === 'under_review' && (
        <>
          <p className="ap-muted">Accept every document, then complete the review to move on to the meeting.</p>
          <Problems items={app.review_blockers} />
          <button className="btn btn-gold" onClick={() => act('complete-review/')}>Complete review</button>
        </>
      )}

      {s === 'agreements_pending' && (
        <>
          <Problems items={app.approval_blockers} />
          <h4 className="d-sub">Approve for the 2-month trial</h4>
          <p className="ap-muted">Approval creates each advocate's account and emails them a temporary password. The Law Firm Admin account is not created automatically: create it on the Users page. Billing starts after the trial unless you set another date.</p>
          <div className="d-form">
            <label className="d-field"><span>Trial start (default today)</span><input type="date" value={dates.trial_start} onChange={(e) => setDates({ ...dates, trial_start: e.target.value })} /></label>
            <label className="d-field"><span>Billing effective date (default end of trial)</span><input type="date" value={dates.billing_effective} onChange={(e) => setDates({ ...dates, billing_effective: e.target.value })} /></label>
            <button className="btn btn-gold" disabled={app.approval_blockers.length > 0}
              onClick={() => act('approve/', Object.fromEntries(Object.entries(dates).filter(([, v]) => v)))}><Check size={16} /> Approve firm</button>
          </div>
        </>
      )}

      {s === 'approved_for_trial' && <button className="btn btn-gold" onClick={() => act('activate/')}>Mark Active (trial finished)</button>}
      {s === 'suspended' && <button className="btn btn-gold" onClick={() => act('reinstate/')}>Reinstate firm</button>}

      {['approved_for_trial', 'active'].includes(s) && (
        <div className="d-form ap-danger">
          <h4 className="d-sub">Suspend this firm</h4>
          <textarea rows={2} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-danger" onClick={() => act('suspend/', { reason })}>Suspend firm</button>
        </div>
      )}
      {['submitted', 'under_review', 'correction_required', 'meeting_pending', 'agreements_pending'].includes(s) && (
        <div className="d-form ap-danger">
          <h4 className="d-sub">Reject this application</h4>
          <textarea rows={2} placeholder="Reason (required, sent to the firm)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-danger" onClick={() => act('reject/', { reason })}>Reject application</button>
        </div>
      )}
    </>
  )
}

function History({ app }) {
  return (
    <ul className="d-timeline">
      {[...app.history].reverse().map((h, i) => <li key={i}><span>{fmtTime(h.at)} · {h.by}</span>{h.action.replace(/[._]/g, ' ')}</li>)}
    </ul>
  )
}
