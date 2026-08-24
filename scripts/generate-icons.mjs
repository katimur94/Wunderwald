/**
 * Rendert public/icons/*.png aus src/assets/icon.svg.
 * Läuft nur lokal / im CI (devDependency sharp) – zur Laufzeit der App
 * wird nichts generiert und nichts nachgeladen.
 *
 *   npm run icons
 */
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'src/assets/icon.svg')
const outDir = resolve(root, 'public/icons')

const BG = '#F2F7EC'

/** Maskable-Icons brauchen 20% Sicherheitsrand ("safe zone"). */
async function maskable(svg, size) {
  const inner = Math.round(size * 0.8)
  const pad = Math.round((size - inner) / 2)
  const logo = await sharp(svg).resize(inner, inner).png().toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const svg = await readFile(src)

  const plain = [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['apple-touch-icon.png', 180],
    ['favicon-48.png', 48],
  ]
  for (const [name, size] of plain) {
    const buf = await sharp(svg).resize(size, size).flatten({ background: BG }).png().toBuffer()
    await writeFile(resolve(outDir, name), buf)
    console.log('✓', name, size + 'px')
  }

  for (const [name, size] of [['maskable-512.png', 512], ['maskable-192.png', 192]]) {
    await writeFile(resolve(outDir, name), await maskable(svg, size))
    console.log('✓', name, size + 'px (maskable)')
  }

  await copyFile(src, resolve(outDir, 'icon.svg'))
  console.log('✓ icon.svg')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
