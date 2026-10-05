// Sample data so the dashboards render before the API is connected.
// Each export maps to a backend table; swap for fetch() calls later.

export const ROLES = {
  clc_admin: { key: 'admin', label: 'Administrator', home: '#/app/admin/overview' },
  firm_admin: { key: 'firm', label: 'Law firm representative', home: '#/app/firm/overview' },
  advocate: { key: 'advocate', label: 'Advocate', home: '#/app/advocate/overview' },
}

export const SERVICES = [
  { code: 'tsa_miner', name: 'TSA for miners' },
  { code: 'gold_investor', name: 'Gold investor support' },
  { code: 'deed_poll', name: 'Deed poll' },
  { code: 'will', name: 'Wills' },
  { code: 'general', name: 'General legal advice' },
]

export const firms = [
  {
    id: 'f1', name: 'PNJ Legal Consultants', status: 'approved', region: 'Dar es Salaam',
    regions: ['Dar es Salaam', 'Pwani'], registration: 'LF/2019/0412', tin: '112-384-920',
    address: 'Plot 22, Samora Avenue, Dar es Salaam', email: 'info@pnjlegal.co.tz', phone: '+255 712 440 120',
    services: ['tsa_miner', 'gold_investor', 'general'], advocates: 6, cases: 14, approvedAt: '2026-03-14',
    docs: ['Business licence', 'Practising certificates (6)', 'TIN certificate'],
  },
  {
    id: 'f2', name: 'Lake Zone Advocates', status: 'approved', region: 'Mwanza',
    regions: ['Mwanza', 'Geita', 'Shinyanga'], registration: 'LF/2017/0198', tin: '104-776-331',
    address: 'Kenyatta Road, Mwanza', email: 'office@lakezone.co.tz', phone: '+255 754 902 311',
    services: ['tsa_miner', 'gold_investor'], advocates: 4, cases: 9, approvedAt: '2026-04-02',
    docs: ['Business licence', 'Practising certificates (4)', 'TIN certificate'],
  },
  {
    id: 'f3', name: 'Kilimanjaro Law Chambers', status: 'pending', region: 'Arusha',
    regions: ['Arusha', 'Kilimanjaro', 'Manyara'], registration: 'LF/2024/0733', tin: '138-221-054',
    address: 'Sokoine Road, Arusha', email: 'admin@kililaw.co.tz', phone: '+255 713 118 640',
    services: ['will', 'deed_poll', 'general'], advocates: 3, cases: 0, approvedAt: null,
    docs: ['Business licence', 'Practising certificates (3)'],
  },
  {
    id: 'f4', name: 'Dodoma Legal Partners', status: 'approved', region: 'Dodoma',
    regions: ['Dodoma', 'Singida'], registration: 'LF/2021/0560', tin: '121-509-883',
    address: 'Area D, Dodoma', email: 'hello@dodomalegal.co.tz', phone: '+255 765 332 908',
    services: ['deed_poll', 'will', 'general'], advocates: 2, cases: 5, approvedAt: '2026-05-20',
    docs: ['Business licence', 'Practising certificates (2)', 'TIN certificate'],
  },
  {
    id: 'f5', name: 'Tanga Coastal Law', status: 'suspended', region: 'Tanga',
    regions: ['Tanga'], registration: 'LF/2018/0301', tin: '109-145-672',
    address: 'Independence Avenue, Tanga', email: 'contact@tangacoastal.co.tz', phone: '+255 719 004 515',
    services: ['general'], advocates: 2, cases: 1, approvedAt: '2026-02-10', reason: 'Practising certificate expired',
    docs: ['Business licence', 'Practising certificates (2)'],
  },
]

export const users = [
  { id: 'u1', name: 'Amina Mwakyusa', email: 'amina@clc.tz', role: 'clc_admin', org: 'Community Legal Clinic', status: 'active' },
  { id: 'u2', name: 'Juma Kileo', email: 'juma@pnjlegal.co.tz', role: 'firm_admin', org: 'PNJ Legal Consultants', status: 'active' },
  { id: 'u3', name: 'Neema Lyimo', email: 'neema@pnjlegal.co.tz', role: 'advocate', org: 'PNJ Legal Consultants', status: 'active' },
  { id: 'u4', name: 'Baraka Mushi', email: 'baraka@lakezone.co.tz', role: 'firm_admin', org: 'Lake Zone Advocates', status: 'active' },
  { id: 'u5', name: 'Zawadi Komba', email: 'zawadi@lakezone.co.tz', role: 'advocate', org: 'Lake Zone Advocates', status: 'invited' },
  { id: 'u6', name: 'Hassan Said', email: 'hassan@kililaw.co.tz', role: 'firm_admin', org: 'Kilimanjaro Law Chambers', status: 'invited' },
]

export const flows = [
  {
    id: 'b1', name: 'Main menu', service: null, entry: true, status: 'published', version: 4, updated: '2026-09-28',
    steps: [
      { id: 's1', type: 'buttons', sw: 'Karibu CLC. Unahitaji msaada gani?', en: 'Welcome to CLC. How can we help?', options: ['TSA ya wachimbaji', 'Mwekezaji wa dhahabu', 'Huduma nyingine'] },
    ],
  },
  {
    id: 'b2', name: 'TSA for miners', service: 'tsa_miner', entry: false, status: 'published', version: 2, updated: '2026-09-20',
    steps: [
      { id: 's1', type: 'question', sw: 'Una leseni ya PML?', en: 'Do you hold a PML licence?' },
      { id: 's2', type: 'question', sw: 'Mgodi uko mkoa gani?', en: 'Which region is your site in?' },
      { id: 's3', type: 'message', sw: 'Asante. Timu yetu itakupigia simu.', en: 'Thank you. Our team will call you.' },
    ],
  },
  {
    id: 'b3', name: 'Deed poll', service: 'deed_poll', entry: false, status: 'draft', version: 1, updated: '2026-09-30',
    steps: [{ id: 's1', type: 'question', sw: 'Jina lako la sasa ni lipi?', en: 'What is your current name?' }],
  },
]

export const referrals = [
  { id: 'r1', ref: 'CLC/2026/0014', service: 'TSA for miners', region: 'Geita', summary: 'Small-scale gold miner requests a Tribute and Sales Agreement review with a buyer; PML licence held.', priority: 'high', received: '2026-09-29', status: 'sent' },
  { id: 'r2', ref: 'CLC/2026/0017', service: 'Gold investor support', region: 'Mwanza', summary: 'Foreign investor seeks guidance on gold trading licence requirements.', priority: 'normal', received: '2026-09-30', status: 'sent' },
  { id: 'r3', ref: 'CLC/2026/0009', service: 'General legal advice', region: 'Dar es Salaam', summary: 'Land boundary dispute between neighbours; documents available.', priority: 'normal', received: '2026-09-18', status: 'accepted' },
  { id: 'r4', ref: 'CLC/2026/0006', service: 'Wills', region: 'Pwani', summary: 'Client wants a will drafted for a family estate.', priority: 'low', received: '2026-09-10', status: 'accepted' },
]

export const myCases = [
  { id: 'c1', ref: 'CLC/2026/0009', service: 'General legal advice', region: 'Dar es Salaam', status: 'active', priority: 'normal', updated: '2026-10-01', next: 'Review boundary survey documents' },
  { id: 'c2', ref: 'CLC/2026/0006', service: 'Wills', region: 'Pwani', status: 'advocate_assigned', priority: 'low', updated: '2026-09-27', next: 'Schedule intake call with client' },
  { id: 'c3', ref: 'CLC/2026/0002', service: 'TSA for miners', region: 'Geita', status: 'active', priority: 'high', updated: '2026-09-30', next: 'Draft agreement for buyer review' },
]

export const weekly = [
  { d: 'Mon', v: 14 }, { d: 'Tue', v: 22 }, { d: 'Wed', v: 18 }, { d: 'Thu', v: 31 },
  { d: 'Fri', v: 27 }, { d: 'Sat', v: 12 }, { d: 'Sun', v: 8 },
]

export const activity = [
  { t: '10 min ago', text: 'Kilimanjaro Law Chambers submitted registration documents' },
  { t: '1 h ago', text: 'Case CLC/2026/0017 referred to Lake Zone Advocates' },
  { t: '3 h ago', text: 'Chatbot flow "Deed poll" saved as draft' },
  { t: 'Yesterday', text: 'Zawadi Komba was invited as an advocate' },
]

export const statusTone = {
  approved: 'green', active: 'green', published: 'green', accepted: 'green',
  pending: 'amber', invited: 'amber', draft: 'amber', sent: 'amber', advocate_assigned: 'blue',
  suspended: 'red', rejected: 'red', declined: 'red',
  submitted: 'amber', under_review: 'blue', correction_required: 'red', meeting_pending: 'blue',
  agreements_pending: 'blue', approved_for_trial: 'green', replacement_requested: 'red', signed: 'green',
}
