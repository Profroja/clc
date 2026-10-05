import { useEffect, useState } from 'react'

// Packages and legal services come from the CLC API (managed in the admin portal under
// "Packages & services"). They are fetched once per page load and shared by every section.
const THEMES = ['sand', 'ocean', 'crimson', 'peach', 'mint']
const ICONS = ['pickaxe', 'globe', 'scroll', 'landmark', 'shield']

const normalize = (p, i) => ({
  id: `p-${p.id}`, // used as the section anchor; ids from the API can start with a digit, which is not a valid selector
  theme: THEMES[i % THEMES.length],
  icon: ICONS[i % ICONS.length],
  title: p.title,
  intro: p.description,
  items: p.items || [],
  media: { type: p.media_type, url: p.media_type === 'video' ? p.video_url : p.image_url, youtube: p.youtube_id },
  image: p.image_url,
})

let cache = null
let request = null
const listeners = new Set()

function load() {
  if (!request) {
    request = fetch('/api/packages/')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows) => { cache = rows.map(normalize); listeners.forEach((fn) => fn(cache)) })
      .catch(() => { request = null }) // try again next time a section mounts
  }
  return request
}

export function usePackages() {
  const [packages, setPackages] = useState(cache)
  useEffect(() => {
    listeners.add(setPackages)
    if (cache) setPackages(cache)
    else load()
    return () => listeners.delete(setPackages)
  }, [])
  return { packages: packages || [], loading: packages === null }
}
