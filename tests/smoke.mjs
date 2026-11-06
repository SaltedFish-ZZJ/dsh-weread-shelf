// Headless render smoke test for client.js.
// Tiny React stand-in: runs function components, hooks, effects, and click handlers,
// so a crash in any view shows up here instead of as a blank panel.
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const SRC = new URL('../client.js', import.meta.url)

// ---------------------------------------------------------------- react stub
const hookStore = new Map()
let dirty = false
let currentSlots = null
let cursor = 0
let pathStack = []
let pendingEffects = []
const errors = []

function useSlot() {
  const index = cursor++
  if (!currentSlots[index]) currentSlots[index] = { mounted: false }
  return currentSlots[index]
}

function depsChanged(previous, next) {
  if (!previous) return true
  if (!next) return false
  if (previous.length !== next.length) return true
  return next.some((value, index) => !Object.is(value, previous[index]))
}

const React = {
  createElement(type, props, ...children) {
    const merged = { ...(props || {}) }
    if (children.length === 1) merged.children = children[0]
    else if (children.length > 1) merged.children = children
    return { type, props: merged }
  },
  Fragment: 'fragment',
  useState(initial) {
    const slot = useSlot()
    if (!slot.mounted) {
      slot.value = typeof initial === 'function' ? initial() : initial
      slot.mounted = true
    }
    const set = (next) => {
      const value = typeof next === 'function' ? next(slot.value) : next
      if (!Object.is(value, slot.value)) {
        slot.value = value
        dirty = true
      }
    }
    return [slot.value, set]
  },
  useEffect(fn, deps) {
    const slot = useSlot()
    if (!slot.mounted || depsChanged(slot.deps, deps)) {
      slot.mounted = true
      slot.deps = deps
      pendingEffects.push(fn)
    }
  },
  useCallback(fn, deps) {
    const slot = useSlot()
    if (!slot.mounted || depsChanged(slot.deps, deps)) {
      slot.mounted = true
      slot.deps = deps
      slot.value = fn
    }
    return slot.value
  },
  useMemo(fn, deps) {
    const slot = useSlot()
    if (!slot.mounted || depsChanged(slot.deps, deps)) {
      slot.mounted = true
      slot.deps = deps
      slot.value = fn()
    }
    return slot.value
  },
  useRef(initial) {
    const slot = useSlot()
    if (!slot.mounted) {
      slot.mounted = true
      slot.value = { current: initial }
    }
    return slot.value
  },
}

// ---------------------------------------------------------------- tree walker
let keyPath = 'root'

function walk(node) {
  if (node == null || node === false || node === true) return null
  if (Array.isArray(node)) return node.map(walk)
  if (typeof node === 'string' || typeof node === 'number') return node
  if (typeof node.type === 'function') {
    const previousSlots = currentSlots
    const previousCursor = cursor
    const previousPath = keyPath
    const selfPath = `${previousPath}/${node.type.name || 'anon'}`
    keyPath = selfPath
    currentSlots = hookStore.get(selfPath) || []
    hookStore.set(selfPath, currentSlots)
    cursor = 0
    let output
    try {
      output = node.type(node.props)
    } catch (error) {
      errors.push({ path: previousPath, error })
      output = null
    }
    const rendered = walk(output)
    currentSlots = previousSlots
    cursor = previousCursor
    keyPath = previousPath
    return rendered
  }
  if (node.props && node.props.children != null) {
    const children = node.props.children
    const list = Array.isArray(children) ? children : [children]
    const previousPath = keyPath
    const rendered = []
    list.forEach((child, index) => {
      keyPath = `${previousPath}>${String(node.type)}${index}`
      rendered.push(walk(child))
    })
    keyPath = previousPath
    return { type: node.type, props: { ...node.props, children: rendered } }
  }
  return node
}

function collect(node, found = []) {
  if (!node) return found
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, found))
    return found
  }
  if (typeof node !== 'object') return found
  found.push(node)
  if (node.props) collect(node.props.children, found)
  return found
}

function textOf(node) {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node.props) return textOf(node.props.children)
  return ''
}

// ---------------------------------------------------------------- static HTML export (for visual checks)
const UNITLESS = new Set(['flex', 'flexGrow', 'flexShrink', 'opacity', 'zIndex', 'fontWeight', 'lineHeight', 'aspectRatio', 'order', 'gridColumn', 'gridRow', 'zoom'])

function styleText(style) {
  return Object.entries(style)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const name = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
      const text = typeof value === 'number' && !UNITLESS.has(key) ? `${value}px` : String(value)
      return `${name}:${text}`
    })
    .join(';')
}

const KEEP_ATTRS = new Set(['viewBox', 'preserveAspectRatio', 'xmlns', 'src', 'href', 'id', 'role', 'title', 'alt', 'type', 'value', 'placeholder', 'disabled', 'checked', 'readOnly', 'rows', 'cols', 'maxLength', 'step', 'min', 'max', 'htmlFor', 'tabIndex', 'lang', 'dir', 'name'])

function attrName(key) {
  if (key === 'htmlFor') return 'for'
  if (KEEP_ATTRS.has(key)) return key
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
}

function toHtml(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char])
  }
  if (Array.isArray(node)) return node.map(toHtml).join('')
  const { type, props = {} } = node
  if (type === 'fragment') return toHtml(props.children)
  const attrs = []
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || value === null || value === undefined || typeof value === 'function') continue
    if (key === 'key' || key === 'ref') continue
    if (key === 'style' && typeof value === 'object') {
      attrs.push(`style="${styleText(value).replace(/"/g, '&quot;')}"`)
      continue
    }
    if (key === 'className') {
      attrs.push(`class="${value}"`)
      continue
    }
    if (value === true) {
      attrs.push(key)
      continue
    }
    if (typeof value === 'object') continue
    attrs.push(`${attrName(key)}="${String(value).replace(/"/g, '&quot;')}"`)
  }
  const OPEN_ONLY = new Set(['img', 'br', 'input', 'hr', 'meta', 'link'])
  const open = `<${type}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
  if (OPEN_ONLY.has(type)) return open
  return `${open}${toHtml(props.children)}</${type}>`
}

function documentHtml(body) {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>书屿 preview</title><style>
:root { --dsw-alias-bg-base:#17181b; --dsw-alias-bg-layer-1:#1e1f23; --dsw-alias-bg-layer-2:#26272c; --dsw-alias-border-l1:#2e2f35; --dsw-alias-border-l2:#3a3b42; --dsw-alias-label-primary:#e6e7ea; --dsw-alias-label-secondary:#9a9ba3; --dsw-alias-state-success-primary:#3fbf7f; --dsw-alias-state-warn-primary:#d9a43a; }
* { box-sizing: border-box; }
body { margin:0; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: 13px/1.5 "Segoe UI", "Microsoft YaHei", system-ui, sans-serif; }
svg { display:block; overflow: visible; }
</style></head><body><div style="width:920px;height:1400px">${body}</div></body></html>`
}
function json(body, status = 200) {
  return {
    ok: status < 400,
    status,
    async json() {
      return body
    },
    async text() {
      return JSON.stringify(body)
    },
    headers: { get: () => 'application/json' },
    body: null,
  }
}

const shelfPayload = {
  books: [
    {
      bookId: '3300024284',
      readerLink: 'https://weread.qq.com/web/reader/test',
      title: '置身事内：中国政府与经济发展',
      author: '兰小欢',
      cover: 'https://cdn.weread.qq.com/weread/cover/84/3300024284/t6_3300024284.jpg',
      category: '经济',
      progress: 32,
      finished: false,
      noteCount: 4,
      thoughtCount: 1,
      lastReadAt: Date.now(),
    },
    {
      bookId: 'CB_x',
      title: '第一性原理',
      author: '武从文',
      cover: '',
      category: '个人成长',
      progress: 0,
      finished: true,
      noteCount: 0,
      thoughtCount: 0,
    },
  ],
  albums: [],
  total: 2,
}

const statsPayload = {
  mode: 'annually',
  totalSeconds: 76204,
  readDays: 64,
  dayAverageSeconds: 1190,
  compare: 0.12,
  recordSeconds: 5400,
  buckets: [
    { at: Date.UTC(2026, 0, 1), seconds: 12000 },
    { at: Date.UTC(2026, 1, 1), seconds: 6800 },
    { at: Date.UTC(2026, 2, 1), seconds: 0 },
    { at: Date.UTC(2026, 3, 1), seconds: 9400 },
    { at: Date.UTC(2026, 4, 1), seconds: 15200 },
    { at: Date.UTC(2026, 5, 1), seconds: 4100 },
    { at: Date.UTC(2026, 6, 1), seconds: 7300 },
    { at: Date.UTC(2026, 7, 1), seconds: 5200 },
    { at: Date.UTC(2026, 8, 1), seconds: 8100 },
    { at: Date.UTC(2026, 9, 1), seconds: 3300 },
    { at: Date.UTC(2026, 10, 1), seconds: 4804 },
  ],
  hours: Array.from({ length: 24 }, (_, index) => (index === 20 ? 900 : index * 7)),
  categories: [
    { title: '经济理财', seconds: 30000, value: 40 },
    { title: '个人成长', seconds: 18000, value: 24 },
  ],
  longest: [
    { bookId: '1', title: '置身事内', author: '兰小欢', seconds: 24000, cover: '', tags: [] },
    { bookId: '2', title: '第一性原理', author: '武从文', seconds: 9000, cover: '', tags: [] },
  ],
  stats: [{ stat: '阅读天数', counts: '64 天' }],
  hourWord: '晚上 8 点最专注',
  categoryWord: '经济理财读得最多',
  rate: 0.6,
}

globalThis.fetch = async (url, init = {}) => {
  const target = String(url)
  if (target.includes('/state')) return json({ configured: true })
  if (target.includes('/shelf')) {
    console.log('[mock] GET', target.replace('http://localhost', ''), '→ books', shelfPayload.books.length)
    return json(shelfPayload)
  }
  if (target.includes('/progress')) return json({ items: {} })
  if (target.includes('/book')) {
    return json({
      info: { bookId: '3300024284', title: '置身事内', author: '兰小欢', cover: '', intro: '一本讲地方财政的书。', category: '经济', newRating: 88.4 },
      progress: { progress: 32, chapterUid: 1, recordReadingTime: 4000 },
      chapters: [
        { chapterUid: 1, chapterIdx: 1, title: '第一章 地方政府的权力与事务' },
        { chapterUid: 2, chapterIdx: 2, title: '第二章 财税与政府行为' },
      ],
      highlights: [
        { bookmarkId: 'b1', chapterUid: 1, chapterName: '第一章 地方政府的权力与事务', markText: '地方政府是经济发展的主体。', createTime: Date.now() - 86400000 },
      ],
      thoughts: [{ reviewId: 'r1', chapterName: '第一章', content: '这解释了很多现象。', createTime: Date.now() - 7200000, star: 4 }],
    })
  }
  if (target.includes('/notes')) {
    return json({
      totalBookCount: 1,
      books: [
        {
          bookId: '3300024284',
          title: '置身事内：中国政府与经济发展',
          author: '兰小欢',
          cover: '',
          noteCount: 3,
          reviewCount: 1,
          bookmarkCount: 0,
          totalNotes: 4,
          progress: 32,
          finished: false,
        },
      ],
    })
  }
  if (target.includes('/stats')) return json(statsPayload)
  if (target.includes('/calendar')) {
    // 9 weeks of daily buckets ending today; today always has reading so the streak is >= 1.
    const stamp = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 8 * 7)
    const days = {}
    for (let index = 0; index < 9 * 7; index += 1) {
      const day = new Date(start.getTime())
      day.setDate(day.getDate() + index)
      if (day > today) break
      days[stamp(day)] = index % 5 === 0 ? 0 : (index % 7) * 600 + 300
    }
    days[stamp(today)] = 659
    return json({ weeks: 9, days, start: stamp(start), end: stamp(today), max: 4200, fetched: 9 })
  }
  if (target.includes('/settings')) {
    const body = init.body ? JSON.parse(init.body) : {}
    if (String(init.method || 'GET').toUpperCase() === 'POST') return json({ settings: { autoSplit: true, folder: 'personal/书屿', ...body } })
    return json({ settings: { autoSplit: true, folder: 'personal/书屿', vaultPath: 'D:/Obsidian_Work/myself_wiki' } })
  }
  if (target.includes('/ai-key')) {
    if (String(init.method || 'GET').toUpperCase() === 'DELETE') return json({ ok: true })
    return json({ ok: true, verified: true })
  }
  if (target.includes('/ai')) return json({ mode: 'dsh', baseUrl: '', model: '', keyConfigured: false })
  if (target.includes('/open')) return json({ ok: true, mode: 'app-window' })
  if (target.includes('/ask')) return json({ ok: true })
  if (target.includes('/save')) return json({ ok: true })
  if (target.includes('/search')) return json({ books: shelfPayload.books })
  return json({ ok: true })
}

// ---------------------------------------------------------------- load module
const code = await readFile(SRC, 'utf8')
let loaded = null
globalThis.window = { __ModuleLoader__: { load: (mod) => { loaded = mod } } }
const requireStub = (name) => {
  if (name === 'react') return React
  throw new Error(`unexpected require(${name})`)
}
new Function('window', 'require', code)(globalThis.window, requireStub)
if (!loaded) throw new Error('client.js did not call __ModuleLoader__.load')
const app = loaded.factory(requireStub)

const registered = new Map()
const injected = []
const fakeCtx = {
  slots: {
    inject(slot, callback) {
      injected.push(slot)
      callback()
      return () => {}
    },
    register(spec, component) {
      registered.set(spec.key || spec.name || spec.id, component)
      return () => {}
    },
  },
  uiWorkspace: { startSession: () => injected.push('startSession') },
  locale: { register: () => {}, bind: () => ({}) },
  get: () => undefined,
}
for (const name of app.inject || ['slots']) {
  if (name === 'slots') app.apply(fakeCtx)
}

const Panel = registered.get('weread-shelf') || registered.get('main') || [...registered.values()][0]
if (!Panel) throw new Error(`no panel registered; got ${[...registered.keys()].join(',')}`)

// ---------------------------------------------------------------- drive it
async function settle(tree) {
  for (let round = 0; round < 25; round += 1) {
    const effects = pendingEffects
    pendingEffects = []
    for (const effect of effects) {
      try {
        await effect()
      } catch (error) {
        errors.push({ path: `effect#${round}`, error })
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (!dirty || effects.length === 0) {
      if (!dirty) break
    }
    dirty = false
    cursor = 0
    keyPath = 'root'
    tree = walk({ type: Panel, props: {} })
  }
  return tree
}

dirty = false
let tree = walk({ type: Panel, props: {} })
tree = await settle(tree)

function report(label) {
  const texts = collect(tree).map(textOf).filter(Boolean)
  console.log(`\n=== ${label} ===`)
  console.log('nodes:', collect(tree).length, '| text chars:', texts.join(' ').length)
  console.log('preview:', texts.join('').slice(0, 160))
}

report('shelf tab')

async function click(label) {
  const nodes = collect(tree)
  const candidates = nodes.filter((node) => node.props && typeof node.props.onClick === 'function' && textOf(node).includes(label))
  // Prefer the innermost control: an outer wrapper (the sheet mask, a card) contains the same text
  // but its onClick closes or navigates instead of switching the thing we mean to switch.
  candidates.sort((left, right) => textOf(left).length - textOf(right).length)
  const target = candidates[0]
  if (!target) {
    console.log(`(no clickable "${label}")`)
    return false
  }
  try {
    await target.props.onClick({ preventDefault() {}, stopPropagation() {} })
  } catch (error) {
    errors.push({ path: `click:${label}`, error })
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  tree = await settle(tree)
  report(`after click ${label}`)
  return true
}

const htmlFlag = process.argv.indexOf('--html')
const htmlBase = htmlFlag > 0 && process.argv[htmlFlag + 1] ? process.argv[htmlFlag + 1].replace(/\.html$/, '') : null
async function snap(name, current = tree) {
  if (!htmlBase) return
  const { writeFile, mkdir } = await import('node:fs/promises')
  await mkdir(dirname(htmlBase), { recursive: true })
  await writeFile(`${htmlBase}-${name}.html`, documentHtml(toHtml(current)), 'utf8')
  console.log(`  ⤷ wrote ${htmlBase}-${name}.html`)
}

await snap('home')
await click('笔记')
await snap('notes')
await click('统计')
const statsText = textOf(tree)
const statsChecks = [
  ['阅读日历可见', statsText.includes('阅读日历')],
  ['连续阅读可见', statsText.includes('连续阅读')],
  ['柱状/折线切换可见', statsText.includes('折线')],
  ['书架进度可见', statsText.includes('书架进度')],
  ['读得最多可见', statsText.includes('读得最多')],
]
for (const [name, pass] of statsChecks) {
  console.log(pass ? `  ✅ ${name}` : `  ❌ ${name}`)
  if (!pass) errors.push({ path: 'stats', error: new Error(`${name}: ${statsText.slice(0, 600)}`) })
}

await snap('stats')
await click('书架')
await snap('shelf')
const opened = collect(tree).find((node) => node.props && typeof node.props.onClick === 'function' && textOf(node).includes('置身事内'))
if (opened) {
  try {
    await opened.props.onClick({ preventDefault() {}, stopPropagation() {} })
  } catch (error) {
    errors.push({ path: 'click:book', error })
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  tree = await settle(tree)
  report('after opening a book')
  await snap('detail')
}

const readNow = collect(tree).find((node) => node.props && typeof node.props.onClick === 'function' && textOf(node).includes('打开阅读'))
if (readNow) {
  try {
    await readNow.props.onClick({ preventDefault() {}, stopPropagation() {} })
  } catch (error) {
    errors.push({ path: 'click:readNow', error })
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  tree = await settle(tree)
  report('after 打开阅读')
  const flat = textOf(tree)
  const checks = [
    ['陪读台可见', flat.includes('陪读《')],
    ['随手记输入框可见', collect(tree).some((node) => node.props && typeof node.props.placeholder === 'string' && node.props.placeholder.includes('随手记'))],
    ['划线与随记栏可见', flat.includes('划线与随记')],
  ]
  for (const [name, pass] of checks) {
    console.log(pass ? `  ✅ ${name}` : `  ❌ ${name}`)
    if (!pass) errors.push({ path: 'companion', error: new Error(name) })
  }
  await snap('companion')
  await click('设置')
  await snap('settings')
  await new Promise((resolve) => setTimeout(resolve, 0))
  tree = await settle(tree)
  const settingsText = textOf(tree)
  const settingsChecks = [
    ['AI 来源可见', settingsText.includes('问屿的 AI')],
    ['跟随 DSH 模型可见', settingsText.includes('跟随 DSH 模型')],
    ['自定义接口可见', settingsText.includes('自定义接口')],
  ]
  for (const [name, pass] of settingsChecks) {
    console.log(pass ? `  ✅ ${name}` : `  ❌ ${name}`)
    if (!pass) errors.push({ path: 'settings', error: new Error(name) })
  }
  await click('自定义接口')
  await new Promise((resolve) => setTimeout(resolve, 0))
  tree = await settle(tree)
  const customText = textOf(tree)
  const customChecks = [
    ['接口地址输入可见', customText.includes('接口地址')],
    ['模型名输入可见', customText.includes('模型名')],
    ['接口 Key 段可见', customText.includes('接口 Key')],
  ]
  for (const [name, pass] of customChecks) {
    console.log(pass ? `  ✅ ${name}` : `  ❌ ${name}`)
    if (!pass) errors.push({ path: 'settings-custom', error: new Error(name) })
  }
  await snap('settings-custom')
} else {
  errors.push({ path: 'click:readNow', error: new Error('没有找到「打开阅读」按钮') })
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} render error(s)`)
  for (const item of errors) console.error(`- ${item.path}: ${item.error && item.error.stack ? item.error.stack.split('\n').slice(0, 4).join('\n  ') : item.error}`)
  process.exitCode = 1
} else {
  console.log('\n✅ no render errors')
}