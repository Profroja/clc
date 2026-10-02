// Podcast, mijadala (discussions) and machapisho (posts) shown in the Media section.
// To publish a video, set `youtube` to the video ID (the part after ?v= in a YouTube link).
// Without a `youtube` ID the page shows the cover image instead.
export const MEDIA_TYPES = [
  { key: 'all', label: { sw: 'Yote', en: 'All', zh: '全部' } },
  { key: 'podcast', label: { sw: 'Podcast', en: 'Podcast', zh: '播客' } },
  { key: 'mijadala', label: { sw: 'Mijadala', en: 'Discussions', zh: '讨论' } },
  { key: 'machapisho', label: { sw: 'Machapisho', en: 'Posts', zh: '文章' } },
]

export const mediaItems = [
  {
    id: 'haki-za-wachimbaji',
    type: 'podcast',
    date: '2026-09-20',
    duration: '24:10',
    youtube: '',
    image: '/images/lawyers.png',
    title: { sw: 'Haki za Mchimbaji Mdogo: Unachopaswa Kujua', en: 'Small-Scale Miners’ Rights: What You Should Know' },
    excerpt: {
      sw: 'Wakili anaeleza leseni ya PML, haki zako mbele ya mwekezaji na namna ya kujikinga na mikataba hatari.',
      en: 'An advocate explains the PML licence, your rights before an investor and how to avoid risky contracts.',
    },
    body: {
      sw: [
        'Wachimbaji wengi wadogo hufanya kazi kwa juhudi kubwa lakini hawajui haki zao za kisheria. Katika kipindi hiki, wakili wetu anaeleza maana ya Leseni Ndogo ya Uchimbaji (PML) na kwa nini ni msingi wa ushirikiano wowote na mwekezaji.',
        'Tunazungumzia pia Mkataba wa Msaada wa Kiufundi (TSA): unapaswa kuwa na nini, nani anasaini, na ni hatua zipi za kuidhinishwa na Tume ya Madini.',
        'Mwisho, tunatoa angalizo la mitego ya kawaida — mikataba ya mdomo, ahadi zisizoandikwa na mgawanyo usio wa haki wa mapato.',
      ],
      en: [
        'Many small-scale miners work hard but do not know their legal rights. In this episode our advocate explains what a Primary Mining Licence (PML) means and why it is the foundation of any partnership with an investor.',
        'We also cover the Technical Support Agreement (TSA): what it should contain, who signs, and the steps to approval by the Mining Commission.',
        'Finally, we flag common traps — verbal contracts, unwritten promises and unfair revenue sharing.',
      ],
    },
  },
  {
    id: 'wosia-na-mirathi',
    type: 'mijadala',
    date: '2026-09-12',
    duration: '31:45',
    youtube: '',
    image: '/images/people.png',
    title: { sw: 'Wosia na Mirathi: Kwa Nini Usisubiri?', en: 'Wills & Inheritance: Why Wait?' },
    excerpt: {
      sw: 'Mjadala wa wazi kuhusu migogoro ya mirathi katika familia na jinsi wosia unavyoweza kuizuia.',
      en: 'An open discussion on inheritance disputes in families and how a will can prevent them.',
    },
    body: {
      sw: [
        'Migogoro ya mirathi ni miongoni mwa sababu kuu za mafarakano ya familia. Wageni wetu wanajadili uzoefu halisi na makosa yanayojirudia.',
        'Wakili anafafanua namna ya kuandika wosia halali, nani anaweza kuwa shahidi, na wapi pa kuuhifadhi salama.',
        'Unaweza pia kupakua nakala ya wosia (PDF) bure kupitia huduma yetu ya Wosia & Urithi.',
      ],
      en: [
        'Inheritance disputes are among the main causes of family rifts. Our guests discuss real experiences and the mistakes that keep repeating.',
        'An advocate explains how to write a valid will, who can witness it, and where to store it safely.',
        'You can also download a free will template (PDF) through our Wills & Inheritance service.',
      ],
    },
  },
  {
    id: 'deed-poll-hatua',
    type: 'machapisho',
    date: '2026-09-05',
    youtube: '',
    image: '/images/lawyer-help.png',
    title: { sw: 'Hatua za Kubadilisha Jina kwa Deed Poll', en: 'Steps to Change Your Name by Deed Poll' },
    excerpt: {
      sw: 'Kutoka kuandaa Deed Poll hadi Gazeti la Serikali na NIDA — mwongozo kwa hatua.',
      en: 'From drafting the Deed Poll to the Government Gazette and NIDA — a step-by-step guide.',
    },
    body: {
      sw: [
        'Kama majina kwenye vitambulisho vyako hayafanani, Deed Poll ndiyo njia halali ya kurekebisha.',
        'Hatua ya 1: kupitia nyaraka zako. Hatua ya 2: kuandaa Deed Poll rasmi na wakili. Hatua ya 3: usajili Wizara ya Ardhi. Hatua ya 4: tangazo kwenye Gazeti la Serikali. Hatua ya 5: barua rasmi kwenda NIDA na NSSF.',
        'Mchakato kwa kawaida huchukua wiki 1–2 kwa usajili. Wasiliana nasi WhatsApp kuanza leo.',
      ],
      en: [
        'If the names on your IDs do not match, a Deed Poll is the lawful way to correct them.',
        'Step 1: review your documents. Step 2: prepare an official Deed Poll with an advocate. Step 3: register at the Ministry of Lands. Step 4: publish in the Government Gazette. Step 5: official letters to NIDA and NSSF.',
        'Registration usually takes 1–2 weeks. Contact us on WhatsApp to start today.',
      ],
    },
  },
  {
    id: 'wawekezaji-wa-kigeni',
    type: 'podcast',
    date: '2026-08-28',
    duration: '19:30',
    youtube: '',
    image: '/images/man-people.png',
    title: { sw: 'Uwekezaji wa Kigeni kwenye Dhahabu: Njia Halali', en: 'Foreign Gold Investment: The Legal Route' },
    excerpt: {
      sw: 'Mgeni anawezaje kuwekeza kwenye dhahabu Tanzania bila leseni yake mwenyewe?',
      en: 'How can a foreigner invest in Tanzanian gold without holding their own licence?',
    },
    body: {
      sw: [
        'Kwa mujibu wa Kifungu 8(3) cha Sheria ya Madini, Sura 123, mwekezaji wa kigeni anaweza kushirikiana na mmiliki wa PML kupitia TSA.',
        'Tunaeleza uhakiki wa kina (due diligence), nyaraka zinazohitajika, na nafasi ya Tume ya Madini.',
      ],
      en: [
        'Under Section 8(3) of the Mining Act, Cap 123, a foreign investor may partner with a PML holder through a TSA.',
        'We explain due diligence, the documents required, and the role of the Mining Commission.',
      ],
    },
  },
  {
    id: 'msaada-wa-kisheria-bei',
    type: 'mijadala',
    date: '2026-08-15',
    duration: '27:05',
    youtube: '',
    image: '/images/lawyers-msaada.png',
    title: { sw: 'Je, Msaada wa Wakili ni Ghali Kweli?', en: 'Is Legal Help Really Expensive?' },
    excerpt: {
      sw: 'Tunavunja dhana potofu kuhusu gharama za wakili na kueleza jinsi ya kuanza kwa WhatsApp.',
      en: 'We break the myth about lawyer costs and explain how to start on WhatsApp.',
    },
    body: {
      sw: [
        'Watu wengi hudhani msaada wa kisheria ni ghali na hivyo husubiri hadi tatizo linakuwa kubwa.',
        'Katika mjadala huu tunaeleza kuwa ushauri wa awali unaweza kuanza kwa WhatsApp, na kwamba kutambua mapema kuwa ni suala la kisheria huokoa muda na gharama.',
      ],
      en: [
        'Many people assume legal help is expensive and so wait until the problem grows.',
        'In this discussion we explain that initial advice can start on WhatsApp, and that recognising early that it is a legal issue saves time and money.',
      ],
    },
  },
  {
    id: 'kwa-nini-mkataba-maandishi',
    type: 'machapisho',
    date: '2026-08-02',
    youtube: '',
    image: '/images/woman-people.png',
    title: { sw: 'Kwa Nini Kila Makubaliano Yaandikwe', en: 'Why Every Agreement Should Be Written' },
    excerpt: {
      sw: 'Makubaliano ya mdomo ni magumu kuthibitisha. Jifunze mambo 5 ya kuzingatia.',
      en: 'Verbal agreements are hard to prove. Learn 5 things to consider.',
    },
    body: {
      sw: [
        'Makubaliano ya mdomo hayana ushahidi mahakamani. Yaandike, yasainiwe na mashahidi, na kila upande abaki na nakala.',
        'Wakili anaweza kuhakiki mkataba kabla ya kusaini ili kukulinda dhidi ya vipengele hatari.',
      ],
      en: [
        'Verbal agreements leave no evidence in court. Write them down, have them signed with witnesses, and keep a copy each.',
        'An advocate can review a contract before you sign to protect you from risky clauses.',
      ],
    },
  },
]

export const formatDate = (iso, lang) =>
  new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'sw' ? 'sw-TZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Live podcast shown in the floating mini player above the WhatsApp button.
// Set `active: true` while a show is live and `youtube` to the live video ID; `id` links to its detail page.
export const liveStream = {
  active: true,
  id: 'haki-za-wachimbaji',
  youtube: '',
  image: '/images/podcast.png',
  title: { sw: 'Podcast LIVE: Haki za Mchimbaji Mdogo', en: 'LIVE Podcast: Small-Scale Miners’ Rights', zh: '直播播客：小型矿工的权利' },
}
