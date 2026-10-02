import { createContext, useContext, useEffect, useState } from 'react'

export const LANGS = [
  { code: 'sw', label: 'Kiswahili', short: 'SW', flag: '🇹🇿' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'zh', label: '中文', short: '中文', flag: '🇨🇳' },
]

export const UI = {
  nav: {
    home: { sw: 'Nyumbani', en: 'Home', zh: '首页' },
    services: { sw: 'Huduma', en: 'Services', zh: '服务' },
    media: { sw: 'Podcast & Machapisho', en: 'Podcast & Posts', zh: '播客与文章' },
    how: { sw: 'Inavyofanya Kazi', en: 'How It Works', zh: '服务流程' },
    why: { sw: 'Kwa Nini CLC', en: 'Why CLC', zh: '为何选择我们' },
    testimonials: { sw: 'Shuhuda', en: 'Testimonials', zh: '客户评价' },
    faq: { sw: 'Maswali', en: 'FAQ', zh: '常见问题' },
    contact: { sw: 'Mawasiliano', en: 'Contact', zh: '联系我们' },
    book: { sw: 'Appointment', en: 'Appointment', zh: '预约咨询' },
  },
  hero: [
    {
      title: { sw: 'Una changamoto ya kisheria?', en: 'Facing a legal issue?', zh: '遇到法律问题？' },
      title2: { sw: 'Pata msaada wa wakili', en: 'Get trusted legal help —', zh: '获得可靠法律帮助 —' },
      accent: { sw: 'haraka.', en: 'fast.', zh: '快速。' },
    },
    {
      title: { sw: 'Anza kwa WhatsApp na wataalamu wa sheria,', en: 'Start on WhatsApp with legal experts,', zh: '通过 WhatsApp 联系法律专家，' },
      title2: { sw: 'weka appointment ya simu au Zoom/Google Meet,', en: 'book a phone or Zoom/Google meeting,', zh: '预约电话或 Zoom/Google 会议，' },
      accent: { sw: 'kisha kutana nasi.', en: 'then meet in person.', zh: '然后面对面完成。' },
    },
  ],
  cta: {
    whatsapp: { sw: 'Ongea Nasi WhatsApp', en: 'Chat on WhatsApp', zh: 'WhatsApp 咨询' },
    book: { sw: 'Appointment', en: 'Appointment', zh: '预约咨询' },
    explore: { sw: 'Angalia', en: 'Explore', zh: '查看' },
    scroll: { sw: 'Shuka Chini', en: 'Scroll Down', zh: '向下滚动' },
    viewAll: { sw: 'Huduma Zote', en: 'View All Services', zh: '全部服务' },
  },
  stats: {
    users: { sw: 'Watumiaji', en: 'Platform Users', zh: '平台用户' },
    clients: { sw: 'Wateja Walioridhika', en: 'Happy Clients', zh: '满意客户' },
    success: { sw: 'Kiwango cha Mafanikio', en: 'Success Rate', zh: '成功率' },
    since: { sw: 'Tunahudumia Tanzania', en: 'Serving Tanzania', zh: '服务坦桑尼亚' },
    available: { sw: 'Jukwaa Liko Wazi', en: 'Platform Available', zh: '平台全天候' },
    hours: { sw: 'Saa za Ofisi (EAT)', en: 'Office Hours (EAT)', zh: '办公时间 (EAT)' },
  },
  services: {
    eyebrow: { sw: 'Huduma Zetu', en: 'Our Services', zh: '我们的服务' },
    title: { sw: 'Vifurushi na Huduma za Kisheria zinazotolewa na CLC', en: 'Packages and Legal Services Provided by CLC', zh: 'CLC 提供的法律服务' },
    sub: {
      sw: 'Suluhisho kamili za kisheria kulingana na mahitaji yako, kwa utaalamu na uwazi.',
      en: 'Comprehensive legal solutions tailored to your needs with professional expertise and transparent processes.',
      zh: '根据您的需求量身定制的全面法律解决方案，专业且流程透明。',
    },
  },
  media: {
    title: { sw: 'Podcast, Mijadala & Machapisho', en: 'Podcast, Discussions & Posts', zh: '播客、讨论与文章' },
    sub: {
      sw: 'Tazama video, sikiliza na usome hadithi na elimu ya kisheria kutoka kwa timu ya CLC.',
      en: 'Watch, listen and read legal stories and education from the CLC team.',
      zh: '观看、收听并阅读 CLC 团队带来的法律故事与知识。',
    },
    viewAll: { sw: 'Angalia Yote', en: 'View All', zh: '查看全部' },
    search: { sw: 'Tafuta podcast, mijadala au machapisho…', en: 'Search podcasts, discussions or posts…', zh: '搜索播客、讨论或文章…' },
    empty: { sw: 'Hakuna matokeo yaliyopatikana.', en: 'No results found.', zh: '未找到结果。' },
    home: { sw: 'Rudi Nyumbani', en: 'Back to home', zh: '返回首页' },
    watch: { sw: 'Tazama', en: 'Watch', zh: '观看' },
    more: { sw: 'Soma Zaidi', en: 'Read More', zh: '查看更多' },
    back: { sw: 'Rudi kwenye Yote', en: 'Back to all', zh: '返回全部内容' },
    related: { sw: 'Yanayofuata', en: 'More to explore', zh: '更多内容' },
    helpTitle: { sw: 'Unahitaji msaada wa kisheria?', en: 'Need legal help?', zh: '需要法律帮助？' },
    helpSub: { sw: 'Ongea na wakili kupitia WhatsApp au weka appointment.', en: 'Talk to an advocate on WhatsApp or book an appointment.', zh: '通过 WhatsApp 联系律师或预约咨询。' },
  },
  how: {
    eyebrow: { sw: 'Hatua 3 Rahisi', en: '3 Simple Steps', zh: '三个简单步骤' },
    title: { sw: 'Namna ya Kuwasiliana nasi', en: 'How It Works', zh: '服务流程' },
    steps: [
      { t: { sw: 'Anza kwa WhatsApp', en: 'Start on WhatsApp', zh: '从 WhatsApp 开始' }, d: { sw: 'Wasiliana na wataalamu wetu kwa ushauri wa haraka na tathmini ya awali ya kesi.', en: 'Contact our legal experts for immediate consultation and initial case assessment.', zh: '联系我们的法律专家，获得即时咨询和初步案件评估。' } },
      { t: { sw: 'Weka Appointment', en: 'Schedule a Meeting', zh: '预约会议' }, d: { sw: 'Simu, Zoom au Google Meet kwa majadiliano ya kina na mpango wa kisheria.', en: 'Phone, Zoom or Google Meet for a detailed discussion and legal strategy.', zh: '通过电话、Zoom 或 Google Meet 详细讨论并制定法律策略。' } },
      { t: { sw: 'Kutana Ana kwa Ana', en: 'Meet in Person', zh: '面对面会谈' }, d: { sw: 'Kamilisha kesi yako kwa kusaini nyaraka na taratibu za mwisho za kisheria.', en: 'Complete your case with document signing and final legal procedures.', zh: '签署文件并完成最终法律程序。' } },
    ],
  },
  partner: {
    eyebrow: { sw: 'Ushirikiano', en: 'Partnership', zh: '合作伙伴' },
    title: { sw: 'Jiunge na Timu ya CLC', en: 'Join the CLC Team', zh: '加入 CLC 团队' },
    sub: {
      sw: 'Je, wewe ni kampuni ya sheria? Shirikiana nasi kufikia wateja wengi zaidi kote Tanzania na kutoa huduma bora kwa pamoja.',
      en: 'Are you a law firm? Partner with us to reach more clients across Tanzania and deliver better legal services together.',
      zh: '您是律师事务所吗？与我们合作，触达坦桑尼亚各地更多客户，共同提供更优质的法律服务。',
    },
    perks: [
      { t: { sw: 'Wateja wapya', en: 'New clients', zh: '更多客户' }, d: { sw: 'Pokea rufaa za kesi zinazoendana na utaalamu wako.', en: 'Receive case referrals that match your expertise.', zh: '获得与您专长相符的案件转介。' } },
      { t: { sw: 'Mtandao wa mawakili', en: 'Lawyer network', zh: '律师网络' }, d: { sw: 'Fanya kazi pamoja na mawakili wenye sifa kote nchini.', en: 'Work alongside qualified advocates nationwide.', zh: '与全国合格律师并肩合作。' } },
      { t: { sw: 'Chapa na uaminifu', en: 'Brand & trust', zh: '品牌与信任' }, d: { sw: 'Nufaika na jukwaa linaloaminika na jamii.', en: 'Grow with a platform the community already trusts.', zh: '借助社区信赖的平台共同成长。' } },
      { t: { sw: 'Ukuaji wa pamoja', en: 'Shared growth', zh: '共同成长' }, d: { sw: 'Tukue pamoja kwa uwazi, heshima na weledi.', en: 'Grow together with transparency, respect and professionalism.', zh: '以透明、尊重和专业精神共同发展。' } },
    ],
    cta: { sw: 'Jiunge na Timu ya CLC', en: 'Join the CLC Team', zh: '加入 CLC 团队' },
    note: { sw: 'Tutajibu kwa WhatsApp ndani ya saa 24.', en: 'We reply on WhatsApp within 24 hours.', zh: '我们将在 24 小时内通过 WhatsApp 回复。' },
    msg: {
      sw: 'Habari CLC, kampuni yetu ya sheria inapenda kujiunga na timu yenu kama mshirika.',
      en: 'Hello CLC, our law firm would like to join your team as a partner.',
      zh: '您好 CLC，我们律师事务所希望作为合作伙伴加入您的团队。',
    },
  },
  why: {
    eyebrow: { sw: 'Kwa Nini Sisi', en: 'Why Choose Us', zh: '为何选择我们' },
    title: { sw: 'Kwa nini utuchague Community Legal Clinic (CLC)', en: 'Why choose Community Legal Clinic (CLC)', zh: '为何选择 Community Legal Clinic (CLC)' },
    body: {
      sw: 'Jukwaa la Community Legal Clinic linakuunganisha na mtandao wa mawakili mbalimbali wenye sifa kote Tanzania — hilo ndilo tunalofanya, kukuunganisha na wakili sahihi kwa haraka. Watu wengi huona hali yao kama si suala la kisheria, kumbe ni suala la kisheria kabisa — na hudhani msaada ni ghali. Kwa kweli si ghali, ila wengi tu hawajui fursa hii ipo.',
      en: 'The Community Legal Clinic platform connects you to a network of many different lawyers across the country — that is exactly what we do, linking you to the right advocate, fast. Many people see their situation as "not a legal issue" when it actually is one — and assume getting help costs a lot. In truth it isn’t that expensive; most people simply don’t know the option exists.',
      zh: 'Community Legal Clinic 平台将您与全国各地众多合格律师联系起来——这正是我们所做的，快速为您匹配合适的律师。很多人觉得自己遇到的情况"不算法律问题"，但实际上正是法律问题；也常以为寻求帮助费用高昂，其实并不贵，只是大多数人并不知道这个渠道存在。',
    },
    points: [
      { sw: 'Tunakuunganisha na mawakili wengi tofauti kote nchini', en: 'We connect you to many different lawyers across the country', zh: '为您连接全国各地众多不同的律师' },
      { sw: 'Tunakusaidia kutambua kuwa ni suala la kisheria', en: 'We help you recognise when it really is a legal issue', zh: '帮助您识别这确实是一个法律问题' },
      { sw: 'Si ghali kama watu wengi wanavyodhani', en: 'It’s more affordable than most people assume', zh: '费用比大多数人想象的要实惠' },
    ],
  },
  testimonials: {
    eyebrow: { sw: 'Shuhuda', en: 'Testimonials', zh: '客户评价' },
    title: { sw: 'Wanachosema Kuhusu Sisi', en: 'What People Say About Us', zh: '客户怎么说' },
  },
  faq: {
    eyebrow: { sw: 'Maswali', en: 'FAQ', zh: '常见问题' },
    title: { sw: 'Maswali Yanayoulizwa Mara kwa Mara', en: 'Frequently Asked Questions', zh: '常见问题解答' },
    items: [
      { q: { sw: 'Deed Poll inachukua muda gani?', en: 'How long does a Deed Poll take?', zh: '契据更名需要多长时间？' }, a: { sw: 'Tunaiandaa na kuiwasilisha Wizara ya Ardhi mapema; usajili kwa kawaida hukamilika ndani ya wiki 1–2, kisha tangazo kwenye Gazeti la Serikali.', en: 'We draft and submit it to the Ministry of Lands promptly; registration usually completes within 1–2 weeks, followed by publication in the Government Gazette.', zh: '我们会尽快起草并提交至土地部，注册通常在 1–2 周内完成，随后在政府公报上公告。' } },
      { q: { sw: 'Je, mgeni anaweza kuwekeza kwenye uchimbaji wa dhahabu?', en: 'Can a foreigner invest in gold mining?', zh: '外国人可以投资黄金矿业吗？' }, a: { sw: 'Ndiyo — kupitia Mkataba wa Msaada wa Kiufundi (TSA) na mmiliki wa PML, kwa mujibu wa Kifungu 8(3) cha Sheria ya Madini, Sura 123.', en: 'Yes — through a Technical Support Agreement (TSA) with a PML holder, in line with Section 8(3) of the Mining Act, Cap 123.', zh: '可以——根据《矿业法》第123章第8(3)条，通过与 PML 持有人签订技术支持协议（TSA）。' } },
      { q: { sw: 'Je, nakala ya wosia ni bure kweli?', en: 'Is the Will template really free?', zh: '遗嘱模板真的免费吗？' }, a: { sw: 'Ndiyo. Tunakupa nakala ya Wosia (PDF) bure. Ukitaka, wakili anaweza kukuandikia na kuuhakiki kabla ya kusaini.', en: 'Yes. The Will template (PDF) is free. If you like, an advocate can draft and review it before signing.', zh: '是的，遗嘱模板（PDF）免费。如需要，律师可在签署前为您起草和审核。' } },
      { q: { sw: 'Lazima nifike ofisini?', en: 'Do I have to visit the office?', zh: '我必须到办公室吗？' }, a: { sw: 'Hapana kwa mwanzo — tunaanza kwa WhatsApp, simu au Zoom. Tunakutana ana kwa ana tu pale ambapo kusaini nyaraka kunahitajika.', en: 'Not at first — we start on WhatsApp, phone or Zoom. We meet in person only when signing documents requires it.', zh: '起初不需要——我们通过 WhatsApp、电话或 Zoom 开始，仅在需要签署文件时面谈。' } },
      { q: { sw: 'Saa zenu za kazi ni zipi?', en: 'What are your office hours?', zh: '办公时间是什么时候？' }, a: { sw: 'Jumatatu–Ijumaa 9:00–18:00 na Jumamosi 9:00–13:00 (EAT). Jukwaa letu liko wazi saa 24.', en: 'Mon–Fri 9:00–18:00 and Sat 9:00–13:00 (EAT). Our platform is available 24/7.', zh: '周一至周五 9:00–18:00，周六 9:00–13:00（东非时间）。平台全天候开放。' } },
    ],
  },
  booking: {
    eyebrow: { sw: 'Appointment', en: 'Appointment', zh: '预约咨询' },
    title: { sw: 'Weka Appointment nasi leo', en: 'Book an appointment with us today', zh: '今天就与我们预约咨询' },
    s1: { sw: 'Chagua huduma', en: 'Choose a service', zh: '选择服务' },
    s2: { sw: 'Aina ya mkutano na muda', en: 'Meeting type & time', zh: '会议方式与时间' },
    s3: { sw: 'Taarifa zako', en: 'Your details', zh: '您的信息' },
    next: { sw: 'Endelea', en: 'Continue', zh: '继续' },
    back: { sw: 'Rudi', en: 'Back', zh: '返回' },
    send: { sw: 'Tuma kwa WhatsApp', en: 'Send via WhatsApp', zh: '通过 WhatsApp 发送' },
    name: { sw: 'Jina kamili', en: 'Full name', zh: '姓名' },
    phone: { sw: 'Namba ya simu', en: 'Phone number', zh: '电话号码' },
    date: { sw: 'Tarehe unayopendelea', en: 'Preferred date', zh: '首选日期' },
    time: { sw: 'Muda', en: 'Time', zh: '时间' },
    note: { sw: 'Eleza kwa ufupi changamoto yako', en: 'Briefly describe your issue', zh: '简要描述您的问题' },
    meeting: { sw: 'Aina ya mkutano', en: 'Meeting type', zh: '会议方式' },
  },
  footer: {
    about: {
      sw: 'Tunatoa suluhisho kamili za kisheria kwa utaalamu na uwazi. Mshirika wako wa kuaminika kwa masuala yote ya kisheria Tanzania.',
      en: 'Providing comprehensive legal solutions with professional expertise and transparent processes. Your trusted partner for all legal matters in Tanzania.',
      zh: '以专业知识和透明流程提供全面的法律解决方案。您在坦桑尼亚值得信赖的法律伙伴。',
    },
    quick: { sw: 'Viungo', en: 'Quick Links', zh: '快速链接' },
    services: { sw: 'Huduma', en: 'Services', zh: '服务' },
    contact: { sw: 'Mawasiliano', en: 'Contact Us', zh: '联系我们' },
    help: { sw: 'Pata Msaada Leo', en: 'Get Legal Help Today', zh: '立即获取帮助' },
    helpSub: { sw: 'Ongea na timu yetu WhatsApp au weka appointment.', en: 'Chat with our team on WhatsApp or book a consultation.', zh: '通过 WhatsApp 联系我们或预约咨询。' },
    disclaimer: {
      sw: 'Taarifa zilizo kwenye tovuti hii si ushauri wa kisheria hadi utakapozungumza na wakili.',
      en: 'Information on this site is not legal advice until you consult an advocate.',
      zh: '在您咨询律师之前，本网站信息不构成法律意见。',
    },
    tagline: { sw: 'Suluhisho za Kisheria kwa Tanzania Imara', en: 'Legal Solutions for a Stronger Tanzania', zh: '法律护航，共建更强坦桑尼亚' },
  },
}

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('clc-lang') || 'sw' } catch { return 'sw' }
  })
  useEffect(() => {
    try { localStorage.setItem('clc-lang', lang) } catch { /* ignore */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
  }, [lang])
  const t = (obj) => (obj ? obj[lang] ?? obj.en : '')
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
