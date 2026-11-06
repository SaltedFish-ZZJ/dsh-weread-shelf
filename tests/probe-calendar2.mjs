import { readFile } from 'node:fs/promises';
import { createWeread } from '../weread.js';
import { buildCalendar } from '../index.js';
function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  const hit = lines.findIndex((l) => l.trim() === `${id}:`);
  const indent = lines[hit].match(/^\s*/)[0].length;
  for (let i = hit + 1; i < lines.length; i += 1) {
    const l = lines[i]; if (!l.trim()) continue;
    if (l.match(/^\s*/)[0].length <= indent) break;
    const m = l.match(/^\s*key:\s*(\S.*)$/); if (m) return m[1].trim().replace(/^["\']|["\']$/g, '');
  }
  throw new Error('no key');
}
const key = pickKey(await readFile('D:\\DSH-Home\\.credentials.yaml', 'utf8'), 'weread/api-key');
const weread = createWeread({ getKey: () => key });
const t0 = Date.now();
const r = await buildCalendar(weread, 53);
console.log('ms', Date.now() - t0, 'fetched', r.fetched, 'days', Object.keys(r.days).length, 'max', r.max, 'start', r.start, 'end', r.end);
const e = Object.entries(r.days).sort(([a],[b]) => a < b ? -1 : 1);
console.log('nonzero days', e.filter(([,v]) => v > 0).length);
console.log(JSON.stringify(e.filter(([,v]) => v > 0).slice(0,10)));
console.log('last', JSON.stringify(e.slice(-5)));
