// Print folders (archive) and audiobooks (albums) from the real shelf.
import { readFile } from 'node:fs/promises';
import https from 'node:https';

const text = await readFile('D:\\DSH-Home\\.credentials.yaml', 'utf8');
function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(`${id}:`)) continue;
    for (let j = i; j < Math.min(i + 12, lines.length); j += 1) {
      const m = /^\s*key:\s*(.+)$/.exec(lines[j]);
      if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return '';
}

const key = pickKey(text, 'weread/api-key');
if (!key) throw new Error('no key');

function call(api, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ api_name: api, skill_version: '1.0.5', ...params });
    const req = https.request(
      {
        host: 'i.weread.qq.com',
        path: '/api/agent/gateway',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          authorization: `Bearer ${key}`,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`bad json ${res.statusCode}: ${raw.slice(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('timeout')));
    req.end(body);
  });
}

const shelf = await call('/shelf/sync');
const books = Array.isArray(shelf.books) ? shelf.books : [];
const albums = Array.isArray(shelf.albums) ? shelf.albums : [];
const archive = Array.isArray(shelf.archive) ? shelf.archive : [];

console.log('books', books.length, 'albums', albums.length, 'folders', archive.length, 'mp', Boolean(shelf.mp));

const nameOf = new Map(books.map((b) => [String(b.bookId), b.title]));
for (const group of archive) {
  const ids = Array.isArray(group.bookIds) ? group.bookIds.map(String) : [];
  console.log(`\n文件夹「${group.name}」 ${ids.length} 本`);
  for (const id of ids.slice(0, 6)) console.log('  -', nameOf.get(id) ?? id);
  if (ids.length > 6) console.log('  …');
}

console.log('\n有声书:');
for (const entry of albums.slice(0, 12)) {
  const info = entry.albumInfo ?? {};
  console.log(`  - ${info.name} · ${info.authorName} · ${info.trackCount} 集 · 结束=${info.finish}`);
}