import { motion } from 'framer-motion'
import { ArrowRight, Check, Globe2, Landmark, Pickaxe, ScrollText, ShieldCheck } from 'lucide-react'
import { UI, useLang } from '../i18n.jsx'
import { waLink } from '../data.js'
import { usePackages } from '../packages.js'
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

const CTA = { sw: 'Pata Huduma Hii', en: 'Get This Service', zh: '获取此服务' }
const ASK = { sw: 'Nataka huduma ya', en: 'I want help with', zh: '我需要以下服务：' }

// The main frame shows whatever the admin chose for the package: an image, an uploaded video or a YouTube video.
function BandMedia({ media, icon: Icon }) {
  if (media.type === 'video' && media.url) {
    return <video src={media.url} controls playsInline preload="metadata" />
  }
  if (media.type === 'youtube' && media.youtube) {
    return (
      <iframe src={`https://www.youtube-nocookie.com/embed/${media.youtube}`} title="Video" loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
    )
  }
  if (media.type === 'image' && media.url) return <img src={media.url} alt="" loading="lazy" />
  return <span className="media-empty"><Icon size={64} /></span>
}

function ServiceBand({ s, index }) {
  const { lang } = useLang()
  const reverse = index % 2 === 1
  const Icon = ICONS[s.icon]
  const playable = s.media.type === 'video' || s.media.type === 'youtube'

  return (
    <section id={s.id} className={`band band--${s.theme} ${reverse ? 'band--rev' : ''}`}>
      <div className="band-pattern" />
      <div className="container band-grid">
        <Reveal className="band-media" y={40}>
          <div className={`media-main ${playable ? 'is-video' : ''}`}>
            <BandMedia media={s.media} icon={Icon} />
          </div>
        </Reveal>

        <Reveal className="band-copy" delay={0.1}>
          <h2 className="band-title">{s.title}</h2>
          {s.intro && <p className="band-intro">{s.intro}</p>}
          {s.items.length > 0 && (
            <ul className="checks">
              {s.items.map((it, i) => (
                <motion.li key={`${it}-${i}`} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 * i }}>
                  <span className="check"><Check size={13} strokeWidth={3} /></span>{it}
                </motion.li>
              ))}
            </ul>
          )}
          <div className="band-ctas">
            <a href={waLink(`${ASK[lang] ?? ASK.en} ${s.title}`)} target="_blank" rel="noreferrer" className="btn btn-wa"><WhatsAppIcon size={18} /> {CTA[lang] ?? CTA.en}</a>
            <a href="#book" className="btn btn-gold">{UI.cta.book[lang]} <ArrowRight size={16} /></a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
export function ServiceBands() {
  const { packages } = usePackages()
  return (
    <div className="bands">
      {packages.map((s, i) => <ServiceBand key={s.id} s={s} index={i} />)}
    </div>
  )
}
