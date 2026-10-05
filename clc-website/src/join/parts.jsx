import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { LANGS, useLang } from '../i18n.jsx'

export function JoinShell({ children, hero = false }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`join ${hero ? 'join-welcome' : ''}`}>
      {!hero && (<header className="j-top">
        <a href="#home" className="j-brand"><img src="/images/logo.png" alt="" /><strong>Community Legal Clinic</strong></a>
        <div className="j-langs" role="group" aria-label="Language">
          {LANGS.map((l) => <button key={l.code} className={l.code === lang ? 'on' : ''} onClick={() => setLang(l.code)}>{l.code.toUpperCase()}</button>)}
        </div>
      </header>)}
      {hero ? children : <main className="j-main">{children}</main>}
    </div>
  )
}

export function Section({ title, sub, children, compact = false }) {
  return (
    <section className={`j-section ${compact ? 'compact' : ''}`}>
      <h2>{title}</h2>
      {sub && <p className="j-sub-text">{sub}</p>}
      <div className="j-fields">{children}</div>
    </section>
  )
}

export function Field({ label, required, children }) {
  return (
    <label className="j-field">
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      {children}
    </label>
  )
}

// Multi-select pills. options: [[value, label], ...]
export function Chips({ options, value, onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  return (
    <div className="j-chips">
      {options.map(([v, label]) => (
        <button type="button" key={v} className={value.includes(v) ? 'on' : ''} aria-pressed={value.includes(v)} onClick={() => toggle(v)}>
          {value.includes(v) && <Check size={13} />} {label}
        </button>
      ))}
    </div>
  )
}

// Drop-down for areas of expertise: pick from the list (with search), star up to 5 as primary,
// and add any area that is not in the list.
export function AreaPicker({ t, L, options, selected, onToggle, custom, onCustom }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [extra, setExtra] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [])

  const isSel = (code) => selected.some((a) => a.code === code)
  const shown = options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()))
  const addExtra = () => {
    const v = extra.trim()
    if (v && !custom.some((c) => c.toLowerCase() === v.toLowerCase())) onCustom([...custom, v])
    setExtra('')
  }

  return (
    <div className="j-ap">
      <div className="j-ap-box" ref={ref}>
        <TagBox open={open} onToggle={() => setOpen((o) => !o)} placeholder={t(L('Chagua maeneo ya utaalamu', 'Select areas of expertise'))}
          tags={[
            ...selected.map((a) => ({ key: a.code, label: options.find((o) => o.code === a.code)?.name || a.code, onRemove: () => onToggle(a.code) })),
            ...custom.map((c) => ({ key: `c:${c}`, label: c, onRemove: () => onCustom(custom.filter((x) => x !== c)) })),
          ]} />        {open && (
          <div className="j-ap-panel">
            <div className="j-ap-search"><Search size={15} /><input autoFocus placeholder={t(L('Tafuta…', 'Search…'))} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <ul role="listbox" aria-multiselectable="true">
              {shown.map((o) => (
                <li key={o.code}>
                  <button type="button" role="option" aria-selected={isSel(o.code)} className={isSel(o.code) ? 'on' : ''} onClick={() => onToggle(o.code)}>
                    <span className="j-ap-check">{isSel(o.code) && <Check size={13} />}</span>{o.name}
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="j-ap-empty">{t(L('Hakuna kilichopatikana. Ongeza eneo lako hapa chini.', 'Nothing found. Add your own area below.'))}</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="j-ap-add">
        <input value={extra} placeholder={t(L('Eneo jingine — andika na uongeze', 'Another area — type it and add'))}
          onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra() } }} />
        <button type="button" className="btn btn-navy" onClick={addExtra} disabled={!extra.trim()}><Plus size={16} /> {t(L('Ongeza', 'Add'))}</button>
      </div>

    </div>
  )
}

// Drop-down multi-select with search; chosen items show below as removable tags.
export function MultiSelect({ t, L, options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [])
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const shown = options.filter(([, label]) => label.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="j-ap">
      <div className="j-ap-box" ref={ref}>
        <TagBox open={open} onToggle={() => setOpen((o) => !o)} placeholder={placeholder}
          tags={value.map((v) => ({ key: v, label: options.find(([x]) => x === v)?.[1] || v, onRemove: () => toggle(v) }))} />        {open && (
          <div className="j-ap-panel">
            <div className="j-ap-search"><Search size={15} /><input autoFocus placeholder={t(L('Tafuta…', 'Search…'))} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <ul role="listbox" aria-multiselectable="true">
              {shown.map(([v, label]) => (
                <li key={v}>
                  <button type="button" role="option" aria-selected={value.includes(v)} className={value.includes(v) ? 'on' : ''} onClick={() => toggle(v)}>
                    <span className="j-ap-check">{value.includes(v) && <Check size={13} />}</span>{label}
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="j-ap-empty">{t(L('Hakuna kilichopatikana.', 'Nothing found.'))}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// The closed drop-down: shows only what was chosen (as removable tags), or the placeholder.
function TagBox({ open, onToggle, tags, placeholder }) {
  return (
    <div className={`j-ap-trigger ${open ? 'open' : ''}`} role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={open}
      onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}>
      <span className="j-ap-tags">
        {tags.length === 0 && <span className="j-ap-ph">{placeholder}</span>}
        {tags.map((tag) => (
          <span key={tag.key} className="j-tag">{tag.label}
            <button type="button" aria-label="Remove" onClick={(e) => { e.stopPropagation(); tag.onRemove() }}><X size={12} /></button>
          </span>
        ))}
      </span>
      <ChevronDown size={18} />
    </div>
  )
}