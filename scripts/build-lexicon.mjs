// Turns the published NASPA Word List into the file api/words.php reads.
//
//   node scripts/build-lexicon.mjs path/to/NWL2023.txt
//
// The published list carries its own definitions and is sorted by word length:
//
//   RUN to move by rapid steps [v RAN, RUNNING, RUNS] : RUNNABLE [adj], RUNNER [n]
//
// This validates every entry against that grammar and re-sorts the list by byte
// value, which is what lets the API binary-search it without loading all 7.5 MB
// into memory. Nothing else about the entries changes.
//
// The build does not run this — regenerate by hand when the word list is
// updated, and commit the result.

import { readFileSync, writeFileSync } from 'node:fs'

const source = process.argv[2]
if (!source) {
  console.error('usage: node scripts/build-lexicon.mjs <NWL2023.txt>')
  process.exit(1)
}

// "text [pos INFLECTION, ...]", the shape every sense ends with, and the
// "RELATED [pos], ..." list that may follow a sense after " : ".
const SENSE = /^(.*?)\s*\[([a-z]+)(?:\s+([A-Z]+(?:,\s*[A-Z]+)*))?\]$/
const RELATED = /^[A-Z]+ \[[a-z]+\](, [A-Z]+ \[[a-z]+\])*$/

const entries = readFileSync(source, 'utf8').split('\n').filter(Boolean)

let undefinedCount = 0

for (const line of entries) {
  const space = line.indexOf(' ')
  const word = space === -1 ? line : line.slice(0, space)
  const body = space === -1 ? '' : line.slice(space + 1)

  // The API assumes headwords are plain uppercase letters of playable length.
  if (!/^[A-Z]{2,15}$/.test(word)) {
    throw new Error(`unexpected headword: ${line}`)
  }

  let defined = false
  for (const chunk of body.split(' / ')) {
    const [sense, related] = chunk.split(' : ')

    const match = SENSE.exec(sense)
    if (!match) throw new Error(`unparsable sense: ${line}`)
    if (match[1] !== '') defined = true

    if (related !== undefined && !RELATED.test(related)) {
      throw new Error(`unparsable related forms: ${line}`)
    }
  }
  if (!defined) undefinedCount++
}

// Byte-value order, which is what the API's binary search compares against.
entries.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
writeFileSync('api/nwl2023.txt', entries.join('\n') + '\n')

console.log(`build-lexicon: ${entries.length} entries -> api/nwl2023.txt`)
console.log(
  `build-lexicon: ${undefinedCount} carry no definition of their own — the API ` +
    `resolves the inflected ones against their base word and asks Claude for the rest`
)
