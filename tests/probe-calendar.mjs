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
const result = await buildCalendar(weread, 4);
console.log('elapsed ms', Date.now() - t0);
console.log('weeks', result.weeks, 'start', result.start, 'end', result.end, 'max', result.max, 'fetched', result.fetched);
const entries = Object.entries(result.days).sort(([a], [b]) => (a < b ? -1 : 1));
console.log('days', entries.length);
console.log(JSON.stringify(entries.slice(-16)));
