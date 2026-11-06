import { readFile } from 'node:fs/promises';
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
const key = pickKey(await readFile('D:\\DSH-Home\\.credentials.yaml','utf8'), 'weread/api-key');
const call = async (extra) => {
  const r = await fetch('https://i.weread.qq.com/api/agent/gateway', { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${key}`}, body: JSON.stringify({ api_name:'/readdata/detail', skill_version:'1.0.5', ...extra }) });
  return r.json();
};
for (const bt of [1780502400, 1774972800]) {
  const d = await call({ mode:'weekly', baseTime: bt });
  const rt = d.readTimes || {};
  console.log('baseTime', bt, new Date(bt*1000).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}), '→ total', d.totalReadTime, 'keys', Object.keys(rt).map(k=>new Date(Number(k)*1000).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).slice(0,10)), 'vals', Object.values(rt).map(v=>Math.round(v/60)+'m'));
}
const dm = await call({ mode:'monthly', baseTime: 1780502400 });
console.log('monthly base 2026-06 → total', dm.totalReadTime, 'days', Object.keys(dm.readTimes||{}).length);
