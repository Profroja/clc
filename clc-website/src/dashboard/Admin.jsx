import { useEffect, useState } from 'react'
import { Building2, Check, CircleAlert, FileText, KeyRound, Loader2, MapPin, Pencil, Power, Search, UserPlus, Users, Workflow } from 'lucide-react'
import { api } from './api.js'
import { firms as firmData, flows as flowData, ROLES, SERVICES, users as userData } from './data.js'
import { Avatar, Badge, BarChart, Card, DetailList, Drawer, Field, Modal, PageHead, StatCard } from './shared.jsx'

const serviceName = (code) => SERVICES.find((s) => s.code === code)?.name || code

/* ---------------- Overview ---------------- */
export function AdminOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('admin/overview/').then(setData).catch((e) => setError(e.message)) }, [])

  return (
    <>
      <PageHead title="Overview" sub="What is happening across CLC." />
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      {!data && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {data && (
        <>
          <div className="d-stats">
            <StatCard icon={Building2} label="Law firms" value={data.law_firms.total}
              hint={`${data.law_firms.awaiting_approval} awaiting approval · ${data.law_firms.approved} approved`} tone="gold" />
            <StatCard icon={Users} label="Platform users" value={data.users.total}
              hint={`${data.users.not_signed_in_yet} yet to sign in`} tone="blue" delay={0.05} />
            <StatCard icon={Workflow} label="Chatbot flows" value={data.flows.total}
              hint={`${data.flows.live} live · ${data.flows.with_changes} with unpublished changes`} tone="green" delay={0.1} />
            <StatCard icon={FileText} label="Open cases" value={data.cases.open}
              hint={`${data.cases.new_this_week} new this week`} tone="navy" delay={0.15} />
          </div>
          <Card title="WhatsApp conversations, last 7 days"><BarChart data={data.conversations_per_day} /></Card>
          {data.awaiting_firms.length > 0 && (
            <Card title="Firms waiting for approval">
              <div className="d-table-wrap">
                <table className="d-table">
                  <thead>
                    <tr><th>S/N</th><th>Application no.</th><th>Law firm</th><th>Region</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {data.awaiting_firms.map((f, i) => (
                      <tr key={f.id}>
                        <td>{i + 1}</td>
                        <td>{f.application_number}</td>
                        <td><strong>{f.firm_name}</strong></td>
                        <td>{f.region}</td>
                        <td><Badge>{f.status}</Badge></td>
                        <td><a href="#/app/admin/firms" className="btn btn-navy d-sm">Review</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  )
}
/* ---------------- Users ---------------- */
const ROLE_OPTIONS = [['clc_admin', 'Administrator'], ['firm_admin', 'Law firm admin'], ['advocate', 'Advocate']]
const BLANK = { full_name: '', email: '', phone: '', role: 'firm_admin', organization_id: '', roll_number: '', practising_certificate: '', certificate_expires_on: '' }

export function AdminUsers() {
  const [rows, setRows] = useState(null)
  const [firms, setFirms] = useState([])
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(BLANK)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState(null) // { type: 'edit' | 'password' | 'toggle', user }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const load = () => {
    api('admin/users/').then(setRows).catch((e) => setError(e.message))
    api('admin/firms/').then(setFirms).catch(() => {})
  }
  useEffect(load, [])

  const needsFirm = form.role !== 'clc_admin'
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      await api('admin/users/', { method: 'POST', body: form })
      setOpen(false)
      setForm(BLANK)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = (rows || []).filter((r) => `${r.full_name} ${r.email} ${r.organization} ${r.role_label}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Users" sub="Create accounts and invite people to the platform.">
        <button className="btn btn-gold" onClick={() => { setFormError(''); setOpen(true) }}><UserPlus size={17} /> Create user</button>
      </PageHead>
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      {!rows && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {rows && (
        <Card>
          <div className="d-search"><Search size={16} /><input placeholder="Search by name, email, role or law firm" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>S/N</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Law firm</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {shown.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{u.role_label}</td>
                    <td>{u.role === 'clc_admin' ? '—' : u.organization}</td>
                    <td><Badge>{u.status}</Badge></td>
                    <td>
                      <div className="d-actions">
                        <button className="d-act" data-tip="Edit this user's name, email and phone number." onClick={() => setAction({ type: 'edit', user: u })} aria-label={`Edit ${u.full_name}`}><Pencil size={16} /></button>
                        <button className="d-act" data-tip="Set a new temporary password. Their current password stops working straight away." onClick={() => setAction({ type: 'password', user: u })} aria-label={`Change password for ${u.full_name}`}><KeyRound size={16} /></button>
                        <button className={`d-act ${u.is_active ? 'is-off' : 'is-on'}`} data-tip={u.is_active ? 'Deactivate this account. They will no longer be able to sign in.' : 'Activate this account so they can sign in again.'} onClick={() => setAction({ type: 'toggle', user: u })} aria-label={`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name}`}><Power size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={8} className="fb-muted">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {action && <UserAction action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); load() }} />}

      {open && (
        <Modal title="Create user" onClose={() => setOpen(false)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button form="new-user" className="btn btn-gold" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Create user'}</button></>}>
          <form id="new-user" onSubmit={submit} className="d-form">
            <Field label="Full name"><input required autoFocus value={form.full_name} onChange={set('full_name')} /></Field>
            <Field label="Email"><input type="email" required value={form.email} onChange={set('email')} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={set('phone')} placeholder="+255…" /></Field>
            <Field label="Role">
              <select value={form.role} onChange={set('role')}>
                {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            {needsFirm && (
              <Field label="Law firm">
                <select required value={form.organization_id} onChange={set('organization_id')}>
                  <option value="">Select a registered law firm</option>
                  {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
            )}
            {needsFirm && firms.length === 0 && <p className="d-hint">No law firm has been approved yet. A firm must be registered and approved before people can be attached to it.</p>}
            {form.role === 'advocate' && (
              <>
                <Field label="Roll number"><input required value={form.roll_number} onChange={set('roll_number')} /></Field>
                <Field label="Practising certificate number"><input required value={form.practising_certificate} onChange={set('practising_certificate')} /></Field>
                <Field label="Certificate expiry date"><input type="date" required value={form.certificate_expires_on} onChange={set('certificate_expires_on')} /></Field>
              </>
            )}
            {formError && <p className="fb-error"><CircleAlert size={16} /> {formError}</p>}
            <p className="d-hint">The person receives an email with a temporary password and must choose a new one at first sign-in.</p>
          </form>
        </Modal>
      )}
    </>
  )
}
// Edit / change password / deactivate pop-ups for one user row
function UserAction({ action, onClose, onDone }) {
  const { type, user } = action
  const [form, setForm] = useState({ full_name: user.full_name, email: user.email, phone: user.phone })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // new temporary password
  const base = `admin/users/${user.id}/`

  const run = async (path, method, body) => {
    setBusy(true)
    setError('')
    try {
      const data = await api(path, { method, body })
      if (type === 'password') setResult(data)
      else onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (type === 'edit') {
    return (
      <Modal title="Edit user" onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button form="edit-user" className="btn btn-gold" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Save changes'}</button></>}>
        <form id="edit-user" className="d-form" onSubmit={(e) => { e.preventDefault(); run(base, 'PATCH', form) }}>
          <Field label="Full name"><input required autoFocus value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <p className="d-hint">Changes apply to all of this person's roles.</p>
          {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
        </form>
      </Modal>
    )
  }

  if (type === 'password') {
    return (
      <Modal title="Change password" onClose={result ? onDone : onClose}
        footer={result ? <button className="btn btn-gold" onClick={onDone}>Done</button>
          : <><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" disabled={busy} onClick={() => run(`${base}reset-password/`, 'POST')}>{busy ? <Loader2 size={16} className="spin" /> : 'Set new password'}</button></>}>
        {result ? (
          <>
            <p className="d-text">A new temporary password was set for <strong>{user.full_name}</strong> and emailed to {result.email}.</p>
            <p className="temp-pw">{result.temporary_password}</p>
            <p className="d-hint">This is shown only now. They must choose their own password when they sign in.</p>
          </>
        ) : (
          <>
            <p className="d-text">Set a new temporary password for <strong>{user.full_name}</strong>? Their current password stops working, and they will be asked to choose a new one when they sign in.</p>
            {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
          </>
        )}
      </Modal>
    )
  }

  const off = user.is_active
  return (
    <Modal title={off ? 'Deactivate account' : 'Activate account'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${off ? 'btn-danger' : 'btn-gold'}`} disabled={busy}
          onClick={() => run(`${base}${off ? 'deactivate' : 'activate'}/`, 'POST')}>{busy ? <Loader2 size={16} className="spin" /> : off ? 'Deactivate' : 'Activate'}</button></>}>
      <p className="d-text">{off
        ? <><strong>{user.full_name}</strong> will no longer be able to sign in, in any role. You can activate the account again later.</>
        : <><strong>{user.full_name}</strong> will be able to sign in again.</>}</p>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
    </Modal>
  )
}

/* ---------------- Law firms ---------------- */
export function AdminFirms() {
  const [list, setList] = useState(firmData)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const shown = list.filter((f) => filter === 'all' || f.status === filter)
  const current = list.find((f) => f.id === selected)
  const decide = (id, status) => setList(list.map((f) => (f.id === id ? { ...f, status, approvedAt: status === 'approved' ? new Date().toISOString().slice(0, 10) : f.approvedAt } : f)))

  return (
    <>
      <PageHead title="Law firms" sub="Every registered firm and its registration details." />
      <div className="d-tabs">
        {['all', 'approved', 'pending', 'suspended'].map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      <div className="d-firm-grid">
        {shown.map((f) => (
          <button key={f.id} className="d-firm" onClick={() => setSelected(f.id)}>
            <div className="d-firm-top"><Avatar name={f.name} /><Badge>{f.status}</Badge></div>
            <h3>{f.name}</h3>
            <p><MapPin size={14} /> {f.region}</p>
            <p><FileText size={14} /> {f.registration}</p>
            <div className="d-firm-foot"><span><b>{f.advocates}</b> advocates</span><span><b>{f.cases}</b> cases</span></div>
          </button>
        ))}
      </div>

      {current && (
        <Drawer title={current.name} onClose={() => setSelected(null)}
          footer={current.status === 'pending' ? (
            <><button className="btn btn-ghost" onClick={() => decide(current.id, 'rejected')}>Reject</button>
              <button className="btn btn-gold" onClick={() => decide(current.id, 'approved')}><Check size={16} /> Approve firm</button></>
          ) : current.status === 'approved' ? (
            <button className="btn btn-ghost" onClick={() => decide(current.id, 'suspended')}>Suspend firm</button>
          ) : current.status === 'suspended' ? (
            <button className="btn btn-gold" onClick={() => decide(current.id, 'approved')}>Reinstate firm</button>
          ) : null}>
          <Badge>{current.status}</Badge>
          {current.reason && <p className="d-hint">Reason: {current.reason}</p>}
          <h4 className="d-sub">Registration</h4>
          <DetailList rows={[
            ['Registration number', current.registration], ['TIN', current.tin], ['Region', current.region],
            ['Regions served', current.regions.join(', ')], ['Address', current.address], ['Approved on', current.approvedAt],
          ]} />
          <h4 className="d-sub">Contact</h4>
          <DetailList rows={[['Email', current.email], ['Phone', current.phone]]} />
          <h4 className="d-sub">Services handled</h4>
          <div className="d-chips">{current.services.map((s) => <span key={s}>{serviceName(s)}</span>)}</div>
          <h4 className="d-sub">Verification documents</h4>
          <ul className="d-docs">{current.docs.map((d) => <li key={d}><FileText size={16} /> {d}</li>)}</ul>
        </Drawer>
      )}
    </>
  )
}

/* ---------------- Chatbot flows ---------------- */
// The visual flow builder lives in ./flows (list -> builder -> test chat), backed by /api/chatbot/.
export { default as AdminFlows } from './flows/FlowList.jsx'
