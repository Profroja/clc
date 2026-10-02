import { useState } from 'react'
import { Building2, Check, FileText, MapPin, Search, UserPlus, Users, Workflow } from 'lucide-react'
import { activity, firms as firmData, flows as flowData, ROLES, SERVICES, users as userData, weekly } from './data.js'
import { Avatar, Badge, BarChart, Card, DetailList, Drawer, Field, PageHead, StatCard } from './shared.jsx'

const serviceName = (code) => SERVICES.find((s) => s.code === code)?.name || code

/* ---------------- Overview ---------------- */
export function AdminOverview() {
  const pending = firmData.filter((f) => f.status === 'pending')
  return (
    <>
      <PageHead title="Good day, Administrator" sub="Here is what is happening across CLC today." />
      <div className="d-stats">
        <StatCard icon={Building2} label="Law firms" value={firmData.length} hint={`${pending.length} awaiting approval`} tone="gold" />
        <StatCard icon={Users} label="Platform users" value={userData.length} hint="2 invitations pending" tone="blue" delay={0.05} />
        <StatCard icon={Workflow} label="Chatbot flows" value={flowData.length} hint="1 draft" tone="green" delay={0.1} />
        <StatCard icon={FileText} label="Open cases" value="29" hint="+6 this week" tone="navy" delay={0.15} />
      </div>
      <div className="d-grid-2">
        <Card title="WhatsApp conversations this week"><BarChart data={weekly} /></Card>
        <Card title="Recent activity">
          <ul className="d-timeline">
            {activity.map((a) => <li key={a.text}><span>{a.t}</span>{a.text}</li>)}
          </ul>
        </Card>
      </div>
      {pending.length > 0 && (
        <Card title="Firms waiting for approval">
          {pending.map((f) => (
            <div key={f.id} className="d-row">
              <Avatar name={f.name} />
              <div className="d-row-main"><strong>{f.name}</strong><small>{f.region} · {f.registration}</small></div>
              <a href="#/app/admin/firms" className="btn btn-navy d-sm">Review</a>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

/* ---------------- Users ---------------- */
export function AdminUsers() {
  const [list, setList] = useState(userData)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'firm_admin', org: firmData[0].name })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    const org = form.role === 'clc_admin' ? 'Community Legal Clinic' : form.org
    setList([{ id: `u${Date.now()}`, name: form.name, email: form.email, role: form.role, org, status: 'invited' }, ...list])
    setForm({ name: '', email: '', phone: '', role: 'firm_admin', org: firmData[0].name })
    setOpen(false)
  }
  const shown = list.filter((u) => `${u.name} ${u.email} ${u.org}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHead title="Users" sub="Create accounts and invite people to the platform.">
        <button className="btn btn-gold" onClick={() => setOpen(true)}><UserPlus size={17} /> Create user</button>
      </PageHead>
      <Card>
        <div className="d-search"><Search size={16} /><input placeholder="Search by name, email or organization" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="d-table-wrap">
          <table className="d-table">
            <thead><tr><th>User</th><th>Role</th><th>Organization</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id}>
                  <td><div className="d-cell-user"><Avatar name={u.name} /><div><strong>{u.name}</strong><small>{u.email}</small></div></div></td>
                  <td>{ROLES[u.role].label}</td>
                  <td>{u.org}</td>
                  <td><Badge>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <Drawer title="Create user" onClose={() => setOpen(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button form="new-user" className="btn btn-gold">Send invitation</button></>}>
          <form id="new-user" onSubmit={submit} className="d-form">
            <Field label="Full name"><input required value={form.name} onChange={set('name')} /></Field>
            <Field label="Email"><input type="email" required value={form.email} onChange={set('email')} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={set('phone')} placeholder="+255…" /></Field>
            <Field label="Role">
              <select value={form.role} onChange={set('role')}>
                {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </Field>
            {form.role !== 'clc_admin' && (
              <Field label="Law firm">
                <select value={form.org} onChange={set('org')}>
                  {firmData.filter((f) => f.status === 'approved').map((f) => <option key={f.id}>{f.name}</option>)}
                </select>
              </Field>
            )}
            <p className="d-hint">The person receives an email invitation and sets their own password.</p>
          </form>
        </Drawer>
      )}
    </>
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
