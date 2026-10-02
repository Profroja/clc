import { useState } from 'react'
import { Briefcase, Check, Inbox, Scale, Users } from 'lucide-react'
import { firms, myCases, referrals as referralData, users, weekly } from './data.js'
import { Avatar, Badge, BarChart, Card, DetailList, Drawer, PageHead, StatCard } from './shared.jsx'

const FIRM = firms[0] // the signed-in representative's firm; comes from the API later

export function FirmOverview() {
  const incoming = referralData.filter((r) => r.status === 'sent')
  return (
    <>
      <PageHead title={FIRM.name} sub="Your firm's referrals, cases and team at a glance." />
      <div className="d-stats">
        <StatCard icon={Inbox} label="New referrals" value={incoming.length} hint="Waiting for your decision" tone="gold" />
        <StatCard icon={Briefcase} label="Active cases" value={myCases.length} hint="Across your advocates" tone="navy" delay={0.05} />
        <StatCard icon={Scale} label="Advocates" value={FIRM.advocates} hint="All with valid certificates" tone="green" delay={0.1} />
        <StatCard icon={Check} label="Cases closed" value="21" hint="Since joining" tone="blue" delay={0.15} />
      </div>
      <div className="d-grid-2">
        <Card title="Cases handled this week"><BarChart data={weekly} /></Card>
        <Card title="Needs your attention">
          {incoming.map((r) => (
            <div key={r.id} className="d-row">
              <div className="d-row-main"><strong>{r.ref}</strong><small>{r.service} · {r.region}</small></div>
              <a href="#/app/firm/referrals" className="btn btn-navy d-sm">Open</a>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

export function FirmReferrals() {
  const [list, setList] = useState(referralData)
  const [selected, setSelected] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [reason, setReason] = useState('')
  const current = list.find((r) => r.id === selected)
  const close = () => { setSelected(null); setConflict(false); setReason('') }
  const decide = (status) => { setList(list.map((r) => (r.id === selected ? { ...r, status } : r))); close() }

  return (
    <>
      <PageHead title="Referral inbox" sub="CLC offers you matters. You only see an anonymised summary until you accept." />
      <Card>
        <div className="d-table-wrap">
          <table className="d-table clickable">
            <thead><tr><th>Reference</th><th>Service</th><th>Region</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.id)}>
                  <td><strong>{r.ref}</strong><small>{r.received}</small></td>
                  <td>{r.service}</td><td>{r.region}</td>
                  <td><Badge tone={r.priority === 'high' ? 'red' : r.priority === 'low' ? 'navy' : 'blue'}>{r.priority}</Badge></td>
                  <td><Badge>{r.status === 'sent' ? 'pending' : r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {current && (
        <Drawer title={current.ref} onClose={close}
          footer={current.status === 'sent' ? (
            <><button className="btn btn-ghost" disabled={!reason} onClick={() => decide('declined')}>Decline</button>
              <button className="btn btn-gold" disabled={!conflict} onClick={() => decide('accepted')}>Accept referral</button></>
          ) : null}>
          <DetailList rows={[['Service', current.service], ['Region', current.region], ['Received', current.received], ['Priority', current.priority]]} />
          <h4 className="d-sub">Summary</h4>
          <p className="d-text">{current.summary}</p>
          {current.status === 'sent' && (
            <>
              <label className="d-check"><input type="checkbox" checked={conflict} onChange={(e) => setConflict(e.target.checked)} /> I confirm there is no conflict of interest.</label>
              <label className="d-field"><span>Reason (required to decline)</span><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            </>
          )}
        </Drawer>
      )}
    </>
  )
}

export function FirmCases() {
  return (
    <>
      <PageHead title="Cases" sub="Accepted matters and who is handling them." />
      <Card>
        <div className="d-table-wrap">
          <table className="d-table">
            <thead><tr><th>Reference</th><th>Service</th><th>Advocate</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {myCases.map((c, i) => (
                <tr key={c.id}>
                  <td><strong>{c.ref}</strong></td><td>{c.service}</td>
                  <td>{i === 1 ? <button className="btn btn-navy d-sm">Assign</button> : 'Neema Lyimo'}</td>
                  <td><Badge>{c.status}</Badge></td><td>{c.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

export function FirmTeam() {
  const team = users.filter((u) => u.org === FIRM.name)
  return (
    <>
      <PageHead title="Our advocates" sub="People who can be assigned your firm's cases." />
      <Card>
        {team.map((u) => (
          <div key={u.id} className="d-row">
            <Avatar name={u.name} />
            <div className="d-row-main"><strong>{u.name}</strong><small>{u.email}</small></div>
            <Badge>{u.status}</Badge>
          </div>
        ))}
      </Card>
    </>
  )
}

export function FirmProfile() {
  return (
    <>
      <PageHead title="Firm profile" sub="Your registration details as held by CLC." />
      <Card>
        <DetailList rows={[
          ['Firm', FIRM.name], ['Registration number', FIRM.registration], ['TIN', FIRM.tin], ['Address', FIRM.address],
          ['Email', FIRM.email], ['Phone', FIRM.phone], ['Regions served', FIRM.regions.join(', ')], ['Status', FIRM.status],
        ]} />
      </Card>
    </>
  )
}
