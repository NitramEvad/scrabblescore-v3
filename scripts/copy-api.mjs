// Copies the PHP API into the Vite build output so the FTP deploy (which uploads
// ./dist) publishes it to public_html/api alongside the static frontend.
//
// config.local.php is intentionally skipped — it only ever exists on the server
// and must never be bundled into a deployment.

import { mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = 'api'
const outDir = 'dist/api'
const skip = new Set(['config.local.php'])

mkdirSync(outDir, { recursive: true })

let count = 0
for (const name of readdirSync(srcDir)) {
  if (skip.has(name)) continue
  const src = join(srcDir, name)
  if (!statSync(src).isFile()) continue
  copyFileSync(src, join(outDir, name))
  count++
  console.log(`copy-api: ${src} -> ${join(outDir, name)}`)
}

console.log(`copy-api: copied ${count} file(s) into ${outDir}`)
