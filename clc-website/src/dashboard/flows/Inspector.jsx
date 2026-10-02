import { useState } from 'react'
import { ChevronDown, ChevronUp, CircleAlert, Clock, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { ICONS } from './BlockNode.jsx'
import { MediaPicker } from './BotSetup.jsx'
import { LANG_LABEL, uid } from './model.js'

/* ---------- small field controls ---------- */

function LangTabs({ langs, lang, setLang, value }) {
  return (
    <div className="fb-langs" role="tablist">
      {langs.map((l) => (
        <button key={l} type="button" role="tab" aria-selected={lang === l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
          {LANG_LABEL[l]}{value && !value[l] ? <i title="Not translated yet" /> : null}
        </button>
      ))}
    </div>
  )
}

function I18nText({ field, value, onChange, langs, lang, setLang }) {
  const v = value || {}
  const text = v[lang] || ''
  const Tag = field.multiline ? 'textarea' : 'input'
  const over = field.max && text.length > field.max
  return (
    <div className="fb-field">
      <div className="fb-field-head">
        <label>{field.label}{field.required && <b> *</b>}</label>
        <LangTabs langs={langs} lang={lang} setLang={setLang} value={v} />
      </div>
      <Tag rows={field.multiline ? 4 : undefined} value={text} onChange={(e) => onChange({ ...v, [lang]: e.target.value })}
        placeholder={`${field.label} (${LANG_LABEL[lang]})`} />
      {field.max && <small className={`fb-count ${over ? 'over' : ''}`}>{text.length} / {field.max}</small>}
    </div>
  )
}

const clean = (s) => s.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^([0-9])/, '_$1').slice(0, 40)

function VariableInput({ field, value, onChange, variables }) {
  const listId = `vars-${field.key}`
  return (
    <div className="fb-field">
      <label>{field.label}{field.required && <b> *</b>}</label>
      <input list={listId} value={value || ''} onChange={(e) => onChange(clean(e.target.value))} placeholder="e.g. full_name" spellCheck={false} />
      <datalist id={listId}>{variables.map((v) => <option key={v} value={v} />)}</datalist>
    </div>
  )
}

function OptionsEditor({ field, value, onChange, langs, lang, setLang }) {
  const options = value || []
  const set = (i, patch) => onChange(options.map((o, j) => (j === i ? { ...o, ...patch } : o)))
  const move = (i, d) => {
    const next = [...options]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="fb-field">
      <div className="fb-field-head">
        <label>{field.label} <span className="fb-muted">({options.length}/{field.max})</span></label>
        <LangTabs langs={langs} lang={lang} setLang={setLang} />
      </div>
      <ol className="fb-options">
        {options.map((o, i) => {
          const title = o.title?.[lang] || ''
          return (
            <li key={o.id}>
              <div className="fb-option-row">
                <input value={title} placeholder={`Title (${LANG_LABEL[lang]})`} onChange={(e) => set(i, { title: { ...o.title, [lang]: e.target.value } })} />
                <div className="fb-option-tools">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp size={15} /></button>
                  <button type="button" disabled={i === options.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown size={15} /></button>
                  <button type="button" disabled={options.length <= (field.min || 0)} onClick={() => onChange(options.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              </div>
              <small className={`fb-count ${title.length > field.title_max ? 'over' : ''}`}>{title.length} / {field.title_max}</small>
              {field.description && (
                <input className="fb-option-desc" value={o.description?.[lang] || ''} placeholder={`Description, optional (${LANG_LABEL[lang]})`}
                  onChange={(e) => set(i, { description: { ...o.description, [lang]: e.target.value } })} />
              )}
              <input className="fb-option-value" value={o.value || ''} spellCheck={false} placeholder="Value saved (optional), e.g. deed_poll"
                onChange={(e) => set(i, { value: e.target.value.trim() })} />
            </li>
          )
        })}
      </ol>
      {options.length < field.max && (
        <button type="button" className="fb-add" onClick={() => onChange([...options, { id: uid('opt'), value: '', title: {} }])}>
          <Plus size={15} /> Add {field.key === 'options' && field.max === 3 ? 'button' : 'choice'}
        </button>
      )}
    </div>
  )
}

function RulesEditor({ value, onChange, variables, operators }) {
  const rules = value || []
  const set = (i, patch) => onChange(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const noValue = new Set(operators.filter((o) => o.no_value).map((o) => o.id))
  return (
    <div className="fb-field">
      <label>Rules <span className="fb-muted">· checked top to bottom; anything else goes to “Otherwise”</span></label>
      <datalist id="rule-vars">{variables.map((v) => <option key={v} value={v} />)}</datalist>
      <ol className="fb-rules">
        {rules.map((r, i) => (
          <li key={r.id}>
            <span className="fb-rule-n">{i + 1}</span>
            <input list="rule-vars" value={r.variable} placeholder="variable" spellCheck={false} onChange={(e) => set(i, { variable: clean(e.target.value) })} />
            <select value={r.operator} onChange={(e) => set(i, { operator: e.target.value })}>
              {operators.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {!noValue.has(r.operator) && <input value={r.value ?? ''} placeholder="value" onChange={(e) => set(i, { value: e.target.value })} />}
            <button type="button" onClick={() => onChange(rules.filter((_, j) => j !== i))} aria-label="Remove rule"><X size={15} /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="fb-add" onClick={() => onChange([...rules, { id: uid('rule'), variable: '', operator: 'equals', value: '' }])}>
        <Plus size={15} /> Add rule
      </button>
    </div>
  )
}

/* ---------- block settings ---------- */

export function BlockInspector({ node, spec, langs, variables, flows, flowId, operators, issues, onChange, onDelete, files, onFilesChange, botSettings }) {
  const [lang, setLang] = useState(langs[0] || 'sw')
  const Icon = ICONS[spec.icon]
  const data = node.data || {}
  const set = (key) => (v) => onChange({ ...data, [key]: v })

  return (
    <div className="fb-inspector-body">
      <div className="fb-inspector-title">
        {Icon && <span className={`fb-block-icon cat-${spec.category || 'start'}`}><Icon size={16} /></span>}
        <div><h3>{spec.label}</h3><p>{spec.description}</p></div>
      </div>
      {issues.length > 0 && (
        <ul className="fb-issues-inline">
          {issues.map((i, k) => (
            <li key={k} className={i.level}>{i.level === 'error' ? <CircleAlert size={14} /> : <TriangleAlert size={14} />}{i.message}</li>
          ))}
        </ul>
      )}
      {node.type === 'business_hours' && (
        <div className="fb-callout"><Clock size={16} />
          <div><strong>{botSettings?.hours_summary || 'Loading hours…'}</strong>
            <p>CLC is {botSettings?.open_now ? 'open' : 'closed'} right now. Change the hours in <b>Bot settings</b> on the Chatbot flows page. In the test chat you can pretend it is open or closed.</p></div>
        </div>
      )}
      {spec.fields.map((f) => {
        const common = { field: f, value: data[f.key], onChange: set(f.key) }
        switch (f.kind) {
          case 'text_i18n': return <I18nText key={f.key} {...common} langs={langs} lang={lang} setLang={setLang} />
          case 'variable': return <VariableInput key={f.key} {...common} variables={variables} />
          case 'options': return <OptionsEditor key={f.key} {...common} langs={langs} lang={lang} setLang={setLang} />
          case 'rules': return <RulesEditor key={f.key} {...common} variables={variables} operators={operators} />
          case 'media': return <MediaPicker key={f.key} {...common} langs={langs} lang={lang} setLang={setLang} files={files} onFilesChange={onFilesChange} LangTabs={LangTabs} />
          case 'emails': return (
            <div className="fb-field" key={f.key}><label>{f.label}</label>
              <input value={data[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)} placeholder={botSettings?.staff_emails?.join(', ') || 'name@clc.tz, other@clc.tz'} spellCheck={false} />
              {f.help && <small className="fb-help">{f.help}{botSettings?.staff_emails?.length ? ` Now: ${botSettings.staff_emails.join(', ')}` : ' None set yet.'}</small>}</div>
          )
          case 'number': return (
            <div className="fb-field" key={f.key}><label>{f.label}</label>
              <input type="number" min={f.min} value={data[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value === '' ? '' : Number(e.target.value))} /></div>
          )
          case 'select': return (
            <div className="fb-field" key={f.key}><label>{f.label}</label>
              <select value={data[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></div>
          )
          case 'flow': return (
            <div className="fb-field" key={f.key}><label>{f.label}{f.required && <b> *</b>}</label>
              <select value={data[f.key] || ''} onChange={(e) => set(f.key)(e.target.value)}>
                <option value="">Choose a flow…</option>
                {flows.filter((x) => x.id !== flowId).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}{x.published ? '' : ' (not published)'}</option>
                ))}
              </select></div>
          )
          default: {
            const Tag = f.multiline ? 'textarea' : 'input'
            return (
              <div className="fb-field" key={f.key}><label>{f.label}{f.required && <b> *</b>}</label>
                <Tag rows={f.multiline ? 4 : undefined} value={data[f.key] ?? ''} onChange={(e) => set(f.key)(e.target.value)} />
                {f.help && <small className="fb-help">{f.help}</small>}</div>
            )
          }
        }
      })}
      {spec.deletable !== false && (
        <button type="button" className="fb-delete" onClick={onDelete}><Trash2 size={15} /> Delete block</button>
      )}
    </div>
  )
}

/* ---------- flow settings and triggers (nothing selected) ---------- */

export function FlowSettings({ flow, settings, triggerTypes, onFlow, onSettings }) {
  const langs = settings.languages || ['sw', 'en']
  const triggers = flow.triggers || []
  const setTrigger = (i, patch) => onFlow({ triggers: triggers.map((t, j) => (j === i ? { ...t, ...patch } : t)) })
  const addTrigger = (type) => onFlow({
    triggers: [...triggers, { type, priority: type === 'keyword' ? 10 : 100, is_active: true, config: type === 'keyword' ? { words: [], match: 'exact' } : {} }],
  })
  const [word, setWord] = useState({})

  return (
    <div className="fb-inspector-body">
      <div className="fb-inspector-title"><div><h3>Flow settings</h3><p>Select a block on the canvas to edit it.</p></div></div>
      <div className="fb-field"><label>Name</label><input value={flow.name} onChange={(e) => onFlow({ name: e.target.value })} /></div>
      <div className="fb-field"><label>Description</label><textarea rows={2} value={flow.description || ''} onChange={(e) => onFlow({ description: e.target.value })} /></div>
      <label className="fb-switch">
        <input type="checkbox" checked={flow.is_active} onChange={(e) => onFlow({ is_active: e.target.checked })} />
        <span>Flow is switched on</span>
      </label>
      <div className="fb-field">
        <label>Languages the bot speaks in this flow</label>
        <div className="fb-chips">
          {['sw', 'en', 'zh'].map((l) => (
            <label key={l} className={`fb-chip ${langs.includes(l) ? 'on' : ''}`}>
              <input type="checkbox" checked={langs.includes(l)} disabled={langs.length === 1 && langs.includes(l)}
                onChange={(e) => onSettings({ languages: e.target.checked ? [...langs, l] : langs.filter((x) => x !== l) })} />
              {LANG_LABEL[l]}
            </label>
          ))}
        </div>
      </div>

      <h4 className="fb-sub">Triggers: what starts this flow</h4>
      {triggers.length === 0 && <p className="fb-muted">No trigger yet. A published flow without a trigger only runs through “Go to flow”.</p>}
      <ul className="fb-triggers">
        {triggers.map((t, i) => (
          <li key={i} className={t.is_active ? '' : 'off'}>
            <div className="fb-trigger-head">
              <strong>{triggerTypes.find((x) => x.id === t.type)?.label}</strong>
              <button type="button" onClick={() => onFlow({ triggers: triggers.filter((_, j) => j !== i) })} aria-label="Remove trigger"><X size={15} /></button>
            </div>
            <p className="fb-muted">{triggerTypes.find((x) => x.id === t.type)?.description}</p>
            {t.type === 'keyword' && (
              <>
                <div className="fb-words">
                  {(t.config.words || []).map((w) => (
                    <span key={w}>{w}<button type="button" onClick={() => setTrigger(i, { config: { ...t.config, words: t.config.words.filter((x) => x !== w) } })} aria-label={`Remove ${w}`}><X size={12} /></button></span>
                  ))}
                  <input value={word[i] || ''} placeholder="Type a word, press Enter" onChange={(e) => setWord({ ...word, [i]: e.target.value })}
                    onKeyDown={(e) => {
                      const w = (word[i] || '').trim()
                      if ((e.key === 'Enter' || e.key === ',') && w) {
                        e.preventDefault()
                        if (!t.config.words.includes(w)) setTrigger(i, { config: { ...t.config, words: [...t.config.words, w] } })
                        setWord({ ...word, [i]: '' })
                      }
                    }} />
                </div>
                <div className="fb-row2">
                  <select value={t.config.match} onChange={(e) => setTrigger(i, { config: { ...t.config, match: e.target.value } })}>
                    <option value="exact">Message is exactly the word</option>
                    <option value="contains">Message contains the word</option>
                  </select>
                  <label className="fb-inline">Priority <input type="number" value={t.priority} onChange={(e) => setTrigger(i, { priority: Number(e.target.value) })} /></label>
                </div>
              </>
            )}
            <label className="fb-switch small">
              <input type="checkbox" checked={t.is_active} onChange={(e) => setTrigger(i, { is_active: e.target.checked })} />
              <span>Active</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="fb-add-row">
        {triggerTypes.map((tt) => (
          <button key={tt.id} type="button" className="fb-add" onClick={() => addTrigger(tt.id)}><Plus size={15} /> {tt.label}</button>
        ))}
      </div>
      <p className="fb-muted fb-note">Keywords are checked first (lowest priority number first), then “New conversation”. Typing <b>menu</b> always restarts from the New-conversation flow.</p>
    </div>
  )
}
