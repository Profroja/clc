import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UI, useLang } from '../i18n.jsx'
import { WhatsAppIcon } from './Icons.jsx'
import { waLink } from '../data.js'

const DURATION = 6500

const SLIDES = [
  {
    bg: '/images/people-lawyers.png',
    main: '/images/woman-people.png',
    mainPos: 'center top',
    fit: 'contain',
    wa: 'Habari, nahitaji msaada wa kisheria',
  },
  {
    bg: '/images/people-lawyers.png',
    main: '/images/man-people.png',
    mainPos: 'center top',
    fit: 'contain',
    compact: true,
    reverse: true,
    wa: 'Nataka kujua zaidi kuhusu huduma zenu',
  },
]

const textVariants = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }),
  exit: { opacity: 0, y: -16, transition: { duration: 0.3 } },
}

export default function HeroSlider() {
  const { t } = useLang()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), DURATION)
    return () => clearTimeout(id)
  }, [index])

  const slide = SLIDES[index]
  const copy = UI.hero[index]

  return (
    <section id="home" className="hero">
      <motion.div
        className="hero-bg"
        style={{ backgroundImage: `url(${slide.bg})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1 }}
      />
      <div className="hero-shade" />
      <div className="hero-sweep" />
      <div className="hero-dust" />
      <div className="hero-pattern" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className={`container hero-grid${slide.reverse ? ' hero-grid--rev' : ''}`}>
        <div className="hero-copy">
          <AnimatePresence mode="wait">
            <motion.div key={index}>
              <motion.h1
                className={slide.compact ? 'hero-h1-sm' : undefined}
                custom={1}
                variants={textVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {t(copy.title)}
                <br />
                {t(copy.title2)} <em>{t(copy.accent)}</em>
              </motion.h1>
              <motion.div className="hero-ctas" custom={3} variants={textVariants} initial="hidden" animate="show" exit="exit">
                <a href={waLink(slide.wa)} target="_blank" rel="noreferrer" className="btn btn-wa btn-lg">
                  <WhatsAppIcon /> {t(UI.cta.whatsapp)}
                </a>
                <a href="#book" className="btn btn-outline-gold btn-lg">{t(UI.cta.book)}</a>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hero-visual">
          <AnimatePresence mode="wait">
            <motion.div key={index} className="arch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <img src={slide.main} alt="" style={{ objectPosition: slide.mainPos, objectFit: slide.fit }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
