// Draws the app icons — a Scrabble tile lit by the amber glow the app itself
// uses — and rasterises them into public/.
//
//   npx playwright-core@1 --help >/dev/null   # or: npm i -D playwright-core
//   node scripts/build-icons.mjs
//
// Chromium renders the SVG below at each exact pixel size, so the PNGs are
// crisp rather than resampled from one master. The build does not run this —
// it is a one-off, and the results are committed.

import { readFileSync, writeFileSync } from 'node:fs'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const TMP = process.env.TMPDIR ?? '/tmp'

/**
 * The icon artwork.
 *
 * `inset` is how much of the canvas the tile leaves free. Android crops
 * maskable icons to a circle of 80% diameter, so that variant needs a much
 * bigger margin than the plain one, which the OS rounds only at the corners.
 * `bevel` and `grid` are detail that reads at 512px and turns to mud at 16px,
 * so the favicon leaves them off and gives the letter the room instead.
 */
function icon({ inset, grid = true, bevel = true, letter = 0.7 }) {
  const tile = 512 - inset * 2
  const depth = tile * 0.042      // the tile's own thickness, seen from above
  const radius = tile * 0.12
  const top = (512 - tile - depth) / 2
  const left = inset
  const right = left + tile
  const bottom = top + tile

  // Board lines, only worth drawing on the large canvas — they read as texture
  // at 512px and disappear by 48px, which is the point.
  const lines = grid
    ? [96, 208, 304, 416]
        .map(
          (at) =>
            `<line x1="${at}" y1="0" x2="${at}" y2="512"/>` +
            `<line x1="0" y1="${at}" x2="512" y2="${at}"/>`
        )
        .join('')
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#413830"/>
      <stop offset="0.55" stop-color="#2b2520"/>
      <stop offset="1" stop-color="#1c1815"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.22" r="0.8">
      <stop offset="0" stop-color="#f59e0b" stop-opacity="0.42"/>
      <stop offset="0.5" stop-color="#d97706" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#d97706" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="face" x1="0.1" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="#fffdf7"/>
      <stop offset="0.45" stop-color="#f7edd9"/>
      <stop offset="1" stop-color="#e4d5b8"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c3ad86"/>
      <stop offset="1" stop-color="#9c8663"/>
    </linearGradient>
    <filter id="cast" x="-35%" y="-35%" width="170%" height="180%">
      <feDropShadow dx="0" dy="${(depth * 1.4).toFixed(1)}" stdDeviation="${(depth * 1.5).toFixed(1)}"
                    flood-color="#120e0a" flood-opacity="0.62"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#ground)"/>
  ${lines && `<g stroke="#f5deb3" stroke-opacity="0.05" stroke-width="2">${lines}</g>`}
  <rect width="512" height="512" fill="url(#glow)"/>

  <g filter="url(#cast)">
    <rect x="${left}" y="${(top + depth).toFixed(1)}" width="${tile}" height="${tile}"
          rx="${radius.toFixed(1)}" fill="url(#edge)"/>
    <rect x="${left}" y="${top.toFixed(1)}" width="${tile}" height="${tile}"
          rx="${radius.toFixed(1)}" fill="url(#face)"/>
  </g>

  <!-- Bevel: light where the glow falls, shadow on the far side. -->
  ${bevel ? `<path d="M ${left + radius * 0.5} ${(bottom - radius * 0.5).toFixed(1)}
           L ${left + radius * 0.5} ${(top + radius).toFixed(1)}
           Q ${left + radius * 0.5} ${(top + radius * 0.5).toFixed(1)} ${left + radius} ${(top + radius * 0.5).toFixed(1)}
           L ${(right - radius * 0.5).toFixed(1)} ${(top + radius * 0.5).toFixed(1)}"
        fill="none" stroke="#fffefb" stroke-opacity="0.9" stroke-width="${(tile * 0.016).toFixed(1)}"
        stroke-linecap="round"/>
  <path d="M ${left + radius} ${(bottom - radius * 0.5).toFixed(1)}
           L ${(right - radius).toFixed(1)} ${(bottom - radius * 0.5).toFixed(1)}
           Q ${(right - radius * 0.5).toFixed(1)} ${(bottom - radius * 0.5).toFixed(1)} ${(right - radius * 0.5).toFixed(1)} ${(bottom - radius).toFixed(1)}
           L ${(right - radius * 0.5).toFixed(1)} ${(top + radius).toFixed(1)}"
        fill="none" stroke="#a58f6b" stroke-opacity="0.55" stroke-width="${(tile * 0.016).toFixed(1)}"
        stroke-linecap="round"/>` : ''}

  <text x="${(left + tile * 0.46).toFixed(1)}" y="${(top + tile * (0.5 + letter * 0.393)).toFixed(1)}"
        font-family="Bitstream Charter, Georgia, 'Times New Roman', serif"
        font-size="${(tile * letter).toFixed(1)}" font-weight="bold"
        fill="#231a10" text-anchor="middle">S</text>

  <text x="${(right - tile * 0.13).toFixed(1)}" y="${(bottom - tile * 0.1).toFixed(1)}"
        font-family="Bitstream Charter, Georgia, 'Times New Roman', serif"
        font-size="${(tile * 0.22).toFixed(1)}" font-weight="bold"
        fill="#231a10" text-anchor="middle">1</text>
</svg>`
}

/* -------------------------------------------------------------------------- */

const { chromium } = await import('playwright-core')

const browser = await chromium.launch({ executablePath: CHROME })

async function render(svg, size, out) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  )
  await page.screenshot({ path: out, omitBackground: true })
  await page.close()
  console.log(`build-icons: ${out} (${size}x${size})`)
}

const plain = icon({ inset: 62 })
// Android's maskable safe zone is the middle 80%: every corner of the tile,
// depth included, has to stay within 205px of the centre of the 512px canvas.
const maskable = icon({ inset: 110, grid: false })

await render(plain, 512, 'public/pwa-512x512.png')
await render(plain, 192, 'public/pwa-192x192.png')
await render(plain, 180, 'public/apple-touch-icon.png')
await render(maskable, 512, 'public/pwa-maskable-512x512.png')

// A tab favicon is 16-32px: nearly full-bleed, with the letter given the room
// that the board lines and bevel would otherwise waste.
writeFileSync(
  'public/favicon.svg',
  icon({ inset: 24, grid: false, bevel: false, letter: 0.76 }) + '\n'
)
console.log('build-icons: public/favicon.svg')

// Anything still asking for /favicon.ico — Windows shortcuts, feed readers,
// pinned tabs — rather than the SVG the page links.
const ico = icon({ inset: 24, grid: false, bevel: false, letter: 0.76 })
const frames = []
for (const size of [16, 32, 48]) {
  const file = `${TMP}/favicon-${size}.png`
  await render(ico, size, file)
  frames.push({ size, png: readFileSync(file) })
}
writeFileSync('public/favicon.ico', buildIco(frames))
console.log('build-icons: public/favicon.ico')

await browser.close()

/** Pack PNG frames into an .ico container (PNG payloads, Vista and later). */
function buildIco(frames) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)             // reserved
  header.writeUInt16LE(1, 2)             // 1 = icon
  header.writeUInt16LE(frames.length, 4)

  let offset = 6 + frames.length * 16
  const entries = frames.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)            // 0 would mean 256
    entry.writeUInt8(size, 1)
    entry.writeUInt16LE(1, 4)            // colour planes
    entry.writeUInt16LE(32, 6)           // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)])
}
