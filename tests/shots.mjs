// Real-data screenshot pipeline: pulls live data through the plugin's own routes, inlines the
// covers as data URIs, then exports the panel to static HTML with tests/smoke.mjs and shoots it
// with headless Chrome. Output lands in tests/pv/ (gitignored) and, for the ones we publish, in docs/.
//
//   node tests/shots.mjs            → export + screenshot everything
//   node tests/shots.mjs --export   → only write tests/pv/data.json + the HTML snapshots
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import { spawn } from 'node:child_process'

import { apply } from '../index.js'
import { readWeReadKey } from './credentials.mjs'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const PV = join(ROOT, 'tests', 'pv')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const key = await readWeReadKey()
if (!key) throw new Error('no weread api key (set WEREAD_CREDENTIALS or DSH_HOME)')

let route = null
const ctx = {
  effect: (fn) => {
    const dispose = fn()
    return () => {
      if (typeof dispose === 'function') dispose()
    }
  },
  on: () => {},
  get: (name) => (name === 'llm' ? { stream: async function* empty() {} } : undefined),
  webServer: {
    register: (entry) => {
      route = entry
      return () => {}
    },
    getOrigin: () => 'http://127.0.0.1',
  },
  credentials: {
    readRecord: async () => ({ kind: 'api-key', key }),
    describeRecord: async () => ({ configured: true, kind: 'api-key', writable: true }),
    modifyRecord: async () => {},
    deleteRecord: async () => {},
  },
  tools: { register: () => () => {} },
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}
apply(ctx, {})
if (!route) throw new Error('plugin did not register a route')

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter()
    req.method = method
    req.url = path
    const raw = body === undefined ? '' : JSON.stringify(body)
    req.headers = { host: '127.0.0.1', 'content-type': 'application/json' }
    req[Symbol.asyncIterator] = async function* replay() {
      if (raw) yield Buffer.from(raw)
    }
    const chunks = []
    const res = {
      headersSent: false,
      status: 200,
      writeHead(code, headers) {
        this.status = code
        this.headers = headers
        this.headersSent = true
      },
      setHeader(name, value) {
        (this.headers || (this.headers = {}))[name] = value
      },
      write(chunk) {
        chunks.push(chunk)
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk))
        resolve({ status: this.status, headers: this.headers || {}, body: Buffer.concat(chunks) })
      },
      on: () => {},
      once: () => {},
    }
    Promise.resolve()
      .then(() => route.handler(req, res))
      .catch(reject)
  })
}

async function getJson(path) {
  const result = await call('GET', path)
  const text = result.body.toString('utf8')
  if (result.status !== 200) throw new Error(`${path} → ${result.status} ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

const covers = new Map()
async function coverUri(url) {
  if (!url) return ''
  if (covers.has(url)) return covers.get(url)
  let result = ''
  try {
    const response = await fetch(url, {
      headers: { referer: 'https://weread.qq.com/', 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (response.ok) {
      const type = response.headers.get('content-type') || 'image/jpeg'
      const buffer = Buffer.from(await response.arrayBuffer())
      result = `data:${type};base64,${buffer.toString('base64')}`
    }
  } catch {
    result = ''
  }
  covers.set(url, result || url)
  return covers.get(url) || url
}

await mkdir(PV, { recursive: true })

console.log('· shelf')
const shelf = await getJson('/api/weread/shelf')
console.log('  books', shelf.books.length, '· folders', shelf.archive?.length || 0)

console.log('· stats')
const stats = await getJson('/api/weread/stats?mode=annually')
const statsOverall = await getJson('/api/weread/stats?mode=overall')

console.log('· calendar')
const calendar = await getJson('/api/weread/calendar?weeks=27')
console.log('  days', Object.keys(calendar.days || {}).length)

console.log('· notes')
const notes = await getJson('/api/weread/notes')
const byNotes = [...(notes.books || [])].sort((left, right) => (right.totalNotes || 0) - (left.totalNotes || 0))
const focus =
  byNotes.find((book) => book.cover && (book.totalNotes || 0) > 20) ||
  byNotes.find((book) => (book.totalNotes || 0) > 10) ||
  byNotes[0] ||
  shelf.books[0]

console.log('· book', focus?.title, focus?.totalNotes ?? '?')
const book = await getJson(`/api/weread/book?id=${encodeURIComponent(focus.bookId)}`)

console.log('· progress')
const ids = shelf.books.filter((item) => item.progress == null).map((item) => item.bookId)
const progress = ids.length ? await getJson(`/api/weread/progress?ids=${ids.slice(0, 60).map(encodeURIComponent).join(',')}`) : { items: {} }

// Inline every cover so the static preview is faithful (no network while rendering).
const embedded = shelf.books
for (const item of embedded) item.cover = await coverUri(item.cover)
if (book.info?.cover) book.info.cover = await coverUri(book.info.cover)
for (const item of stats.longest || []) {
  if (item.cover) item.cover = await coverUri(item.cover)
}
console.log('  covers', embedded.filter((item) => String(item.cover).startsWith('data:')).length, '/', embedded.length)

const data = { shelf, stats, statsByMode: { annually: stats, overall: statsOverall }, calendar, notes, book, progress, focusTitle: focus?.title || '' }
await writeFile(join(PV, 'data.json'), JSON.stringify(data), 'utf8')

console.log('· render')
const render = spawn(process.execPath, ['tests/smoke.mjs', '--html', 'tests/pv/real.html', '--data', 'tests/pv/data.json'], {
  cwd: ROOT,
  stdio: 'inherit',
})
await new Promise((resolve, reject) => {
  render.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`smoke exited ${code}`))))
})

if (process.argv.includes('--export')) process.exit(0)

const shots = [
  ['home', 1180, 1020],
  ['shelf-category', 1180, 900],
  ['notes', 1180, 860],
  ['stats', 1180, 1880],
  ['detail', 1180, 1080],
  ['companion', 1180, 900],
]

for (const [name, width, height] of shots) {
  const file = join(PV, `real-${name}.html`)
  const output = join(PV, `shot-${name}.png`)
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=${join(PV, `chrome-${name}`)}`,
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=6000',
      `--screenshot=${output}`,
      `file:///${file.replace(/\\/g, '/')}`,
    ],
    { stdio: 'ignore' },
  )
  await new Promise((resolve) => chrome.on('exit', resolve))
  await new Promise((resolve) => setTimeout(resolve, 700))
  console.log('  ⤷', output)
}

console.log('done')