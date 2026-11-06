import { readFile } from "node:fs/promises";
const STORE = "D:\\DSH-Home\\.credentials.yaml";
const GATEWAY = "https://i.weread.qq.com/api/agent/gateway";
function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/);
  const hit = lines.findIndex((line) => line.trim() === `${id}:`);
  if (hit < 0) throw new Error("no record " + id);
  const indent = lines[hit].match(/^\s*/)[0].length;
  for (let i = hit + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const own = line.match(/^\s*/)[0].length;
    if (own <= indent) break;
    const m = line.match(/^\s*key:\s*(\S.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no key field");
}
const key = pickKey(await readFile(STORE, "utf8"), "weread/api-key");
const res = await fetch(GATEWAY, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
  body: JSON.stringify({ api_name: "/store/search", skill_version: "1.0.5", keyword: "\u7f6e\u8eab\u4e8b\u5185", count: 5 }),
});
const text = await res.text();
console.log("http", res.status);
let data; try { data = JSON.parse(text); } catch { console.log(text.slice(0, 300)); process.exit(0); }
console.log("errcode", data.errcode, "keys", Object.keys(data).slice(0, 8).join(","));
const raw = Array.isArray(data.results) ? data.results : Array.isArray(data.books) ? data.books : [];
console.log("results", raw.length);
if (raw[0]) console.log(JSON.stringify(raw[0]).slice(0, 420));
