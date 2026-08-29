<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

apply_cors();

/* ----------------------------------------------------------------------------
 * GET /api/words.php?w=WORD — is the word playable, and what does it mean?
 *
 * The verdict comes straight from nwl2023.txt (the NASPA Word List 2023, which
 * carries its own definitions), so it needs no database and no outbound call:
 *
 *   { "word": "QI", "valid": true, "lexicon": "NWL2023",
 *     "lexiconName": "NASPA Word List 2023", "reason": null,
 *     "hasDefinition": true,
 *     "senses": [ { "definition": "the vital force ...", "formOf": null,
 *                   "partOfSpeech": "noun", "inflections": ["QIS"],
 *                   "related": [] } ] }
 *
 * `valid` is the GREEN/RED verdict; `senses` is what the client reveals when
 * the user expands the result. An unreachable or misconfigured server returns
 * an `error` with a 4xx/5xx status and never a false `valid`.
 *
 * Roughly one entry in five is listed with a part of speech but no meaning the
 * list can supply, and comes back with "hasDefinition": false. For those the
 * client can ask again with &define=1, which returns just a definition and
 * where it came from:
 *
 *   { "word": "ACCOUNTANT", "definition": "one who ...", "source": "claude" }
 *
 * `source` is "lexicon" when the word list defines the word after all,
 * "claude" when the definition was written by the Anthropic API (the client
 * says so on screen), and null when neither could supply one.
 * -------------------------------------------------------------------------- */

const LEXICON_CODE = 'NWL2023';
const LEXICON_NAME = 'NASPA Word List 2023';

// Two tiles is the shortest playable word; the board is fifteen squares wide.
const MIN_WORD_LENGTH = 2;
const MAX_WORD_LENGTH = 15;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    send_json(['error' => 'Method not allowed'], 405);
}

// Lookups are cheap (no DB, no outbound calls) but still worth a ceiling.
rate_limit('words', 600, 3600);

$raw = (string) ($_GET['w'] ?? '');
if (strlen($raw) > 64) {
    send_json(['error' => 'That is too long to be a word.'], 400);
}

$word = strtoupper((string) preg_replace('/[^A-Za-z]/', '', $raw));
if ($word === '') {
    send_json(['error' => 'Provide a word to look up, e.g. ?w=quixotic'], 400);
}

// &define=1 asks for a definition for a word the list leaves undefined.
$wantDefinition = ($_GET['define'] ?? '0') !== '0';

// A repeat lookup of the same word can be answered from the browser cache.
header('Cache-Control: public, max-age=86400');

if (strlen($word) < MIN_WORD_LENGTH || strlen($word) > MAX_WORD_LENGTH) {
    if ($wantDefinition) {
        send_json(['word' => $word, 'definition' => null, 'source' => null]);
    }
    send_word_verdict($word, false, strlen($word) < MIN_WORD_LENGTH
        ? 'A playable word needs at least two letters.'
        : 'Too long to fit — the board is only fifteen squares wide.');
}

$entry = lexicon_lookup(__DIR__ . '/nwl2023.txt', $word);

if ($entry === null) {
    if ($wantDefinition) {
        send_json(['word' => $word, 'definition' => null, 'source' => null]);
    }
    send_word_verdict($word, false, 'Not in the ' . LEXICON_NAME . '.');
}

$senses = resolve_forms(parse_entry($entry), __DIR__ . '/nwl2023.txt');

if (!$wantDefinition) {
    send_word_verdict($word, true, null, $senses);
}

send_json(['word' => $word] + describe_word($word, $senses));

/* -------------------------------------------------------------------------- */

/** Send the GREEN/RED verdict for a word, with its senses when it is playable. */
function send_word_verdict(string $word, bool $valid, ?string $reason, array $senses = []): never
{
    send_json([
        'word'          => $word,
        'valid'         => $valid,
        'lexicon'       => LEXICON_CODE,
        'lexiconName'   => LEXICON_NAME,
        'reason'        => $reason,
        'hasDefinition' => lexicon_meaning($senses) !== null,
        'senses'        => $senses,
    ]);
}

/**
 * Fill in the meaning of the base word for senses that are only a pointer at
 * one — AAHED is listed as a form of AAH and nothing else. One extra search
 * each saves asking Claude about ~97,000 inflected forms.
 */
function resolve_forms(array $senses, string $path): array
{
    foreach ($senses as $i => $sense) {
        $senses[$i]['formOfDefinition'] = null;

        if ($sense['definition'] !== null || $sense['formOf'] === null) {
            continue;
        }

        $entry = lexicon_lookup($path, $sense['formOf']);
        if ($entry !== null) {
            // parse_entry, not resolve_forms — one hop only, never a chain.
            $senses[$i]['formOfDefinition'] = first_definition(parse_entry($entry));
        }
    }

    return $senses;
}

/** The first sense that spells out a meaning of its own, or null if none does. */
function first_definition(array $senses): ?string
{
    foreach ($senses as $sense) {
        if ($sense['definition'] !== null) {
            return $sense['definition'];
        }
    }

    return null;
}

/** Anything the word list can tell the reader this word means, or null. */
function lexicon_meaning(array $senses): ?string
{
    $own = first_definition($senses);
    if ($own !== null) {
        return $own;
    }

    foreach ($senses as $sense) {
        if (($sense['formOfDefinition'] ?? null) !== null) {
            return $sense['formOfDefinition'];
        }
    }

    return null;
}

/**
 * Find a definition for a word the list confirmed is playable.
 *
 * Most entries carry a meaning, their own or that of the word they are a form
 * of. For the rest the list gives only a part of speech, so ask Claude — the
 * word is always one of the 196,601 headwords and the prompt is fixed, so this
 * can't be steered into a general LLM proxy. Answers are cached on disk because
 * a word's meaning doesn't change.
 */
function describe_word(string $word, array $senses): array
{
    $definition = lexicon_meaning($senses);
    if ($definition !== null) {
        return ['definition' => $definition, 'source' => 'lexicon'];
    }

    $cache = sys_get_temp_dir() . '/scrabble_worddefs';
    $file = $cache . '/' . $word . '.txt';   // $word is /^[A-Z]{2,15}$/

    if (is_file($file)) {
        $cached = (string) @file_get_contents($file);
        if ($cached !== '') {
            return ['definition' => $cached, 'source' => 'claude'];
        }
    }

    $cfg = load_config();
    $apiKey = $cfg['anthropic_api_key'] ?? '';
    if ($apiKey === '') {
        return no_definition();
    }

    // Only uncached lookups reach the Anthropic API, so only they cost budget.
    rate_limit('worddef', 60, 3600);

    $partOfSpeech = $senses[0]['partOfSpeech'] ?? null;
    $as = $partOfSpeech === null ? '' : " as a {$partOfSpeech}";

    $text = call_anthropic(
        $apiKey,
        $cfg['anthropic_model'] ?? 'claude-sonnet-4-20250514',
        150,
        "Define the English word \"{$word}\"{$as} in one short dictionary-style "
            . "phrase, the way a Scrabble dictionary would. It is a valid tournament "
            . "Scrabble word, so define it even if it is obscure. Reply with the "
            . "definition only — no preamble, no repetition of the word itself."
    );

    if ($text === null) {
        return no_definition();
    }

    $text = trim((string) preg_replace('/\s+/', ' ', $text));
    if (@mkdir($cache, 0700, true) || is_dir($cache)) {
        @file_put_contents($file, $text, LOCK_EX);
    }

    return ['definition' => $text, 'source' => 'claude'];
}

/** No definition available — and not worth caching a day of that answer. */
function no_definition(): array
{
    header('Cache-Control: no-store');

    return ['definition' => null, 'source' => null];
}

/**
 * Binary-search the lexicon for $word and return the text following the
 * headword, or null when the word is not in the list.
 *
 * nwl2023.txt is one entry per line ("HEADWORD definition...") sorted by byte
 * value, so ~23 seeks answer any lookup without reading the 7.5 MB into memory.
 */
function lexicon_lookup(string $path, string $word): ?string
{
    $fh = @fopen($path, 'rb');
    if ($fh === false) {
        error_log('[scrabble-api] Lexicon file unreadable: ' . $path);
        send_json(['error' => 'The word list is unavailable on the server.'], 500);
    }

    // Invariant: the entry, if present, starts at a byte offset in [$lo, $hi),
    // and $lo is always itself the start of a line.
    $lo = 0;
    $hi = (int) filesize($path);

    try {
        while ($lo < $hi) {
            $start = line_start($fh, intdiv($lo + $hi, 2), $lo);

            fseek($fh, $start);
            $line = fgets($fh);
            if ($line === false) {
                $hi = $start;
                continue;
            }
            $end = ftell($fh);

            $space = strpos($line, ' ');
            $head = $space === false ? rtrim($line, "\n") : substr($line, 0, $space);

            $cmp = strcmp($head, $word);
            if ($cmp === 0) {
                return $space === false ? '' : rtrim(substr($line, $space + 1), "\n");
            }
            if ($cmp < 0) {
                $lo = $end;     // this line and everything before it sorts lower
            } else {
                $hi = $start;   // this line and everything after it sorts higher
            }
        }
    } finally {
        fclose($fh);
    }

    return null;
}

/**
 * Byte offset where the line containing $pos begins, never reaching back
 * before $floor (which the caller guarantees is itself a line start).
 */
function line_start($fh, int $pos, int $floor): int
{
    if ($pos <= $floor) {
        return $floor;
    }

    // The longest entry is ~220 bytes, so the first window always spans a
    // newline unless the search has already narrowed down to $floor.
    for ($window = 1024; ; $window *= 4) {
        $from = max($floor, $pos - $window);
        $chunk = (string) stream_get_contents($fh, $pos - $from, $from);

        $newline = strrpos($chunk, "\n");
        if ($newline !== false) {
            return $from + $newline + 1;
        }
        if ($from === $floor) {
            return $floor;
        }
    }
}

/**
 * Split a lexicon entry into senses. The list's own notation is, for example,
 *
 *   RUN  to move by rapid steps [v RAN, RUNNING, RUNS] : RUNNABLE [adj], RUNNER [n]
 *   FED  a federal agent [n FEDS] / < FEED, to give food to [v]
 *   AAHED  <aah=v> [v]
 *   AD  an {advertisement=n} [n ADS]
 *
 * with " / " between senses, " : " before a sense's related forms,
 * "[pos INFLECTION, ...]" closing each sense, and "<base=pos>" or "< BASE,"
 * marking an inflected form of another word.
 */
function parse_entry(string $entry): array
{
    $senses = [];

    foreach (explode(' / ', $entry) as $chunk) {
        [$body, $relatedText] = array_pad(explode(' : ', $chunk, 2), 2, null);

        $partOfSpeech = null;
        $inflections = [];
        if (preg_match('/^(.*?)\s*\[([a-z]+)(?:\s+([A-Z]+(?:,\s*[A-Z]+)*))?\]$/', $body, $m)) {
            $body = $m[1];
            $partOfSpeech = expand_part_of_speech($m[2]);
            if (($m[3] ?? '') !== '') {
                $inflections = preg_split('/,\s*/', $m[3]) ?: [];
            }
        }

        $formOf = null;
        if (preg_match('/^<([A-Za-z\'-]+)=[a-z]+>$/', $body, $m)) {
            $formOf = strtoupper($m[1]);   // the whole sense just points at the base word
            $body = '';
        } elseif (preg_match('/^<\s*([A-Z]+),\s*(.*)$/', $body, $m)) {
            $formOf = $m[1];
            $body = $m[2];
        }

        $senses[] = [
            'definition'   => tidy_definition($body),
            'formOf'       => $formOf,
            'partOfSpeech' => $partOfSpeech,
            'inflections'  => array_values($inflections),
            'related'      => parse_related($relatedText),
        ];
    }

    return $senses;
}

/** Turn the list's inline markup into plain prose. */
function tidy_definition(string $text): ?string
{
    $text = str_replace('{mdash}', "\u{2014}", $text);
    $text = (string) preg_replace('/\{([^=}]+)=[a-z]+\}/', '$1', $text);
    $text = trim($text);

    return $text === '' ? null : $text;
}

/** Parse "RUNNABLE [adj], RUNNER [n]" into a list of related words. */
function parse_related(?string $text): array
{
    if ($text === null) {
        return [];
    }

    preg_match_all('/([A-Z]+)\s*\[([a-z]+)\]/', $text, $matches, PREG_SET_ORDER);

    $related = [];
    foreach ($matches as $match) {
        $related[] = [
            'word'         => $match[1],
            'partOfSpeech' => expand_part_of_speech($match[2]),
        ];
    }

    return $related;
}

/** Spell out the list's part-of-speech abbreviations. */
function expand_part_of_speech(string $abbreviation): string
{
    return [
        'n'       => 'noun',
        'v'       => 'verb',
        'adj'     => 'adjective',
        'adv'     => 'adverb',
        'pron'    => 'pronoun',
        'prep'    => 'preposition',
        'conj'    => 'conjunction',
        'interj'  => 'interjection',
        'article' => 'article',
    ][$abbreviation] ?? $abbreviation;
}
