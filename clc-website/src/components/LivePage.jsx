import { ArrowLeft, ExternalLink, MessageCircle, Radio } from 'lucide-react'
import { WHATSAPP } from '../data.js'
import { useLang } from '../i18n.jsx'
import { useLive } from '../live.js'
import { WhatsAppIcon } from './Icons.jsx'

const T = {
  back: { sw: 'Rudi nyumbani', en: 'Back to home', zh: '返回首页' },
  live: { sw: 'LIVE', en: 'LIVE', zh: '直播' },
  chatTitle: { sw: 'Ongea nasi moja kwa moja', en: 'Chat with us live', zh: '实时与我们交流' },
  chatText: {
    sw: 'Una swali kuhusu kipindi? Tuandikie kwenye WhatsApp wakati kipindi kinaendelea na timu yetu itakujibu.',
    en: 'Have a question about the show? Message us on WhatsApp while it is on air and our team will reply.',
    zh: '对节目有疑问？节目进行时通过 WhatsApp 给我们留言，团队会回复您。',
  },
  chatButton: { sw: 'Ongea nasi WhatsApp', en: 'Chat on WhatsApp', zh: 'WhatsApp 聊天' },
  numberLabel: { sw: 'Namba ya mazungumzo ya moja kwa moja', en: 'Live chat number', zh: '直播聊天号码' },
  offTitle: { sw: 'Hakuna kipindi cha moja kwa moja kwa sasa', en: 'We are not live right now', zh: '目前没有直播' },
  offText: {
    sw: 'Kipindi kijacho kikianza, video itaonekana hapa na dirisha dogo litatokea kwenye tovuti. Wakati huo huo, tazama vipindi vilivyopita.',
    en: 'When the next show starts, the video appears here and a small window pops up on the website. Meanwhile, watch our earlier shows.',
    zh: '下一期节目开始时，视频会出现在这里，网站上也会弹出小窗口。在此之前，欢迎观看往期节目。',
  },
  past: { sw: 'Vipindi vilivyopita', en: 'Earlier shows', zh: '往期节目' },
  channel: { sw: 'Fungua YouTube', en: 'Open YouTube', zh: '打开 YouTube' },
}

const pretty = (digits) => (digits ? `+${digits.replace(/^(\d{3})(\d{3})(\d{3})(\d*)$/, '$1 $2 $3 $4').trim()}` : '')

export default function LivePage() {
  const { t } = useLang()
  const { live, loading } = useLive()
  const number = live?.whatsapp_number || WHATSAPP // the live-chat number set by the admin; the main CLC number if none was set
  const chatLink = `https://wa.me/${number}?text=${encodeURIComponent(live?.whatsapp_message || '')}`

  return (
    <main className="livepage">
      <div className="container">
        <a href="#home" className="mback"><ArrowLeft size={16} /> {t(T.back)}</a>

        {loading ? null : live.live ? (
          <div className="live-layout">
            <div className="live-main">
              <div className="live-frame">
                <iframe src={`https://www.youtube.com/embed/${live.video_id}?autoplay=1&playsinline=1&rel=0`} title="CLC Live"
                  allow="autoplay; accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
              <div className="live-info">
                <span className="live-badge live-badge--lg"><span className="live-dot" /> {t(T.live)}</span>
                {live.title && <h1>{live.title}</h1>}
              </div>
            </div>

            <aside className="live-chat">
              <span className="live-chat-ic"><MessageCircle size={26} /></span>
              <h2>{t(T.chatTitle)}</h2>
              <p>{t(T.chatText)}</p>
              <a href={chatLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-lg"><WhatsAppIcon size={20} /> {t(T.chatButton)}</a>
              <small>{t(T.numberLabel)}: <b>{pretty(number)}</b></small>
            </aside>
          </div>
        ) : (
          <div className="live-off">
            <span className="live-chat-ic"><Radio size={28} /></span>
            <h1>{t(T.offTitle)}</h1>
            <p>{t(T.offText)}</p>
            <div className="live-off-actions">
              <a href="#/media" className="btn btn-gold btn-lg">{t(T.past)}</a>
              <a href={live?.channel_url} target="_blank" rel="noreferrer" className="btn btn-outline-gold">{t(T.channel)} <ExternalLink size={16} /></a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
