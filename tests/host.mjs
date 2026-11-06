// Host-side end-to-end check: mounts the plugin against a stub Cordis context and drives the
// real HTTP handler, so route wiring and JSON shapes are exercised without the DSH shell.
//   node tests/host.mjs            → JSON contract only
//   node tests/host.mjs --live     → also hits the WeRead gateway (needs a stored API key)
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

import { apply } from '../index.js';

const live = process.argv.includes('--live');

function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${id}:`);
  if (start < 0) return '';
  const indent = lines[start].match(/^\s*/)[0].length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (line.match(/^\s*/)[0].length <= indent) break;
    const match = line.match(/^\s*key:\s*(\S.*)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

let key = '';
if (live) {
  const path = join(homedir(), '.dsh-weread-shelf', 'settings.json');
  try {
    key = pickKey(await readFile('D:\\DSH-Home\\.credentials.yaml', 'utf8'), 'weread/api-key');
  } catch {
    key = '';
  }
  if (!key) {
    console.error('no api key found for --live');
    process.exit(1);
  }
}

let route = null;
const ctx = {
  effect: (fn) => {
    const dispose = fn();
    return () => {
      if (typeof dispose === 'function') dispose();
    };
  },
  on: () => {},
  get: (name) => (name === 'llm' ? { stream: async function* empty() {} } : undefined),
  webServer: {
    register: (entry) => {
      route = entry;
      return () => {};
    },
    getOrigin: () => 'http://127.0.0.1',
  },
  credentials: {
    readRecord: async () => (key ? { kind: 'api-key', key } : undefined),
    describeRecord: async () => ({ configured: Boolean(key), kind: key ? 'api-key' : undefined, writable: true }),
    modifyRecord: async () => {},
    deleteRecord: async () => {},
  },
  tools: { register: () => () => {} },
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
};

apply(ctx, {});
if (!route) throw new Error('plugin did not register a web route');

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = path;
    const raw = body === undefined ? '' : JSON.stringify(body);
    req.headers = { host: '127.0.0.1', 'content-type': 'application/json' };
    req[Symbol.asyncIterator] = async function* replay() {
      if (raw) yield Buffer.from(raw);
    };
    const chunks = [];
    const res = {
      headersSent: false,
      status: 200,
      writeHead(code, headers) {
        this.status = code;
        this.headers = headers;
        this.headersSent = true;
      },
      setHeader(name, value) {
        (this.headers || (this.headers = {}))[name] = value;
      },
      write(chunk) {
        chunks.push(Buffer.from(chunk));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        resolve({ status: this.status, headers: this.headers || {}, body: Buffer.concat(chunks).toString('utf8') });
      },
      on: () => {},
      once: () => {},
    };
    Promise.resolve()
      .then(() => route.handler(req, res))
      .catch(reject);
  });
}

const checks = [];
const expect = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(pass ? `  ✅ ${name}${detail ? ` · ${detail}` : ''}` : `  ❌ ${name}${detail ? ` · ${detail}` : ''}`);
};

const state = JSON.parse((await call('GET', '/api/weread/state')).body);
expect('state returns configured flag', typeof state.configured === 'boolean', JSON.stringify(state));

if (live) {
  const shelf = JSON.parse((await call('GET', '/api/weread/shelf')).body);
  expect('shelf returns books', Array.isArray(shelf.books) && shelf.books.length > 0, `books ${shelf.books?.length}`);

  const stats = JSON.parse((await call('GET', '/api/weread/stats?mode=annually')).body);
  expect('stats normalizes seconds', typeof stats.totalSeconds === 'number' && stats.totalSeconds > 0, `total ${stats.totalSeconds}s · buckets ${stats.buckets?.length}`);

  const started = Date.now();
  const calendar = JSON.parse((await call('GET', '/api/weread/calendar?weeks=8')).body);
  const days = Object.keys(calendar.days || {});
  expect('calendar returns daily buckets', days.length > 0, `${days.length} days · ${Date.now() - started}ms`);
  expect('calendar spans monday..today', Boolean(calendar.start) && Boolean(calendar.end), `${calendar.start} → ${calendar.end}`);
  const cached = JSON.parse((await call('GET', '/api/weread/calendar?weeks=8')).body);
  expect('calendar is cached on the second call', JSON.stringify(Object.keys(cached.days).sort()) === JSON.stringify(days.sort()), `max ${cached.max}`);

  const found = JSON.parse((await call('GET', `/api/weread/search?q=${encodeURIComponent('置身事内')}`)).body);
  const hits = found.results || [];
  expect('search returns store books', hits.length > 0, `${hits.length} hits`);
  expect('search hit carries a reader link', Boolean(hits[0] && (hits[0].readerLink || hits[0].deepLink)), (hits[0]?.readerLink || '').slice(0, 46));
  const blank = JSON.parse((await call('GET', '/api/weread/search?q=')).body);
  expect('blank search returns an empty list', Array.isArray(blank.results) && blank.results.length === 0, JSON.stringify(blank).slice(0, 60));

  // Whole-book archive: write into a throwaway vault, then put the user's settings back.
  const original = JSON.parse((await call('GET', '/api/weread/settings')).body).settings;
  const scratch = await mkdtemp(join(tmpdir(), 'weread-archive-'));
  try {
    await call('POST', '/api/weread/settings', { vaultPath: scratch, folder: '\u4e66\u5c7f\u6d4b\u8bd5' });
    const pick = (shelf.books || []).find((book) => (book.noteCount || 0) + (book.thoughtCount || 0) > 0);
    if (pick) {
      const first = JSON.parse((await call('POST', '/api/weread/archive', { bookId: pick.bookId, title: pick.title, author: pick.author })).body);
      expect('archive writes a note', Boolean(first.ok) && first.added > 0, `added ${first.added} \u2192 ${first.file}`);
      const written = await readFile(join(scratch, '\u4e66\u5c7f\u6d4b\u8bd5', first.file.split('/').pop()), 'utf8');
      expect('archive lands under the \u6574\u672c\u5f52\u6863 heading', written.includes('## \u6574\u672c\u5f52\u6863') && written.includes('---'), `${written.length} chars`);
      const again = JSON.parse((await call('POST', '/api/weread/archive', { bookId: pick.bookId })).body);
      expect('archive is idempotent', Boolean(again.unchanged), again.message || '');
      const moc = await readFile(join(scratch, '\u4e66\u5c7f\u6d4b\u8bd5', '\u4e66\u5c7f\u4e66\u5355.md'), 'utf8');
      expect('archive updates the MOC', moc.includes(`[[${pick.title}]]`), '\u4e66\u5c7f\u4e66\u5355.md');
    } else {
      expect('archive needs a book with notes', false, 'no book with notes on the shelf');
    }
  } finally {
    await call('POST', '/api/weread/settings', { vaultPath: original.vaultPath, folder: original.folder });
    await rm(scratch, { recursive: true, force: true });
  }
}

const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ ${failed.length} check(s) failed`);
  process.exitCode = 1;
} else {
  console.log('\n✅ host route contract ok');
}