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
    echo json_encode($data);
    exit;
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
