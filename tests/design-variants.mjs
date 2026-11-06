// 用真实书架数据 + 真实封面生成 3 个设计方向的可视化对比页
// 运行：node tests/design-variants.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'design');

const GATEWAY = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.5';
const CRED = 'D:\\DSH-Home\\.credentials.yaml';

function pickKey(text, wanted) {
  const lines = text.split(/\r?\n/);
  let inBlock = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (inBlock >= 0 && indent <= inBlock && trimmed.includes(':')) { inBlock = -1; continue; }
    const keyMatch = trimmed.match(/^(['"]?)([^'":]+)\1:\s*(.*)$/);
    if (keyMatch && keyMatch[2].trim() === wanted) inBlock = indent;
    if (inBlock >= 0) {
      const valueMatch = trimmed.match(/^(key|value):\s*(.*)$/);
      if (valueMatch) {
        const raw = valueMatch[2].trim().replace(/^['"]|['"]$/g, '');
        if (!raw) return null;
        const token = raw.split(/\s+/).pop();
        return token && token.length > 10 ? token : null;
      }
    }
  }
  const flat = text.match(new RegExp(`${wanted}:\\s*(\\S+)`));
  return flat ? flat[1] : null;
}

async function gateway(key, apiName, params = {}) {
  const response = await fetch(GATEWAY, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_name: apiName, skill_version: SKILL_VERSION, ...params }),
  });
  if (!response.ok) throw new Error(`${apiName} HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errcode) throw new Error(`${apiName} errcode ${payload.errcode}: ${payload.errmsg || ''}`);
  return payload;
}

async function coverData(coverUrl) {
  try {
    const response = await fetch(coverUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', referer: 'https://weread.qq.com/' },
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 400 * 1024) return null;
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch { return null; }
}

const key = pickKey(await readFile(CRED, 'utf8'), 'weread/api-key');
if (!key) throw new Error('找不到 weread/api-key');

const shelf = await gateway(key, '/shelf/sync');
const books = (shelf.books || []);
const picked = [];
for (const book of books) {
  if (picked.length >= 9) break;
  if (!book.cover) continue;
  let percent = 0;
  try {
    const progress = await gateway(key, '/book/getprogress', { bookId: book.bookId });
    percent = Math.round(Number(progress.book?.progress) || 0);
  } catch { /* ignore */ }
  picked.push({
    title: book.title,
    author: book.author,
    category: book.category || '',
    finished: book.finishReading === 1 || percent >= 100,
    percent,
    cover: await coverData(book.cover),
  });
}
console.log(`books ${books.length}, picked ${picked.length}, with cover ${picked.filter((b) => b.cover).length}`);

const reading = picked.filter((b) => b.percent > 0 && b.percent < 100).length;
const done = picked.filter((b) => b.finished).length;

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function coverImg(book) {
  if (!book.cover) return `<div class="frame"><div class="ph">${esc(book.title.slice(0, 6))}</div></div>`;
  return `<div class="frame"><img class="cover" src="${book.cover}" alt=""></div>`;
}

// ── A · 纸本 · 书店 ─────────────────────────────────────────
function variantPaper() {
  const cards = picked.map((book) => `
    <article class="card">
      <div class="mount">${coverImg(book)}</div>
      <h3 class="t">${esc(book.title)}</h3>
      <p class="a">${esc(book.author)}</p>
      <div class="bar"><i style="width:${book.percent}%"></i></div>
      <p class="m">${book.finished ? '已读完' : book.percent ? `${book.percent}%` : '未开始'}</p>
    </article>`).join('');

  return `<!doctype html><html lang="zh"><meta charset="utf-8"><style>
  :root{--paper:#F5F0E5;--ink:#221F1B;--rule:#D9D0BD;--red:#8B3A2E;--mute:#7A7266}
  *{box-sizing:border-box;margin:0}
  body{background:var(--paper);color:var(--ink);font:15px/1.6 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;
       padding:34px 40px 56px;-webkit-font-smoothing:antialiased}
  .serif{font-family:Georgia,"Songti SC",SimSun,serif}
  header{display:flex;align-items:flex-end;gap:18px;padding-bottom:16px;border-bottom:2px solid var(--ink)}
  h1{font:600 30px/1 "Songti SC",SimSun,serif;letter-spacing:.12em}
  .sub{font-size:12px;letter-spacing:.22em;color:var(--mute);text-transform:uppercase;padding-bottom:4px}
  nav{margin-left:auto;display:flex;gap:22px;font-size:13px}
  nav a{color:var(--mute);text-decoration:none;padding-bottom:6px}
  nav a.on{color:var(--ink);border-bottom:2px solid var(--red)}
  .strip{display:flex;align-items:center;gap:26px;padding:20px 0 26px;font-size:13px}
  .strip b{font:600 26px/1 Georgia,serif;letter-spacing:.02em}
  .strip span{color:var(--mute)}
  .strip .sep{width:1px;height:26px;background:var(--rule)}
  .strip .grow{flex:1}
  .search{border:1px solid var(--rule);background:transparent;padding:7px 12px;font:13px inherit;color:var(--ink);width:190px}
  .chips{display:flex;gap:20px;font-size:13px;margin-bottom:26px;border-bottom:1px solid var(--rule);padding-bottom:0}
  .chips a{color:var(--mute);text-decoration:none;padding:0 0 10px}
  .chips a.on{color:var(--red);border-bottom:1px solid var(--red)}
  .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:34px 26px}
  .mount{padding:7px;background:#FFFDF7;border:1px solid var(--rule);box-shadow:0 1px 0 rgba(0,0,0,.04)}
  .frame{position:relative;aspect-ratio:3/4;overflow:hidden;background:#E7DECD}
  .cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .ph{position:absolute;inset:0;background:#E7DECD;color:#9A8F7C;font:12px/1.5 "Songti SC",serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px}
  .t{font:600 15px/1.45 "Songti SC",SimSun,serif;margin-top:12px;min-height:2.9em}
  .a{font-size:12px;color:var(--mute);margin-top:3px}
  .bar{height:2px;background:var(--rule);margin-top:10px}
  .bar i{display:block;height:2px;background:var(--red)}
  .m{font-size:11px;color:var(--mute);margin-top:6px;letter-spacing:.08em}
  </style>
  <header><h1>书屿</h1><div class="sub">微信读书 · 我读过的地方</div>
    <nav><a class="on" href="#">书架</a><a href="#">笔记</a><a href="#">统计</a><a href="#">问屿</a></nav></header>
  <div class="strip">
    <div><b>${picked.length}</b> <span>本</span></div><i class="sep"></i>
    <div><b>${reading}</b> <span>在读</span></div><i class="sep"></i>
    <div><b>${done}</b> <span>读完</span></div>
    <div class="grow"></div>
    <input class="search" placeholder="搜书架"> </div>
  <div class="chips"><a class="on" href="#">全部 ${picked.length}</a><a href="#">在读 ${reading}</a><a href="#">搁置</a><a href="#">读完 ${done}</a></div>
  <div class="grid">${cards}</div>
  </html>`;
}

// ── B · 夜读 · 书房 ──────────────────────────────────────────
function variantNight() {
  const cards = picked.map((book) => `
    <article class="card">
      <div class="shade">${coverImg(book)}</div>
      <div class="meta">
        <h3>${esc(book.title)}</h3>
        <p>${esc(book.author)}</p>
        <div class="bar"><i style="width:${book.percent}%"></i></div>
        <em>${book.finished ? '读完' : book.percent ? book.percent + '%' : '未读'}</em>
      </div>
    </article>`).join('');

  return `<!doctype html><html lang="zh"><meta charset="utf-8"><style>
  :root{--bg:#0E1116;--bg2:#151A22;--text:#E9E5DA;--mute:#828B99;--gold:#C8A45C;--line:rgba(233,229,218,.10)}
  *{box-sizing:border-box;margin:0}
  body{background:radial-gradient(120% 80% at 50% -10%,#1B2230 0%,var(--bg) 55%) fixed,var(--bg);
       color:var(--text);font:14px/1.6 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;
       padding:38px 44px 60px;min-height:100vh;-webkit-font-smoothing:antialiased}
  header{display:flex;align-items:center;gap:16px;margin-bottom:34px}
  h1{font:400 26px/1 Georgia,"Songti SC",serif;letter-spacing:.3em;color:#F3EEE2}
  .dot{width:5px;height:5px;border-radius:50%;background:var(--gold);box-shadow:0 0 12px var(--gold)}
  nav{margin-left:auto;display:flex;gap:26px;font-size:13px;letter-spacing:.08em}
  nav a{color:var(--mute);text-decoration:none;position:relative;padding-bottom:5px}
  nav a.on{color:var(--text)}
  nav a.on:after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--gold)}
  .row{display:flex;align-items:baseline;gap:12px;margin-bottom:30px}
  .big{font:300 44px/1 Georgia,serif;color:#F3EEE2;letter-spacing:-.02em}
  .cap{font-size:12px;color:var(--mute);letter-spacing:.16em;text-transform:uppercase}
  .split{width:1px;height:30px;background:var(--line);margin:0 14px}
  .chips{margin-left:auto;display:flex;gap:8px}
  .chips a{font-size:12.5px;color:var(--mute);text-decoration:none;padding:5px 13px;border:1px solid var(--line);border-radius:999px}
  .chips a.on{color:#131313;background:var(--gold);border-color:var(--gold);font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:30px 24px}
  .card{cursor:pointer}
  .shade{position:relative;border-radius:3px;overflow:hidden;box-shadow:0 10px 26px -8px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.045)}
  .frame{position:relative;aspect-ratio:3/4;overflow:hidden;background:#1D232C}
  .cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .ph{position:absolute;inset:0;background:#1D232C;color:#5B6472;display:flex;align-items:center;justify-content:center;font-size:12px;padding:12px;text-align:center}
  .meta{padding-top:11px}
  .meta h3{font:400 14px/1.45 "Songti SC",SimSun,serif;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta p{font-size:11.5px;color:var(--mute);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar{height:1px;background:var(--line);margin-top:9px}
  .bar i{display:block;height:1px;background:var(--gold);box-shadow:0 0 8px rgba(200,164,92,.7)}
  .meta em{font-style:normal;font-size:10.5px;color:var(--mute);letter-spacing:.1em;display:block;margin-top:5px}
  </style>
  <header><span class="dot"></span><h1>书屿</h1>
    <nav><a class="on" href="#">书架</a><a href="#">笔记</a><a href="#">统计</a><a href="#">问屿</a></nav></header>
  <div class="row">
    <div><div class="big">${picked.length}</div><div class="cap">在架</div></div><i class="split"></i>
    <div><div class="big">${reading}</div><div class="cap">在读</div></div><i class="split"></i>
    <div><div class="big">${done}</div><div class="cap">读完</div></div>
    <div class="chips"><a class="on" href="#">全部</a><a href="#">在读</a><a href="#">搁置</a><a href="#">读完</a></div>
  </div>
  <div class="grid">${cards}</div>
  </html>`;
}

// ── C · 编辑室 · 书目 ────────────────────────────────────────
function variantEditorial() {
  const rows = picked.map((book, index) => `
    <div class="row">
      <div class="idx">${String(index + 1).padStart(2, '0')}</div>
      <div class="thumb">${coverImg(book)}</div>
      <div class="body">
        <h3>${esc(book.title)}</h3>
        <p class="by">${esc(book.author)}${book.category ? ' · ' + esc(book.category) : ''}</p>
      </div>
      <div class="prog"><span>${book.finished ? '读毕' : book.percent ? book.percent + '%' : '—'}</span>
        <div class="line"><i style="width:${book.percent}%"></i></div></div>
    </div>`).join('');

  return `<!doctype html><html lang="zh"><meta charset="utf-8"><style>
  :root{--bg:#FCFBF9;--ink:#141414;--mute:#8C8880;--hair:#E6E2DA;--accent:#1F3FD1}
  *{box-sizing:border-box;margin:0}
  body{background:var(--bg);color:var(--ink);padding:44px 48px 64px;
       font:14px/1.6 "Segoe UI","Microsoft YaHei",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .masthead{border-top:3px solid var(--ink);padding-top:18px;display:flex;align-items:flex-start;gap:20px}
  h1{font:400 52px/.9 Georgia,"Songti SC",serif;letter-spacing:-.02em}
  .kicker{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mute);margin-top:6px}
  .standfirst{margin-left:auto;max-width:300px;font:400 13px/1.7 Georgia,"Songti SC",serif;color:#4A463F;text-align:right}
  .facts{display:flex;gap:40px;padding:22px 0;border-bottom:1px solid var(--hair);font-size:12px;letter-spacing:.06em}
  .facts div span{display:block;color:var(--mute);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:5px}
  .facts b{font:400 22px/1 Georgia,serif}
  nav{display:flex;gap:26px;margin:0 0 0 auto;align-self:center;font-size:12.5px;letter-spacing:.1em}
  nav a{color:var(--mute);text-decoration:none}
  nav a.on{color:var(--ink);border-bottom:1.5px solid var(--accent)}
  .list{margin-top:8px}
  .row{display:grid;grid-template-columns:40px 72px 1fr 132px;align-items:center;gap:20px;
       padding:16px 0;border-bottom:1px solid var(--hair)}
  .idx{font:400 12px/1 Georgia,serif;color:var(--mute)}
  .frame{position:relative;aspect-ratio:3/4;overflow:hidden;background:#EDEAE3}
  .cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .ph{position:absolute;inset:0;background:#EDEAE3;color:#B0AAA0;font-size:10px;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px}
  h3{font:400 17px/1.4 "Songti SC",SimSun,serif}
  .by{font-size:12px;color:var(--mute);margin-top:1px}
  .prog span{font:400 12px/1 Georgia,serif;color:#4A463F;display:block;text-align:right;margin-bottom:6px}
  .line{height:2px;background:#EEEBE4}
  .line i{display:block;height:2px;background:var(--accent)}
  </style>
  <div class="masthead">
    <div><h1>书屿</h1><div class="kicker">A reading index · 微信读书</div></div>
    <div class="standfirst">在读 ${reading} 本，读完 ${done} 本。所有划线、想法与问答，都留在你自己那里。</div>
  </div>
  <div class="facts">
    <div><span>在架</span><b>${picked.length}</b></div>
    <div><span>在读</span><b>${reading}</b></div>
    <div><span>读完</span><b>${done}</b></div>
    <nav><a class="on" href="#">书架</a><a href="#">笔记</a><a href="#">统计</a><a href="#">问屿</a></nav>
  </div>
  <div class="list">${rows}</div>
  </html>`;
}

await mkdir(outDir, { recursive: true });
const files = [
  ['shelf-A-paper.html', variantPaper()],
  ['shelf-B-night.html', variantNight()],
  ['shelf-C-editorial.html', variantEditorial()],
];
for (const [name, html] of files) {
  await writeFile(join(outDir, name), html, 'utf8');
  console.log('wrote', name, (html.length / 1024).toFixed(0) + 'KB');
}