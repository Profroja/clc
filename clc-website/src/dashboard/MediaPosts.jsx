import { useEffect, useState } from 'react'
import { CircleAlert, Loader2, Pencil, Plus, Trash2, Video } from 'lucide-react'
import { api } from './api.js'
import { Badge, Card, DetailList, Field, Modal, PageHead } from './shared.jsx'
import { MediaPreview, MediaThumb } from './MediaView.jsx'

const KINDS = [['podcast', 'Podcast'], ['mijadala', 'Mijadala (discussion)'], ['machapisho', 'Machapisho (post)']]
const KIND_LABEL = { podcast: 'Podcast', mijadala: 'Mijadala', machapisho: 'Machapisho' }
const PLAYERS = [['none', 'No video'], ['video', 'Upload video'], ['youtube', 'YouTube link']]
const PLAYER_LABEL = { video: 'Uploaded video', youtube: 'YouTube video' }
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ kind: 'podcast', title: '', excerpt: '', body_text: '', published_on: today(), duration: '', player: 'none', video_url: '', is_published: true })

export default function AdminMediaPosts() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [removing, setRemoving] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = () => api('admin/media/').then(setRows).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  return (
    <>
      <PageHead title="Podcast, Mijadala & Machapisho" sub="The podcasts, discussions and posts shown on the CLC website.">
        <button className="btn btn-gold" onClick={() => setEditing('new')}><Plus size={17} /> Add item</button>
      </PageHead>
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      {!rows && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {rows && (
        <Card>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>S/N</th><th>Picture</th><th>Title</th><th>Type</th><th>Date</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} className="clickable-row" onClick={() => setViewing(m)}>
                    <td>{i + 1}</td>
                    <td><MediaThumb item={{ image: m.cover_url, videoUrl: m.video_url, youtubeId: m.youtube_id }} /></td>
                    <td><strong>{m.title}</strong></td>
                    <td>{KIND_LABEL[m.kind]}</td>
                    <td>{new Date(m.published_on).toLocaleDateString()}</td>
                    <td>{m.duration || '—'}</td>
                    <td><Badge tone={m.is_published ? 'green' : 'amber'}>{m.is_published ? 'Published' : 'Hidden'}</Badge></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="u-actions">
                        <button className="btn btn-outline-navy d-sm" onClick={() => setEditing(m)}><Pencil size={14} /> Edit</button>
                        <button className="btn btn-outline-danger d-sm" onClick={() => setRemoving(m)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={8} className="fb-muted">Nothing here yet. Click “Add item” to publish the first one.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewing && <MediaDetails item={rows.find((r) => r.id === viewing.id) || viewing} onClose={() => setViewing(null)} onEdit={(m) => { setViewing(null); setEditing(m) }} />}
      {editing && <MediaForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {removing && <DeleteDialog item={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load() }} />}
    </>
  )
}

function MediaForm({ item, onClose, onSaved }) {
  const [f, setF] = useState(() => (item ? {
    kind: item.kind, title: item.title, excerpt: item.excerpt, body_text: item.body_text, published_on: item.published_on,
    duration: item.duration, player: item.player, video_url: item.youtube_id ? `https://youtu.be/${item.youtube_id}` : '', is_published: item.is_published,
  } : blank()))
  const [cover, setCover] = useState(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [video, setVideo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const coverPreview = cover ? URL.createObjectURL(cover) : null
  const videoPreview = video ? URL.createObjectURL(video) : null

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const fd = new FormData()
    fd.append('kind', f.kind)
    fd.append('title', f.title)
    fd.append('excerpt', f.excerpt)
    fd.append('body', f.body_text)
    fd.append('published_on', f.published_on)
    fd.append('duration', f.duration)
    fd.append('player', f.player)
    fd.append('video_url', f.video_url)
    fd.append('is_published', String(f.is_published))
    if (cover) fd.append('cover', cover)
    if (removeCover && !cover) fd.append('remove_cover', 'true')
    if (video && f.player === 'video') fd.append('video', video)
    try {
      await api(item ? `admin/media/${item.id}/` : 'admin/media/', { method: item ? 'PATCH' : 'POST', body: fd })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal wide title={item ? 'Edit item' : 'Add item'} onClose={onClose}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button form="media-form" className="btn btn-gold" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : item ? 'Save changes' : 'Add item'}</button></>}>
      <form id="media-form" className="d-form" onSubmit={submit}>
        <Field label="Type">
          <select value={f.kind} onChange={set('kind')}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
        <Field label="Title"><input required autoFocus value={f.title} onChange={set('title')} placeholder="e.g. Haki za Mchimbaji Mdogo: Unachopaswa Kujua" /></Field>
        <Field label="Short summary (shown on the card)"><textarea rows={2} value={f.excerpt} onChange={set('excerpt')} /></Field>
        <Field label="Full text (shown on the page)"><textarea rows={8} value={f.body_text} onChange={set('body_text')} /></Field>
        <small className="d-hint">Leave a blank line between paragraphs.</small>

        <div className="pk-two">
          <Field label="Date"><input type="date" required value={f.published_on} onChange={set('published_on')} /></Field>
          <Field label="Duration (optional)"><input value={f.duration} onChange={set('duration')} placeholder="24:10" /></Field>
        </div>

        <div className="d-field">
          <span>Cover picture</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setCover(e.target.files[0] || null)} />
          {coverPreview && <img className="pk-preview" src={coverPreview} alt="" />}
          {!cover && item?.cover_url && !removeCover && <small className="d-hint">The current cover stays unless you choose a new one.</small>}
          {!cover && item?.cover_url && f.player !== 'none' && (
            <label className="d-check"><input type="checkbox" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} /> Remove the current cover{f.player === 'video' ? ' and show a frame from the video instead' : ' and show the YouTube thumbnail instead'}</label>
          )}
          <small className="d-hint">JPG, PNG or WEBP, up to 5 MB. {f.player === 'none' ? 'Shown on the card.' : 'Optional with a video: without a cover, the website shows a frame from the video.'}</small>
        </div>

        <div className="d-field">
          <span>Video (optional)</span>
          <div className="pk-media">
            {PLAYERS.map(([v, l]) => <button type="button" key={v} className={f.player === v ? 'on' : ''} onClick={() => { setF({ ...f, player: v }); setVideo(null) }}>{v !== 'none' && <Video size={14} />} {l}</button>)}
          </div>
          {f.player === 'video' && (
            <>
              <input type="file" accept=".mp4,.webm,.mov,.m4v,video/*" onChange={(e) => setVideo(e.target.files[0] || null)} />
              {videoPreview && <video className="pk-preview" src={videoPreview} controls muted />}
              {!video && item?.player === 'video' && <small className="d-hint">The current video stays unless you choose a new one.</small>}
              <small className="d-hint">MP4 is best (also WEBM or MOV), up to 200 MB. Large files take a while to upload.</small>
            </>
          )}
          {f.player === 'youtube' && (
            <>
              <input value={f.video_url} onChange={set('video_url')} placeholder="Paste the YouTube link" />
              <small className="d-hint">The video plays from YouTube on the website. A cover picture is optional.</small>
            </>
          )}
        </div>

        <label className="d-check"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Show on the website</label>
        {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
      </form>
    </Modal>
  )
}

function DeleteDialog({ item, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const remove = async () => {
    setBusy(true)
    try { await api(`admin/media/${item.id}/`, { method: 'DELETE' }); onDone() } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Modal title="Delete item" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Keep it</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Delete item'}</button></>}>
      <p className="d-text"><strong>{item.title}</strong> will be permanently deleted and removed from the website.</p>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
    </Modal>
  )
}

function MediaDetails({ item: m, onClose, onEdit }) {
  return (
    <Modal wide title="Item details" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-gold" onClick={() => onEdit(m)}><Pencil size={15} /> Edit</button></>}>
      <MediaPreview item={{ image: m.cover_url, videoUrl: m.video_url, youtubeId: m.youtube_id }} />
      <div className="ap-top mv-gap"><Badge tone={m.is_published ? 'green' : 'amber'}>{m.is_published ? 'Published' : 'Hidden'}</Badge><Badge tone="blue">{KIND_LABEL[m.kind]}</Badge></div>
      <h3 className="mv-title">{m.title}</h3>
      <DetailList rows={[['Date', new Date(m.published_on).toLocaleDateString()], ['Duration', m.duration], ['Video', PLAYER_LABEL[m.player] || 'None']]} />
      {m.excerpt && (<><h4 className="d-sub">Short summary</h4><p className="d-text">{m.excerpt}</p></>)}
      {m.body.length > 0 && (<><h4 className="d-sub">Full text</h4>{m.body.map((para, i) => <p key={i} className="d-text mv-para">{para}</p>)}</>)}
    </Modal>
  )
}
