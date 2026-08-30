// Draws the app icons — the Scrabble tile, and nothing behind it — and
// rasterises them into public/.
//
//   npm i -D playwright-core     # or run it from a checkout that has one
//   node scripts/build-icons.mjs
//
// Chromium renders the SVG below at each exact pixel size, so the PNGs are
// crisp rather than resampled from one master. The build does not run this —
// it is a one-off, and the results are committed.

import { readFileSync, writeFileSync } from 'node:fs'

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const TMP = process.env.TMPDIR ?? '/tmp'

/**
 * The icon artwork: the tile fills the canvas, so there is no background to
 * see. Phones mask an icon to their own shape regardless, so a tile drawn
 * small on a transparent canvas would not float — iOS has no transparency in
 * home screen icons at all and flattens it onto black. Letting the tile be the
 * whole icon is what actually puts a bare tile on the home screen.
 *
 * `content` scales the letter and its score toward the centre. Android crops
 * maskable icons to a circle of 80% diameter, so that variant pulls them in;
 * `radius` rounds the corners for the favicon, which sits on a page rather
 * than in a mask, so it keeps its own tile shape and an edge to hold it off a
 * pale tab bar. The ivory runs deeper than a real tile so that the icon still
 * has an outline of its own against a light wallpaper.
 */
function icon({ content = 1, radius = 0 } = {}) {
  const shape = radius
    ? `<rect x="8" y="8" width="496" height="496" rx="${radius}"`
    : `<rect width="512" height="512"`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="face" x1="0.08" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#fdf7e8"/>
      <stop offset="0.45" stop-color="#f2e3c4"/>
      <stop offset="1" stop-color="#d8c298"/>
    </linearGradient>
    <radialGradient id="lit" cx="0.26" cy="0.2" r="0.72">
      <stop offset="0" stop-color="#fffdf4" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#fffdf4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="worn" cx="0.85" cy="0.9" r="0.6">
      <stop offset="0" stop-color="#9c8153" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#9c8153" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="tile">${shape}/></clipPath>
  </defs>

  ${shape} fill="url(#face)"/>
  <g clip-path="url(#tile)">
    <rect width="512" height="512" fill="url(#lit)"/>
    <rect width="512" height="512" fill="url(#worn)"/>
  </g>
  ${radius ? `${shape} fill="none" stroke="#a8905f" stroke-opacity="0.55" stroke-width="9"/>` : ''}

  <g transform="translate(256 256) scale(${content}) translate(-256 -256)">
    <text x="246" y="371" font-family="Bitstream Charter, Georgia, 'Times New Roman', serif"
          font-size="330" font-weight="bold" fill="#241a10" text-anchor="middle">S</text>
    <text x="405" y="420" font-family="Bitstream Charter, Georgia, 'Times New Roman', serif"
          font-size="100" font-weight="bold" fill="#241a10" text-anchor="middle">1</text>
  </g>
</svg>`
}

/* -------------------------------------------------------------------------- */

const { chromium } = await import('playwright-core')

const browser = await chromium.launch({ executablePath: CHROME })

async function render(svg, size, out) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
  )
  await page.screenshot({ path: out, omitBackground: true })
  await page.close()
  console.log(`build-icons: ${out} (${size}x${size})`)
}

const plain = icon()
// The score sits in a corner, which is what a circular crop eats first: at
// 0.82 its furthest pixel lands ~198px from the centre, inside the 205px
// Android guarantees.
const maskable = icon({ content: 0.82 })
// A tab shows the icon as-is, so here the tile keeps its own rounded corners
// and the page shows through around them.
const tab = icon({ radius: 84 })

await render(plain, 512, 'public/pwa-512x512.png')
await render(plain, 192, 'public/pwa-192x192.png')
await render(plain, 180, 'public/apple-touch-icon.png')
await render(maskable, 512, 'public/pwa-maskable-512x512.png')

writeFileSync('public/favicon.svg', tab + '\n')
console.log('build-icons: public/favicon.svg')

// Anything still asking for /favicon.ico — Windows shortcuts, feed readers,
// pinned tabs — rather than the SVG the page links.
const frames = []
for (const size of [16, 32, 48]) {
  const file = `${TMP}/favicon-${size}.png`
  await render(tab, size, file)
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
