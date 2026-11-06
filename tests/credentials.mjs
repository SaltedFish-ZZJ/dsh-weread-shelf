// Reads the WeRead API key out of the DSH credentials store, so the live tests work on any
// machine without a hard-coded path. Set WEREAD_CREDENTIALS to point at a specific file
// (`~/.dsh/.credentials.yaml` style YAML) or DSH_HOME at a profile home.
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const KEY_ID = 'weread/api-key'

export function credentialsPaths() {
  return [
    process.env.WEREAD_CREDENTIALS,
    process.env.DSH_HOME ? join(process.env.DSH_HOME, '.credentials.yaml') : '',
    join(homedir(), '.dsh', '.credentials.yaml'),
    join(homedir(), 'DSH-Home', '.credentials.yaml'),
  ].filter(Boolean)
}

/** Pull `key:` from the record block named `<scope>/<id>` in the credentials YAML. */
export function pickKey(yaml, id) {
  const lines = yaml.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `${id}:`)
  if (start < 0) return ''
  const indent = lines[start].match(/^\s*/)[0].length
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue
    if (line.match(/^\s*/)[0].length <= indent) break
    const match = line.match(/^\s*key:\s*(\S.*)$/)
    if (match) return match[1].trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

/** First credential file that carries a WeRead key. Returns '' when none is configured. */
export async function readWeReadKey() {
  for (const path of credentialsPaths()) {
    try {
      const key = pickKey(await readFile(path, 'utf8'), KEY_ID)
      if (key) return key
    } catch {
      // try the next candidate
    }
  }
  return ''
}