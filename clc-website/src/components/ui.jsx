import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

export function Reveal({ children, delay = 0, y = 32, className = '', as = 'div' }) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  )
}

export function CountUp({ to, suffix = '', duration = 1.8, plain = false }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1)
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  return <span ref={ref}>{plain ? val : val.toLocaleString()}{suffix}</span>
}

export function SectionHead({ title, sub, light = false, center = false, children }) {
  return (
    <div className={`section-head ${light ? 'light' : ''} ${center ? 'center' : ''}`}>
      <div>
        <Reveal as="h2" delay={0.05}>{title}</Reveal>
        {sub && <Reveal as="p" delay={0.1}>{sub}</Reveal>}
      </div>
      {children}
    </div>
  )
}
