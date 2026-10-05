import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarCheck, Check, CircleAlert, Clock, Handshake, Loader2, Mail, Phone, Video, X } from 'lucide-react'
import { useLang } from '../i18n.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'

const L = (sw, en, zh) => ({ sw, en, zh })
const LOCALE = { sw: 'sw-TZ', en: 'en-GB', zh: 'zh-CN' }

const T = {
  title: L('Panga appointment', 'Book an appointment', '预约咨询'),
  needTitle: L('Unahitaji msaada gani?', 'What do you need help with?', '您需要什么帮助？'),
  howTitle: L('Tukutane kwa njia gani?', 'How would you like to meet?', '您希望如何见面？'),
  general: L('Ushauri wa jumla wa kisheria', 'General legal advice', '一般法律咨询'),
  pickDay: L('Chagua siku', 'Choose a day', '选择日期'),
  pickTime: L('Chagua saa', 'Choose a time', '选择时间'),
  eat: L('Saa za Afrika Mashariki (EAT)', 'East Africa Time (EAT)', '东非时间 (EAT)'),
  closed: L('Imefungwa', 'Closed', '休息'),
  full: L('Imejaa', 'Full', '已满'),
  noTimes: L('Hakuna saa zilizo wazi siku hii. Chagua siku nyingine.', 'No times are free on this day. Please choose another day.', '这一天没有空闲时间，请选择其他日期。'),
  name: L('Jina kamili', 'Full name', '姓名'),
  phone: L('Namba ya simu', 'Phone number', '电话号码'),
  email: L('Barua pepe', 'Email', '电子邮箱'),
  emailHint: L('Uthibitisho wa appointment utatumwa hapa.', 'Your confirmation is sent here.', '确认邮件将发送到这里。'),
  note: L('Maelezo mafupi ya tatizo lako (si lazima)', 'Briefly describe your issue (optional)', '简要描述您的问题（选填）'),
  next: L('Endelea', 'Continue', '继续'),
  back: L('Rudi', 'Back', '返回'),
  confirm: L('Thibitisha appointment', 'Confirm appointment', '确认预约'),
  doneTitle: L('Appointment yako imepangwa!', 'Your appointment is booked!', '预约成功！'),
  doneRef: L('Namba ya appointment', 'Reference', '预约编号'),
  emailed: L('Tumekutumia uthibitisho kwa', 'We emailed a confirmation to', '确认邮件已发送至'),
  notEmailed: L('Appointment imehifadhiwa, lakini hatukuweza kutuma barua pepe. Tafadhali hifadhi namba ya appointment.', 'Your appointment is saved, but we could not send the email. Please keep your reference.', '预约已保存，但邮件未能发送。请保存您的预约编号。'),
  close: L('Funga', 'Close', '关闭'),
  taken: L('Saa hiyo imechukuliwa na mtu mwingine. Tafadhali chagua saa nyingine.', 'That time was just taken. Please choose another time.', '该时间刚被预约，请选择其他时间。'),
  network: L('Imeshindikana kufikia seva. Jaribu tena.', 'Could not reach the server. Please try again.', '无法连接服务器，请重试。'),
}

const KINDS = [
  { value: 'whatsapp', icon: WhatsAppIcon, label: L('Simu ya WhatsApp', 'WhatsApp call', 'WhatsApp 通话'), hint: L('Tutakupigia kwa WhatsApp', 'We call you on WhatsApp', '我们通过 WhatsApp 联系您') },
  { value: 'phone', icon: Phone, label: L('Simu ya kawaida', 'Phone call', '电话'), hint: L('Tutakupigia kwa simu', 'We phone you', '我们给您打电话') },
  { value: 'google_meet', icon: Video, label: L('Google Meet', 'Google Meet', 'Google Meet'), hint: L('Tunakutumia kiungo', 'We email you the link', '我们邮件发送链接') },
  { value: 'in_person', icon: Handshake, label: L('Ana kwa ana', 'In person', '当面'), hint: L('Ofisini kwetu, Dar es Salaam', 'At our Dar es Salaam office', '到访达累斯萨拉姆办公室') },
]

const PAGE = { enter: (d) => ({ opacity: 0, x: d * 40 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: d * -40 }) }

export default function AppointmentModal() {
  const [open, setOpen] = useState(false)
  // Every "Appointment" button on the site is a link to #book: open the pop-up instead of jumping to a section.
  useEffect(() => {
    const on = (e) => {
      const link = e.target.closest?.('a[href="#book"]')
      if (link) { e.preventDefault(); setOpen(true) }
    }
    document.addEventListener('click', on)
    return () => document.removeEventListener('click', on)
  }, [])
  return open ? <Dialog onClose={() => setOpen(false)} /> : null
}

function Dialog({ onClose }) {
  const { t, lang } = useLang()
  const [options, setOptions] = useState(null)
  const [step, setStep] = useState(0) // 0 need, 1 how to meet, 2 day & time, 3 your details, 4 done
  const [dir, setDir] = useState(1)
  const [f, setF] = useState({ service: '', meeting_kind: '', date: '', time: '', full_name: '', phone: '+255 ', email: '', note: '' })
  const [slots, setSlots] = useState(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState('')
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    fetch('/api/appointments/options/').then((r) => r.json()).then(setOptions).catch(() => setBanner(t(T.network)))
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc) }
  }, [onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSlots = (date) => {
    setSlots(null)
    return fetch(`/api/appointments/slots/?date=${date}`).then((r) => r.json()).then(setSlots).catch(() => setSlots([]))
  }
  useEffect(() => { if (f.date) loadSlots(f.date) }, [f.date])

  const days = (options?.days || []).slice(0, 21)
  const go = (to) => { setDir(to > step ? 1 : -1); setStep(to); setBanner('') }
  const toDayStep = () => {
    if (!f.date) {
      const first = days.find((d) => d.open && d.free > 0)
      if (first) set('date', first.date)
    }
    go(2)
  }

  const valid = [
    !!f.service,
    !!f.meeting_kind,
    !!f.date && !!f.time,
    f.full_name.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 9 && /\S+@\S+\.\S+/.test(f.email),
  ]

  const submit = async () => {
    setBusy(true)
    setBanner('')
    setErrors({})
    try {
      const res = await fetch('/api/appointments/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, language: lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 201) { setDone(data); setDir(1); setStep(4); return }
      if (res.status === 409) { set('time', ''); loadSlots(f.date); go(2); setBanner(t(T.taken)); return }
      setErrors(data.errors || {})
      setBanner(data.detail || t(T.network))
    } catch {
      setBanner(t(T.network))
    } finally {
      setBusy(false)
    }
  }

  const dayLabel = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE[lang] || 'en-GB', opts)
  const kind = KINDS.find((k) => k.value === f.meeting_kind)

  return (
    <div className="apt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="apt" role="dialog" aria-modal="true" aria-label={t(T.title)} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }}>
        <header className="apt-head">
          <div>
            <h2>{step === 4 ? t(T.doneTitle) : t(T.title)}</h2>
          </div>
          <button className="apt-x" onClick={onClose} aria-label={t(T.close)}><X size={20} /></button>
        </header>

        <div className="apt-body">
          {!options ? <div className="apt-center"><Loader2 className="spin" size={28} /></div> : (
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div key={step} custom={dir} variants={PAGE} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                {step === 0 && (
                  <>
                    <h3>{t(T.needTitle)}</h3>
                    <div className="apt-chips">
                      {[...options.services, options.general].map((s, i, all) => {
                        const label = i === all.length - 1 ? t(T.general) : s
                        return <button key={s} type="button" className={f.service === s ? 'on' : ''} onClick={() => set('service', s)}>{f.service === s && <Check size={14} />} {label}</button>
                      })}
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h3>{t(T.howTitle)}</h3>
                    <div className="apt-kinds">
                      {KINDS.map((k) => (
                        <button key={k.value} type="button" className={f.meeting_kind === k.value ? 'on' : ''} onClick={() => set('meeting_kind', k.value)}>
                          <span className="apt-kind-ic"><k.icon size={20} /></span>
                          <strong>{t(k.label)}</strong><small>{t(k.hint)}</small>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h3>{t(T.pickDay)}</h3>
                    <div className="apt-days" role="listbox">
                      {days.map((d) => {
                        const off = !d.open || d.free === 0
                        return (
                          <button key={d.date} type="button" disabled={off} className={f.date === d.date ? 'on' : ''}
                            onClick={() => { set('date', d.date); set('time', '') }}>
                            <small>{dayLabel(d.date, { weekday: 'short' })}</small>
                            <b>{dayLabel(d.date, { day: 'numeric' })}</b>
                            <small>{off ? t(d.open ? T.full : T.closed) : dayLabel(d.date, { month: 'short' })}</small>
                          </button>
                        )
                      })}
                    </div>
                    <h3>{t(T.pickTime)} <em>{t(T.eat)}</em></h3>
                    {!slots ? <div className="apt-center sm"><Loader2 className="spin" size={22} /></div>
                      : slots.some((s) => s.available) ? (
                        <div className="apt-times">
                          {slots.map((s) => <button key={s.time} type="button" disabled={!s.available} className={f.time === s.time ? 'on' : ''} onClick={() => set('time', s.time)}>{s.time}</button>)}
                        </div>
                      ) : <p className="apt-empty">{t(T.noTimes)}</p>}
                  </>
                )}

                {step === 3 && (
                  <div className="apt-form">
                    <div className="apt-summary"><CalendarCheck size={18} />
                      <span><b>{dayLabel(f.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b> · {f.time} EAT · {kind && t(kind.label)}<br /><small>{f.service === options.general ? t(T.general) : f.service}</small></span>
                    </div>
                    <label><span>{t(T.name)} *</span><input value={f.full_name} onChange={(e) => set('full_name', e.target.value)} autoComplete="name" autoFocus /></label>
                    {errors.full_name && <p className="apt-err">{errors.full_name}</p>}
                    <label><span>{t(T.phone)} *</span><input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></label>
                    {errors.phone && <p className="apt-err">{errors.phone}</p>}
                    <label><span><Mail size={13} /> {t(T.email)} *</span><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /><small>{t(T.emailHint)}</small></label>
                    {errors.email && <p className="apt-err">{errors.email}</p>}
                    <label><span>{t(T.note)}</span><textarea rows={3} value={f.note} onChange={(e) => set('note', e.target.value)} /></label>
                  </div>
                )}

                {step === 4 && done && (
                  <div className="apt-done">
                    <span className="apt-done-badge"><Check size={30} /></span>
                    <p className="apt-ref">{t(T.doneRef)}: <b>{done.reference}</b></p>
                    <div className="apt-summary big">
                      <span><b>{dayLabel(done.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b><br />
                        <Clock size={14} /> {done.time} EAT · {kind && t(kind.label)}<br /><small>{done.service === options.general ? t(T.general) : done.service}</small></span>
                    </div>
                    <p className={done.confirmation_emailed ? 'apt-ok' : 'apt-warn'}>{done.confirmation_emailed ? <>{t(T.emailed)} <b>{done.email}</b></> : t(T.notEmailed)}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
          {banner && <p className="apt-banner" role="alert"><CircleAlert size={16} /> {banner}</p>}
        </div>

        <footer className="apt-foot">
          {step === 4 ? <button className="btn btn-gold" onClick={onClose}>{t(T.close)}</button> : (
            <>
              {step > 0 ? <button className="btn btn-ghost" onClick={() => go(step - 1)} disabled={busy}><ArrowLeft size={16} /> {t(T.back)}</button> : <span />}
              {step < 3
                ? <button className="btn btn-gold" disabled={!valid[step]} onClick={() => (step === 1 ? toDayStep() : go(step + 1))}>{t(T.next)} <ArrowRight size={16} /></button>
                : <button className="btn btn-gold" disabled={!valid[3] || busy} onClick={submit}>{busy ? <Loader2 size={16} className="spin" /> : <>{t(T.confirm)} <Check size={16} /></>}</button>}
            </>
          )}
        </footer>
      </motion.div>
    </div>
  )
}
