// Helpers shared by the flow builder: ids, texts per language, exits of a block, new blocks.

export const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`

export const LANG_LABEL = { sw: 'SW', en: 'EN', zh: '中文' }

// The text to show on the canvas: first language that has one.
export function preview(value, langs = ['sw', 'en', 'zh']) {
  if (!value) return ''
  if (typeof value === 'string') return value
  for (const l of langs) if (value[l]) return value[l]
  return Object.values(value).find(Boolean) || ''
}

// Exits of a block, from the catalog's `outputs` spec: [{ id, label }]
export function portsOf(node, spec) {
  const out = spec?.outputs || { kind: 'none' }
  const data = node.data || {}
  if (out.kind === 'static') return out.ports
  if (out.kind === 'options') return (data[out.field] || []).map((o) => ({ id: o.id, label: preview(o.title) || 'Untitled choice' }))
  if (out.kind === 'rules') {
    const rules = (data[out.field] || []).map((r) => ({ id: r.id, label: ruleLabel(r) }))
    return [...rules, out.else]
  }
  return []
}

export function ruleLabel(r) {
  if (!r.variable) return 'New rule'
  const ops = { equals: '=', not_equals: '≠', contains: 'contains', is_empty: 'is empty', not_empty: 'is not empty', greater_than: '>', less_than: '<' }
  return `${r.variable} ${ops[r.operator] || '?'} ${['is_empty', 'not_empty'].includes(r.operator) ? '' : r.value ?? ''}`.trim()
}

// A new block with sensible defaults, so it validates with as little typing as possible.
export function newBlock(type, spec, position) {
  const data = {}
  for (const f of spec.fields) {
    if (f.default !== undefined) data[f.key] = f.default
    else if (f.kind === 'text_i18n') data[f.key] = {}
    else if (f.kind === 'options') data[f.key] = [{ id: uid('opt'), value: '', title: {} }]
    else if (f.kind === 'rules') data[f.key] = [{ id: uid('rule'), variable: '', operator: 'equals', value: '' }]
  }
  if (type === 'ask_file') {
    data.done_label = { sw: 'Nimemaliza', en: 'Done', zh: '完成' }
    data.skip_label = { sw: 'Sina nyaraka', en: 'No documents', zh: '没有文件' }
  }
  if (type === 'ask_list') data.button_label = { sw: 'Chagua', en: 'Choose', zh: '选择' }
  return { id: uid('n'), type, position, data }
}

// Variables the flow sets, for autocomplete in conditions and texts.
export function variablesIn(nodes) {
  const names = new Set(['lang', 'client_name', 'phone', 'reference'])
  for (const n of nodes) {
    const d = n.data || {}
    if (d.save_as) names.add(d.save_as)
    if (n.type === 'set_variable' && d.name) names.add(d.name)
  }
  return [...names].sort()
}
