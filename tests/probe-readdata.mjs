// Dump the raw /readdata/detail payload so we can fix the chart labels.
// The API key is read from the credential store and never printed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const STORE = 'D:\\DSH-Home\\.credentials.yaml';
const GATEWAY = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.5';

function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  const hit = lines.findIndex((line) => line.trim() === `${id}:`);
  if (hit < 0) throw new Error(`no record ${id}`);
  const indent = lines[hit].match(/^\s*/)[0].length;
  for (let i = hit + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const own = line.match(/^\s*/)[0].length;
    if (own <= indent) break;
    const m = line.match(/^\s*key:\s*(\S.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error(`no key field under ${id}`);
}

const key = pickKey(await readFile(STORE, 'utf8'), 'weread/api-key');

async function call(apiName, extra = {}) {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ api_name: apiName, skill_version: SKILL_VERSION, ...extra }),
  });
  if (!res.ok) throw new Error(`${apiName} http ${res.status}`);
  return res.json();
}

const out = {};
for (const mode of ['weekly', 'monthly', 'annually', 'overall']) {
  out[mode] = await call('/readdata/detail', { mode });
}

const dir = 'D:\\deepseek_work\\research\\_tmp';
await mkdir(dir, { recursive: true });
await writeFile(`${dir}\\readdata-raw.json`, JSON.stringify(out, null, 2), 'utf8');

for (const mode of Object.keys(out)) {
  const d = out[mode];
  const rt = d.readTimes || {};
  const daily = d.dailyReadTimes || {};
  console.log(
    mode,
    '| total', d.totalReadTime,
    '| readTimes keys', JSON.stringify(Object.keys(rt).slice(0, 4)),
    'n=' + Object.keys(rt).length,
    '| first values', JSON.stringify(Object.values(rt).slice(0, 4)),
    '| daily keys', JSON.stringify(Object.keys(daily).slice(0, 2)),
    'n=' + Object.keys(daily).length,
  );
}