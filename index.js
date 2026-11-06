/**
 * Host half of the WeRead cyber-bookshelf plugin.
 *
 * Responsibilities:
 *  - own the WeRead API key (stored through the credentials service, never in config files)
 *  - expose a small same-origin JSON API the Client half fetches: /api/weread/*
 *  - register read-only Agent tools so the model can answer reading questions
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const CHROME_CANDIDATES = [
  join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe'),
];

/**
 * Open a WeRead link in a real browser window (app mode) so it is NOT framed.
 * Framing is what triggers WeRead's "no third-party plugin" block.
 */
async function openReader(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl ?? ''));
  } catch {
    return { error: { code: 'bad-url', message: '阅读链接无效' } };
  }
  if (!/(^|\.)weread\.qq\.com$/.test(url.hostname)) {
    return { error: { code: 'bad-url', message: '只允许打开微信读书域名' } };
  }
  const target = url.toString();
  const exe = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!exe) {
    try {
      spawn('cmd', ['/c', 'start', '', target], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
      return { ok: true, mode: 'default-browser' };
    } catch (error) {
      return { error: { code: 'open-failed', message: error.message } };
    }
  }
  try {
    spawn(exe, [`--app=${target}`, '--new-window'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    return { ok: true, mode: 'app-window' };
  } catch (error) {
    return { error: { code: 'open-failed', message: error.message } };
  }
}

import { createWeread, WereadError } from './weread.js';

const KEY_ID = 'weread/api-key';
const AI_KEY_ID = 'weread/ai-key';
const PREFIX = '/api/weread';

/** Where reading notes land inside the user's Obsidian vault. */
const VAULT_DEFAULTS = {
  vaultPath: join(homedir(), 'Obsidian'),
  folder: 'personal/书屿',
  autoSplit: true,
  aiMode: 'dsh',
  aiBaseUrl: '',
  aiModel: '',
};

/** User-tunable settings, persisted outside the package (the package dir can be read-only). */
let settings = { ...VAULT_DEFAULTS };
const SETTINGS_FILE = join(homedir(), '.dsh-weread-shelf', 'settings.json');

async function loadSettings() {
  try {
    const raw = JSON.parse(await readFile(SETTINGS_FILE, 'utf8'));
    settings = { ...VAULT_DEFAULTS, ...raw };
  } catch {
    settings = { ...VAULT_DEFAULTS };
  }
  return settings;
}

async function writeSettings(patch) {
  settings = { ...settings, ...patch };
  await mkdir(dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settings;
}

/**
 * Reading calendar: `/readdata/detail` only answers the current period, but a `baseTime`
 * pins it to an earlier week, so a year of daily buckets is 52 paged calls. Finished weeks
 * never change, so they are cached on disk; only the running week is re-fetched.
 */
const CALENDAR_FILE = join(homedir(), '.dsh-weread-shelf', 'calendar.json');
let calendar = null;

const dayKey = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const startOfWeek = (date) => {
  const start = new Date(date.getTime());
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

async function loadCalendar() {
  if (calendar) return calendar;
  try {
    const raw = JSON.parse(await readFile(CALENDAR_FILE, 'utf8'));
    calendar = raw && typeof raw.weeks === 'object' ? raw : { weeks: {} };
  } catch {
    calendar = { weeks: {} };
  }
  return calendar;
}

async function saveCalendar() {
  try {
    await mkdir(dirname(CALENDAR_FILE), { recursive: true });
    await writeFile(CALENDAR_FILE, `${JSON.stringify(calendar)}\n`, 'utf8');
  } catch {
    // A calendar that cannot be cached is still a calendar; keep serving from memory.
  }
}

async function buildCalendar(weread, weeks) {
  const store = await loadCalendar();
  const today = new Date();
  const currentWeek = startOfWeek(today);
  const targets = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(currentWeek.getTime());
    start.setDate(start.getDate() - index * 7);
    targets.push(start);
  }

  const pending = targets.filter((start, index) => index === targets.length - 1 || !store.weeks[dayKey(start)]);
  const queue = pending.slice();
  const worker = async () => {
    for (;;) {
      const start = queue.shift();
      if (!start) return;
      // Noon on the Thursday of that week: unambiguously inside it, in any timezone.
      const baseTime = Math.floor(start.getTime() / 1000) + 3 * 86400 + 43200;
      try {
        const data = await weread.call('/readdata/detail', { mode: 'weekly', baseTime });
        const bucket = {};
        for (const [stamp, seconds] of Object.entries(data?.readTimes ?? {})) {
          bucket[dayKey(new Date(Number(stamp) * 1000))] = Number(seconds) || 0;
        }
        store.weeks[dayKey(start)] = bucket;
      } catch {
        // One unreachable week must not blank the whole calendar.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, Math.max(1, queue.length)) }, worker));
  if (pending.length) void saveCalendar();

  const days = {};
  for (const start of targets) {
    const bucket = store.weeks[dayKey(start)] ?? {};
    Object.assign(days, bucket);
  }
  const values = Object.values(days);
  return {
    weeks,
    days,
    start: dayKey(targets[0]),
    end: dayKey(currentWeek.getTime() + 6 * 86400000 > today.getTime() ? today : currentWeek.getTime() + 6 * 86400000),
    max: values.length ? Math.max(...values, 1) : 1,
    fetched: pending.length,
  };
}

export const name = 'weread-shelf';
export const inject = ['webServer', 'credentials', 'tools'];
export { buildCalendar };

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function failure(error) {
  const code = error instanceof WereadError ? error.code : 'internal';
  const status = code === 'auth' || code === 'no-key' ? 401 : code === 'network' ? 502 : 500;
  return json({ error: { code, message: error?.message ?? String(error) } }, status);
}

function clamp(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function formatDate(ms) {
  const date = new Date(Number(ms) || 0);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

export function apply(ctx, config = {}) {
  void loadSettings();
  const weread = createWeread({
    getKey: async () => {
      const record = await ctx.credentials.readRecord(KEY_ID);
      return record && record.kind === 'api-key' ? (record.key ?? '') : '';
    },
  });

  const readBody = async (request) => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  };

  // ---------------------------------------------------------------- reading partner

  const shelfContext = async () => {
    const shelf = await weread.shelf();
    const notebooks = await weread.notebooks().catch(() => ({ books: [] }));
    const notes = new Map(notebooks.books.map((book) => [book.bookId, book]));
    const rows = shelf.books.map((book) => {
      const note = notes.get(book.bookId);
      const percent = Math.round(book.progress || 0);
      return `- ${book.title}／${book.author || '佚名'}｜${book.finished ? '已读完' : percent ? `进度 ${percent}%` : '未开始'}｜划线 ${note?.noteCount ?? 0} 条、想法 ${note?.reviewCount ?? 0} 条`;
    });
    return `书架共 ${shelf.total} 本：\n${rows.join('\n')}`;
  };

  const bookContext = async (bookId) => {
    const [info, progress, chapters, highlights, thoughts] = await Promise.all([
      weread.bookInfo(bookId).catch(() => null),
      weread.progress(bookId).catch(() => null),
      weread.chapters(bookId).catch(() => []),
      weread.highlights(bookId).catch(() => []),
      weread.thoughts(bookId).catch(() => []),
    ]);
    const lines = [];
    if (info) {
      lines.push(`《${info.title}》／${info.author || '佚名'}${info.category ? `｜${info.category}` : ''}`);
      if (info.intro) lines.push(`简介：${clamp(String(info.intro), 1200)}`);
      if (info.wordCount) lines.push(`字数：约 ${Math.round(Number(info.wordCount) / 1000)} 千字`);
    }
    lines.push(
      progress
        ? `阅读进度：${progress.percent}%${progress.chapterTitle ? `（停在「${progress.chapterTitle}」）` : ''}`
        : '阅读进度：未知',
    );
    if (chapters.length) {
      lines.push(`目录共 ${chapters.length} 章：${chapters.slice(0, 80).map((c) => c.title).join(' / ')}`);
    }
    if (highlights.length) {
      const chosen = highlights.slice(0, 60);
      lines.push(
        `\n我的划线和想法（共 ${highlights.length} 条，这里是最新的 ${chosen.length} 条）：\n${chosen
          .map((item, index) => {
            const where = item.chapter ? `（${item.chapter}）` : '';
            const when = item.at ? `［${formatDate(item.at)}］` : '';
            return `${index + 1}. ${when}${item.markText}${where}`;
          })
          .join('\n')}`,
      );
    }
    if (thoughts.length) {
      lines.push(
        `\n我自己写下的想法：\n${thoughts
          .slice(0, 30)
          .map((item, index) => `${index + 1}. ${item.content}${item.chapter ? `（${item.chapter}）` : ''}`)
          .join('\n')}`,
      );
    }
    return { text: lines.join('\n'), info, progress, chapters, highlights, thoughts };
  };

  const SYSTEM_COMMON = [
    '你是「书屿」里的读书伴侣，名字叫屿。你熟悉这位读者的微信读书书架、阅读进度、划线原文和他自己写下的想法。',
    '回答用简体中文，说话像一个读过这本书、也记得他读到哪儿的人：具体、简短、有温度，不用「首先/其次/综上所述」这类模板腔。',
    '能引用他的划线原文就直引（用「」括起来），并告诉他这条划线在书里的位置（章节名）。',
    '不要编造书里没有的内容；不确定时说明你不确定，或建议他回到相应章节去看。',
    '回答控制在 400 字以内，除非他明确要长文。',
  ].join('\n');

  const askSystem = async (mode, bookId) => {
    if (mode === 'book' && bookId) {
      const data = await bookContext(bookId);
      return `${SYSTEM_COMMON}\n\n他正在读这一本：\n\n${data.text}`;
    }
    return `${SYSTEM_COMMON}\n\n${await shelfContext()}\n\n他问的是整座书架的事：可以帮他找书、排优先级、串联不同书里的观点、推荐下一本。`;
  };

  const readAiKey = async () => {
    const record = await ctx.credentials.readRecord(AI_KEY_ID);
    return typeof record?.key === 'string' && record.key ? record.key : '';
  };

  /** Any OpenAI-compatible base URL resolves to its chat endpoint. */
  const chatEndpoint = (base) => {
    const trimmed = String(base || '').trim().replace(/\/+$/, '');
    return /\/chat\/completions$/.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
  };

  const streamAnswer = async (req, res, body) => {
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'empty', message: '先写点什么再问吧' } }));
      return;
    }

    const customBase = String(settings.aiBaseUrl ?? '').trim();
    const customModel = String(settings.aiModel ?? '').trim();
    const useCustom = settings.aiMode === 'custom';
    if (useCustom && (!customBase || !customModel)) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'no-ai-config', message: '先在设置里填好自定义接口的地址和模型名' } }));
      return;
    }
    const customKey = useCustom ? await readAiKey() : '';
    if (useCustom && !customKey) {
      res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'no-ai-key', message: '自定义接口还差一个 API Key' } }));
      return;
    }

    const llm = useCustom ? null : ctx.get('llm');
    const selection = useCustom ? null : ctx.get('agentDefaultModel')?.currentSelection?.();
    if (!useCustom && (!llm || !selection?.provider || !selection?.model)) {
      res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'no-model', message: '这个 DSH 里还没有可用的模型配置' } }));
      return;
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.flushHeaders?.();

    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const system = await askSystem(typeof body.mode === 'string' ? body.mode : 'global', body.bookId);
      const history = Array.isArray(body.history)
        ? body.history
            .filter((turn) => turn && typeof turn.content === 'string' && turn.content.trim())
            .slice(-8)
            .map((turn) => ({
              role: turn.role === 'assistant' ? 'assistant' : 'user',
              content: [{ type: 'text', text: clamp(String(turn.content), 4000) }],
            }))
        : [];
      const messages = [...history, { role: 'user', content: [{ type: 'text', text: question }] }];

      if (useCustom) {
        await streamCustom({
          endpoint: chatEndpoint(customBase),
          key: customKey,
          model: customModel,
          system,
          messages: messages.map((message) => ({
            role: message.role,
            content: Array.isArray(message.content)
              ? message.content.map((part) => part.text ?? '').join('')
              : String(message.content ?? ''),
          })),
          signal: controller.signal,
          send,
        });
        if (!controller.signal.aborted) send({ done: true });
        return;
      }

      for await (const chunk of llm.stream({
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
        system,
        messages,
        maxTokens: 1200,
        signal: controller.signal,
      })) {
        if (chunk?.type === 'text-delta' && chunk.text) send({ text: chunk.text });
        else if (chunk?.type === 'finish') {
          const failure = chunk.reason?.failure;
          if (failure) send({ error: failure.message ?? String(failure.code ?? '生成失败') });
          send({ done: true });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) send({ error: error?.message ?? String(error) });
    } finally {
      if (!controller.signal.aborted) res.end();
    }
  };

  // ---------------------------------------------------------------- Obsidian outbox

  const vaultFile = (folder, title) => {
    const safe = String(title || '未命名')
      .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    return join(settings.vaultPath, folder, `${safe || '未命名'}.md`);
  };

  const saveToVault = async (body) => {
    const title = String(body.title || '').trim();
    const text = String(body.text || '').trim();
    if (!title || !text) return { error: { code: 'empty', message: '标题和内容都要有' } };

    const kind =
      body.kind === 'thought' || body.kind === 'note'
        ? '想法'
        : body.kind === 'insight'
          ? '问答'
          : '划线';
    const folder = settings.folder;
    const dir = join(settings.vaultPath, folder);
    const file = vaultFile(folder, title);
    await mkdir(dir, { recursive: true });

    const stampDate = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const day = `${stampDate.getFullYear()}-${pad(stampDate.getMonth() + 1)}-${pad(stampDate.getDate())}`;
    const time = `${pad(stampDate.getHours())}:${pad(stampDate.getMinutes())}`;
    const entry = `- ${time} ${kind}：${text}${body.where ? `（${body.where}）` : ''}`;

    let existing = '';
    try {
      existing = await readFile(file, 'utf8');
    } catch {
      existing = '';
    }

    if (!existing) {
      const header = [
        '---',
        `title: "${title.replace(/"/g, "'")}"`,
        `author: "${String(body.author || '').replace(/"/g, "'")}"`,
        'source: 微信读书',
        body.bookId ? `bookId: "${String(body.bookId)}"` : null,
        'tags: [书屿, 微信读书]',
        `created: ${day}`,
        '---',
        '',
        `# ${title}`,
        '',
        '## 划线',
        '',
        '## 想法',
        '',
        '## 问答',
        '',
        '## 索引',
        '',
        `- [[书屿书单]]`,
        '',
      ]
        .filter((line) => line !== null)
        .join('\n');
      existing = header;
    }

    const heading = `## ${kind}`;
    if (existing.includes(heading)) {
      existing = existing.replace(heading, `${heading}\n\n${entry}`);
    } else {
      existing = `${existing.replace(/\s*$/, '')}\n\n${heading}\n\n${entry}\n`;
    }
    await writeFile(file, existing, 'utf8');

    // Keep the MOC in sync so the note is never an orphan (vault AGENTS.md rule 4).
    const index = join(dir, '书屿书单.md');
    let moc = '';
    try {
      moc = await readFile(index, 'utf8');
    } catch {
      moc = ['---', 'title: "书屿书单"', 'tags: [书屿, MOC]', '---', '', '# 书屿书单', '', '微信读书里画过的线、写下的想法，读到这里继续。', ''].join('\n');
    }
    if (!moc.includes(`[[${title}]]`)) {
      const line = `- [[${title}]]${body.author ? ` — ${body.author}` : ''} · 见于 ${day}`;
      moc = moc.includes('\n# 书屿书单') ? `${moc.replace(/\s*$/, '')}\n${line}\n` : `${moc}\n${line}\n`;
    }
    await writeFile(index, `${moc.replace(/\s*$/, '')}\n`, 'utf8');

    return { ok: true, file: `personal/书屿/${file.split('\\').pop()}`, day };
  };

  const touchIndex = async (dir, title, author, day) => {
    const index = join(dir, '书屿书单.md');
    let moc = '';
    try {
      moc = await readFile(index, 'utf8');
    } catch {
      moc = ['---', 'title: "书屿书单"', 'tags: [书屿, MOC]', '---', '', '# 书屿书单', '', '微信读书里画过的线、写下的想法，读到这里继续。', ''].join('\n');
    }
    if (!moc.includes(`[[${title}]]`)) {
      const line = `- [[${title}]]${author ? ` — ${author}` : ''} · 见于 ${day}`;
      moc = moc.includes('\n# 书屿书单') ? `${moc.replace(/\s*$/, '')}\n${line}\n` : `${moc}\n${line}\n`;
    }
    await writeFile(index, `${moc.replace(/\s*$/, '')}\n`, 'utf8');
  };

  const noteHeader = (title, author, bookId, day) =>
    [
      '---',
      `title: "${title.replace(/"/g, "'")}"`,
      `author: "${String(author || '').replace(/"/g, "'")}"`,
      'source: 微信读书',
      bookId ? `bookId: "${String(bookId)}"` : null,
      'tags: [书屿, 微信读书]',
      `created: ${day}`,
      '---',
      '',
      `# ${title}`,
      '',
      '## 划线',
      '',
      '## 想法',
      '',
      '## 问答',
      '',
      '## 整本归档',
      '',
      '## 索引',
      '',
      '`- [[书屿书单]]`',
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');

  /** Archive a whole book's highlights + thoughts into one dated section (deduped). */
  const archiveToVault = async (body) => {
    const bookId = String(body.bookId || '').trim();
    if (!bookId) return { error: { code: 'empty', message: '缺少 bookId' } };

    const [info, chapters, highlights, thoughts] = await Promise.all([
      weread.bookInfo(bookId).catch(() => null),
      weread.chapters(bookId).catch(() => []),
      weread.highlights(bookId).catch(() => []),
      weread.thoughts(bookId).catch(() => []),
    ]);

    const title = String(body.title || info?.title || '').trim();
    const author = String(body.author || info?.author || '').trim();
    if (!title) return { error: { code: 'empty', message: '没有书名，无法归档' } };
    if (!highlights.length && !thoughts.length) {
      return { error: { code: 'empty', message: '这本书还没有划线和想法' } };
    }

    const folder = settings.folder;
    const dir = join(settings.vaultPath, folder);
    const file = vaultFile(folder, title);
    await mkdir(dir, { recursive: true });

    const stamp = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const day = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`;
    const shortAt = (ms) => {
      if (!ms) return '';
      const date = new Date(ms);
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };

    let existing = '';
    try {
      existing = await readFile(file, 'utf8');
    } catch {
      existing = '';
    }
    if (!existing) existing = noteHeader(title, author, bookId, day);

    const chapterOrder = new Map(chapters.map((chapter, index) => [chapter.title, index]));
    const groups = new Map();
    const push = (chapter, line) => {
      const key = chapter || '未分章节';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(line);
    };

    let added = 0;
    for (const item of highlights) {
      const text = String(item.markText || '').trim();
      if (!text || existing.includes(text)) continue;
      push(item.chapter, `- 划线${item.createdAt ? `（${shortAt(item.createdAt)}）` : ''}：${text}`);
      added += 1;
    }
    for (const item of thoughts) {
      const text = String(item.content || '').trim();
      if (!text || existing.includes(text)) continue;
      const picked = item.abstract ? `「${item.abstract}」 ` : '';
      push(item.chapter, `  - 想法${item.createdAt ? `（${shortAt(item.createdAt)}）` : ''}：${picked}${text}`);
      added += 1;
    }

    if (!added) {
      return { ok: true, unchanged: true, file: `${folder}/${file.split('\\').pop()}`, message: '这本书的划线和想法都已经归档过了' };
    }

    const ordered = [...groups.entries()].sort((a, b) => {
      const left = chapterOrder.has(a[0]) ? chapterOrder.get(a[0]) : 10_000;
      const right = chapterOrder.has(b[0]) ? chapterOrder.get(b[0]) : 10_000;
      return left - right;
    });

    const lines = [
      `### ${day} 归档（新增 ${added} 条）`,
      '',
      ...ordered.flatMap(([chapter, items]) => [`#### ${chapter}`, '', ...items, '']),
    ].join('\n');

    const heading = '## 整本归档';
    if (existing.includes(heading)) {
      existing = existing.replace(heading, `${heading}\n\n${lines}`);
    } else if (existing.includes('## 索引')) {
      existing = existing.replace('## 索引', `${heading}\n\n${lines}\n## 索引`);
    } else {
      existing = `${existing.replace(/\s*$/, '')}\n\n${heading}\n\n${lines}\n`;
    }
    await writeFile(file, existing, 'utf8');
    await touchIndex(dir, title, author, day);

    return { ok: true, file: `${folder}/${file.split('\\').pop()}`, day, added };
  };

  // ---------------------------------------------------------------- cover proxy

  const coverProxy = async (req, res, url) => {
    const target = url.searchParams.get('u') ?? '';
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('bad cover url');
      return;
    }
    const host = parsed.hostname;
    // WeRead serves covers from three places: cdn.weread.qq.com, res.weread.qq.com and
    // the Tencent COS bucket wfqqreader-1252317822.image.myqcloud.com (imported / uploaded covers).
    if (!/\.(qq\.com|qpic\.cn|weixin\.qq\.com|myqcloud\.com)$/.test(host)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('cover host not allowed');
      return;
    }
    try {
      const upstream = await fetch(parsed, {
        headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://weread.qq.com/' },
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) throw new Error(`cover ${upstream.status}`);
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(200, {
        'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'cache-control': 'public, max-age=86400',
        'content-length': buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(error?.message ?? error));
    }
  };

  /** Streams tokens from any OpenAI-compatible `/chat/completions` endpoint. */
  const streamCustom = async (opts) => {
    const { endpoint, key, model, system, messages, signal, send } = opts;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 1200,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      send({ error: `接口返回 ${response.status}${detail ? `：${clamp(detail, 280)}` : ''}` });
      return;
    }
    if (!response.body) {
      send({ error: '接口没有返回内容' });
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let stopped = false;
    while (!stopped) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let cut = buffer.indexOf('\n');
      while (cut >= 0) {
        const line = buffer.slice(0, cut).trim();
        buffer = buffer.slice(cut + 1);
        cut = buffer.indexOf('\n');
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') {
          stopped = true;
          break;
        }
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content;
        if (typeof delta === 'string' && delta) send({ text: delta });
        const upstreamError = parsed?.error?.message;
        if (upstreamError) {
          send({ error: String(upstreamError) });
          stopped = true;
          break;
        }
      }
    }
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  };

  const routes = {
    'GET state': async () => {
      const info = await ctx.credentials.describeRecord(KEY_ID);
      return json({ configured: Boolean(info?.configured) });
    },
    'GET settings': async () => json({ settings }),
    'GET ai': async () => {
      const record = await ctx.credentials.readRecord(AI_KEY_ID);
      return json({
        mode: settings.aiMode === 'custom' ? 'custom' : 'dsh',
        baseUrl: settings.aiBaseUrl ?? '',
        model: settings.aiModel ?? '',
        keyConfigured: Boolean(record?.key),
      });
    },
    'POST ai': async (request) => {
      const body = await readBody(request);
      const patch = {};
      if (body.mode === 'dsh' || body.mode === 'custom') patch.aiMode = body.mode;
      if (typeof body.baseUrl === 'string') patch.aiBaseUrl = body.baseUrl.trim();
      if (typeof body.model === 'string') patch.aiModel = body.model.trim();
      const next = await writeSettings(patch);
      return json({ ok: true, settings: next });
    },
    'POST ai-key': async (request) => {
      const body = await readBody(request);
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (key.length < 8) return json({ error: { code: 'format', message: '这个 Key 看起来太短了' } }, 400);
      await ctx.credentials.modifyRecord(AI_KEY_ID, async () => ({ kind: 'api-key', key }));
      const base = String(body.baseUrl ?? settings.aiBaseUrl ?? '').trim();
      if (!base) return json({ ok: true, verified: false });
      try {
        const response = await fetch(`${base.replace(/\/+$/, '')}/models`, {
          headers: { authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(8000),
        });
        return json({ ok: true, verified: response.ok, status: response.status });
      } catch (error) {
        return json({ ok: true, verified: false, note: String(error?.message ?? error) });
      }
    },
    'DELETE ai-key': async () => {
      await ctx.credentials.deleteRecord(AI_KEY_ID);
      return json({ ok: true });
    },
    'POST settings': async (request) => {
      const body = await readBody(request);
      const patch = {};
      if (typeof body.autoSplit === 'boolean') patch.autoSplit = body.autoSplit;
      if (typeof body.folder === 'string' && body.folder.trim()) patch.folder = body.folder.trim();
      if (typeof body.vaultPath === 'string' && body.vaultPath.trim()) patch.vaultPath = body.vaultPath.trim();
      if (body.aiMode === 'dsh' || body.aiMode === 'custom') patch.aiMode = body.aiMode;
      if (typeof body.aiBaseUrl === 'string') patch.aiBaseUrl = body.aiBaseUrl.trim();
      if (typeof body.aiModel === 'string') patch.aiModel = body.aiModel.trim();
      const next = await writeSettings(patch);
      return json({ ok: true, settings: next });
    },
    'POST key': async (request) => {
      const body = await readBody(request);
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!key) return json({ error: { code: 'empty', message: '请填写 API Key' } }, 400);
      if (!/^wrk-\S{8,}$/.test(key)) {
        return json({ error: { code: 'format', message: 'API Key 应以 wrk- 开头' } }, 400);
      }
      // Verify before persisting: an invalid key should not overwrite a working one.
      try {
        await createWeread({ getKey: async () => key }).shelf();
      } catch (error) {
        return json(
          { error: { code: error.code ?? 'invalid', message: error?.message ?? String(error) } },
          error.code === 'auth' ? 401 : 502,
        );
      }
      await ctx.credentials.modifyRecord(KEY_ID, async () => ({ kind: 'api-key', key }));
      weread.invalidate();
      return json({ configured: true });
    },
    'DELETE key': async () => {
      await ctx.credentials.deleteRecord(KEY_ID);
      weread.invalidate();
      return json({ configured: false });
    },
    'GET shelf': async () => {
      const [shelf, notebooks] = await Promise.all([weread.shelf(), weread.notebooks().catch(() => ({ books: [] }))]);
      const notes = new Map(notebooks.books.map((book) => [book.bookId, book]));
      const decorate = (book) => {
        const note = notes.get(book.bookId);
        return {
          ...book,
          noteCount: note ? note.noteCount : 0,
          thoughtCount: note ? note.reviewCount : 0,
          progress: note ? note.progress : 0,
          finished: book.finished || note?.finished === true,
        };
      };
      return json({
        books: shelf.books.map(decorate),
        albums: shelf.albums,
        hasArticles: shelf.hasArticles,
        archive: shelf.archive,
        total: shelf.total,
        fetchedAt: shelf.fetchedAt,
      });
    },
    'GET progress': async (request) => {
      const ids = (new URL(request.url).searchParams.get('ids') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 60);
      const results = {};
      const queue = [...ids];
      const worker = async () => {
        for (;;) {
          const id = queue.shift();
          if (!id) return;
          try {
            results[id] = await weread.progress(id);
          } catch {
            results[id] = null;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
      return json({ progress: results });
    },
    'GET book': async (request) => {
      const bookId = new URL(request.url).searchParams.get('id') ?? '';
      if (!bookId) return json({ error: { code: 'bad-request', message: '缺少 id' } }, 400);
      const [info, progress, chapters, highlights, thoughts] = await Promise.all([
        weread.bookInfo(bookId).catch(() => null),
        weread.progress(bookId).catch(() => null),
        weread.chapters(bookId).catch(() => []),
        weread.highlights(bookId).catch(() => []),
        weread.thoughts(bookId).catch(() => []),
      ]);
      return json({ info, progress, chapters, highlights, thoughts });
    },
    'GET notes': async () => {
      const notebooks = await weread.notebooks();
      return json(notebooks);
    },
    'GET stats': async (request) => {
      const mode = new URL(request.url).searchParams.get('mode') ?? 'annually';
      const allowed = new Set(['weekly', 'monthly', 'annually', 'overall']);
      const data = await weread.call('/readdata/detail', { mode: allowed.has(mode) ? mode : 'annually' });
      return json(shapeStats(data));
    },
    'GET calendar': async (request) => {
      const raw = Number(new URL(request.url).searchParams.get('weeks')) || 27;
      const weeks = Math.min(53, Math.max(4, Math.round(raw)));
      return json(await buildCalendar(weread, weeks));
    },
    'POST archive': async (request) => {
      const body = await readBody(request);
      const result = await archiveToVault(body);
      if (result.error) return json(result, 400);
      return json(result);
    },
    'GET search': async (request) => {
      const keyword = new URL(request.url).searchParams.get('q') ?? '';
      if (!keyword.trim()) return json({ results: [] });
      const results = await weread.search(keyword.trim(), 20);
      return json({ results });
    },
  };

  const handle = async (request) => {
    const url = new URL(request.url);
    const rest = url.pathname.slice(PREFIX.length).replace(/^\/+/, '');
    const key = `${request.method} ${rest}`;
    const route = routes[key];
    if (!route) return json({ error: { code: 'not-found', message: `没有这个接口：${key}` } }, 404);
    try {
      return await route(request);
    } catch (error) {
      return failure(error);
    }
  };

  // A `resource` route only answers GET/HEAD (anything else is answered 405 upstream), and
  // saving or clearing the key needs POST/DELETE. A handler route owns the whole exchange.
  const handleHttp = async (req, res) => {
    try {
      const method = String(req.method ?? 'GET').toUpperCase();
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
      const route = url.pathname.slice(PREFIX.length).replace(/^\/+/, '');

      if (route === 'cover') {
        await coverProxy(req, res, url);
        return;
      }

      let payload;
      if (method !== 'GET' && method !== 'HEAD') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        payload = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
      }

      if (route === 'ask' && method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(payload || '{}');
        } catch {
          body = {};
        }
        await streamAnswer(req, res, body);
        return;
      }

      if (route === 'open' && method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(payload || '{}');
        } catch {
          body = {};
        }
        const result = await openReader(body.url);
        const text = JSON.stringify(result.error ? { error: result.error } : result);
        res.writeHead(result.error ? 400 : 200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        });
        res.end(text);
        return;
      }

      if (
        (route === 'settings' && method === 'POST') ||
        ((route === 'ai' || route === 'ai-key') && (method === 'POST' || method === 'DELETE'))
      ) {
        let body = {};
        try {
          body = JSON.parse(payload || '{}');
        } catch {
          body = {};
        }
        const request = new Request(url, {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'POST' ? JSON.stringify(body) : undefined,
        });
        const response = await routes[`${method} ${route}`](request);
        const text = await response.text();
        res.writeHead(response.status, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        });
        res.end(text);
        return;
      }

      if (route === 'archive' && method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(payload || '{}');
        } catch {
          body = {};
        }
        const result = await archiveToVault(body);
        const text = JSON.stringify(result.error ? { error: result.error } : result);
        res.writeHead(result.error ? 400 : 200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        });
        res.end(text);
        return;
      }

      if (route === 'save' && method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(payload || '{}');
        } catch {
          body = {};
        }
        const result = await saveToVault(body);
        const text = JSON.stringify(result.error ? { error: result.error } : result);
        res.writeHead(result.error ? 400 : 200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        });
        res.end(text);
        return;
      }

      const request = new Request(url, {
        method,
        headers: { 'content-type': String(req.headers['content-type'] ?? 'application/json') },
        body: payload,
      });
      const response = await handle(request);
      const text = await response.text();
      res.writeHead(response.status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(text),
      });
      res.end(text);
    } catch (error) {
      const body = JSON.stringify({ error: { code: 'internal', message: error?.message ?? String(error) } });
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(body);
    }
  };

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: PREFIX,
      handler: handleHttp,
    }),
  );

  if (ctx.get('tools')) registerTools(ctx, weread);
}

/** Flatten /readdata/detail into what the panel needs (all durations are seconds). */
function shapeStats(data) {
  const readTimes = data?.readTimes && typeof data.readTimes === 'object' ? data.readTimes : {};
  const daily = data?.dailyReadTimes && typeof data.dailyReadTimes === 'object' ? data.dailyReadTimes : {};
  const buckets = Object.entries(readTimes)
    .map(([stamp, seconds]) => ({ at: Number(stamp) * 1000, seconds: Number(seconds) || 0 }))
    .sort((a, b) => a.at - b.at);
  const days = Object.entries(daily)
    .map(([stamp, seconds]) => ({ at: Number(stamp) * 1000, seconds: Number(seconds) || 0 }))
    .sort((a, b) => a.at - b.at);
  return {
    totalSeconds: Number(data?.totalReadTime) || 0,
    readDays: Number(data?.readDays) || 0,
    dayAverageSeconds: Number(data?.dayAverageReadTime) || 0,
    compare: typeof data?.compare === 'number' && data.compare >= 0 ? data.compare : null,
    recordSeconds: Number(data?.recordReadingTime) || 0,
    buckets,
    days,
    longest: (Array.isArray(data?.readLongest) ? data.readLongest : []).map((item) => ({
      bookId: String(item?.book?.bookId ?? item?.albumInfo?.albumId ?? ''),
      title: item?.book?.title ?? item?.albumInfo?.name ?? '',
      author: item?.book?.author ?? item?.albumInfo?.authorName ?? '',
      cover: item?.book?.cover ?? item?.albumInfo?.cover ?? '',
      seconds: Number(item?.readTime) || 0,
      tags: Array.isArray(item?.tags) ? item.tags : [],
    })),
    categories: (Array.isArray(data?.preferCategory) ? data.preferCategory : []).map((item) => ({
      title: item?.categoryTitle ?? '',
      seconds: Number(item?.readingTime) || 0,
      value: Number(item?.val) || 0,
    })),
    stats: (Array.isArray(data?.readStat) ? data.readStat : []).map((item) => ({
      stat: item?.stat ?? '',
      counts: item?.counts ?? '',
    })),
    hours: Array.isArray(data?.preferTime) ? data.preferTime.map((seconds) => Number(seconds) || 0) : [],
    hourWord: data?.preferTimeWord ?? '',
    categoryWord: data?.preferCategoryWord ?? '',
    rate: typeof data?.readRate === 'number' ? data.readRate : null,
  };
}

function registerTools(ctx, weread) {
  const textBlock = (value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }];

  const summariseShelf = async () => {
    const shelf = await weread.shelf();
    const notebooks = await weread.notebooks().catch(() => ({ books: [] }));
    const notes = new Map(notebooks.books.map((book) => [book.bookId, book]));
    return shelf.books.map((book) => ({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      finished: book.finished,
      notes: notes.get(book.bookId)
        ? {
            highlights: notes.get(book.bookId).noteCount,
            thoughts: notes.get(book.bookId).reviewCount,
            progress: notes.get(book.bookId).progress,
          }
        : null,
    }));
  };

  ctx.effect(() =>
    ctx.tools.register({
      name: 'weread_shelf',
      description:
        "List the user's WeRead (微信读书) shelf: title, author, finished flag, reading progress and note counts. Use it when the user asks what they are reading or to find a book id.",
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => textBlock(value),
      },
      execute: async () => ({ books: await summariseShelf() }),
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'weread_notes',
      description:
        "Read the user's WeRead highlights (划线原文) and thoughts (想法) for one book, or their notebook overview when no bookId is given. Use it to summarise or review what the user has read.",
      parameters: {
        type: 'object',
        properties: {
          bookId: { type: 'string', description: 'WeRead book id. Omit to list every annotated book.' },
        },
        additionalProperties: false,
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => textBlock(value),
      },
      execute: async (args) => {
        const bookId = typeof args?.bookId === 'string' ? args.bookId.trim() : '';
        if (!bookId) return { notebooks: await weread.notebooks() };
        const [highlights, thoughts, info] = await Promise.all([
          weread.highlights(bookId),
          weread.thoughts(bookId),
          weread.bookInfo(bookId).catch(() => null),
        ]);
        return { book: info, highlights, thoughts };
      },
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'weread_stats',
      description:
        "The user's WeRead reading statistics (total seconds, read days, most-read books, preferred categories, hourly distribution). All durations are seconds.",
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['weekly', 'monthly', 'annually', 'overall'],
            description: 'Statistics period, default monthly.',
          },
        },
        additionalProperties: false,
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => textBlock(value),
      },
      execute: async (args) => {
        const mode = args?.mode ?? 'monthly';
        const data = await weread.call('/readdata/detail', { mode });
        return shapeStats(data);
      },
    }),
  );

  ctx.effect(() =>
    ctx.tools.register({
      name: 'weread_search',
      description: 'Search the WeRead store for books by keyword and return ids, titles, authors and ratings.',
      parameters: {
        type: 'object',
        properties: { keyword: { type: 'string', description: 'Search keyword.' } },
        required: ['keyword'],
        additionalProperties: false,
      },
      output: {
        schema: { type: 'object' },
        render: (_args, value) => textBlock(value),
      },
      execute: async (args) => ({ results: await weread.search(String(args?.keyword ?? ''), 10) }),
    }),
  );
}