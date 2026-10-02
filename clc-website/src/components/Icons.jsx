export const WhatsAppIcon = ({ size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.2 4.24-9.44 9.45-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44zm8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.63l6.03-1.58a11.33 11.33 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.37-11.36 0-3.03-1.18-5.89-3.33-8.03z" />
  </svg>
)

export const ScalesLogo = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="gold-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F4D77A" />
        <stop offset=".55" stopColor="#C9A227" />
        <stop offset="1" stopColor="#9C7A12" />
      </linearGradient>
    </defs>
    <g stroke="url(#gold-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 10v42M20 52h24M12 19h40" />
      <path d="M17 19l-7.5 15a7.5 7.5 0 0 0 15 0zM47 19l-7.5 15a7.5 7.5 0 0 0 15 0z" />
    </g>
    <circle cx="32" cy="9" r="3.4" fill="url(#gold-g)" />
  </svg>
)

const S = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
)
export const Social = {
  facebook: (p) => <S {...p} d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" />,
  instagram: (p) => <S {...p} d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8.2c0-1.6-.4-3-1.6-4.2-1.1-1.1-2.6-1.5-4.2-1.6-1.7-.1-6.6-.1-8.3 0-1.6.1-3 .4-4.2 1.6S2.2 6.6 2.1 8.2c-.1 1.7-.1 6.6 0 8.3.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 6.6.1 8.3 0 1.6-.1 3-.4 4.2-1.6 1.1-1.1 1.5-2.6 1.6-4.2.1-1.7.1-6.6 0-8.3zm-2.2 10.2a3.4 3.4 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.8.4s-4.6.1-5.8-.4a3.4 3.4 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.8s-.1-4.6.4-5.8a3.4 3.4 0 0 1 1.9-1.9c1.3-.5 4.4-.4 5.8-.4s4.6-.1 5.8.4a3.4 3.4 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.8s.1 4.6-.4 5.8z" />,
  youtube: (p) => <S {...p} d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15V9l5.8 3-5.8 3z" />,
  x: (p) => <S {...p} d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5z" />,
  linkedin: (p) => <S {...p} d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z" />,
}

export const SOCIALS = [
  { key: 'whatsapp', href: 'https://wa.me/255745118253', label: 'WhatsApp' },
  { key: 'facebook', href: 'https://www.facebook.com/share/1QDsHjjizj/', label: 'Facebook' },
  { key: 'instagram', href: 'https://www.instagram.com/community_legal_clinic', label: 'Instagram' },
  { key: 'youtube', href: 'https://www.youtube.com/@Communitylegalclinic', label: 'YouTube' },
  { key: 'x', href: 'https://x.com/legalclinicclc', label: 'X' },
  // TODO: replace with CLC's public LinkedIn page URL
  { key: 'linkedin', href: 'https://www.linkedin.com/', label: 'LinkedIn' },
]
