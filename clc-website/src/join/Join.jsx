import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, CircleAlert, FileUp, BadgeCheck, Handshake, Loader2, Plus, Send, Trash2, Users, X } from 'lucide-react'
import { UI, useLang } from '../i18n.jsx'
import { Reveal } from '../components/ui.jsx'
import { LANGUAGES, REGIONS, errorLines, jreq, saved } from './joinApi.js'
import { AreaPicker, Chips, MultiSelect, Field, JoinShell, Section } from './parts.jsx'

const L = (sw, en) => ({ sw, en })

const STEPS = [
  L('Taarifa za kampuni', 'Firm details'),
  L('Ofisi na mawasiliano', 'Office & contacts'),
  L('Washirika', 'Partners'),
  L('Utaalamu', 'Expertise'),
  L('Mawakili', 'Advocates'),
  L('Nyaraka', 'Documents'),
  L('Kagua na tuma', 'Review & submit'),
]

const PAGE = {
  enter: (d) => ({ opacity: 0, x: d * 60 }),
  center: { opacity: 1, x: 0 },
  exit: (d) => ({ opacity: 0, x: d * -60 }),
}

const EMPTY = {
  firm_name: '', brela_number: '', registration_date: '', tin: '', licence_number: '', licence_expiry: '',
  region: '', district: '', ward: '', street: '', postal_address: '', map_location: '',
  phone_e164: '', whatsapp_e164: '', email: '', website: '', contact_person: '', contact_person_phone: '',
  practice_areas: [], other_areas: '', regions_served: [], languages: [],
  partners: [{ full_name: '', id_number: '', email: '', phone_e164: '', is_managing_partner: true, is_authorized_rep: true }],
  advocates: [],
}
const DATES = ['registration_date', 'licence_expiry']
const blankAdvocate = () => ({ full_name: '', roll_number: '', phone_e164: '', email: '', practising_certificate: '', certificate_expiry: '', practice_areas: [], other_areas: '' })

const toForm = (app) => {
  const f = { ...EMPTY }
  Object.keys(EMPTY).forEach((k) => { if (app[k] != null) f[k] = app[k] })
  DATES.forEach((k) => { f[k] = app[k] || '' })
  f.advocates = (app.advocates || []).map((a) => ({ ...a, certificate_expiry: a.certificate_expiry || '' }))
  if (!f.partners.length) f.partners = EMPTY.partners
  return f
}

const toPayload = (f) => {
  const p = { ...f }
  DATES.forEach((k) => { p[k] = f[k] || null })
  p.partners = f.partners.filter((x) => x.full_name.trim())
  p.advocates = f.advocates.filter((a) => a.full_name.trim() || a.roll_number.trim() || a.email.trim())
    .map(({ has_login, ...a }) => ({ ...a, certificate_expiry: a.certificate_expiry || null }))
  return p
}

// What must be filled before moving on from each step
const missing = (step, f) => {
  const need = (pairs) => pairs.filter(([, v]) => !String(v || '').trim()).map(([l]) => l)
  if (step === 0) return need([['firm name', f.firm_name], ['BRELA number', f.brela_number], ['registration date', f.registration_date], ['TIN', f.tin], ['licence number', f.licence_number], ['licence expiry', f.licence_expiry]])
  if (step === 1) return need([['region', f.region], ['district', f.district], ['ward', f.ward], ['street / building', f.street], ['official phone', f.phone_e164], ['official email', f.email], ['contact person', f.contact_person]])
  if (step === 2) {
    const m = need([['a partner name', f.partners.find((p) => p.full_name.trim())?.full_name]])
    if (!f.partners.some((p) => p.is_managing_partner && p.full_name.trim())) m.push('a Managing Partner')
    const rep = f.partners.find((p) => p.is_authorized_rep && p.full_name.trim())
    if (!rep) m.push('an authorized representative')
    else if (!rep.email.trim()) m.push("the authorized representative's email")
    return m
  }
  if (step === 3) {
    const m = []
    if (!f.practice_areas.length) m.push('at least one area of expertise')
    else if (!f.practice_areas.some((a) => a.is_primary)) m.push('at least one area of expertise')
    if (!f.regions_served.length) m.push('regions served')
    if (!f.languages.length) m.push('languages supported')
    return m
  }
  if (step === 4) {
    const rows = f.advocates.filter((a) => a.full_name.trim())
    if (!rows.length) return ['at least one advocate']
    return rows.flatMap((a) => need([[`${a.full_name}: roll number`, a.roll_number], [`${a.full_name}: email`, a.email], [`${a.full_name}: certificate number`, a.practising_certificate], [`${a.full_name}: certificate expiry`, a.certificate_expiry]]))
  }
  return []
}

export default function Join({ resume }) {
  const { t } = useLang()
  const [options, setOptions] = useState(null)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1) // 1 forward, -1 back
  const [started, setStarted] = useState(!!resume) // the welcome page comes first; the form starts on "Join"
  const [form, setForm] = useState(EMPTY)
  const [creds, setCreds] = useState(resume || null) // { id, token }
  const [app, setApp] = useState(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [done, setDone] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    jreq('options/').then(setOptions).catch((e) => setErrors(errorLines(e)))
    const c = resume || saved.get()
    if (!c) { setBooting(false); return }
    jreq(`applications/${c.id}/`, { token: c.token })
      .then((a) => {
        if (a.editable) { setCreds(c); setApp(a); setForm(toForm(a)) } else if (!resume) saved.clear()
        if (!a.editable && resume) window.location.hash = `#/join/track/${c.id}/${c.token}`
      })
      .catch(() => { if (!resume) saved.clear() })
      .finally(() => setBooting(false))
  }, [resume])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const input = (k) => ({ value: form[k], onChange: (e) => set(k)(e.target.value) })

  // Save the draft (creates it the first time). Returns the saved application.
  const save = useCallback(async () => {
    const body = toPayload(form)
    const data = creds
      ? await jreq(`applications/${creds.id}/`, { method: 'PUT', body, token: creds.token })
      : await jreq('applications/', { method: 'POST', body })
    const application = data.application || data
    if (!creds) {
      const c = { id: application.id, token: data.token }
      setCreds(c)
      saved.set(c)
    }
    setApp(application)
    setForm((f) => ({ ...f, partners: toForm(application).partners, advocates: toForm(application).advocates }))
    return application
  }, [form, creds])

  const next = async () => {
    const m = missing(step, form)
    if (m.length) { setErrors([`Please add: ${m.join(', ')}.`]); return }
    setBusy(true); setErrors([])
    try {
      await save()
      setDir(1)
      setStep((s) => s + 1)
      window.scrollTo(0, 0)
    } catch (e) { setErrors(errorLines(e)) } finally { setBusy(false) }
  }

  const back = () => { setErrors([]); setDir(-1); setStep((s) => s - 1); window.scrollTo(0, 0) }

  const upload = async (docType, file, advocateId) => {
    const fd = new FormData()
    fd.append('doc_type', docType)
    fd.append('file', file)
    if (advocateId) fd.append('advocate_id', advocateId)
    setErrors([])
    try { setApp(await jreq(`applications/${creds.id}/documents/`, { method: 'POST', form: fd, token: creds.token })) } catch (e) { setErrors(errorLines(e)) }
  }
  const removeDoc = async (id) => {
    try { setApp(await jreq(`applications/${creds.id}/documents/${id}/`, { method: 'DELETE', token: creds.token })) } catch (e) { setErrors(errorLines(e)) }
  }

  const submit = async () => {
    setBusy(true); setErrors([])
    try {
      await save()
      const result = await jreq(`applications/${creds.id}/submit/`, { method: 'POST', token: creds.token })
      setDone(result)
      saved.set(creds)
    } catch (e) { setErrors(errorLines(e)) } finally { setBusy(false) }
  }

  const docsFor = (type, advocateId = null) => (app?.documents || []).filter((d) => d.doc_type === type && (d.advocate_id || null) === advocateId)

  if (booting || !options) {
    return <JoinShell><div className="j-center"><Loader2 className="spin" size={28} /></div></JoinShell>
  }

  if (done) {
    return (
      <JoinShell>
        <motion.div className="j-card j-done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="j-done-badge"><Check size={30} /></span>
          <h1>{t(done.status === 'under_review' ? L('Marekebisho yametumwa', 'Corrections sent') : L('Maombi yametumwa', 'Application submitted'))}</h1>
          {done.application_number && <p className="j-number">{done.application_number}</p>}
          <p>{t(L('CLC itapitia maombi yako. Tumia kiungo hapa chini kufuatilia hatua na kujibu maombi yetu ya nyaraka au marekebisho. Pia tumekutumia barua pepe.', 'CLC will review your application. Use the link below to follow progress and answer any request for documents or corrections. We also emailed it to you.'))}</p>
          <a className="btn btn-gold btn-lg" href={`#/join/track/${creds.id}/${creds.token}`}>{t(L('Fuatilia maombi', 'Track my application'))} <ArrowRight size={18} /></a>
          <p className="j-note">{t(L('Maombi si idhini ya moja kwa moja: kampuni haitaona mashauri ya wateja hadi CLC iidhinishe.', 'Registration is an application for approval, not automatic access: your firm cannot see client matters until CLC approves it.'))}</p>
        </motion.div>
      </JoinShell>
    )
  }

  if (!started) {
    // Same look as the "Join the CLC Team" section on the main website
    const P = UI.partner
    const icons = [Users, Handshake, BadgeCheck, ArrowRight]
    return (
      <JoinShell hero>
        <section className="partner j-hero">
          <div className="partner-orb o1" />
          <div className="partner-orb o2" />
          <div className="container partner-inner">
            <Reveal className="partner-copy">
              <h2>{t(P.title)}</h2>
              <p>{t(P.sub)}</p>
              <button className="btn btn-gold btn-lg btn-shine" onClick={() => { setDir(1); setStarted(true); window.scrollTo(0, 0) }}>
                <Handshake size={20} /> {app ? t(L('Endelea na maombi', 'Continue my application')) : t(L('Jiunge', 'Join'))} <ArrowRight size={18} />
              </button>
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
      </JoinShell>
    )
  }
  const rep = form.partners.find((p) => p.is_authorized_rep)
  // The firm just picks its areas; the first five picked are recorded as its primary areas.
  const toggleArea = (code) => {
    const list = form.practice_areas.some((a) => a.code === code)
      ? form.practice_areas.filter((a) => a.code !== code) : [...form.practice_areas, { code, is_primary: false }]
    set('practice_areas')(list.map((a, i) => ({ ...a, is_primary: i < 5 })))
  }
  const setList = (key, i, patch) => set(key)(form[key].map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const setRep = (i) => set('partners')(form.partners.map((p, j) => ({ ...p, is_authorized_rep: j === i })))
  const areaName = (a) => t({ sw: a.name_sw, en: a.name_en })

  return (
    <JoinShell>
      <div className="j-card">
        {/* Pages slide in from the right when moving forward and from the left when going back */}
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={step} custom={dir} variants={PAGE} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
            {step === 0 && (
              <Section title={t(L('Taarifa za kampuni', 'Firm details'))} sub={t(L('Kama zilivyo kwenye usajili wa BRELA.', 'As they appear on your BRELA registration.'))}>
                <Field label={t(L('Jina la kampuni (lililosajiliwa)', 'Registered firm name'))} required><input {...input('firm_name')} /></Field>
                <div className="j-grid">
                  <Field label={t(L('Namba ya usajili BRELA', 'BRELA registration number'))} required><input {...input('brela_number')} /></Field>
                  <Field label={t(L('Tarehe ya usajili', 'Registration date'))} required><input type="date" {...input('registration_date')} /></Field>
                  <Field label="TIN" required><input {...input('tin')} /></Field>
                  <Field label={t(L('Namba ya leseni ya biashara', 'Business licence number'))} required><input {...input('licence_number')} /></Field>
                  <Field label={t(L('Leseni inaisha tarehe', 'Licence expiry date'))} required><input type="date" {...input('licence_expiry')} /></Field>
                </div>
              </Section>
            )}

            {step === 1 && (
              <Section title={t(L('Ofisi na mawasiliano', 'Office & contacts'))}>
                <div className="j-grid">
                  <Field label={t(L('Mkoa', 'Region'))} required>
                    <select value={form.region} onChange={(e) => set('region')(e.target.value)}><option value="">—</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
                  </Field>
                  <Field label={t(L('Wilaya', 'District'))} required><input {...input('district')} /></Field>
                  <Field label={t(L('Kata', 'Ward'))} required><input {...input('ward')} /></Field>
                  <Field label={t(L('Mtaa / Jengo', 'Street / building'))} required><input {...input('street')} /></Field>
                  <Field label={t(L('Anwani ya posta', 'Postal address'))}><input {...input('postal_address')} placeholder="P.O. Box …" /></Field>
                  <Field label={t(L('Eneo kwenye ramani (kiungo au lat,lng)', 'Map location (link or lat,lng)'))}><input {...input('map_location')} /></Field>
                  <Field label={t(L('Simu rasmi', 'Official phone'))} required><input type="tel" {...input('phone_e164')} placeholder="+255 7XX XXX XXX" /></Field>
                  <Field label="WhatsApp"><input type="tel" {...input('whatsapp_e164')} placeholder="+255 7XX XXX XXX" /></Field>
                  <Field label={t(L('Barua pepe rasmi', 'Official email'))} required><input type="email" {...input('email')} /></Field>
                  <Field label={t(L('Tovuti (kama ipo)', 'Website (if any)'))}><input {...input('website')} placeholder="https://" /></Field>
                  <Field label={t(L('Mtu wa mawasiliano', 'Contact person'))} required><input {...input('contact_person')} /></Field>
                  <Field label={t(L('Simu ya mtu wa mawasiliano', "Contact person's phone"))}><input type="tel" {...input('contact_person_phone')} /></Field>
                </div>
              </Section>
            )}

            {step === 2 && (
              <Section title={t(L('Washirika / wamiliki', 'Partners / proprietors'))}
                sub={t(L('Orodhesha wote. Chagua Mshirika Mkuu na mwakilishi aliyeidhinishwa — akaunti ya msimamizi wa kampuni itatumwa kwake.', 'List everyone. Mark the Managing Partner and the authorized representative — the firm admin account is sent to them.'))}>
                {form.partners.map((p, i) => (
                  <div className="j-repeat" key={p.id || i}>
                    <div className="j-repeat-head">
                      <strong>{t(L('Mshirika', 'Partner'))} {i + 1}</strong>
                      {form.partners.length > 1 && <button type="button" className="j-icon" onClick={() => set('partners')(form.partners.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={16} /></button>}
                    </div>
                    <div className="j-grid">
                      <Field label={t(L('Jina kamili', 'Full name'))} required><input value={p.full_name} onChange={(e) => setList('partners', i, { full_name: e.target.value })} /></Field>
                      <Field label={t(L('Namba ya kitambulisho', 'ID number'))}><input value={p.id_number} onChange={(e) => setList('partners', i, { id_number: e.target.value })} /></Field>
                      <Field label={t(L('Barua pepe', 'Email'))}><input type="email" value={p.email} onChange={(e) => setList('partners', i, { email: e.target.value })} /></Field>
                      <Field label={t(L('Simu', 'Phone'))}><input type="tel" value={p.phone_e164} onChange={(e) => setList('partners', i, { phone_e164: e.target.value })} /></Field>
                    </div>
                    <div className="j-checks">
                      <label><input type="checkbox" checked={p.is_managing_partner} onChange={(e) => setList('partners', i, { is_managing_partner: e.target.checked })} /> {t(L('Mshirika Mkuu', 'Managing Partner / Principal'))}</label>
                      <label><input type="radio" name="rep" checked={p.is_authorized_rep} onChange={() => setRep(i)} /> {t(L('Mwakilishi aliyeidhinishwa', 'Authorized representative'))}</label>
                    </div>
                  </div>
                ))}
                <button type="button" className="j-add" onClick={() => set('partners')([...form.partners, { full_name: '', id_number: '', email: '', phone_e164: '', is_managing_partner: false, is_authorized_rep: false }])}><Plus size={16} /> {t(L('Ongeza mshirika', 'Add a partner'))}</button>
              </Section>
            )}

            {step === 3 && (
              <Section title={t(L('Maeneo ya utaalamu', 'Areas of expertise'))}
                sub={t(L('Chagua maeneo yote mnayoshughulikia.', 'Select every area you handle.'))}>
                <AreaPicker
                  t={t} L={L}
                  options={options.practice_areas.map((a) => ({ code: a.code, name: areaName(a) }))}
                  selected={form.practice_areas}
                  onToggle={toggleArea}
                  custom={form.other_areas.split(',').map((x) => x.trim()).filter(Boolean)}
                  onCustom={(list) => set('other_areas')(list.join(', '))}
                />                <h4 className="j-sub">{t(L('Mikoa mnayohudumia', 'Regions served'))}</h4>
                <MultiSelect t={t} L={L} options={REGIONS.map((r) => [r, r])} value={form.regions_served} onChange={set('regions_served')}
                  placeholder={t(L('Chagua mikoa mnayohudumia', 'Select the regions you serve'))} />
                <h4 className="j-sub">{t(L('Lugha zinazotumika', 'Languages supported'))}</h4>
                <Chips options={LANGUAGES} value={form.languages} onChange={set('languages')} />
              </Section>
            )}

            {step === 4 && (
              <Section title={t(L('Mawakili watakaoshughulikia mashauri ya CLC', 'Advocates who will handle CLC matters'))}
                sub={t(L('Kila wakili hupata wasifu wake na akaunti baada ya idhini. Utaalamu wao ni tofauti na wa kampuni.', "Each advocate gets their own profile and login after approval. Their expertise is recorded separately from the firm's."))}>
                {form.advocates.map((a, i) => (
                  <div className="j-repeat" key={a.id || i}>
                    <div className="j-repeat-head">
                      <strong>{t(L('Wakili', 'Advocate'))} {i + 1}</strong>
                      <button type="button" className="j-icon" onClick={() => set('advocates')(form.advocates.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={16} /></button>
                    </div>
                    <div className="j-grid">
                      <Field label={t(L('Jina kamili', 'Full name'))} required><input value={a.full_name} onChange={(e) => setList('advocates', i, { full_name: e.target.value })} /></Field>
                      <Field label={t(L('Namba ya Roll', 'Roll number'))} required><input value={a.roll_number} onChange={(e) => setList('advocates', i, { roll_number: e.target.value })} /></Field>
                      <Field label={t(L('Simu', 'Mobile'))}><input type="tel" value={a.phone_e164} onChange={(e) => setList('advocates', i, { phone_e164: e.target.value })} /></Field>
                      <Field label={t(L('Barua pepe', 'Email'))} required><input type="email" value={a.email} onChange={(e) => setList('advocates', i, { email: e.target.value })} /></Field>
                      <Field label={t(L('Namba ya Practising Certificate', 'Practising certificate number'))} required><input value={a.practising_certificate} onChange={(e) => setList('advocates', i, { practising_certificate: e.target.value })} /></Field>
                      <Field label={t(L('Cheti kinaisha tarehe', 'Certificate expiry date'))} required><input type="date" value={a.certificate_expiry} onChange={(e) => setList('advocates', i, { certificate_expiry: e.target.value })} /></Field>
                    </div>
                    <h4 className="j-sub">{t(L('Utaalamu wa wakili', "Advocate's expertise"))}</h4>
                    <Chips options={options.practice_areas.map((x) => [x.code, areaName(x)])} value={a.practice_areas} onChange={(v) => setList('advocates', i, { practice_areas: v })} />
                    <Field label={t(L('Nyingine — taja', 'Other — specify'))}><input value={a.other_areas} onChange={(e) => setList('advocates', i, { other_areas: e.target.value })} /></Field>
                  </div>
                ))}
                <button type="button" className="j-add" onClick={() => set('advocates')([...form.advocates, blankAdvocate()])}><Plus size={16} /> {t(L('Ongeza wakili', 'Add an advocate'))}</button>
              </Section>
            )}

            {step === 5 && (
              <Section compact title={t(L('Nyaraka za lazima', 'Mandatory documents'))} sub={t(L('PDF, JPG au PNG, hadi MB 10 kila moja.', 'PDF, JPG or PNG, up to 10 MB each.'))}>
                {options.required_documents.map((d) => (
                  <DocSlot key={d.type} label={d.label} multiple={d.multiple} docs={docsFor(d.type)} onUpload={(f) => upload(d.type, f)} onRemove={removeDoc} t={t} />
                ))}
                <h4 className="j-sub">{t(L('Practising Certificate ya kila wakili', 'Practising certificate for each advocate'))}</h4>
                {(app?.advocates || []).map((a) => (
                  <DocSlot key={a.id} label={`${a.full_name} (${a.roll_number})`} docs={docsFor('practising_certificate', a.id)} onUpload={(f) => upload('practising_certificate', f, a.id)} onRemove={removeDoc} t={t} />
                ))}
              </Section>
            )}

            {step === 6 && (
              <Section title={t(L('Kagua na tuma', 'Review & submit'))} sub={t(L('Hakikisha taarifa ni sahihi. Ukishatuma, CLC itaanza kupitia.', 'Check that everything is correct. Once submitted, CLC starts its review.'))}>
                <dl className="j-summary">
                  <div><dt>{t(L('Kampuni', 'Firm'))}</dt><dd>{form.firm_name}</dd></div>
                  <div><dt>BRELA / TIN</dt><dd>{form.brela_number} · {form.tin}</dd></div>
                  <div><dt>{t(L('Ofisi', 'Office'))}</dt><dd>{[form.street, form.ward, form.district, form.region].filter(Boolean).join(', ')}</dd></div>
                  <div><dt>{t(L('Mawasiliano', 'Contact'))}</dt><dd>{form.phone_e164} · {form.email}</dd></div>
                  <div><dt>{t(L('Mwakilishi', 'Representative'))}</dt><dd>{rep?.full_name} ({rep?.email})</dd></div>
                  <div><dt>{t(L('Maeneo ya msingi', 'Primary areas'))}</dt><dd>{form.practice_areas.filter((a) => a.is_primary).map((a) => options.practice_areas.find((x) => x.code === a.code)?.name_en).join(', ')}</dd></div>
                  <div><dt>{t(L('Mawakili', 'Advocates'))}</dt><dd>{form.advocates.map((a) => a.full_name).join(', ')}</dd></div>
                </dl>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>

        {errors.length > 0 && (
          <div className="j-errors" role="alert">
            <CircleAlert size={18} />
            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <div className="j-nav">
          {step > 0 ? <button className="btn btn-ghost" onClick={back} disabled={busy}><ArrowLeft size={16} /> {t(L('Rudi', 'Back'))}</button> : <button className="btn btn-ghost" onClick={() => { setDir(-1); setStarted(false) }}><ArrowLeft size={16} /> {t(L('Rudi', 'Back'))}</button>}
          {step < STEPS.length - 1
            ? <button className="btn btn-gold" onClick={next} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <>{t(L('Endelea', 'Continue'))} <ArrowRight size={16} /></>}</button>
            : <button className="btn btn-gold btn-lg" onClick={submit} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <><Send size={17} /> {t(app?.status === 'correction_required' ? L('Tuma marekebisho', 'Resubmit') : L('Tuma maombi', 'Submit application'))}</>}</button>}
        </div>
        {step > 0 && step < 6 && <p className="j-autosave">{t(L('Rasimu huhifadhiwa kila unapoendelea. Unaweza kurudi baadaye kwenye kivinjari hiki.', 'Your draft is saved each time you continue. You can come back later in this browser.'))}</p>}
      </div>
    </JoinShell>
  )
}

const STATUS_TEXT = { pending: L('Inasubiri mapitio', 'Waiting for review'), accepted: L('Imekubaliwa', 'Accepted'), replacement_requested: L('Badilisha', 'Replacement needed') }

export function DocSlot({ label, docs, multiple, onUpload, onRemove, t, locked }) {
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    setBusy(true)
    for (const f of files) await onUpload(f)
    setBusy(false)
  }
  return (
    <div className={`j-doc ${docs.length ? 'has' : ''}`}>
      <div className="j-doc-main">
        <strong>{label}</strong>
        {docs.map((d) => (
          <div key={d.id} className="j-file">
            <span className={`j-dot ${d.status}`} /> {d.file_name}
            <em>{t(STATUS_TEXT[d.status])}</em>
            {d.status !== 'accepted' && !locked && <button type="button" className="j-icon" onClick={() => onRemove(d.id)} aria-label="Remove file"><X size={14} /></button>}
            {d.reviewer_note && <small className="j-note-inline">CLC: {d.reviewer_note}</small>}
          </div>
        ))}
      </div>
      {!locked && (
        <label className="btn btn-outline-navy j-upload">
          {busy ? <Loader2 size={15} className="spin" /> : <FileUp size={15} />} {docs.length && !multiple ? t(L('Badilisha', 'Replace')) : t(L('Pakia', 'Upload'))}
          <input type="file" hidden multiple={multiple} accept=".pdf,.jpg,.jpeg,.png" onChange={pick} />
        </label>
      )}
    </div>
  )
}
