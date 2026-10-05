import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Check, Eye, EyeOff, Loader2, Lock, Mail, Scale, ShieldCheck, UserRound } from 'lucide-react'
import { useLang } from '../i18n.jsx'

const T = {
  brand: { en: 'Community Legal Clinic' },
  title: { sw: 'Karibu tena', en: 'Welcome back', zh: '欢迎回来' },
  sub: { sw: 'Ingia kwa barua pepe na nenosiri lako.', en: 'Sign in with your email and password.', zh: '使用邮箱和密码登录。' },
  email: { sw: 'Barua pepe', en: 'Email', zh: '邮箱' },
  emailPlaceholder: { sw: 'Weka barua pepe yako', en: 'Enter your email', zh: '请输入您的邮箱' },
  password: { sw: 'Nenosiri', en: 'Password', zh: '密码' },
  passwordPlaceholder: { sw: 'Weka nenosiri lako', en: 'Enter your password', zh: '请输入您的密码' },
  show: { sw: 'Onyesha nenosiri', en: 'Show password', zh: '显示密码' },
  hide: { sw: 'Ficha nenosiri', en: 'Hide password', zh: '隐藏密码' },
  signIn: { sw: 'Ingia', en: 'Sign in', zh: '登录' },
  workingAs: { sw: 'Unafanya kazi kama', en: 'Working as', zh: '工作身份' },
  workingAsSub: { sw: 'Chagua jukumu la kutumia kwenye kipindi hiki.', en: 'Choose the role to use for this session.', zh: '请选择本次会话使用的角色。' },
  otherAccount: { sw: 'Tumia akaunti nyingine', en: 'Use a different account', zh: '使用其他账号' },
  done: { sw: 'Umeingia', en: 'You are signed in', zh: '登录成功' },
  doneSub: { sw: 'Unafanya kazi kama', en: 'You are working as', zh: '当前身份' },
  newPwTitle: { sw: 'Weka nenosiri jipya', en: 'Choose a new password', zh: '设置新密码' },
  newPwSub: { sw: 'Ulitumia nenosiri la muda. Weka nenosiri lako mwenyewe ili kuendelea.', en: 'You signed in with a temporary password. Choose your own to continue.', zh: '您使用的是临时密码，请设置自己的密码后继续。' },
  newPw: { sw: 'Nenosiri jipya', en: 'New password', zh: '新密码' },
  confirmPw: { sw: 'Thibitisha nenosiri', en: 'Confirm password', zh: '确认密码' },
  savePw: { sw: 'Hifadhi na uendelee', en: 'Save and continue', zh: '保存并继续' },
  mismatch: { sw: 'Manenosiri hayafanani.', en: 'The passwords do not match.', zh: '两次输入的密码不一致。' },
  errors: {
    invalid_credentials: { sw: 'Barua pepe au nenosiri si sahihi.', en: 'Incorrect email or password.', zh: '邮箱或密码不正确。' },
    no_active_role: {
      sw: 'Akaunti yako haina jukumu linalofanya kazi. Wasiliana na msimamizi.',
      en: 'Your account has no active role. Contact an administrator.',
      zh: '您的账号没有可用角色，请联系管理员。',
    },
    invalid_role: { sw: 'Jukumu hili halipatikani.', en: 'That role is not available.', zh: '该角色不可用。' },
    network: { sw: 'Imeshindikana kufikia seva. Jaribu tena.', en: 'Could not reach the server. Try again.', zh: '无法连接服务器，请重试。' },
  },
}

const ROLE_ICON = { clc_admin: ShieldCheck, firm_admin: Building2, advocate: Scale }

async function post(url, body, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.detail || 'network'), { data })
  return data
}

export default function Login() {
  const { t } = useLang()
  const [step, setStep] = useState('credentials') // credentials | role | done
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null) // { pick_role_token, user, memberships }
  const [signedAs, setSignedAs] = useState(null)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const fail = (e) => setError(t(T.errors[e.message] || T.errors.network))

  const chooseRole = async (membership, token = pending.pick_role_token) => {
    setBusy(true)
    setError('')
    try {
      const data = await post('/api/auth/select-role/', { membership_id: membership.id }, token)
      sessionStorage.setItem('clc_auth', JSON.stringify({ access: data.access, refresh: data.refresh, user: data.user, membership: data.membership }))
      setSignedAs(data.membership)
      setStep('done')
      window.location.hash = '#/app' // the dashboard sends each role to its own home
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await post('/api/auth/login/', { email, password })
      setPending(data)
      if (data.must_change_password) setStep('newpw')
      else await proceed(data)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const proceed = async (data) => {
    if (data.memberships.length === 1) await chooseRole(data.memberships[0], data.pick_role_token)
    else setStep('role')
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) { setError(t(T.mismatch)); return }
    setBusy(true)
    setError('')
    try {
      await post('/api/auth/change-password/', { current_password: password, new_password: newPw }, pending.pick_role_token)
      setPassword(newPw)
      await proceed(pending)
    } catch (err) {
      setError(err.data?.errors?.join(' ') || t(T.errors[err.message] || T.errors.network))
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setStep('credentials')
    setPassword('')
    setPending(null)
    setError('')
  }

  return (
    <div className="login">
      <aside className="login-side">
        <img src="/images/hero-skyline.jpg" alt="" className="login-side-img" />
        <div className="login-side-shade" />
        <div className="login-side-body">
          <a href="#home" className="login-brand">
            <img src="/images/logo.png" alt="" />
            <strong>{t(T.brand)}</strong>
          </a>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <AnimatePresence mode="wait">
            {step === 'credentials' && (
              <motion.form key="c" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <h2>{t(T.title)}</h2>
                <p className="login-sub">{t(T.sub)}</p>

                <label className="field">
                  <span>{t(T.email)}</span>
                  <div className="field-box">
                    <Mail size={18} />
                    <input type="email" autoComplete="username" required autoFocus placeholder={t(T.emailPlaceholder)} value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </label>

                <label className="field">
                  <span>{t(T.password)}</span>
                  <div className="field-box">
                    <Lock size={18} />
                    <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required placeholder={t(T.passwordPlaceholder)} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="field-eye" onClick={() => setShowPw((s) => !s)} aria-label={t(showPw ? T.hide : T.show)}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                {error && <p className="login-error" role="alert">{error}</p>}

                <button className="btn btn-gold btn-lg login-submit" disabled={busy}>
                  {busy ? <Loader2 size={18} className="spin" /> : t(T.signIn)}
                </button>
              </motion.form>
            )}

            {step === 'newpw' && pending && (
              <motion.form key="n" onSubmit={changePassword} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <h2>{t(T.newPwTitle)}</h2>
                <p className="login-sub">{t(T.newPwSub)}</p>
                <label className="field">
                  <span>{t(T.newPw)}</span>
                  <div className="field-box"><Lock size={18} /><input type="password" autoComplete="new-password" required minLength={8} autoFocus value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
                </label>
                <label className="field">
                  <span>{t(T.confirmPw)}</span>
                  <div className="field-box"><Lock size={18} /><input type="password" autoComplete="new-password" required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} /></div>
                </label>
                {error && <p className="login-error" role="alert">{error}</p>}
                <button className="btn btn-gold btn-lg login-submit" disabled={busy}>
                  {busy ? <Loader2 size={18} className="spin" /> : t(T.savePw)}
                </button>
              </motion.form>
            )}

            {step === 'role' && pending && (
              <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                <h2>{t(T.workingAs)}</h2>
                <p className="login-sub">{pending.user.full_name} · {t(T.workingAsSub)}</p>
                <div className="role-list">
                  {pending.memberships.map((m) => {
                    const Icon = ROLE_ICON[m.role] || UserRound
                    return (
                      <button key={m.id} className="role-card" disabled={busy} onClick={() => chooseRole(m)}>
                        <span className="role-icon"><Icon size={20} /></span>
                        <span className="role-text"><strong>{m.role_label}</strong><small>{m.organization}</small></span>
                      </button>
                    )
                  })}
                </div>
                {error && <p className="login-error" role="alert">{error}</p>}
                <button className="btn btn-ghost login-other" onClick={reset}>{t(T.otherAccount)}</button>
              </motion.div>
            )}

            {step === 'done' && signedAs && (
              <motion.div key="d" className="login-done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <span className="done-badge"><Check size={28} /></span>
                <h2>{t(T.done)}</h2>
                <p className="login-sub">{t(T.doneSub)} <strong>{signedAs.label}</strong></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
