<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ----------------------------------------------------------------------------
 * GET /api/games.php — return all games, newest first.
 * -------------------------------------------------------------------------- */
if ($method === 'GET') {
    $pdo = get_db();
    $stmt = $pdo->query(
        'SELECT id, game_date, player1, player2, player1_score, player2_score,
                winner, turns, duration_minutes
         FROM games
         ORDER BY game_date DESC, id DESC'
    );

    $games = array_map(static function (array $row): array {
        return [
            'id'               => (string) $row['id'],
            'game_date'        => to_iso8601($row['game_date']),
            'player1'          => $row['player1'],
            'player2'          => $row['player2'],
            'player1_score'    => (int) $row['player1_score'],
            'player2_score'    => (int) $row['player2_score'],
            'winner'           => $row['winner'],
            'turns'            => json_decode($row['turns'] ?? '[]', true) ?: [],
            'duration_minutes' => (int) $row['duration_minutes'],
        ];
    }, $stmt->fetchAll());

    send_json($games);
}

/* ----------------------------------------------------------------------------
 * POST /api/games.php — insert a new game record.
 * -------------------------------------------------------------------------- */
if ($method === 'POST') {
    // Generous limit — guards against spam without blocking real play.
    rate_limit('save', 120, 3600);

    $input = json_decode(file_get_contents('php://input') ?: 'null', true);

    if (!is_array($input)) {
        send_json(['success' => false, 'error' => 'Invalid JSON body.'], 400);
    }

    foreach (['player1', 'player2', 'player1_score', 'player2_score'] as $field) {
        if (!array_key_exists($field, $input)) {
            send_json(['success' => false, 'error' => "Missing field: {$field}"], 400);
        }
    }

    // Validate and normalise input (defends storage from oversized/garbage data).
    $player1 = trim((string) $input['player1']);
    $player2 = trim((string) $input['player2']);
    if ($player1 === '' || $player2 === '') {
        send_json(['success' => false, 'error' => 'Player names are required.'], 400);
    }
    if (mb_strlen($player1) > 64 || mb_strlen($player2) > 64) {
        send_json(['success' => false, 'error' => 'Player names are too long.'], 400);
    }

    $turns = $input['turns'] ?? [];
    if (!is_array($turns) || count($turns) > 2000) {
        send_json(['success' => false, 'error' => 'Invalid turns data.'], 400);
    }
    $turnsJson = json_encode($turns);
    if ($turnsJson === false || strlen($turnsJson) > 200000) {
        send_json(['success' => false, 'error' => 'Turns payload too large.'], 400);
    }

    $clampScore = static fn($v): int => max(0, min(100000, (int) $v));
    $winner = isset($input['winner']) && $input['winner'] !== null
        ? mb_substr(trim((string) $input['winner']), 0, 64)
        : null;

    $pdo = get_db();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO games
                (game_date, player1, player2, player1_score, player2_score,
                 winner, turns, duration_minutes)
             VALUES
                (:game_date, :player1, :player2, :p1score, :p2score,
                 :winner, :turns, :duration)'
        );

        $stmt->execute([
            ':game_date' => to_mysql_datetime($input['game_date'] ?? null),
            ':player1'   => $player1,
            ':player2'   => $player2,
            ':p1score'   => $clampScore($input['player1_score']),
            ':p2score'   => $clampScore($input['player2_score']),
            ':winner'    => $winner,
            ':turns'     => $turnsJson,
            ':duration'  => $clampScore($input['duration_minutes'] ?? 0),
        ]);

        send_json(['success' => true, 'error' => null, 'id' => (string) $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        error_log('[scrabble-api] Insert failed: ' . $e->getMessage());
        send_json(['success' => false, 'error' => 'Database insert failed.'], 500);
    }
}

send_json(['error' => 'Method not allowed'], 405);
