import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, applyEdgeChanges, applyNodeChanges,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft, CircleAlert, CircleCheck, FlaskConical, History, Loader2, RotateCcw, Settings2, TriangleAlert, Zap,
} from 'lucide-react'
import { api } from '../api.js'
import BlockNode, { BuilderContext, ICONS } from './BlockNode.jsx'
import { BlockInspector, FlowSettings } from './Inspector.jsx'
import TestChat from './TestChat.jsx'
import { newBlock, portsOf, variablesIn } from './model.js'

const EDGE = { type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 } }
const SAVE_DELAY = 1200

// Canvas nodes carry React Flow extras (selected, measured…); the API stores only these keys.
const toDefinition = (nodes, edges, settings) => ({
  nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position: { x: Math.round(position.x), y: Math.round(position.y) }, data })),
  edges: edges.map(({ id, source, sourceHandle, target }) => ({ id, source, sourceHandle: sourceHandle || 'next', target })),
  settings,
})
const toCanvas = (definition) => ({
  nodes: (definition.nodes || []).map((n) => ({ ...n, deletable: n.type !== 'start' })),
  edges: (definition.edges || []).map((e) => ({ ...e, ...EDGE })),
  settings: definition.settings || { languages: ['sw', 'en'] },
})

function triggerSummary(triggers = []) {
  const on = triggers.filter((t) => t.is_active)
  if (!on.length) return 'No trigger: only reachable from “Go to flow”'
  return on.map((t) => (t.type === 'keyword' ? `Keyword: ${t.config.words.join(', ')}` : 'Any new conversation')).join(' · ')
}

function Builder({ flowId, onExit }) {
  const rf = useReactFlow()
  const wrapper = useRef(null)
  const [catalog, setCatalog] = useState(null)
  const [flow, setFlow] = useState(null)
  const [allFlows, setAllFlows] = useState([])
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [settings, setSettings] = useState({ languages: ['sw', 'en'] })
  const [issues, setIssues] = useState([])
  const [save, setSave] = useState('saved') // saved | pending | saving | error
  const [hasDraft, setHasDraft] = useState(false)
  const [selected, setSelected] = useState(null)
  const [panel, setPanel] = useState('inspector') // inspector | test | versions
  const [showIssues, setShowIssues] = useState(false)
  const [active, setActive] = useState(null)
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const dirty = useRef(false)
  const flowDirty = useRef(false)

  const specs = useMemo(() => Object.fromEntries((catalog?.node_types || []).map((t) => [t.type, t])), [catalog])
  const nodeTypes = useMemo(() => Object.fromEntries(Object.keys(specs).map((k) => [k, BlockNode])), [specs])
  const definition = useCallback(() => toDefinition(nodes, edges, settings), [nodes, edges, settings])

  /* ---------- load ---------- */
  useEffect(() => {
    let live = true
    Promise.all([api('chatbot/node-types/'), api(`chatbot/flows/${flowId}/`), api('chatbot/flows/')])
      .then(([cat, f, list]) => {
        if (!live) return
        const c = toCanvas(f.editing.definition)
        setCatalog(cat)
        setFlow(f)
        setHasDraft(f.editing.from === 'draft')
        setNodes(c.nodes)
        setEdges(c.edges)
        setSettings(c.settings)
        setAllFlows(list.map((x) => ({ id: x.id, name: x.name, published: !!x.published })))
        api(`chatbot/flows/${flowId}/validate/`, { method: 'POST', body: { definition: f.editing.definition } })
          .then((r) => live && setIssues(r.issues)).catch(() => {})
      })
      .catch((e) => live && setLoadError(e))
    return () => { live = false }
  }, [flowId])

  /* ---------- autosave: canvas -> draft, settings -> flow ---------- */
  const saveNow = useCallback(async () => {
    if (!dirty.current) return true
    dirty.current = false
    setSave('saving')
    try {
      const res = await api(`chatbot/flows/${flowId}/draft/`, { method: 'PUT', body: { definition: definition() } })
      setIssues(res.issues)
      setHasDraft(true)
      setSave(dirty.current ? 'pending' : 'saved')
      return true
    } catch (e) {
      dirty.current = true
      setSave('error')
      setToast({ kind: 'error', text: e.message })
      return false
    }
  }, [flowId, definition])

  useEffect(() => {
    if (!dirty.current) return undefined
    setSave('pending')
    const t = setTimeout(saveNow, SAVE_DELAY)
    return () => clearTimeout(t)
  }, [nodes, edges, settings, saveNow])

  useEffect(() => {
    if (!flow || !flowDirty.current) return undefined
    const t = setTimeout(async () => {
      flowDirty.current = false
      try {
        const res = await api(`chatbot/flows/${flowId}/`, {
          method: 'PATCH', body: { name: flow.name, description: flow.description, is_active: flow.is_active, triggers: flow.triggers },
        })
        setFlow((f) => ({ ...f, published: res.published }))
      } catch (e) {
        setToast({ kind: 'error', text: e.message })
      }
    }, SAVE_DELAY)
    return () => clearTimeout(t)
  }, [flow, flowId])

  useEffect(() => {
    const warn = (e) => { if (dirty.current || flowDirty.current) { e.preventDefault(); e.returnValue = '' } }
    const keys = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNow() } }
    window.addEventListener('beforeunload', warn)
    window.addEventListener('keydown', keys)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('keydown', keys) }
  }, [saveNow])

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t) } return undefined }, [toast])

  /* ---------- canvas edits ---------- */
  const onNodesChange = useCallback((changes) => {
    if (changes.some((c) => c.type === 'remove' || (c.type === 'position' && !c.dragging) || c.type === 'add')) dirty.current = true
    setNodes((ns) => applyNodeChanges(changes, ns))
    const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id)
    if (removed.length) setSelected((s) => (removed.includes(s) ? null : s))
  }, [])
  const onEdgesChange = useCallback((changes) => {
    if (changes.some((c) => c.type === 'remove')) dirty.current = true
    setEdges((es) => applyEdgeChanges(changes, es))
  }, [])
  const onConnect = useCallback((c) => {
    dirty.current = true
    // Each exit leads to one block: a new arrow replaces the old one.
    setEdges((es) => [
      ...es.filter((e) => !(e.source === c.source && (e.sourceHandle || 'next') === (c.sourceHandle || 'next'))),
      { id: `e_${c.source}_${c.sourceHandle || 'next'}`, source: c.source, sourceHandle: c.sourceHandle || 'next', target: c.target, ...EDGE },
    ])
  }, [])
  const isValidConnection = useCallback((c) => c.source !== c.target, [])

  const addBlock = useCallback((type, position) => {
    const spec = specs[type]
    if (!spec) return
    // Clicked from the palette: put it under the selected block (or the lowest one), never on top
    // of another block, and wire the selected block's first free exit to it.
    let at = position
    let from = null
    if (!at) {
      const all = rf.getNodes()
      const anchor = all.find((n) => n.id === selected)
        || all.reduce((low, n) => (!low || n.position.y > low.position.y ? n : low), null)
      if (anchor) {
        at = { x: anchor.position.x, y: anchor.position.y + (anchor.measured?.height || 120) + 60 }
        const overlaps = (p) => all.some((n) => Math.abs(n.position.x - p.x) < 240 && Math.abs(n.position.y - p.y) < (n.measured?.height || 120))
        while (overlaps(at)) at = { x: at.x + 280, y: at.y }
        if (anchor.id === selected) {
          const used = new Set(edges.filter((e) => e.source === anchor.id).map((e) => e.sourceHandle || 'next'))
          const port = portsOf(anchor, specs[anchor.type]).find((p) => !used.has(p.id))
          if (port) from = { source: anchor.id, sourceHandle: port.id }
        }
      } else {
        at = rf.screenToFlowPosition({
          x: (wrapper.current?.getBoundingClientRect().left || 0) + (wrapper.current?.clientWidth || 600) / 2 - 110,
          y: (wrapper.current?.getBoundingClientRect().top || 0) + (wrapper.current?.clientHeight || 400) / 3,
        })
      }
    }
    const block = newBlock(type, spec, at)
    dirty.current = true
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...block, selected: true, deletable: true }])
    if (from) {
      setEdges((es) => [...es, { id: `e_${from.source}_${from.sourceHandle}`, ...from, target: block.id, ...EDGE }])
    }
    setSelected(block.id)
    setPanel('inspector')
  }, [specs, rf, selected, edges])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/clc-block')
    if (type) addBlock(type, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
  }, [addBlock, rf])

  const updateData = useCallback((id, data) => {
    dirty.current = true
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data } : n)))
    // Drop arrows from exits that no longer exist (a removed button or rule).
    const node = nodes.find((n) => n.id === id)
    if (node) {
      const valid = new Set(portsOf({ ...node, data }, specs[node.type]).map((p) => p.id))
      setEdges((es) => es.filter((e) => e.source !== id || valid.has(e.sourceHandle || 'next')))
    }
  }, [nodes, specs])

  const deleteBlock = useCallback((id) => {
    dirty.current = true
    setNodes((ns) => ns.filter((n) => n.id !== id))
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id))
    setSelected(null)
  }, [])

  const editFlow = (patch) => { flowDirty.current = true; setFlow((f) => ({ ...f, ...patch })) }
  const editSettings = (patch) => { dirty.current = true; setSettings((s) => ({ ...s, ...patch })) }

  /* ---------- check, publish, versions ---------- */
  const check = async () => {
    const res = await api(`chatbot/flows/${flowId}/validate/`, { method: 'POST', body: { definition: definition() } })
    setIssues(res.issues)
    setShowIssues(true)
    if (!res.issues.length) setToast({ kind: 'ok', text: 'No problems found.' })
  }
  const publish = async () => {
    if (!(await saveNow())) return // pending edits become the draft first
    try {
      const res = await api(`chatbot/flows/${flowId}/publish/`, { method: 'POST' })
      setFlow((f) => ({ ...f, published: res.published }))
      setHasDraft(false)
      setIssues(res.issues || [])
      setToast({ kind: 'ok', text: `Published version ${res.published.version}. New WhatsApp conversations use it now.` })
    } catch (e) {
      if (e.data?.issues) { setIssues(e.data.issues); setShowIssues(true) }
      setToast({ kind: 'error', text: e.message })
    }
  }
  const [versions, setVersions] = useState(null)
  const openVersions = async () => {
    setPanel('versions')
    setVersions(await api(`chatbot/flows/${flowId}/versions/`))
  }
  const restore = async (v) => {
    if (!window.confirm(`Load version ${v.version} into the editor? Your current unpublished changes are replaced.`)) return
    const res = await api(`chatbot/flows/${flowId}/versions/${v.id}/restore/`, { method: 'POST' })
    const c = toCanvas(res.definition)
    setNodes(c.nodes); setEdges(c.edges); setSettings(c.settings)
    setHasDraft(true)
    setPanel('inspector')
    setToast({ kind: 'ok', text: `Version ${v.version} loaded. Publish to make it live again.` })
  }

  /* ---------- render ---------- */
  if (loadError) {
    return (
      <div className="fb fb-center">
        <CircleAlert size={30} />
        <p>{loadError.status === 401 || loadError.status === 403 ? 'Sign in and work as CLC Admin to edit chatbot flows.' : loadError.message}</p>
        <button type="button" className="btn btn-navy" onClick={onExit}>Back to flows</button>
      </div>
    )
  }
  if (!catalog || !flow) return <div className="fb fb-center"><Loader2 className="spin" size={28} /></div>

  const langs = settings.languages || ['sw', 'en']
  const byNode = issues.reduce((acc, i) => { if (i.node) (acc[i.node] = acc[i.node] || []).push(i); return acc }, {})
  const errors = issues.filter((i) => i.level === 'error').length
  const warnings = issues.length - errors
  const selectedNode = nodes.find((n) => n.id === selected)
  const ctx = { specs, issues: byNode, active, flows: allFlows, triggerSummary: triggerSummary(flow.triggers),
    wired: new Set(edges.map((e) => `${e.source}:${e.sourceHandle || 'next'}`)) }

  return (
    <BuilderContext.Provider value={ctx}>
      <div className="fb">
        <header className="fb-top">
          <button type="button" className="fb-icon" onClick={async () => { await saveNow(); onExit() }} title="Back to flows"><ArrowLeft size={18} /></button>
          <div className="fb-title">
            <strong>{flow.name}</strong>
            <span>
              {flow.published ? <em className="live">Live · v{flow.published.version}</em> : <em>Not published</em>}
              {hasDraft && <em className="draft">Unpublished changes</em>}
              {!flow.is_active && <em className="off">Switched off</em>}
            </span>
          </div>
          <span className={`fb-save ${save}`}>
            {save === 'saving' ? 'Saving…' : save === 'pending' ? 'Unsaved' : save === 'error' ? 'Not saved' : 'All changes saved'}
          </span>
          <div className="fb-actions">
            <button type="button" className={`fb-btn ${panel === 'inspector' && !selected ? 'on' : ''}`} onClick={() => { setSelected(null); setPanel('inspector') }}><Settings2 size={16} /> Settings & triggers</button>
            <button type="button" className={`fb-btn ${panel === 'versions' ? 'on' : ''}`} onClick={openVersions}><History size={16} /> Versions</button>
            <button type="button" className="fb-btn" onClick={check}>
              {errors ? <CircleAlert size={16} className="err" /> : warnings ? <TriangleAlert size={16} className="warn" /> : <CircleCheck size={16} className="ok" />}
              Check{issues.length ? ` (${issues.length})` : ''}
            </button>
            <button type="button" className={`fb-btn ${panel === 'test' ? 'on' : ''}`} onClick={() => setPanel(panel === 'test' ? 'inspector' : 'test')}><FlaskConical size={16} /> Test</button>
            <button type="button" className="btn btn-gold d-sm" onClick={publish} disabled={errors > 0} title={errors ? 'Fix the errors first' : ''}><Zap size={16} /> Publish</button>
          </div>
        </header>

        <div className="fb-body">
          <aside className="fb-palette">
            {catalog.categories.map((cat) => (
              <section key={cat.id}>
                <h4>{cat.label}</h4>
                {catalog.node_types.filter((t) => t.category === cat.id).map((t) => {
                  const Icon = ICONS[t.icon]
                  return (
                    <button key={t.type} type="button" draggable className={`fb-pal cat-${cat.id}`} title={t.description}
                      onDragStart={(e) => { e.dataTransfer.setData('application/clc-block', t.type); e.dataTransfer.effectAllowed = 'move' }}
                      onClick={() => addBlock(t.type)}>
                      <span className="fb-block-icon">{Icon && <Icon size={15} />}</span>{t.label}
                    </button>
                  )
                })}
              </section>
            ))}
            <p className="fb-muted fb-note">Click or drag a block onto the canvas. To connect, drag from a gold dot (●) on a block's right edge to the next block.</p>
          </aside>

          <div className="fb-canvas" ref={wrapper} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }} onDrop={onDrop}>
            <ReactFlow
              nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
              isValidConnection={isValidConnection} defaultEdgeOptions={EDGE}
              onSelectionChange={({ nodes: sel }) => { if (sel.length === 1) { setSelected(sel[0].id); if (panel === 'versions') setPanel('inspector') } else if (!sel.length) setSelected(null) }}
              deleteKeyCode={['Backspace', 'Delete']} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.2} proOptions={{ hideAttribution: true }}
            >
              <Background gap={22} size={1.4} color="#d9d2c3" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={(n) => (byNode[n.id]?.some((i) => i.level === 'error') ? '#c2643a' : '#c9a227')} />
            </ReactFlow>

            {showIssues && issues.length > 0 && (
              <div className="fb-issues">
                <header><strong>{errors} error{errors === 1 ? '' : 's'}, {warnings} warning{warnings === 1 ? '' : 's'}</strong>
                  <button type="button" onClick={() => setShowIssues(false)}>Hide</button></header>
                <ul>
                  {issues.map((i, k) => (
                    <li key={k} className={i.level}>
                      <button type="button" onClick={() => {
                        const n = nodes.find((x) => x.id === i.node)
                        if (!n) return
                        setSelected(n.id); setPanel('inspector')
                        setNodes((ns) => ns.map((x) => ({ ...x, selected: x.id === n.id })))
                        rf.setCenter(n.position.x + 120, n.position.y + 60, { zoom: 1, duration: 400 })
                      }}>
                        {i.level === 'error' ? <CircleAlert size={14} /> : <TriangleAlert size={14} />}
                        <span>{i.node ? <b>{specs[nodes.find((x) => x.id === i.node)?.type]?.label || 'Block'}: </b> : null}{i.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {toast && <div className={`fb-toast ${toast.kind}`}>{toast.text}</div>}
          </div>

          <aside className="fb-side">
            {panel === 'test' && (
              <TestChat flowId={flowId} getDefinition={definition} langs={langs} onActive={setActive} onClose={() => setPanel('inspector')} />
            )}
            {panel === 'versions' && (
              <div className="fb-inspector-body">
                <div className="fb-inspector-title"><div><h3>Versions</h3><p>Every publish is kept. Load an old one to edit or re-publish it.</p></div></div>
                {!versions ? <Loader2 className="spin" /> : (
                  <ul className="fb-versions">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <div><strong>Version {v.version}</strong> <em className={v.status}>{v.status}</em>
                          <small>{v.published_at ? `Published ${new Date(v.published_at).toLocaleString()}${v.published_by ? ` by ${v.published_by}` : ''}` : `Edited ${new Date(v.updated_at).toLocaleString()}`} · {v.nodes} blocks</small></div>
                        {v.status !== 'draft' && <button type="button" className="fb-btn" onClick={() => restore(v)}><RotateCcw size={14} /> Load</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {panel === 'inspector' && (selectedNode && specs[selectedNode.type] ? (
              <BlockInspector key={selectedNode.id} node={selectedNode} spec={specs[selectedNode.type]} langs={langs}
                variables={variablesIn(nodes)} flows={allFlows} flowId={flowId} operators={catalog.operators}
                issues={byNode[selectedNode.id] || []} onChange={(data) => updateData(selectedNode.id, data)}
                onDelete={() => deleteBlock(selectedNode.id)} />
            ) : (
              <FlowSettings flow={flow} settings={settings} triggerTypes={catalog.trigger_types} onFlow={editFlow} onSettings={editSettings} />
            ))}
          </aside>
        </div>
      </div>
    </BuilderContext.Provider>
  )
}

export default function FlowBuilder(props) {
  return <ReactFlowProvider><Builder {...props} /></ReactFlowProvider>
}
