import { createContext, memo, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Briefcase, Flag, GitBranch, Headset, List, MessageSquare, Paperclip, Play, Search, SquareMousePointer,
  TextCursorInput, Variable, Workflow,
} from 'lucide-react'
import { portsOf, preview } from './model.js'

export const ICONS = {
  play: Play, 'message-square': MessageSquare, 'text-cursor-input': TextCursorInput,
  'square-mouse-pointer': SquareMousePointer, list: List, paperclip: Paperclip, 'git-branch': GitBranch,
  variable: Variable, workflow: Workflow, briefcase: Briefcase, search: Search, headset: Headset, flag: Flag,
}

// The builder shares the catalog, validation issues and test-chat position with every block.
export const BuilderContext = createContext({ specs: {}, issues: {}, active: null, flows: [] })

function summary(node, spec, ctx) {
  const d = node.data || {}
  switch (node.type) {
    case 'start': return ctx.triggerSummary
    case 'set_variable': return d.name ? `${d.name} = ${d.value ?? ''}` : ''
    case 'go_to_flow': return ctx.flows.find((f) => f.id === d.flow_id)?.name || 'Choose a flow'
    case 'condition': return ''
    case 'create_case': return preview(d.text) || 'Saves the case'
    default: return preview(d.text)
  }
}

function BlockNode({ id, type, data, selected }) {
  const ctx = useContext(BuilderContext)
  const spec = ctx.specs[type]
  if (!spec) return <div className="fb-block fb-unknown">Unknown block “{type}”</div>
  const Icon = ICONS[spec.icon] || MessageSquare
  const ports = portsOf({ type, data }, spec)
  const problems = ctx.issues[id] || []
  const level = problems.some((i) => i.level === 'error') ? 'error' : problems.length ? 'warning' : null
  const text = summary({ type, data }, spec, ctx)
  const saves = data?.save_as

  return (
    <div className={`fb-block cat-${spec.category || 'start'} ${selected ? 'is-selected' : ''} ${ctx.active === id ? 'is-active' : ''} ${level ? `has-${level}` : ''}`}>
      {type !== 'start' && <Handle type="target" position={Position.Top} className="fb-in" />}
      <header>
        <span className="fb-block-icon"><Icon size={15} /></span>
        <strong>{spec.label}</strong>
        {level && <span className={`fb-dot ${level}`} title={problems.map((p) => p.message).join('\n')}>{problems.length}</span>}
      </header>
      {text && <p className="fb-block-text">{text}</p>}
      {saves && <p className="fb-block-var">Saves <code>{saves}</code></p>}
      {ports.length > 0 && (
        <ul className="fb-ports">
          {ports.map((p) => (
            <li key={p.id}>
              <span>{p.label}</span>
              <Handle type="source" id={p.id} position={Position.Right} className="fb-out" />
            </li>
          ))}
        </ul>
      )}
      {ports.length === 0 && <p className="fb-block-end">{type === 'handover' ? 'Chat goes to CLC' : 'Flow ends'}</p>}
    </div>
  )
}

export default memo(BlockNode)
