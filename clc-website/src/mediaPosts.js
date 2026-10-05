import { useEffect, useState } from 'react'

// Podcasts, discussions and posts come from the CLC API (managed in the admin portal under
// "Podcast & posts"). They are fetched once per page load and shared by every component.
const normalize = (m) => ({
  id: m.id,
  type: m.kind,
  date: m.published_on,
  duration: m.duration,
  youtube: m.youtube_id,
  video: m.video_url,
  // a YouTube-only item with no cover uses YouTube's own thumbnail
  image: m.cover_url || (m.youtube_id ? `https://img.youtube.com/vi/${m.youtube_id}/hqdefault.jpg` : ''),
  cover: m.cover_url,
  // an uploaded video with no cover: the card shows a frame from the video itself
  frame: m.video_url && !m.cover_url ? `${m.video_url}#t=0.5` : null,
  title: { en: m.title }, // one text per item: the language switcher falls back to it in every language
  excerpt: { en: m.excerpt },
  body: { en: m.body },
})

let cache = null
let request = null
const listeners = new Set()

function load() {
  if (!request) {
    request = fetch('/api/media/')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows) => { cache = rows.map(normalize); listeners.forEach((fn) => fn(cache)) })
      .catch(() => { request = null }) // try again next time a component mounts
  }
  return request
}

export function useMediaPosts() {
  const [items, setItems] = useState(cache)
  useEffect(() => {
    listeners.add(setItems)
    if (cache) setItems(cache)
    else load()
    return () => listeners.delete(setItems)
  }, [])
  return { items: items || [], loading: items === null }
}
