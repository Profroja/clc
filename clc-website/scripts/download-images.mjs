// Downloads the HD photos listed in scripts/images.json into public/images/.
// Usage: npm run images            (skips files that are already HD)
//        npm run images -- --force (re-download everything)
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'images')
const force = process.argv.includes('--force')
const { images } = JSON.parse(await readFile(join(root, 'scripts', 'images.json'), 'utf8'))
await mkdir(outDir, { recursive: true })

let ok = 0, skipped = 0, failed = 0
for (const [file, { id, params }] of Object.entries(images)) {
  const dest = join(outDir, file)
  if (!force) {
    try { if ((await stat(dest)).size > 150_000) { skipped++; continue } } catch {}
  }
  const url = `https://images.unsplash.com/${id}?${params}&q=85&fm=jpg&auto=format`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(dest, buf)
    console.log(`✓ ${file.padEnd(18)} ${(buf.length / 1024).toFixed(0)} KB`)
    ok++
  } catch (e) {
    console.warn(`✗ ${file.padEnd(18)} ${e.message} (keeping current file)`)
    failed++
  }
}
console.log(`\nDone: ${ok} downloaded, ${skipped} already HD, ${failed} failed.`)
