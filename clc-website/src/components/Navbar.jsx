import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import { LANGS, UI, useLang } from '../i18n.jsx'
import { WhatsAppIcon } from './Icons.jsx'

const LINKS = [
  ['home', '#home'],
  ['services', '#services'],
  ['media', '#media'],
  ['why', '#why'],
  ['contact', '#contact'],
]

export function Logo() {
  return (
    <a href="#home" className="logo" aria-label="Community Legal Clinic">
      <img src="/images/logo.png" alt="Community Legal Clinic" className="logo-img" />
      <span className="logo-text">
        <strong>Community Legal Clinic</strong>
      </span>
    </a>
  )
}

function LangSwitcher() {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])
  const cur = LANGS.find((l) => l.code === lang)
  return (
    <div className="lang" ref={ref}>
      <button className="lang-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="flag">{cur.flag}</span> {cur.label} <ChevronDown size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="lang-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {LANGS.map((l) => (
              <li key={l.code}>
                <button className={l.code === lang ? 'active' : ''} onClick={() => { setLang(l.code); setOpen(false) }}>
                  <span className="flag">{l.flag}</span> {l.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Navbar() {
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30)
      let cur = 'home'
      for (const [key, href] of LINKS) {
        const el = document.querySelector(href)
        if (el && el.getBoundingClientRect().top < 140) cur = key
      }
      setActive(cur)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          {LINKS.map(([key, href]) => (
            <a key={key} href={href} className={active === key ? 'active' : ''}>{t(UI.nav[key])}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <LangSwitcher />
          <a href="#book" className="btn btn-gold btn-shine nav-book">{t(UI.nav.book)}</a>
          <button className="burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            >
              <div className="drawer-head">
                <Logo />
                <button className="burger" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
              </div>
              {LINKS.map(([key, href], i) => (
                <motion.a
                  key={key}
                  href={href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                >
                  {t(UI.nav[key])}
                </motion.a>
              ))}
              <div className="drawer-foot">
                <LangSwitcher />
                <a href="#book" onClick={() => setOpen(false)} className="btn btn-gold">{t(UI.nav.book)}</a>
                <a href="https://wa.me/255745118253" className="btn btn-wa"><WhatsAppIcon /> WhatsApp</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
