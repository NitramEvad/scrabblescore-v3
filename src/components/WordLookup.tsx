import { useEffect, useRef, useState } from 'react'
import {
  defineWord,
  lookupWord,
  WordDefinition,
  WordLookupResult,
  WordSense,
} from '../api'

interface WordLookupProps {
  onClose: () => void
}

const MAX_RECENT = 8

/**
 * Settle an argument mid-game: type a word, press Enter, get a green or red
 * verdict from the Scrabble word list, then expand it for the definition.
 */
export function WordLookup({ onClose }: WordLookupProps) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<WordLookupResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState(false)
  const [fetched, setFetched] = useState<WordDefinition | null>(null)
  const [defining, setDefining] = useState(false)
  const [defineError, setDefineError] = useState<string | null>(null)

  const [recent, setRecent] = useState<WordLookupResult[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const cache = useRef(new Map<string, WordLookupResult>())
  // Only the newest lookup may write to the screen; slow ones are discarded.
  const latest = useRef(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function check(raw: string) {
    const word = raw.replace(/[^a-zA-Z]/g, '').toUpperCase()
    if (!word) return

    setQuery(word)
    setExpanded(false)
    setFetched(null)
    setDefineError(null)
    setError(null)

    const token = ++latest.current

    const cached = cache.current.get(word)
    if (cached) {
      setResult(cached)
      remember(cached)
      return
    }

    setChecking(true)
    try {
      const found = await lookupWord(word)
      if (token !== latest.current) return
      cache.current.set(word, found)
      setResult(found)
      remember(found)
    } catch (err) {
      if (token !== latest.current) return
      setResult(null)
      setError(err instanceof Error ? err.message : 'Could not reach the word list')
    } finally {
      if (token === latest.current) setChecking(false)
    }
  }

  function remember(found: WordLookupResult) {
    setRecent((prev) => [
      found,
      ...prev.filter((r) => r.word !== found.word),
    ].slice(0, MAX_RECENT))
  }

  async function toggleDefinition() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)

    // Most entries define themselves; the rest need a second request.
    if (!result || result.hasDefinition || fetched || defining) return

    setDefining(true)
    setDefineError(null)
    try {
      setFetched(await defineWord(result.word))
    } catch (err) {
      setDefineError(
        err instanceof Error ? err.message : 'Could not fetch a definition'
      )
    } finally {
      setDefining(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Word lookup"
    >
      <div
        className="w-full max-w-md my-8 bg-[#2a2520]/95 rounded-2xl border border-amber-400/30 p-5 md:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl text-amber-100">Word Lookup</h2>
            <p className="text-amber-200/50 text-xs mt-1">
              Is it playable? Press Enter to find out.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close word lookup"
            className="flex-shrink-0 -mt-1 -mr-1 px-3 py-1 text-amber-300/70 hover:text-amber-100 active:text-amber-400 text-2xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            check(query)
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            maxLength={15}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Type a word"
            aria-label="Word to look up"
            className="flex-1 min-w-0 px-4 py-3 bg-amber-100/10 border border-amber-400/30 rounded-lg text-amber-100 text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder-amber-300/50 focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button
            type="submit"
            disabled={!query || checking}
            className="flex-shrink-0 px-5 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {checking ? '…' : 'Check'}
          </button>
        </form>

        <div aria-live="polite">
          {error && (
            <div className="mt-4 p-4 rounded-xl border border-amber-400/40 bg-amber-200/10">
              <p className="text-amber-200 text-sm text-center">
                Couldn&rsquo;t check that word &mdash; {error}.
              </p>
              <button
                onClick={() => check(query)}
                className="w-full mt-2 text-amber-400 hover:text-amber-300 text-sm"
              >
                Try again
              </button>
            </div>
          )}

          {result && !error && (
            <Verdict
              result={result}
              expanded={expanded}
              onToggle={toggleDefinition}
              defining={defining}
              defineError={defineError}
              fetched={fetched}
              onLookup={check}
            />
          )}
        </div>

        {recent.length > 0 && (
          <div className="mt-5 pt-4 border-t border-amber-400/20">
            <p className="text-amber-200/50 text-xs mb-2 tracking-wide uppercase">
              Recent
            </p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={r.word}
                  onClick={() => check(r.word)}
                  className={`px-2.5 py-1 rounded-full text-xs tracking-wide border transition-colors ${
                    r.valid
                      ? 'border-emerald-400/40 text-emerald-300/90 hover:bg-emerald-400/10'
                      : 'border-red-400/40 text-red-300/90 hover:bg-red-400/10'
                  }`}
                >
                  {r.valid ? '✓' : '✗'} {r.word}
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <p className="mt-4 text-amber-200/40 text-[11px] text-center">
            Checked against the {result.lexiconName}
          </p>
        )}
      </div>
    </div>
  )
}

interface VerdictProps {
  result: WordLookupResult
  expanded: boolean
  onToggle: () => void
  defining: boolean
  defineError: string | null
  fetched: WordDefinition | null
  onLookup: (word: string) => void
}

function Verdict({
  result,
  expanded,
  onToggle,
  defining,
  defineError,
  fetched,
  onLookup,
}: VerdictProps) {
  return (
    <div className="mt-4">
      <div
        className={`rounded-xl border-2 p-5 text-center ${
          result.valid
            ? 'bg-emerald-500/20 border-emerald-400'
            : 'bg-red-500/20 border-red-400'
        }`}
      >
        <p
          className={`text-3xl md:text-4xl tracking-widest break-all ${
            result.valid ? 'text-emerald-100' : 'text-red-100'
          }`}
        >
          {result.word}
        </p>
        <p
          className={`mt-2 text-sm tracking-[0.2em] uppercase ${
            result.valid ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          {result.valid ? '✓ Playable' : '✗ Not playable'}
        </p>
        {result.reason && (
          <p className="mt-2 text-red-200/70 text-xs">{result.reason}</p>
        )}
      </div>

      {result.valid && (
        <>
          <button
            onClick={onToggle}
            aria-expanded={expanded}
            className="w-full mt-3 py-2.5 text-amber-300 hover:text-amber-100 active:text-amber-400 border border-amber-400/30 hover:border-amber-400/60 rounded-lg text-sm transition-colors"
          >
            {expanded ? 'Hide definition' : 'Show definition'}
          </button>

          {expanded && (
            <div className="mt-3 p-4 bg-amber-200/10 rounded-xl border border-amber-400/20 space-y-4">
              {result.senses.map((sense, i) => (
                <Sense key={i} sense={sense} onLookup={onLookup} />
              ))}

              {!result.hasDefinition && (
                <FetchedDefinition
                  defining={defining}
                  defineError={defineError}
                  fetched={fetched}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Sense({
  sense,
  onLookup,
}: {
  sense: WordSense
  onLookup: (word: string) => void
}) {
  return (
    <div>
      {sense.partOfSpeech && (
        <p className="text-amber-400/80 text-xs italic">{sense.partOfSpeech}</p>
      )}

      {sense.definition && (
        <p className="text-amber-100 text-sm mt-1">{sense.definition}</p>
      )}

      {sense.formOf && (
        <p className="text-amber-200/70 text-sm mt-1">
          A form of <WordLink word={sense.formOf} onLookup={onLookup} />
          {sense.formOfDefinition && <> &mdash; {sense.formOfDefinition}</>}
        </p>
      )}

      {sense.inflections.length > 0 && (
        <p className="text-amber-200/50 text-xs mt-2">
          Also plays as{' '}
          {sense.inflections.map((word, i) => (
            <span key={word}>
              {i > 0 && ', '}
              <WordLink word={word} onLookup={onLookup} />
            </span>
          ))}
        </p>
      )}

      {sense.related.length > 0 && (
        <p className="text-amber-200/50 text-xs mt-1">
          Related:{' '}
          {sense.related.map((related, i) => (
            <span key={related.word}>
              {i > 0 && ', '}
              <WordLink word={related.word} onLookup={onLookup} />
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

/** A word in a definition that can be looked up in turn. */
function WordLink({
  word,
  onLookup,
}: {
  word: string
  onLookup: (word: string) => void
}) {
  return (
    <button
      onClick={() => onLookup(word)}
      className="text-amber-300 hover:text-amber-100 underline decoration-amber-400/30 underline-offset-2 transition-colors"
    >
      {word}
    </button>
  )
}

/** The definition for a word the list confirms but doesn't itself define. */
function FetchedDefinition({
  defining,
  defineError,
  fetched,
}: {
  defining: boolean
  defineError: string | null
  fetched: WordDefinition | null
}) {
  if (defining) {
    return <p className="text-amber-200/60 text-sm">Looking up a definition…</p>
  }

  if (defineError) {
    return (
      <p className="text-amber-200/60 text-sm">
        The word list doesn&rsquo;t define this one, and the definition
        couldn&rsquo;t be fetched &mdash; {defineError}.
      </p>
    )
  }

  if (!fetched?.definition) {
    return (
      <p className="text-amber-200/60 text-sm">
        The word list confirms this word but doesn&rsquo;t define it.
      </p>
    )
  }

  return (
    <div>
      <p className="text-amber-100 text-sm">{fetched.definition}</p>
      {fetched.source === 'claude' && (
        <p className="text-amber-200/40 text-[11px] mt-2">
          The word list doesn&rsquo;t define this one &mdash; definition written
          by Claude.
        </p>
      )}
    </div>
  )
}
