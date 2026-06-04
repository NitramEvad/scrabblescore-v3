<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pdo = get_db();

/* ----------------------------------------------------------------------------
 * GET /api/games.php — return all games, newest first.
 * -------------------------------------------------------------------------- */
if ($method === 'GET') {
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
    $input = json_decode(file_get_contents('php://input') ?: 'null', true);

    if (!is_array($input)) {
        send_json(['success' => false, 'error' => 'Invalid JSON body.'], 400);
    }

    foreach (['player1', 'player2', 'player1_score', 'player2_score'] as $field) {
        if (!array_key_exists($field, $input)) {
            send_json(['success' => false, 'error' => "Missing field: {$field}"], 400);
        }
    }

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
            ':player1'   => (string) $input['player1'],
            ':player2'   => (string) $input['player2'],
            ':p1score'   => (int) $input['player1_score'],
            ':p2score'   => (int) $input['player2_score'],
            ':winner'    => isset($input['winner']) && $input['winner'] !== null
                ? (string) $input['winner']
                : null,
            ':turns'     => json_encode($input['turns'] ?? []),
            ':duration'  => (int) ($input['duration_minutes'] ?? 0),
        ]);

        send_json(['success' => true, 'error' => null, 'id' => (string) $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        error_log('[scrabble-api] Insert failed: ' . $e->getMessage());
        send_json(['success' => false, 'error' => 'Database insert failed.'], 500);
    }
}

send_json(['error' => 'Method not allowed'], 405);
