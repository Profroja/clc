import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Maximize2, Minus, Play, Search, X } from 'lucide-react'
import { UI, useLang } from '../i18n.jsx'
import { MEDIA_TYPES, formatDate } from '../media.js'
import { useLive } from '../live.js'
import { useMediaPosts } from '../mediaPosts.js'
import { waLink } from '../data.js'
import { Reveal, SectionHead } from './ui.jsx'
import { WhatsAppIcon } from './Icons.jsx'

const pick = (o, lang) => o[lang] ?? o.en
const typeLabel = (key, lang) => pick(MEDIA_TYPES.find((m) => m.key === key).label, lang)
// The picture of an item: its cover, or YouTube's thumbnail, or a frame taken from the uploaded video.
function Thumb({ m, className }) {
  if (m.image) return <img className={className} src={m.image} alt="" loading="lazy" />
  if (m.frame) return <video className={className} src={m.frame} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
  return null
}

const isVideo = (m) => m.type !== 'machapisho' || !!m.youtube || !!m.video

function MediaCard({ m, lang, featured = false }) {
  return (
    <motion.article layout className={`mcard ${featured ? 'mcard--feat' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <a href={`#/media/${m.id}`} className="mcard-img">
        <Thumb m={m} />
        <span className={`mtag mtag--${m.type}`}>{typeLabel(m.type, lang)}</span>
        {isVideo(m) && <span className="mplay"><Play size={featured ? 30 : 22} fill="currentColor" /></span>}
        {m.duration && <span className="mdur"><Clock size={12} /> {m.duration}</span>}
      </a>
      <div className="mcard-body">
        <span className="mdate"><CalendarDays size={14} /> {formatDate(m.date, lang)}</span>
        <h3>{pick(m.title, lang)}</h3>
        <p>{pick(m.excerpt, lang)}</p>
        <a href={`#/media/${m.id}`} className="mmore">{UI.media.more[lang]} <ArrowRight size={16} /></a>
      </div>
    </motion.article>
  )
}

const byDate = (a, b) => b.date.localeCompare(a.date)

export function MediaSection() {
  const { lang, t } = useLang()
  const { items: mediaItems } = useMediaPosts()
  const recent = [...mediaItems].sort(byDate).slice(0, 4)

  return (
    <section className="section media" id="media">
      <div className="container">
        <SectionHead title={t(UI.media.title)} sub={t(UI.media.sub)} />
        <div className="mgrid mgrid--row">
          {recent.map((m) => <MediaCard key={m.id} m={m} lang={lang} />)}
        </div>
        <div className="mall">
          <a href="#/media" className="btn btn-gold btn-lg">{t(UI.media.viewAll)} <ArrowRight size={18} /></a>
        </div>
      </div>
    </section>
  )
}

export function MediaArchive() {
  const { lang, t } = useLang()
  const { items: mediaItems } = useMediaPosts()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const items = [...mediaItems].sort(byDate).filter((m) =>
    (filter === 'all' || m.type === filter) &&
    (!needle || `${pick(m.title, lang)} ${pick(m.excerpt, lang)}`.toLowerCase().includes(needle)))

  return (
    <main className="mpage">
      <div className="mpage-hero">
        <div className="container">
          <a href="#home" className="mback"><ArrowLeft size={16} /> {t(UI.media.home)}</a>
          <Reveal>
            <h1>{t(UI.media.title)}</h1>
            <p className="march-sub">{t(UI.media.sub)}</p>
          </Reveal>
        </div>
      </div>
      <div className="container march">
        <div className="march-tools">
          <label className="msearch">
            <Search size={18} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(UI.media.search)} />
          </label>
          <div className="mfilters" role="tablist">
            {MEDIA_TYPES.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
                {pick(f.label, lang)}
              </button>
            ))}
          </div>
        </div>
        {items.length ? (
          <motion.div layout className="mgrid">
            <AnimatePresence mode="popLayout">
              {items.map((m) => <MediaCard key={m.id} m={m} lang={lang} />)}
            </AnimatePresence>
          </motion.div>
        ) : (
          <p className="mempty">{t(UI.media.empty)}</p>
        )}
      </div>
    </main>
  )
}

export function MediaPage({ id }) {
  const { lang } = useLang()
  const { items: mediaItems, loading } = useMediaPosts()
  const m = mediaItems.find((x) => x.id === id)

  if (loading) return <main className="mpage" />
  if (!m) {
    return (
      <main className="mpage">
        <div className="container mpage-inner" style={{ textAlign: 'center' }}>
          <h1>404</h1>
          <a href="#/media" className="btn btn-gold">{UI.media.back[lang]}</a>
        </div>
      </main>
    )
  }

  const related = mediaItems.filter((x) => x.id !== m.id).sort((a) => (a.type === m.type ? -1 : 1)).slice(0, 3)

  return (
    <main className="mpage">
      <div className="mpage-hero">
        <div className="container">
          <a href="#/media" className="mback"><ArrowLeft size={16} /> {UI.media.back[lang]}</a>
          <Reveal>
            <span className={`mtag mtag--${m.type} mtag--static`}>{typeLabel(m.type, lang)}</span>
            <h1>{pick(m.title, lang)}</h1>
            <div className="mmeta">
              <span><CalendarDays size={15} /> {formatDate(m.date, lang)}</span>
              {m.duration && <span><Clock size={15} /> {m.duration}</span>}
            </div>
          </Reveal>
        </div>
      </div>

      <div className="container mpage-inner">
        <article>
          <Reveal className="mplayer">
            {m.youtube ? (
              <iframe src={`https://www.youtube.com/embed/${m.youtube}`} title={pick(m.title, lang)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
            ) : m.video ? (
              <video src={m.video} poster={m.cover || undefined} controls playsInline preload="metadata" />
            ) : (
              <>
                <img src={m.image} alt="" />
                {isVideo(m) && <span className="mplay mplay--lg"><Play size={38} fill="currentColor" /></span>}
              </>
            )}
          </Reveal>
          <div className="mbody">
            <p className="mlead">{pick(m.excerpt, lang)}</p>
            {pick(m.body, lang).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </article>

        <aside className="mside">
          <div className="mcta">
            <h4>{UI.media.helpTitle[lang]}</h4>
            <p>{UI.media.helpSub[lang]}</p>
            <a href={waLink(pick(m.title, lang))} target="_blank" rel="noreferrer" className="btn btn-wa"><WhatsAppIcon size={18} /> {UI.cta.whatsapp[lang]}</a>
            <a href="#book" className="btn btn-gold">{UI.cta.book[lang]}</a>
          </div>
          <h4 className="mside-title">{UI.media.related[lang]}</h4>
          {related.map((r) => (
            <a key={r.id} href={`#/media/${r.id}`} className="mrel">
              <Thumb m={r} />
              <span><small>{typeLabel(r.type, lang)}</small>{pick(r.title, lang)}</span>
            </a>
          ))}
        </aside>
      </div>
    </main>
  )
}

// The floating live window: it appears while CLC is live on YouTube and autoplays (muted).
// Clicking the video or the title opens the live page (#/live) with the full player and the WhatsApp chat.
export function LiveMini({ hidden = false }) {
  const { t } = useLang()
  const { live } = useLive()
  const [state, setState] = useState('open') // open | min
  const [closedFor, setClosedFor] = useState(null) // the video the visitor closed; a new live show opens it again
  if (!live?.live || hidden || closedFor === live.video_id) return null

  const title = live.title || t({ sw: 'Podcast LIVE sasa', en: 'Podcast LIVE now', zh: '播客直播中' })
  return (
    <div className={`live-mini ${state === 'min' ? 'is-min' : ''}`} role="complementary" aria-label="Live podcast">
      {state === 'min' ? (
        <button className="live-pill" onClick={() => setState('open')}>
          <span className="live-dot" /> LIVE <small>{t(UI.media.watch)}</small>
        </button>
      ) : (
        <motion.div className="live-win" initial={{ opacity: 0, y: 30, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <div className="live-screen">
            <iframe src={`https://www.youtube.com/embed/${live.video_id}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0`} title="Live"
              allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} />
            <a href="#/live" className="live-click" aria-label={title} />
            <div className="live-bar">
              <span className="live-badge"><span className="live-dot" /> LIVE</span>
              <span className="live-actions">
                <a href="#/live" aria-label="Open" title="Open"><Maximize2 size={15} /></a>
                <button onClick={() => setState('min')} aria-label="Minimize" title="Minimize"><Minus size={16} /></button>
                <button onClick={() => setClosedFor(live.video_id)} aria-label="Close" title="Close"><X size={16} /></button>
              </span>
            </div>
          </div>
          <a href="#/live" className="live-title">{title}</a>
        </motion.div>
      )}
    </div>
  )
}
