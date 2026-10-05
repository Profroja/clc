import { ImageOff, Play } from 'lucide-react'

// What an item shows in the admin: its picture, a frame from its uploaded video, or YouTube's thumbnail.
// `item` needs { image, videoUrl, youtubeId }.
export function MediaThumb({ item, size = 'sm' }) {
  const { image, videoUrl, youtubeId } = item
  const hasVideo = !!videoUrl || !!youtubeId
  return (
    <span className={`mv-thumb ${size}`}>
      {image ? <img src={image} alt="" loading="lazy" />
        : videoUrl ? <video src={`${videoUrl}#t=0.5`} preload="metadata" muted playsInline tabIndex={-1} aria-hidden="true" />
          : youtubeId ? <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="" loading="lazy" />
            : <span className="mv-none"><ImageOff size={size === 'sm' ? 16 : 28} /></span>}
      {hasVideo && <span className="mv-play"><Play size={size === 'sm' ? 10 : 18} fill="currentColor" /></span>}
    </span>
  )
}

// The full media in the details pop-up: a player for videos, the picture otherwise.
export function MediaPreview({ item }) {
  const { image, videoUrl, youtubeId } = item
  if (youtubeId) {
    return <div className="mv-player"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title="Video" allowFullScreen /></div>
  }
  if (videoUrl) return <div className="mv-player"><video src={videoUrl} poster={image || undefined} controls playsInline preload="metadata" /></div>
  if (image) return <div className="mv-player"><img src={image} alt="" /></div>
  return <div className="mv-player empty"><ImageOff size={32} /><span>No picture or video</span></div>
}
