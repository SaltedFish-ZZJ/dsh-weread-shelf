#!/usr/bin/env node
// 生成 DSH 插件市场索引（format 1）。
//
// 用法：
//   node scripts/market-index.mjs            # 用当前 HEAD 作为版本 commit
//   node scripts/market-index.mjs <commit>   # 指定 40 位 sha
//
// 产物：market/index.json + market/icon.svg（相对图标要求与索引同源）。
// 推上去之后，索引地址就是
//   https://raw.githubusercontent.com/SaltedFish-ZZJ/dsh-weread-shelf/main/market/index.json
// 用户在 DSH「插件 → 发现 → 添加索引源」里填这个 URL 就能装。
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'market');

const REPO = 'https://github.com/SaltedFish-ZZJ/dsh-weread-shelf';
const DSH_ENGINE = '>=0.2.0-rc.2';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const manifest = await readJson(join(root, 'package.json'));

const commit =
  process.argv[2] ||
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();

if (!/^[0-9a-f]{40}$/.test(commit)) {
  throw new Error(`commit 必须是 40 位小写 sha，收到：${commit}`);
}

const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(version.replace(/[-+].*$/, ''))) {
  throw new Error(`version 不是精确 SemVer：${version}`);
}

const title = { en: 'Shuyu · WeRead Shelf', zh: '书屿 · 微信读书书架' };
const description = {
  en: 'A WeRead shelf inside DSH: browse your books, open a book in a chrome-less reader window, ask an AI companion, and file highlights into Obsidian.',
  zh: '把微信读书搬进 DSH 左侧栏：书架、独立窗口阅读、AI 陪读台，划线与想法一路写进 Obsidian。',
};

const index = {
  format: 1,
  title: { en: 'Shuyu Plugins', zh: '书屿插件索引' },
  description: {
    en: 'Single-plugin index for Shuyu, a WeRead shelf plugin for DSH.',
    zh: '书屿的插件索引，目前只收录书屿本体。',
  },
  metadata: {
    categories: { reading: { title: { en: 'Reading', zh: '阅读' } } },
  },
  plugins: [
    {
      name: manifest.name,
      title,
      description,
      icon: './icon.svg',
      author: manifest.author,
      homepage: REPO,
      repository: { url: REPO },
      metadata: {
        category: 'reading',
        keywords: ['微信读书', '书架', 'wechat-reading', 'obsidian', 'AI 陪读', 'bookshelf'],
      },
      versions: [
        {
          version,
          publishTimestamp: Math.floor(Date.now() / 1000),
          source: { type: 'git', url: REPO, commit },
          engines: { dsh: DSH_ENGINE },
        },
      ],
    },
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(OUT_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
await copyFile(join(root, 'icon.svg'), join(OUT_DIR, 'icon.svg'));

console.log(`✅ wrote market/index.json`);
console.log(`   plugin: ${manifest.name}@${version}`);
console.log(`   commit: ${commit}`);
console.log(`   source: git ${REPO}`);