import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Bot, CircleAlert, Clock, FolderOpen, KeyRound, Loader2, MessageCircle, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { api } from '../api.js'
import { Card, Drawer, Field, PageHead } from '../shared.jsx'
import { BotFiles, BotSettingsForm } from './BotSetup.jsx'

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
  const [drawer, setDrawer] = useState(null)  // 'files' | 'settings'
  const [files, setFiles] = useState(null)
  const [saved, setSaved] = useState(false)
  const loadFiles = useCallback(() => api('chatbot/media/').then(setFiles).catch(() => setFiles([])), [])
  useEffect(() => { if (drawer === 'files') loadFiles() }, [drawer, loadFiles])
  const [removing, setRemoving] = useState(null)
  const [removeError, setRemoveError] = useState('')

  const load = useCallback(() => {
    api('chatbot/flows/').then(setFlows).catch(setError)
  }, [])
  useEffect(() => { if (!builderId) load() }, [builderId, load])

  const remove = async () => {
    setRemoveError('')
    try {
      await api(`chatbot/flows/${removing.id}/`, { method: 'DELETE' })
      setFlows((cur) => cur.filter((f) => f.id !== removing.id))
      setRemoving(null)
    } catch (err) {
      setRemoveError(err.message)
    }
  }
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
        <button className="btn btn-ghost" onClick={() => setDrawer('files')}><FolderOpen size={17} /> Bot files</button>
        <button className="btn btn-ghost" onClick={() => { setSaved(false); setDrawer('settings') }}><Clock size={17} /> Bot settings</button>
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
        <Card>
          <div className="d-table-wrap">
            <table className="d-table clickable">
              <thead>
                <tr><th>S/N</th><th>Name</th><th>Triggers</th><th>Blocks</th><th>Status</th><th>Updated</th><th>Action</th></tr>
              </thead>
              <tbody>
                {flows.map((f, i) => (
                  <tr key={f.id} onClick={() => open(f.id)}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{f.name}</strong>
                      {f.description && <small>{f.description}</small>}
                    </td>
                    <td><TriggerChips triggers={f.triggers} /></td>
                    <td>{(f.draft || f.published)?.nodes ?? 0}</td>
                    <td>
                      <span className="fb-status">
                        {!f.is_active ? <em className="off"><Power size={11} /> Off</em>
                          : f.published ? <em className="live">Live v{f.published.version}</em> : <em>Not published</em>}
                        {f.draft && <em className="draft">Changes</em>}
                      </span>
                    </td>
                    <td>{new Date(f.updated_at).toLocaleDateString()}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="d-actions">
                        <button className="d-act" data-tip={`Open the builder for ${f.name}.`} onClick={() => open(f.id)} aria-label={`Open builder for ${f.name}`}><Pencil size={16} /></button>
                        <button className="d-act is-danger" data-tip={`Delete ${f.name} and every version of it. This cannot be undone.`} onClick={() => { setRemoveError(''); setRemoving(f) }} aria-label={`Delete ${f.name}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {removing && (
        <Drawer title="Delete this flow?" onClose={() => setRemoving(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setRemoving(null)}>Keep it</button>
            <button className="btn btn-danger" onClick={remove}>Delete flow</button></>}>
          <p className="d-text"><strong>{removing.name}</strong> and all its versions will be permanently deleted. Clients will no longer be able to start it.</p>
          {removeError && <p className="fb-error"><CircleAlert size={16} /> {removeError}</p>}
        </Drawer>
      )}

      {drawer === 'files' && (
        <Drawer title="Bot files" onClose={() => setDrawer(null)}>
          <BotFiles files={files} onChange={loadFiles} />
        </Drawer>
      )}
      {drawer === 'settings' && (
        <Drawer title="Bot settings" onClose={() => setDrawer(null)}
          footer={<>{saved && <span className="fb-saved">Saved</span>}
            <button className="btn btn-ghost" onClick={() => setDrawer(null)}>Close</button>
            <button form="bot-settings" className="btn btn-gold">Save settings</button></>}>
          <BotSettingsForm id="bot-settings" onSaved={() => setSaved(true)} />
        </Drawer>
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
