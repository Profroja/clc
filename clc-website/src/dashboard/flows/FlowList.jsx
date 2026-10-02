import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Bot, CircleAlert, KeyRound, Loader2, MessageCircle, Plus, Power } from 'lucide-react'
import { api } from '../api.js'
import { Card, Drawer, Field, PageHead } from '../shared.jsx'

// The builder (and React Flow) loads only when an admin opens a flow, not for website visitors.
const FlowBuilder = lazy(() => import('./FlowBuilder.jsx'))

const BUILDER = /^#\/app\/admin\/flows\/([0-9a-f-]{36})/

function useBuilderId() {
  const read = () => (window.location.hash.match(BUILDER) || [])[1] || null
  const [id, setId] = useState(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id
}

function TriggerChips({ triggers }) {
  const on = triggers.filter((t) => t.is_active)
  if (!on.length) return <span className="fb-chipline muted">No trigger</span>
  return (
    <span className="fb-chipline">
      {on.map((t, i) => t.type === 'keyword'
        ? <span key={i}><KeyRound size={12} /> {t.config.words.slice(0, 3).join(', ')}{t.config.words.length > 3 ? '…' : ''}</span>
        : <span key={i}><MessageCircle size={12} /> New conversation</span>)}
    </span>
  )
}

export default function FlowList() {
  const builderId = useBuilderId()
  const [flows, setFlows] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    api('chatbot/flows/').then(setFlows).catch(setError)
  }, [])
  useEffect(() => { if (!builderId) load() }, [builderId, load])

  const open = (id) => { window.location.hash = `#/app/admin/flows/${id}` }
  const create = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      const flow = await api('chatbot/flows/', { method: 'POST', body: form })
      setCreating(false)
      setForm({ name: '', description: '' })
      open(flow.id)
    } catch (err) {
      setFormError(err.message)
    }
  }

  if (builderId) {
    return (
      <Suspense fallback={<div className="fb fb-center"><Loader2 className="spin" size={28} /></div>}>
        <FlowBuilder flowId={builderId} onExit={() => { window.location.hash = '#/app/admin/flows' }} />
      </Suspense>
    )
  }

  return (
    <>
      <PageHead title="Chatbot flows" sub="Build what the WhatsApp bot says and asks, then publish it.">
        <button className="btn btn-gold" onClick={() => setCreating(true)}><Plus size={17} /> New flow</button>
      </PageHead>

      {error && (
        <Card>
          <p className="fb-error"><CircleAlert size={18} />
            {error.status === 401 || error.status === 403 ? 'Sign in and work as CLC Admin to manage chatbot flows.' : error.message}
          </p>
        </Card>
      )}
      {!flows && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {flows && flows.length === 0 && (
        <Card><p className="fb-muted">No flows yet. Create one, or run <code>python manage.py seed_chatbot</code> to load CLC's intake flow.</p></Card>
      )}

      {flows && flows.length > 0 && (
        <div className="d-flow-grid">
          {flows.map((f) => (
            <button key={f.id} className="d-flow" onClick={() => open(f.id)}>
              <div className="d-flow-top">
                <span className="d-flow-icon"><Bot size={20} /></span>
                <span className="fb-status">
                  {!f.is_active ? <em className="off"><Power size={11} /> Off</em>
                    : f.published ? <em className="live">Live v{f.published.version}</em> : <em>Not published</em>}
                  {f.draft && <em className="draft">Changes</em>}
                </span>
              </div>
              <h3>{f.name}</h3>
              {f.description && <p>{f.description}</p>}
              <TriggerChips triggers={f.triggers} />
              <div className="d-flow-foot">
                <span>{(f.draft || f.published)?.nodes ?? 0} blocks</span>
                <span>Updated {new Date(f.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <Drawer title="New chatbot flow" onClose={() => setCreating(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button form="new-flow" className="btn btn-gold">Create and open builder</button></>}>
          <form id="new-flow" className="d-form" onSubmit={create}>
            <Field label="Name"><input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Land dispute intake" /></Field>
            <Field label="Description (optional)"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            {formError && <p className="fb-error"><CircleAlert size={16} /> {formError}</p>}
            <p className="d-hint">The flow starts empty with a Start block. Add triggers in Settings to decide what starts it.</p>
          </form>
        </Drawer>
      )}
    </>
  )
}
