import { useEffect, useState } from 'react'
import { Check, CircleAlert, Loader2, Radio } from 'lucide-react'
import { api } from './api.js'
import { Badge, Card, Field, PageHead } from './shared.jsx'

export default function LivePodcast() {
  const [s, setS] = useState(null)
  const [f, setF] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const apply = (data) => {
    setS(data)
    setF({
      channel_handle: data.channel_handle, popup_title: data.popup_title, whatsapp_number: data.whatsapp_number ? `+${data.whatsapp_number}` : '',
      whatsapp_message: data.whatsapp_message, manual_video_url: data.manual_video_url, manual_live: data.manual_live,
    })
  }
  useEffect(() => { api('admin/live/').then(apply).catch((e) => setError(e.message)) }, [])

  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }) }
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      apply(await api('admin/live/', { method: 'PATCH', body: f }))
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!s) return <><PageHead title="Live podcast" /><div className="fb-center-inline">{error ? <p className="fb-error"><CircleAlert size={18} /> {error}</p> : <Loader2 className="spin" />}</div></>

  const live = s.status.live
  return (
    <>
      <PageHead title="Live podcast" sub="When CLC goes live on YouTube, a popup with the video appears on the website, and viewers can chat with you on WhatsApp." />

      <Card>
        <div className="lv-status">
          <span className={`lv-dot ${live ? 'on' : ''}`}><Radio size={20} /></span>
          <div>
            <strong>{live ? 'You are live now' : 'You are not live'}</strong>
            <small>{live
              ? (s.status.source === 'manual' ? 'Shown because “Live now” is switched on below.' : 'Detected automatically from your YouTube channel.')
              : s.auto_detect ? 'The website checks your YouTube channel every minute and shows the popup as soon as you go live.' : 'Automatic detection is off. Use “Live now” below when you start a show.'}</small>
          </div>
          <Badge tone={live ? 'red' : 'navy'}>{live ? 'LIVE' : 'Offline'}</Badge>
        </div>
        {!s.auto_detect && (
          <p className="lv-note">To detect your live shows automatically, add a free YouTube Data API key as <code>YOUTUBE_API_KEY</code> in <code>clcBackend/.env</code> and restart the server. Until then, switch “Live now” on by hand when you start streaming.</p>
        )}
      </Card>

      <form onSubmit={save} className="lv-grid">
        <Card title="Live chat on WhatsApp">
          <div className="d-form">
            <Field label="WhatsApp number for the live chat"><input value={f.whatsapp_number} onChange={set('whatsapp_number')} placeholder="+255 7XX XXX XXX" /></Field>
            <Field label="Message the viewer starts with"><textarea rows={3} value={f.whatsapp_message} onChange={set('whatsapp_message')} /></Field>
            <p className="d-hint">Viewers see this number on the live page, next to the video, and tap one button to chat with you.</p>
          </div>
        </Card>

        <Card title="The popup">
          <div className="d-form">
            <Field label="YouTube channel"><input value={f.channel_handle} onChange={set('channel_handle')} placeholder="@Communitylegalclinic" /></Field>
            <Field label="Popup title (optional)"><input value={f.popup_title} onChange={set('popup_title')} placeholder="Leave empty to use the YouTube title" /></Field>
          </div>
        </Card>

        <Card title="Go live by hand" className="lv-wide">
          <div className="d-form">
            <Field label="YouTube link of the live video"><input value={f.manual_video_url} onChange={set('manual_video_url')} placeholder="https://www.youtube.com/watch?v=…" /></Field>
            <label className="d-check"><input type="checkbox" checked={f.manual_live} onChange={(e) => { setSaved(false); setF({ ...f, manual_live: e.target.checked }) }} /> Live now — show the popup on the website</label>
            <p className="d-hint">Use this if automatic detection is off, or to show a show before YouTube reports it as live. Switch it off when you finish.</p>
          </div>
        </Card>

        <div className="lv-actions lv-wide">
          {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
          {saved && <span className="lv-saved"><Check size={16} /> Saved</span>}
          <button className="btn btn-gold" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Save changes'}</button>
        </div>
      </form>
    </>
  )
}
