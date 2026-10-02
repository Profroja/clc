import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Globe2, Landmark, Pickaxe, ScrollText, ShieldCheck } from 'lucide-react'
import { UI, useLang } from '../i18n.jsx'
import { services, waLink } from '../data.js'
import { Reveal, SectionHead } from './ui.jsx'
import { WhatsAppIcon } from './Icons.jsx'

export const ICONS = { pickaxe: Pickaxe, globe: Globe2, landmark: Landmark, scroll: ScrollText, shield: ShieldCheck }

export function ServicesOverview() {
  const { t } = useLang()
  return (
    <section className="section services-overview" id="services">
      <div className="container">
        <SectionHead title={t(UI.services.title)} />
      </div>
    </section>
  )
}

function ServiceBand({ s, index }) {
  const { lang } = useLang()
  const reverse = index % 2 === 1
  const Icon = ICONS[s.icon]
  const pick = (o) => o[lang] ?? o.en

  return (
    <section id={s.id} className={`band band--${s.theme} ${reverse ? 'band--rev' : ''}`}>
      <div className="band-pattern" />
      <div className="container band-grid">
        <Reveal className="band-media" y={40}>
          <div className="media-main">
            <img src={s.image} alt="" loading="lazy" />
          </div>
          <motion.div className="media-inset" whileHover={{ rotate: reverse ? 2 : -2, scale: 1.04 }}>
            <img src={s.inset} alt="" loading="lazy" />
          </motion.div>
          <span className="media-icon"><Icon size={26} /></span>
          <span className="media-badge"><Check size={14} /> {pick(s.badge)}</span>
        </Reveal>

        <Reveal className="band-copy" delay={0.1}>
          <AnimatePresence mode="wait">
            <motion.div key={lang} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <h2 className="band-title">{pick(s.title)}</h2>
              <p className="band-intro">{pick(s.intro)}</p>
              <ul className="checks">
                {pick(s.items).map((it, i) => (
                  <motion.li key={it} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 * i }}>
                    <span className="check"><Check size={13} strokeWidth={3} /></span>{it}
                  </motion.li>
                ))}
              </ul>
              <div className="mini-steps">
                {pick(s.steps).map((st, i) => (
                  <div key={st} className="mini-step">
                    <b>{i + 1}</b><span>{st}</span>
                  </div>
                ))}
              </div>
              <div className="band-ctas">
                <a href={waLink(pick(s.wa))} target="_blank" rel="noreferrer" className="btn btn-wa"><WhatsAppIcon size={18} /> {pick(s.cta)}</a>
                <a href="#book" className="btn btn-gold">{UI.cta.book[lang]} <ArrowRight size={16} /></a>
              </div>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  )
}

export function ServiceBands() {
  return (
    <div className="bands">
      {services.map((s, i) => <ServiceBand key={s.id} s={s} index={i} />)}
    </div>
  )
}
