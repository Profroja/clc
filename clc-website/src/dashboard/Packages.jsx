import { useEffect, useState } from 'react'
import { CircleAlert, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Video, X } from 'lucide-react'
import { api } from './api.js'
import { Badge, Card, DetailList, Field, Modal, PageHead } from './shared.jsx'
import { MediaPreview, MediaThumb } from './MediaView.jsx'

const MEDIA = [['none', 'No media'], ['image', 'Image'], ['video', 'Upload video'], ['youtube', 'YouTube link']]
const MEDIA_LABEL = { image: 'Image', video: 'Video', youtube: 'YouTube video' }
const blank = () => ({ title: '', description: '', items: [''], media_type: 'none', video_url: '', is_published: true })
const short = (s, n = 90) => (s.length > n ? `${s.slice(0, n).trim()}…` : s)

export default function AdminPackages() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | package
  const [removing, setRemoving] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = () => api('admin/packages/').then(setRows).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  return (
    <>
      <PageHead title="Packages & services" sub="The packages and legal services shown on the CLC website.">
        <button className="btn btn-gold" onClick={() => setEditing('new')}><Plus size={17} /> Add package</button>
      </PageHead>
      {error && <Card><p className="fb-error"><CircleAlert size={18} /> {error}</p></Card>}
      {!rows && !error && <div className="fb-center-inline"><Loader2 className="spin" /></div>}
      {rows && (
        <Card>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th>S/N</th><th>Picture</th><th>Title</th><th>Description</th><th>Services included</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="clickable-row" onClick={() => setViewing(p)}>
                    <td>{i + 1}</td>
                    <td><MediaThumb item={{ image: p.image_url, videoUrl: p.video_url, youtubeId: p.youtube_id }} /></td>
                    <td><strong>{p.title}</strong></td>
                    <td className="pk-desc">{short(p.description) || '—'}</td>
                    <td>{p.items.length}</td>
                    <td><Badge tone={p.is_published ? 'green' : 'amber'}>{p.is_published ? 'Published' : 'Hidden'}</Badge></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="u-actions">
                        <button className="btn btn-outline-navy d-sm" onClick={() => setEditing(p)}><Pencil size={14} /> Edit</button>
                        <button className="btn btn-outline-danger d-sm" onClick={() => setRemoving(p)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="fb-muted">No packages yet. Click “Add package” to create the first one.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {viewing && <PackageDetails pkg={rows.find((r) => r.id === viewing.id) || viewing} onClose={() => setViewing(null)} onEdit={(p) => { setViewing(null); setEditing(p) }} />}
      {editing && <PackageForm pkg={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {removing && <DeleteDialog pkg={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); load() }} />}
    </>
  )
}

function PackageForm({ pkg, onClose, onSaved }) {
  const [f, setF] = useState(() => (pkg ? {
    title: pkg.title, description: pkg.description, items: pkg.items.length ? pkg.items : [''], media_type: pkg.media_type,
    video_url: pkg.youtube_id ? `https://youtu.be/${pkg.youtube_id}` : '', is_published: pkg.is_published,
  } : blank()))
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setItem = (i, v) => setF({ ...f, items: f.items.map((x, j) => (j === i ? v : x)) })
  const preview = file ? URL.createObjectURL(file) : null
  const pickMedia = (v) => { setF({ ...f, media_type: v }); setFile(null) }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const fd = new FormData()
    fd.append('title', f.title)
    fd.append('description', f.description)
    fd.append('items', JSON.stringify(f.items))
    fd.append('media_type', f.media_type)
    fd.append('video_url', f.video_url)
    fd.append('is_published', String(f.is_published))
    if (file) fd.append(f.media_type === 'video' ? 'video' : 'image', file)
    try {
      await api(pkg ? `admin/packages/${pkg.id}/` : 'admin/packages/', { method: pkg ? 'PATCH' : 'POST', body: fd })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal wide title={pkg ? 'Edit package' : 'Add package'} onClose={onClose}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button form="pkg-form" className="btn btn-gold" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : pkg ? 'Save changes' : 'Add package'}</button></>}>
      <form id="pkg-form" className="d-form" onSubmit={submit}>
        <Field label="Title"><input required autoFocus value={f.title} onChange={set('title')} placeholder="e.g. Mkataba kati ya Mchimbaji Mdogo na Mwekezaji" /></Field>
        <Field label="Description"><textarea rows={4} value={f.description} onChange={set('description')} /></Field>

        <div className="d-field">
          <span>Services included</span>
          <div className="pk-items">
            {f.items.map((it, i) => (
              <div key={i} className="pk-item">
                <input value={it} placeholder={`Service ${i + 1}`} onChange={(e) => setItem(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setF({ ...f, items: [...f.items.slice(0, i + 1), '', ...f.items.slice(i + 1)] }) } }} />
                <button type="button" className="d-icon-btn" aria-label="Remove" disabled={f.items.length === 1 && !it}
                  onClick={() => setF({ ...f, items: f.items.length === 1 ? [''] : f.items.filter((_, j) => j !== i) })}><X size={15} /></button>
              </div>
            ))}
            <button type="button" className="pk-add" onClick={() => setF({ ...f, items: [...f.items, ''] })}><Plus size={14} /> Add a service</button>
          </div>
        </div>

        <div className="d-field">
          <span>Image or video</span>
          <div className="pk-media">
            {MEDIA.map(([v, l]) => <button type="button" key={v} className={f.media_type === v ? 'on' : ''} onClick={() => pickMedia(v)}>{v === 'image' && <ImageIcon size={14} />}{(v === 'video' || v === 'youtube') && <Video size={14} />} {l}</button>)}
          </div>
          {f.media_type === 'image' && (
            <>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files[0] || null)} />
              {preview && <img className="pk-preview" src={preview} alt="" />}
              {!file && pkg?.image_url && <small className="d-hint">The current image stays unless you choose a new one.</small>}
              <small className="d-hint">JPG, PNG or WEBP, up to 5 MB.</small>
            </>
          )}
          {f.media_type === 'video' && (
            <>
              <input type="file" accept=".mp4,.webm,.mov,.m4v,video/*" onChange={(e) => setFile(e.target.files[0] || null)} />
              {preview && <video className="pk-preview" src={preview} controls muted />}
              {!file && pkg?.media_type === 'video' && <small className="d-hint">The current video stays unless you choose a new one.</small>}
              <small className="d-hint">MP4 is best (also WEBM or MOV), up to 200 MB. Large files take a while to upload.</small>
            </>
          )}
          {f.media_type === 'youtube' && (
            <>
              <input value={f.video_url} onChange={set('video_url')} placeholder="Paste the YouTube link" />
              <small className="d-hint">The video plays from YouTube on the website.</small>
            </>
          )}        </div>

        <label className="d-check"><input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Show on the website</label>
        {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
      </form>
    </Modal>
  )
}

function DeleteDialog({ pkg, onClose, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const remove = async () => {
    setBusy(true)
    try { await api(`admin/packages/${pkg.id}/`, { method: 'DELETE' }); onDone() } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <Modal title="Delete package" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Keep it</button>
        <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Delete package'}</button></>}>
      <p className="d-text"><strong>{pkg.title}</strong> will be permanently deleted and removed from the website.</p>
      {error && <p className="fb-error"><CircleAlert size={16} /> {error}</p>}
    </Modal>
  )
}

function PackageDetails({ pkg: p, onClose, onEdit }) {
  return (
    <Modal wide title="Package details" onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-gold" onClick={() => onEdit(p)}><Pencil size={15} /> Edit</button></>}>
      <MediaPreview item={{ image: p.image_url, videoUrl: p.video_url, youtubeId: p.youtube_id }} />
      <div className="ap-top mv-gap"><Badge tone={p.is_published ? 'green' : 'amber'}>{p.is_published ? 'Published' : 'Hidden'}</Badge><span className="ap-muted">{MEDIA_LABEL[p.media_type] || 'No media'}</span></div>
      <h3 className="mv-title">{p.title}</h3>
      {p.description && <p className="d-text">{p.description}</p>}
      <h4 className="d-sub">Services included ({p.items.length})</h4>
      {p.items.length ? <ul className="mv-list">{p.items.map((it, i) => <li key={i}>{it}</li>)}</ul> : <p className="ap-muted">None listed.</p>}
      <DetailList rows={[['Last updated', new Date(p.updated_at).toLocaleString()]]} />
    </Modal>
  )
}
