import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, X } from 'lucide-react'
import { statusTone } from './data.js'

export function PageHead({ title, sub, children }) {
  return (
    <div className="d-pagehead">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="d-pagehead-actions">{children}</div>
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'navy', delay = 0 }) {
  return (
    <motion.div className="d-stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <span className={`d-stat-icon tone-${tone}`}><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {hint && <em>{hint}</em>}
      </div>
    </motion.div>
  )
}

export function Badge({ children, tone }) {
  const key = String(children).toLowerCase().replace(/ /g, '_')
  return <span className={`d-badge tone-${tone || statusTone[key] || 'navy'}`}>{String(children).replace(/_/g, ' ')}</span>
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`d-card ${className}`}>
      {(title || action) && (
        <header className="d-card-head">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

// A plain person icon (no initials)
export function Avatar() {
  return <span className="d-avatar"><User size={18} /></span>
}
export function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.v))
  return (
    <div className="d-bars">
      {data.map((d, i) => (
        <div key={d.d} className="d-bar">
          <span className="d-bar-val">{d.v}</span>
          <motion.i initial={{ height: 0 }} animate={{ height: `${(d.v / max) * 100}%` }} transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }} />
          <small>{d.d}</small>
        </div>
      ))}
    </div>
  )
}

// Right-hand slide-over used for forms and detail views
export function Drawer({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="d-overlay" onClick={onClose}>
      <motion.aside className={`d-drawer ${wide ? 'wide' : ''}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}
        initial={{ x: 480 }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
        <header>
          <h2>{title}</h2>
          <button className="d-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="d-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </motion.aside>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="d-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function DetailList({ rows }) {
  return (
    <dl className="d-details">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>
      ))}
    </dl>
  )
}

// Centred pop-up dialog
export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="d-overlay d-modal-wrap" onClick={onClose}>
      <motion.div className={`d-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <header>
          <h2>{title}</h2>
          <button className="d-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="d-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </motion.div>
    </div>
  )
}