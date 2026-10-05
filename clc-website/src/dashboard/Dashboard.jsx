import { useEffect, useRef, useState } from 'react'
import { Bell, Briefcase, Building2, CalendarCheck, CreditCard, ChevronDown, Inbox, LayoutDashboard, LogOut, Menu, Mic, Package, Radio, Scale, UserCircle, Users, Workflow } from 'lucide-react'
import { signOut } from './api.js'
import { ROLES } from './data.js'
import { Avatar } from './shared.jsx'
import { AdminFlows, AdminOverview, AdminUsers } from './Admin.jsx'
import AdminFirmsLive from './Applications.jsx'
import AdminPackages from './Packages.jsx'
import AdminMediaPosts from './MediaPosts.jsx'
import LivePodcast from './LivePodcast.jsx'
import Appointments from './Appointments.jsx'
import { FirmCases, FirmOverview, FirmProfile, FirmReferrals, FirmTeam } from './Firm.jsx'
import { AdvocateMatters, AdvocateOverview, AdvocateSubscription, MyDetailsDialog } from './Advocate.jsx'

// One entry per sidebar link: [path, label, icon, page]
const NAV = {
  admin: [
    ['overview', 'Overview', LayoutDashboard, AdminOverview],
    ['users', 'Users', Users, AdminUsers],
    ['flows', 'Chatbot flows', Workflow, AdminFlows],
    ['firms', 'Law firms', Building2, AdminFirmsLive],
    ['appointments', 'Appointments', CalendarCheck, Appointments],
    ['packages', 'Packages & services', Package, AdminPackages],
    ['media', 'Podcast & posts', Mic, AdminMediaPosts],
    ['live', 'Live podcast', Radio, LivePodcast],
  ],
  firm: [
    ['overview', 'Overview', LayoutDashboard, FirmOverview],
    ['referrals', 'Referral inbox', Inbox, FirmReferrals],
    ['cases', 'Cases', Briefcase, FirmCases],
    ['team', 'Advocates', Scale, FirmTeam],
    ['profile', 'Firm profile', UserCircle, FirmProfile],
  ],
  advocate: [
    ['overview', 'Dashboard', LayoutDashboard, AdvocateOverview],
    ['matters', 'Matters', Briefcase, AdvocateMatters],
    ['subscription', 'Subscription plans', CreditCard, AdvocateSubscription],
  ],
}

const DEMO = {
  admin: { user: { full_name: 'Amina Mwakyusa', email: 'amina@clc.tz' }, membership: { role: 'clc_admin', organization: 'Community Legal Clinic' } },
  firm: { user: { full_name: 'Juma Kileo', email: 'juma@pnjlegal.co.tz' }, membership: { role: 'firm_admin', organization: 'PNJ Legal Consultants' } },
  advocate: { user: { full_name: 'Neema Lyimo', email: 'neema@pnjlegal.co.tz' }, membership: { role: 'advocate', organization: 'PNJ Legal Consultants' } },
}

function readAuth(hash) {
  try {
    const stored = JSON.parse(sessionStorage.getItem('clc_auth'))
    if (stored) return stored
  } catch { /* ignore */ }
  // Dev-only preview so the dashboards can be viewed before the API is connected.
  if (import.meta.env.DEV) return DEMO[hash.split('/')[2]] || null
  return null
}

function UserMenu({ auth, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [])
  return (
    <div className="d-user" ref={ref}>
      <button className="d-user-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={auth.user.full_name} />
        <ChevronDown size={16} className={open ? 'flip' : ''} />
      </button>
      {open && (
        <div className="d-menu" role="menu">
          <div className="d-menu-head">
            <Avatar name={auth.user.full_name} />
            <div><strong>{auth.user.full_name}</strong><small>{auth.membership.organization}</small></div>
          </div>
          {auth.membership.role === 'advocate' && (
            <button role="menuitem" className="d-menu-item" onClick={() => { setOpen(false); setDetails(true) }}><UserCircle size={17} /> My details</button>
          )}
          <button role="menuitem" className="d-menu-out" onClick={onSignOut}><LogOut size={17} /> Sign out</button>
        </div>
      )}
      {details && <MyDetailsDialog onClose={() => setDetails(false)} />}
    </div>
  )
}

export default function Dashboard({ hash }) {
  const auth = readAuth(hash)
  const [menu, setMenu] = useState(false)
  const [, role, page] = hash.replace('#/', '').split('/') // app / role / page
  const own = auth && ROLES[auth.membership.role]

  // Not signed in -> login. Wrong or missing role segment -> the user's own home.
  useEffect(() => {
    if (!auth) window.location.hash = '#/login'
    else if (role !== own.key) window.location.hash = own.home
  }, [auth, role, own])
  useEffect(() => setMenu(false), [hash])

  if (!auth || role !== own.key) return null
  const items = NAV[role]
  const active = items.find(([p]) => p === page) || items[0]
  const Page = active[3]

  return (
    <div className="dash">
      <aside className={`d-side ${menu ? 'open' : ''}`}>
        <a href="#home" className="d-brand"><img src="/images/logo.png" alt="" /><strong>CLC</strong><small>Portal</small></a>
        <p className="d-side-label">{own.label}</p>
        <nav>
          {items.map(([p, label, Icon]) => (
            <a key={p} href={`#/app/${role}/${p}`} className={active[0] === p ? 'on' : ''}><Icon size={19} /> {label}</a>
          ))}
        </nav>
      </aside>
      {menu && <div className="d-scrim" onClick={() => setMenu(false)} />}

      <div className="d-main">
        <header className="d-top">
          <button className="d-icon-btn d-burger" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="d-crumb">{own.label} <span>/</span> <b>{active[1]}</b></div>
          <div className="d-top-right">
            <button className="d-icon-btn d-bell" aria-label="Notifications"><Bell size={19} /><i /></button>
            <UserMenu auth={auth} onSignOut={signOut} />
          </div>
        </header>
        <main className="d-content" key={`${role}/${active[0]}`}><Page /></main>
      </div>
    </div>
  )
}
