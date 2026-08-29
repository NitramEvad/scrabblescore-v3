<?php

declare(strict_types=1);

/**
 * Shared helpers for the Scrabble Score Tracker API.
 *
 * Database credentials live in config.local.php, which is created manually on
 * the server (see config.example.php) and is NOT committed or deployed by CI.
 */

/** Load configuration from config.local.php. */
function load_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $local = __DIR__ . '/config.local.php';
    if (!is_file($local)) {
        send_json(
            ['error' => 'Server not configured: api/config.local.php is missing. Copy config.example.php and fill in your MySQL credentials.'],
            500
        );
    }

    $config = require $local;
    return $config;
}

/** Open a PDO connection to MySQL using the loaded config. */
function get_db(): PDO
{
    $cfg = load_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $cfg['db_host'],
        $cfg['db_name'],
        $cfg['db_charset'] ?? 'utf8mb4'
    );

    try {
        return new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // Don't leak credentials/host details to the client.
        error_log('[scrabble-api] DB connection failed: ' . $e->getMessage());
        send_json(['error' => 'Database connection failed.'], 500);
    }
}

/** Send a JSON response and stop. */
function send_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data);
    exit;
}

/**
 * Best-effort per-IP rate limit. Fails open (allows the request) if it can't
 * read/write its state, so a transient filesystem issue never breaks the app.
 * Sends a 429 and stops the request when the limit is exceeded.
 */
function rate_limit(string $bucket, int $max, int $windowSeconds): void
{
    $dir = sys_get_temp_dir() . '/scrabble_ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return; // can't create state dir — fail open
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = $dir . '/' . $bucket . '_' . md5($ip) . '.json';
    $now = time();

    $hits = [];
    if (is_file($file)) {
        $decoded = json_decode((string) @file_get_contents($file), true);
        if (is_array($decoded)) {
            $hits = $decoded;
        }
    }

    // Keep only timestamps inside the current window.
    $hits = array_values(array_filter($hits, static fn($t) => $t > $now - $windowSeconds));

    if (count($hits) >= $max) {
        send_json(['error' => 'Rate limit exceeded. Please slow down.'], 429);
    }

    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

/**
 * Apply CORS headers when an allowed_origin is configured, and short-circuit
 * preflight OPTIONS requests. For a same-origin deployment (frontend and API
 * on the same domain) allowed_origin can be left empty.
 */
function apply_cors(): void
{
    $cfg = load_config();
    $origin = $cfg['allowed_origin'] ?? '';

    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** Convert an incoming date (ISO 8601 or null) to MySQL DATETIME in UTC. */
function to_mysql_datetime(?string $value): string
{
    try {
        $dt = $value ? new DateTime($value) : new DateTime('now');
    } catch (Exception $e) {
        $dt = new DateTime('now');
    }
    $dt->setTimezone(new DateTimeZone('UTC'));
    return $dt->format('Y-m-d H:i:s');
}

/** Convert a MySQL DATETIME (UTC) back to an ISO 8601 string with Z suffix. */
function to_iso8601(?string $value): ?string
{
    if (!$value) {
        return null;
    }
    try {
        $dt = new DateTime($value, new DateTimeZone('UTC'));
    } catch (Exception $e) {
        return $value;
    }
    return $dt->format('Y-m-d\TH:i:s.000\Z');
}

/**
 * Call the Anthropic Messages API and return the text, or null on failure.
 *
 * Shared by ai.php (poems and quips) and words.php (definitions for the words
 * the Scrabble list leaves undefined). Every caller builds its own prompt from
 * a fixed template, so the key never backs a general-purpose LLM proxy.
 */
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
