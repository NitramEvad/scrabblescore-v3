<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

apply_cors();

/* ----------------------------------------------------------------------------
 * POST /api/ai.php — server-side proxy for the Anthropic API.
 *
 * The API key lives in config.local.php and never reaches the browser. The
 * prompt is built here from a fixed `kind`, so this endpoint can only produce
 * the two app-specific texts and can't be abused as a general LLM proxy.
 *
 * Request:  { "kind": "poem", "winner": "...", "loser": "...",
 *             "winnerScore": 0, "loserScore": 0 }
 *           { "kind": "quip", "player": "...", "minutes": 1 }
 * Response: { "text": "..." }  or  { "text": null }  on any failure.
 * -------------------------------------------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    send_json(['error' => 'Method not allowed'], 405);
}

// Protect the Anthropic budget from runaway/abusive callers.
rate_limit('ai', 40, 3600);

$cfg = load_config();
$apiKey = $cfg['anthropic_api_key'] ?? '';
if ($apiKey === '') {
    // Not configured — let the client use its built-in fallback text.
    send_json(['text' => null]);
}

$input = json_decode(file_get_contents('php://input') ?: 'null', true);
if (!is_array($input)) {
    send_json(['text' => null], 400);
}

$kind = $input['kind'] ?? '';

/** Trim and length-cap a name so prompts stay bounded. */
$name = static fn($v): string => mb_substr(trim((string) $v), 0, 64);
/** Clamp a score to a sane non-negative integer. */
$score = static fn($v): int => max(0, min(100000, (int) $v));

if ($kind === 'poem') {
    $winner = $name($input['winner'] ?? '');
    $loser = $name($input['loser'] ?? '');
    $prompt = "Write a short, playful, slightly over-the-top celebratory poem "
        . "(4-6 lines) praising {$winner} for their glorious Scrabble victory over "
        . "{$loser}. The final score was {$score($input['winnerScore'] ?? 0)} to "
        . "{$score($input['loserScore'] ?? 0)}. Be funny and theatrical, perhaps "
        . "gently teasing the loser. Keep it lighthearted and fun. Just the poem, "
        . "no introduction.";
    $maxTokens = 1000;
} elseif ($kind === 'quip') {
    $player = $name($input['player'] ?? '');
    $minutes = max(1, min(600, (int) ($input['minutes'] ?? 1)));
    $plural = $minutes > 1 ? 's' : '';
    $prompt = "Write a single short, cheeky one-liner (max 15 words) gently "
        . "mocking {$player} for taking {$minutes} minute{$plural} on their "
        . "Scrabble turn. Be playful and funny, not mean. Just the quip, nothing else.";
    $maxTokens = 200;
} else {
    send_json(['text' => null], 400);
}

$model = $cfg['anthropic_model'] ?? 'claude-sonnet-4-20250514';

$text = call_anthropic($apiKey, $model, $maxTokens, $prompt);
send_json(['text' => $text]);

/* -------------------------------------------------------------------------- */

/** Call the Anthropic Messages API and return the text, or null on failure. */
function call_anthropic(string $apiKey, string $model, int $maxTokens, string $prompt): ?string
{
    $payload = json_encode([
        'model'      => $model,
        'max_tokens' => $maxTokens,
        'messages'   => [['role' => 'user', 'content' => $prompt]],
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_POSTFIELDS     => $payload,
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        error_log('[scrabble-api] Anthropic call failed: ' . ($err ?: "HTTP {$status}"));
        return null;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || empty($data['content']) || !is_array($data['content'])) {
        return null;
    }

    $text = '';
    foreach ($data['content'] as $block) {
        if (isset($block['text'])) {
            $text .= ($text === '' ? '' : "\n") . $block['text'];
        }
    }

    return $text !== '' ? $text : null;
}
