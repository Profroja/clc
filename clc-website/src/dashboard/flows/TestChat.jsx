import { useEffect, useRef, useState } from 'react'
import { Bot, FileText, List, Loader2, Paperclip, RotateCcw, Send, X } from 'lucide-react'
import { api } from '../api.js'
import { LANG_LABEL } from './model.js'

// Plays the flow exactly as the engine would on WhatsApp, using what is on the canvas now.
// Nothing is saved and no message is sent; "system" lines show what would have happened.
// WhatsApp formatting: *bold*, _italic_, ~strike~ (what the client will see).
function WhatsAppText({ text }) {
  const parts = (text || '').split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g)
  return parts.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
    if (/^_[^_]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
    if (/^~[^~]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>
    return p
  })
}

const EFFECT_LABEL = {
  business_hours: 'Business hours', notify_staff: 'Notify staff', create_case: 'Case created', handover: 'Handover',
  set_client: 'Client record', case_status: 'Case status',
}

export default function TestChat({ flowId, getDefinition, langs, files, onActive, onClose }) {
  const [lang, setLang] = useState(langs[0] || 'sw')
  const [hours, setHours] = useState('real')
  const [log, setLog] = useState([])
  const [state, setState] = useState(null)
  const [ended, setEnded] = useState(null)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [openList, setOpenList] = useState(null)
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [log])
  useEffect(() => () => onActive(null), [onActive])

  const run = async (event, mine) => {
    setBusy(true)
    if (mine) setLog((l) => [...l, { from: 'me', text: mine }])
    try {
      const res = await api(`chatbot/flows/${flowId}/simulate/`, {
        method: 'POST', body: { definition: getDefinition(), state: event ? state : null, event, lang, hours: hours === 'real' ? null : hours },
      })
      if (res.error) {
        setLog((l) => [...l, { from: 'error', text: res.error }])
        return
      }
      setLog((l) => [
        ...l,
        ...res.messages.map((m) => ({ from: 'bot', msg: m })),
        ...res.effects.map((e) => ({ from: 'system', text: `${EFFECT_LABEL[e.effect] || e.effect}${e.detail ? `: ${e.detail}` : ''}` })),
        ...(res.ended ? [{ from: 'system', text: res.ended === 'handoff' ? 'Bot stopped: chat handed over to CLC' : 'Flow finished' }] : []),
      ])
      setState(res.state)
      setEnded(res.ended)
      onActive(res.waiting_node || null)
    } catch (e) {
      setLog((l) => [...l, { from: 'error', text: e.message }])
    } finally {
      setBusy(false)
    }
  }

  const restart = () => {
    setLog([])
    setState(null)
    setEnded(null)
    onActive(null)
    run(null)
  }
  const send = (e) => {
    e.preventDefault()
    if (!text.trim() || !state) return
    run({ kind: 'text', text }, text)
    setText('')
  }
  const tap = (id, title) => state && !busy && run({ kind: 'choice', choice_id: id }, title)
  const sendFile = () => state && run({ kind: 'file', file: { file_name: 'test-document.pdf', mime_type: 'application/pdf', storage_key: 'test', size_bytes: 1, sha256: '0'.repeat(64) } }, '📎 test-document.pdf')

  return (
    <aside className="fb-test">
      <header>
        <strong>Test chat</strong>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Client language" disabled={!!state}>
          {langs.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
        </select>
        <select value={hours} onChange={(e) => setHours(e.target.value)} aria-label="Business hours" title="Business hours blocks act as if CLC is…">
          <option value="real">Hours: real time</option>
          <option value="open">Pretend open</option>
          <option value="closed">Pretend closed</option>
        </select>
        <button type="button" className="fb-icon" onClick={restart} title="Start again"><RotateCcw size={16} /></button>
        <button type="button" className="fb-icon" onClick={onClose} title="Close"><X size={16} /></button>
      </header>
      <div className="fb-phone">
        {log.length === 0 && (
          <div className="fb-test-empty">
            <Bot size={28} />
            <p>Chat with this flow as a client would on WhatsApp. Unsaved changes are included; nothing is saved or sent.</p>
            <button type="button" className="btn btn-gold d-sm" onClick={restart}>Start test</button>
          </div>
        )}
        {log.map((item, i) => {
          if (item.from === 'me') return <div key={i} className="fb-bubble me">{item.text}</div>
          if (item.from === 'system') return <div key={i} className="fb-sys">{item.text}</div>
          if (item.from === 'error') return <div key={i} className="fb-sys error">{item.text}</div>
          const m = item.msg
          if (m.type === 'media') {
            const f = files?.find((x) => x.id === m.asset_id)
            return (
              <div key={i} className="fb-bubble bot media">
                {m.media_kind === 'image'
                  ? (f ? <img src={f.url} alt={m.name} /> : <p>🖼 {m.name}</p>)
                  : <a className="fb-doc" href={f?.url} target="_blank" rel="noreferrer"><FileText size={22} /><span>{m.file_name}</span></a>}
                {m.caption && <p><WhatsAppText text={m.caption} /></p>}
              </div>
            )
          }
          return (
            <div key={i} className="fb-bubble bot">
              <p><WhatsAppText text={m.text} /></p>
              {m.type === 'buttons' && (
                <div className="fb-bubble-btns">
                  {m.buttons.map((b) => <button key={b.id} type="button" onClick={() => tap(b.id, b.title)}>{b.title}</button>)}
                </div>
              )}
              {m.type === 'list' && (
                <>
                  <div className="fb-bubble-btns"><button type="button" onClick={() => setOpenList(openList === i ? null : i)}><List size={14} /> {m.button}</button></div>
                  {openList === i && (
                    <ul className="fb-list-rows">
                      {m.section && <li className="fb-list-head">{m.section}</li>}
                      {m.rows.map((r) => (
                        <li key={r.id}><button type="button" onClick={() => { setOpenList(null); tap(r.id, r.title) }}>
                          <strong>{r.title}</strong>{r.description && <small>{r.description}</small>}
                        </button></li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )
        })}
        {busy && <div className="fb-sys"><Loader2 size={14} className="spin" /> …</div>}
        <div ref={end} />
      </div>
      <form className="fb-compose" onSubmit={send}>
        <button type="button" className="fb-icon" onClick={sendFile} disabled={!state || busy} title="Send a test document"><Paperclip size={17} /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!state || busy}
          placeholder={ended ? 'Flow ended — start again' : state ? 'Type a message' : 'Press Start test'} />
        <button type="submit" className="fb-icon send" disabled={!state || busy || !text.trim()} aria-label="Send"><Send size={17} /></button>
      </form>
    </aside>
  )
}
