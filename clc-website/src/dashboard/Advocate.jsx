import { useState } from 'react'
import { Briefcase, CheckCircle2, Clock, Flame } from 'lucide-react'
import { myCases } from './data.js'
import { Badge, Card, DetailList, Drawer, PageHead, StatCard } from './shared.jsx'

export function AdvocateOverview() {
  const urgent = myCases.filter((c) => c.priority === 'high')
  return (
    <>
      <PageHead title="Welcome back" sub="Your assigned cases and what to do next." />
      <div className="d-stats">
        <StatCard icon={Briefcase} label="My cases" value={myCases.length} tone="navy" />
        <StatCard icon={Flame} label="High priority" value={urgent.length} tone="red" delay={0.05} />
        <StatCard icon={Clock} label="Due this week" value="2" tone="gold" delay={0.1} />
        <StatCard icon={CheckCircle2} label="Closed this month" value="4" tone="green" delay={0.15} />
      </div>
      <Card title="Next steps">
        {myCases.map((c) => (
          <div key={c.id} className="d-row">
            <div className="d-row-main"><strong>{c.ref}</strong><small>{c.next}</small></div>
            <Badge>{c.status}</Badge>
          </div>
        ))}
      </Card>
    </>
  )
}

export function AdvocateCases() {
  const [list, setList] = useState(myCases)
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const current = list.find((c) => c.id === selected)

  return (
    <>
      <PageHead title="My cases" sub="Cases assigned to you by your firm." />
      <Card>
        <div className="d-table-wrap">
          <table className="d-table clickable">
            <thead><tr><th>Reference</th><th>Service</th><th>Region</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => setSelected(c.id)}>
                  <td><strong>{c.ref}</strong></td><td>{c.service}</td><td>{c.region}</td>
                  <td><Badge>{c.status}</Badge></td><td>{c.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {current && (
        <Drawer title={current.ref} onClose={() => setSelected(null)}
          footer={<button className="btn btn-gold" onClick={() => { setList(list.map((c) => (c.id === current.id ? { ...c, status: 'closed' } : c))); setSelected(null) }}>Mark ready to close</button>}>
          <DetailList rows={[['Service', current.service], ['Region', current.region], ['Priority', current.priority], ['Next step', current.next]]} />
          <label className="d-field"><span>Add a note (visible only to your firm)</span>
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </Drawer>
      )}
    </>
  )
}
