# 书屿 · WeRead Shelf for DSH

DSH 左侧栏里的微信读书书架：点书 → 独立窗口阅读 → 回来陪读；划线、想法、随记一路写进 Obsidian。

![书架](docs/shelf.png)

## 功能

- **书架**：微信读书官方 Agent Skill API（`wrk-` Key），全部书籍 + 公众号，按在读 / 读完 / 未开始筛选，带进度。
- **打开阅读**：用 Chrome `--app` 开一个没有地址栏的独立窗口（不是内嵌 iframe —— 微信读书会拦 frame，且有封号风险）。
- **陪读台**：点「打开阅读」后可自动进入左右分栏 —— 左栏问这本书的 AI，右栏是这本书的划线、想法和随手记。
- **全局 AI（问屿）**：跨书问，推荐、串联、找共同主题。
- **写进知识库**：单条划线 / 想法 / AI 回答 / 随手记都能落进 Obsidian；整本书的划线与想法可一次归档，自动去重、按章节分组、维护书单 MOC。
- **统计**：阅读日历热力图、连续阅读天数、趋势（柱 / 折线）、24 小时极坐标钟、分类环形、周分布、笔记密度散点、书架进度环墙。
- **书城**：查微信读书全站（只读，不能下单或加书架）。

## 安装

```bash
# 在 DSH 里
plugin_manager install_bundle  target=D:\deepseek_work\plugins\dsh-weread-shelf
```

安装后在左侧栏出现「书屿」图标；首次打开会让你填 API Key（App：「我 → 设置 → 微信读书 Skill → 获取 API Key」，形如 `wrk-xxxxxxxx`）。

Key 存在 DSH 的 credentials 服务里，落盘位置由 DSH 决定，不会写进本仓库。

## 配置

面板右上「设置」：

| 项 | 说明 |
| --- | --- |
| 打开阅读后自动进入陪读台 | 默认开 |
| Obsidian 子目录 | 默认 `personal/书屿`（相对库根） |
| 微信读书 API Key | 已连接 / 断开、替换 |

库根默认 `D:\Obsidian_Work\myself_wiki`，写在宿主侧 `~/.dsh-weread-shelf/settings.json`。

## AI 走哪个模型

宿主 `llm` 服务 + `agentDefaultModel.currentSelection()`，也就是 **DSH 里当前选中的模型**。消耗的是它的 token，与微信读书无关（`wrk-` Key 只取数据）。

单书提问的上下文约 3.5k 字符（简介 + 目录 + 前 60 条划线 + 前 30 条想法），输出上限 1200 token，历史只带最近 8 轮。

## 代码结构

```
index.js     宿主半：/api/weread 路由（state/key/shelf/book/notes/stats/calendar/search/open/ask/save/archive/settings）、4 个只读工具
weread.js    官方网关客户端：POST i.weread.qq.com/api/agent/gateway，业务参数平铺 + skill_version
client.js    面板半：window.__ModuleLoader__ 单文件，无构建（槽位 sidebar.panellist + main）
cordis.patch.yml / package.json / locale / icon.svg
tests/       smoke.mjs（无头 React 渲染 + 静态预览）、host.mjs（桩 ctx 跑真路由）、探针脚本
```

## 测试

```bash
node tests/smoke.mjs                 # 渲染冒烟：四个视图 + 一次完整点击流
node tests/host.mjs --live           # 真 Key 打真接口（需要本机已存 Key）
node tests/smoke.mjs --html tests/pv/x.html   # 顺带导出各视图静态 HTML，配合 headless Chrome 截图
```

## 已知边界

- 官方接口 17 个，全部只读：不能改阅读进度、不能加书架、不能导出正文。
- 阅读窗口是 Chrome `--app`；找不到 Chrome 时回落系统默认浏览器（有地址栏）。
- 封面走 `/api/weread/cover` 代理（只允许 `*.qq.com` / `*.qpic.cn` / `*.weixin.qq.com`）。
- 时区按本机（`readTimes` 的桶是本地零点）。

## 版本

- 0.6.0 — 纸本主题（米黄纸面 / 宋体正文 / 暗红印章 / 竖排书名签 / 统计页插图框）
- 0.5.0 — Key 管理、整本归档进 Obsidian
- 0.4.0 — 统计仪表盘、书城检索修复
- 0.3.0 — 去掉内嵌阅读，改 Chrome 独立窗口 + 陪读台