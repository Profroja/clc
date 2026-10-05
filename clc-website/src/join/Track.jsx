import { useCallback, useEffect, useState } from 'react'
import { Check, CircleAlert, Clock, Loader2, Pencil, Send } from 'lucide-react'
import { useLang } from '../i18n.jsx'
import { DocSlot } from './Join.jsx'
import { JoinShell } from './parts.jsx'
import { errorLines, jreq } from './joinApi.js'

const L = (sw, en) => ({ sw, en })

// The stages the applicant sees, in order
const STAGES = [
  ['submitted', L('Imetumwa', 'Submitted')],
  ['under_review', L('Mapitio ya CLC', 'CLC review')],
  ['meeting_pending', L('Mkutano', 'Meeting')],
  ['agreements_pending', L('Makubaliano', 'Agreements')],
  ['approved_for_trial', L('Majaribio ya miezi 2', '2-month trial')],
  ['active', L('Hai', 'Active')],
]
const ORDER = STAGES.map(([k]) => k)
const stageIndex = (s) => (s === 'correction_required' ? 1 : ORDER.indexOf(s))

const MESSAGE = {
  submitted: L('Maombi yako yamepokelewa. CLC itaanza mapitio hivi karibuni.', 'We received your application. CLC will start the review soon.'),
  under_review: L('CLC inapitia nyaraka zako.', 'CLC is reviewing your documents.'),
  correction_required: L('CLC inahitaji marekebisho au nyaraka zaidi. Tazama maombi hapa chini, kisha tuma tena.', 'CLC needs a correction or more documents. See the requests below, then resubmit.'),
  meeting_pending: L('Nyaraka zimekubaliwa. Hatua inayofuata ni mkutano wa utangulizi na CLC.', 'Your documents are accepted. Next is the onboarding meeting with CLC.'),
  agreements_pending: L('Mkutano umekamilika. CLC inakamilisha makubaliano ya kusainiwa.', 'The meeting is done. CLC is completing the agreements for signing.'),
  approved_for_trial: L('Hongera! Kampuni imeidhinishwa kwa majaribio ya miezi 2. Angalia barua pepe yako kwa akaunti za kuingia.', 'Congratulations! Your firm is approved for a 2-month trial. Check your email for your login details.'),
  active: L('Kampuni yako iko hai kwenye jukwaa la CLC.', 'Your firm is active on the CLC platform.'),
  suspended: L('Akaunti ya kampuni imesimamishwa. Wasiliana na CLC.', 'Your firm is suspended. Please contact CLC.'),
  rejected: L('Maombi hayakuidhinishwa.', 'Your application was not approved.'),
}

export default function Track({ id, token }) {
  const { t } = useLang()
  const [app, setApp] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => jreq(`applications/${id}/`, { token }).then(setApp).catch((e) => setError(errorLines(e)[0])), [id, token])
  useEffect(() => { load() }, [load])

  if (error) return <JoinShell><div className="j-card j-center"><CircleAlert /> <p>{error}</p></div></JoinShell>
  if (!app) return <JoinShell><div className="j-center"><Loader2 className="spin" size={28} /></div></JoinShell>

  const idx = stageIndex(app.status)
  const open = app.requests.filter((r) => !r.resolved_at)
  const meeting = app.meetings.find((m) => m.outcome === 'scheduled')
  const upload = async (docType, file, advocateId) => {
    const fd = new FormData()
    fd.append('doc_type', docType); fd.append('file', file)
    if (advocateId) fd.append('advocate_id', advocateId)
    try { setApp(await jreq(`applications/${id}/documents/`, { method: 'POST', form: fd, token })) } catch (e) { setError(errorLines(e)[0]) }
  }
  const remove = async (docId) => { try { setApp(await jreq(`applications/${id}/documents/${docId}/`, { method: 'DELETE', token })) } catch (e) { setError(errorLines(e)[0]) } }
  const resubmit = async () => {
    setBusy(true)
    try { setApp(await jreq(`applications/${id}/submit/`, { method: 'POST', token })) } catch (e) { setError(errorLines(e).join(' ')) } finally { setBusy(false) }
  }
  // group documents by slot so a replacement upload lands next to the document it replaces
  const slots = [...new Map(app.documents.map((d) => [`${d.doc_type}:${d.advocate_id}`, d])).values()]

  return (
    <JoinShell>
      <div className="j-head">
        <h1>{app.firm_name}</h1>
        <p className="j-number">{app.application_number}</p>
      </div>

      <ol className="j-track">
        {STAGES.map(([k, label], i) => (
          <li key={k} className={i < idx ? 'done' : i === idx ? 'on' : ''}>
            <span>{i < idx ? <Check size={15} /> : i + 1}</span><em>{t(label)}</em>
          </li>
        ))}
      </ol>

      <div className="j-card">
        <p className={`j-banner ${['rejected', 'suspended'].includes(app.status) ? 'bad' : app.status === 'correction_required' ? 'warn' : ''}`}>
          {t(MESSAGE[app.status] || MESSAGE.submitted)}
          {app.status_reason && <> <strong>{app.status_reason}</strong></>}
        </p>

        {meeting && (
          <p className="j-meeting"><Clock size={16} /> {t(L('Mkutano', 'Meeting'))}: {new Date(meeting.scheduled_at).toLocaleString()} · {meeting.meeting_type === 'online' ? 'Online' : 'Physical'} {meeting.location_or_link && `· ${meeting.location_or_link}`}</p>
        )}

        {open.length > 0 && (
          <div className="j-requests">
            <h3>{t(L('Maombi kutoka CLC', 'Requests from CLC'))}</h3>
            {open.map((r) => <p key={r.id}>{r.message}</p>)}
          </div>
        )}

        {app.editable && (
          <div className="j-actions">
            <a className="btn btn-outline-navy" href={`#/join/edit/${id}/${token}`}><Pencil size={16} /> {t(L('Hariri maombi', 'Edit application'))}</a>
            {app.status === 'correction_required' && <button className="btn btn-gold" onClick={resubmit} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <><Send size={16} /> {t(L('Tuma tena', 'Resubmit'))}</>}</button>}
          </div>
        )}

        <h3 className="j-sub">{t(L('Nyaraka', 'Documents'))}</h3>
        {slots.map((d) => {
          const same = app.documents.filter((x) => x.doc_type === d.doc_type && x.advocate_id === d.advocate_id)
          return (
            <DocSlot key={`${d.doc_type}${d.advocate_id}`} t={t} label={d.advocate_name ? `${d.type_label}: ${d.advocate_name}` : d.type_label}
              docs={same} multiple={d.doc_type === 'office_photos'} locked={!app.editable}
              onUpload={(f) => upload(d.doc_type, f, d.advocate_id)} onRemove={remove} />
          )
        })}

        {open.filter((r) => r.kind === 'document' && r.doc_type && !app.documents.some((d) => d.doc_type === r.doc_type)).map((r) => (
          <DocSlot key={r.id} t={t} label={r.doc_type.replace(/_/g, ' ')} docs={[]} locked={!app.editable}
            onUpload={(f) => upload(r.doc_type, f)} onRemove={remove} />
        ))}

        <h3 className="j-sub">{t(L('Makubaliano', 'Agreements'))}</h3>
        <ul className="j-agreements">
          {app.agreements.map((a) => (
            <li key={a.type} className={a.signed_at ? 'signed' : ''}>{a.signed_at ? <Check size={15} /> : <Clock size={15} />} {a.label}{a.signed_at && <em> · {a.signed_at}</em>}</li>
          ))}
        </ul>

        {app.trial.start && (
          <p className="j-note">{t(L('Majaribio', 'Trial'))}: {app.trial.start} → {app.trial.end} · {t(L('Malipo huanza', 'Billing starts'))}: {app.trial.billing_effective}</p>
        )}
      </div>
    </JoinShell>
  )
}
