import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, CalendarDays, Check, ChevronDown, Clock,
  LogIn, Mail, MapPin, Mic, Phone, Video, Handshake, Users,
} from 'lucide-react'
import { UI, useLang } from '../i18n.jsx'
import { services, waLink, WHATSAPP } from '../data.js'
import { Reveal, SectionHead } from './ui.jsx'
import { Logo } from './Navbar.jsx'
import { SOCIALS, Social, WhatsAppIcon } from './Icons.jsx'

/* ---------------- How it works ---------------- */
function PhoneMock() {
  return (
    <div className="phone">
      <div className="phone-top"><span className="av">CLC</span><div><b>Community Legal Clinic</b><small>online</small></div></div>
      <div className="msgs">
        <motion.p className="in" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>Habari! Tunakusaidiaje leo? 👋</motion.p>
        <motion.p className="out" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }}>Nataka kubadilisha jina kwa Deed Poll</motion.p>
        <motion.p className="in" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 }}>Sawa kabisa ✅ Tutumie nyaraka zako…</motion.p>
      </div>
    </div>
  )
}
function LaptopMock() {
  return (
    <div className="laptop">
      <div className="screen">
        <div className="vtile big"><img src="/images/lawyer-help.png" alt="" /><span>Advocate</span></div>
        <div className="vtile"><Users size={22} /><span>You</span></div>
        <div className="vbar"><Mic size={12} /><Video size={12} /><span className="end" /></div>
      </div>
      <div className="base" />
    </div>
  )
}
function SignMock() {
  return (
    <div className="signmock">
      <img src="/images/deed.jpg" alt="" />
      <motion.span className="stamp" initial={{ scale: 2.2, opacity: 0, rotate: -25 }} whileInView={{ scale: 1, opacity: 1, rotate: -12 }} viewport={{ once: true }} transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 12 }}>
        <BadgeCheck size={18} /> APPROVED
      </motion.span>
    </div>
  )
}

export function HowItWorks() {
  const { t } = useLang()
  const H = UI.how
  const mocks = [<PhoneMock key="p" />, <LaptopMock key="l" />, <SignMock key="s" />]
  const icons = [WhatsAppIcon, CalendarDays, Handshake]
  return (
    <section className="section how" id="contact">
      <div className="how-glow" />
      <div className="container">
        <SectionHead light center title={t(H.title)} />
        <div className="how-grid">
          <svg className="how-line" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
            <motion.path d="M20 20 C 250 -10, 350 50, 500 20 S 800 -10, 980 20" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: 'easeInOut' }} />
          </svg>
          {H.steps.map((s, i) => {
            const Ic = icons[i]
            return (
              <Reveal key={i} delay={i * 0.15} className="how-card">
                <div className="how-num">{i + 1}</div>
                <div className="how-mock">{mocks[i]}</div>
                <h3><span className="how-ic"><Ic size={18} /></span>{t(s.t)}</h3>
                <p>{t(s.d)}</p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Partner with us ---------------- */
export function PartnerSection() {
  const { t, lang } = useLang()
  const P = UI.partner
  const icons = [Users, Handshake, BadgeCheck, ArrowRight]
  return (
    <section className="section partner" id="partner">
      <div className="partner-orb o1" />
      <div className="partner-orb o2" />
      <div className="container partner-inner">
        <Reveal className="partner-copy">
          <span className="eyebrow">{t(P.eyebrow)}</span>
          <h2>{t(P.title)}</h2>
          <p>{t(P.sub)}</p>
          <a className="btn btn-gold btn-lg btn-shine" href={waLink(P.msg[lang] || P.msg.en)} target="_blank" rel="noopener noreferrer">
            <Handshake size={20} /> {t(P.cta)} <ArrowRight size={18} />
          </a>
          <small className="partner-note">{t(P.note)}</small>
        </Reveal>
        <div className="partner-visual">
          <div className="partner-ring"><Handshake size={44} /><span>CLC</span></div>
          {P.perks.map((k, i) => {
            const Ic = icons[i]
            return (
              <Reveal key={i} delay={0.1 + i * 0.12} className="perk" y={24}>
                <span className="perk-ic"><Ic size={20} /></span>
                <div><b>{t(k.t)}</b><p>{t(k.d)}</p></div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Why choose ---------------- */
export function WhyChoose() {
  const { t } = useLang()
  const W = UI.why
  return (
    <section className="section why" id="why">
      <div className="container why-grid">
        <Reveal className="why-media">
          <img src="/images/lawyers.png" alt="" loading="lazy" />
        </Reveal>
        <Reveal className="why-copy" delay={0.1}>
          <h2 className="why-title">{t(W.title)}</h2>
          <p className="why-body">{t(W.body)}</p>
          <ul className="checks why-points">
            {W.points.map((p, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 * i }}>
                <span className="check"><Check size={13} strokeWidth={3} /></span>{t(p)}
              </motion.li>
            ))}
          </ul>
          <a href={waLink('Habari, nahitaji msaada wa kisheria')} target="_blank" rel="noreferrer" className="btn btn-wa btn-lg">
            <WhatsAppIcon /> {t(UI.cta.whatsapp)}
          </a>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Booking ---------------- */
const MEETINGS = [
  { key: 'WhatsApp', icon: WhatsAppIcon },
  { key: 'Phone', icon: Phone },
  { key: 'Zoom', icon: Video },
  { key: 'Google Meet', icon: Video },
  { key: 'In person', icon: Handshake },
]
const TIMES = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']

export function Booking() {
  const { t, lang } = useLang()
  const B = UI.booking
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ service: '', meeting: 'WhatsApp', date: '', time: '10:00', name: '', phone: '', note: '' })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const canNext = step === 0 ? !!f.service : step === 1 ? !!f.date : f.name && f.phone
  const today = new Date().toISOString().slice(0, 10)

  const send = () => {
    const svc = services.find((s) => s.id === f.service)
    const msg = [
      'Booking — Community Legal Clinic',
      `Service: ${svc ? svc.short.en : ''}`,
      `Meeting: ${f.meeting}`,
      `Date: ${f.date} ${f.time}`,
      `Name: ${f.name}`,
      `Phone: ${f.phone}`,
      f.note && `Issue: ${f.note}`,
      `Language: ${lang.toUpperCase()}`,
    ].filter(Boolean).join('\n')
    window.open(waLink(msg), '_blank', 'noopener')
    setStep(3)
  }

  const stepLabels = [B.s1, B.s2, B.s3]
  return (
    <section className="section booking" id="book">
      <div className="container booking-grid">
        <div className="booking-intro">
          <SectionHead light title={t(B.title)} />
          <Reveal className="booking-photo">
            <img src="/images/handshake.jpg" alt="" />
            <div className="booking-hours"><Clock size={18} /><span>Mon–Fri 9:00–18:00<br />Sat 9:00–13:00 (EAT)</span></div>
          </Reveal>
        </div>

        <Reveal className="booking-card">
          <div className="progress">
            {stepLabels.map((l, i) => (
              <div key={i} className={`pstep ${i <= step ? 'on' : ''}`}>
                <b>{i < step ? '✓' : i + 1}</b><span>{t(l)}</span>
              </div>
            ))}
            <div className="pbar"><motion.span animate={{ width: `${(Math.min(step, 2) / 2) * 100}%` }} /></div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              {step === 0 && (
                <div className="pick-grid">
                  {services.map((s) => (
                    <button key={s.id} className={`pick ${f.service === s.id ? 'on' : ''}`} onClick={() => set('service', s.id)}>
                      <img src={s.image} alt="" />
                      <span>{t(s.short)}</span>
                    </button>
                  ))}
                </div>
              )}
              {step === 1 && (
                <div className="form-col">
                  <label className="lbl">{t(B.meeting)}</label>
                  <div className="meet-grid">
                    {MEETINGS.map((m) => (
                      <button key={m.key} className={`meet ${f.meeting === m.key ? 'on' : ''}`} onClick={() => set('meeting', m.key)}>
                        <m.icon size={18} /> {m.key}
                      </button>
                    ))}
                  </div>
                  <div className="row2">
                    <div>
                      <label className="lbl" htmlFor="bdate">{t(B.date)}</label>
                      <input id="bdate" type="date" min={today} value={f.date} onChange={(e) => set('date', e.target.value)} />
                    </div>
                    <div>
                      <label className="lbl">{t(B.time)}</label>
                      <div className="time-grid">
                        {TIMES.map((tm) => (
                          <button key={tm} className={`time ${f.time === tm ? 'on' : ''}`} onClick={() => set('time', tm)}>{tm}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="form-col">
                  <div className="row2">
                    <div><label className="lbl" htmlFor="bname">{t(B.name)}</label><input id="bname" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Jina / Name" /></div>
                    <div><label className="lbl" htmlFor="bphone">{t(B.phone)}</label><input id="bphone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+255 7xx xxx xxx" /></div>
                  </div>
                  <label className="lbl" htmlFor="bnote">{t(B.note)}</label>
                  <textarea id="bnote" rows={4} value={f.note} onChange={(e) => set('note', e.target.value)} />
                </div>
              )}
              {step === 3 && (
                <div className="done">
                  <motion.span className="done-ic" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
                    <BadgeCheck size={46} />
                  </motion.span>
                  <h3>Asante, {f.name.split(' ')[0]}!</h3>
                  <p>{f.meeting} • {f.date} • {f.time}</p>
                  <button className="btn btn-outline-gold" onClick={() => { setStep(0); setF((o) => ({ ...o, service: '', date: '', note: '' })) }}>OK</button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step < 3 && (
            <div className="booking-actions">
              {step > 0 ? <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>{t(B.back)}</button> : <span />}
              {step < 2 ? (
                <button className="btn btn-gold" disabled={!canNext} onClick={() => setStep(step + 1)}>{t(B.next)} <ArrowRight size={16} /></button>
              ) : (
                <button className="btn btn-wa" disabled={!canNext} onClick={send}><WhatsAppIcon size={18} /> {t(B.send)}</button>
              )}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Final CTA + Footer ---------------- */
export function FinalCTA() {
  const { t } = useLang()
  return (
    <section className="final-cta">
      <div className="container final-inner">
        <Reveal className="final-copy">
          <h2>{t(UI.footer.help)}</h2>
          <p>{t(UI.hero[0].sub)}</p>
          <div className="hero-ctas">
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="btn btn-navy btn-lg"><WhatsAppIcon /> {t(UI.cta.whatsapp)}</a>
            <a href="#book" className="btn btn-white btn-lg">{t(UI.cta.book)}</a>
          </div>
        </Reveal>
        <Reveal className="final-img" delay={0.1}>
          <img src="/images/lawyers-msaada.png" alt="" />
        </Reveal>
      </div>
    </section>
  )
}

export function Footer() {
  const { t } = useLang()
  const F = UI.footer
  return (
    <footer className="footer" id="footer">
      <div className="container footer-grid">
        <div className="f-brand">
          <Logo />
          <p>{t(F.about)}</p>
          <div className="socials">
            {SOCIALS.map((s) => {
              const Ic = s.key === 'whatsapp' ? WhatsAppIcon : Social[s.key]
              return <a key={s.key} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}><Ic size={17} /></a>
            })}
          </div>
        </div>
        <div>
          <h4>{t(F.quick)}</h4>
          {['home', 'services', 'contact'].map((k) => <a key={k} href={`#${k === 'home' ? 'home' : k}`}>{t(UI.nav[k])}</a>)}
        </div>
        <div>
          <h4>{t(F.services)}</h4>
          {services.map((s) => <a key={s.id} href={`#${s.id}`}>{t(s.short)}</a>)}
        </div>
        <div>
          <h4>{t(F.contact)}</h4>
          <p className="f-line"><Phone size={15} /> <a href="tel:+255745118253">+255 745 118 253</a></p>
          {/* TODO: replace with CLC's real email address */}
          <p className="f-line"><Mail size={15} /> <a href="mailto:info@clc.tz">info@clc.tz</a></p>
          <p className="f-line"><MapPin size={15} /> P.O. Box 4661, Dar es Salaam</p>
          <p className="f-line"><Clock size={15} /> Mon–Fri 9–18 • Sat 9–13</p>
          <a href="#/login" className="btn btn-outline-gold f-login"><LogIn size={16} /> {t({ sw: 'Ingia', en: 'Login', zh: '登录' })}</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Community Legal Clinic (CLC). All rights reserved.</span>
        <span className="f-disc">{t(F.disclaimer)}</span>
        <span className="f-links"><a href="https://clc.tz/privacy.html">Privacy</a><a href="https://clc.tz/terms.html">Terms</a><a href="https://clc.tz/legal-disclaimer.html">Disclaimer</a></span>
      </div>
    </footer>
  )
}

export function FloatingWA() {
  const { t } = useLang()
  return (
    <a className="fab-wa" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <span className="fab-tip">{t({ sw: 'Ongea na Wakili', en: 'Chat with a lawyer', zh: '与律师交谈' })}</span>
      <WhatsAppIcon size={28} />
    </a>
  )
}
