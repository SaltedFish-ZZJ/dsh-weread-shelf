// Host-side end-to-end check: mounts the plugin against a stub Cordis context and drives the
// real HTTP handler, so route wiring and JSON shapes are exercised without the DSH shell.
//   node tests/host.mjs            → JSON contract only, offline
//   node tests/host.mjs --live     → also hits the WeRead gateway (needs a stored API key;
//                                    set WEREAD_CREDENTIALS or DSH_HOME if it is not in ~/.dsh)
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';

import { apply } from '../index.js';
import { readWeReadKey } from './credentials.mjs';

const live = process.argv.includes('--live');

let key = '';
if (live) {
  key = await readWeReadKey();
  if (!key) {
    console.error('no api key found for --live (set WEREAD_CREDENTIALS or DSH_HOME)');
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

// Only https WeRead links are opened, in a Chrome app window. Dry-run keeps the test from
// launching a real window.
process.env.DSH_WEREAD_OPEN_DRY = '1';
const readerLink = JSON.parse((await call('POST', '/api/weread/open', { url: 'https://weread.qq.com/web/reader/abc' })).body);
expect('open accepts a reader link', readerLink.ok === true && readerLink.mode === 'dry-run', JSON.stringify(readerLink));
const appLink = await call('POST', '/api/weread/open', { url: 'weread://bestbookmark?bookId=CB_x&chapterUid=12&rangeStart=30&rangeEnd=58' });
expect('open rejects app deep links', appLink.status === 400, `${appLink.status} ${appLink.body.slice(0, 60)}`);
const foreign = await call('POST', '/api/weread/open', { url: 'https://evil.example.com/x' });
expect('open rejects foreign hosts', foreign.status === 400, `${foreign.status} ${foreign.body.slice(0, 60)}`);
delete process.env.DSH_WEREAD_OPEN_DRY;

if (live) {
  const shelf = JSON.parse((await call('GET', '/api/weread/shelf')).body);
  expect('shelf returns books', Array.isArray(shelf.books) && shelf.books.length > 0, `books ${shelf.books?.length}`);

  const cos = (shelf.books || []).find((book) => {
    try {
      return /\.myqcloud\.com$/.test(new URL(book.cover).hostname);
    } catch {
      return false;
    }
  });
  if (cos) {
    const image = await call('GET', `/api/weread/cover?u=${encodeURIComponent(cos.cover)}`);
    const type = String(image.headers['content-type'] || image.headers['Content-Type'] || '');
    expect('cover proxy serves tencent cos covers', image.status === 200 && type.startsWith('image/'), `${type} · ${cos.title}`);
  }

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

if (live) {
  // Ask-Isle can also speak to any OpenAI-compatible endpoint; prove it against a local fake
  // stream so the wire format (payload + SSE chunks) is covered without spending tokens.
  let received = null;
  const server = createServer((req, res) => {
    if (String(req.url ?? '').endsWith('/models')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    let payload = '';
    req.on('data', (chunk) => {
      payload += chunk;
    });
    req.on('end', () => {
      received = JSON.parse(payload || '{}');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('data: {"choices":[{"delta":{"content":"第一段"}}]}\n\n');
      res.write('data: {"choices":[{"delta":{"content":"，第二段"}}]}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  const originalAi = JSON.parse((await call('GET', '/api/weread/ai')).body);
  try {
    await call('POST', '/api/weread/ai-key', { key: 'local-test-key', baseUrl: base });
    await call('POST', '/api/weread/ai', { mode: 'custom', baseUrl: base, model: 'test-model' });
    const state = JSON.parse((await call('GET', '/api/weread/ai')).body);
    expect('ai route reports the custom endpoint', state.mode === 'custom' && Boolean(state.baseUrl), state.baseUrl);

    const firstBook = JSON.parse((await call('GET', '/api/weread/shelf')).body).books?.[0];
    const asked = await call('POST', '/api/weread/ask', { question: '你好', mode: 'book', bookId: firstBook?.bookId });
    expect('ask streams from a custom endpoint', asked.body.includes('第一段') && asked.body.includes('第二段'), asked.body.trim().slice(0, 80));
    expect('custom endpoint receives an openai payload', Boolean(received) && received.model === 'test-model' && Array.isArray(received.messages), received?.model || 'no payload');
    expect('custom endpoint gets the reading-partner prompt', Boolean(received?.messages?.[0]?.content?.startsWith('你是「书屿」')), 'system first');
  } finally {
    await call('POST', '/api/weread/ai', { mode: originalAi.mode || 'dsh', baseUrl: originalAi.baseUrl || '', model: originalAi.model || '' });
    server.close();
  }
}

const failed = checks.filter((item) => !item.pass);
if (failed.length) {
  console.error(`\n❌ ${failed.length} check(s) failed`);
  process.exitCode = 1;
} else {
  console.log('\n✅ host route contract ok');
}