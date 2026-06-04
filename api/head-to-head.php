<?php

declare(strict_types=1);

require __DIR__ . '/db.php';

apply_cors();

/* ----------------------------------------------------------------------------
 * GET /api/head-to-head.php?p1=Alice&p2=Bob
 *
 * Returns the win/loss/draw tally from player1's (p1) perspective across all
 * games between the two players (case-insensitive, order-independent).
 * -------------------------------------------------------------------------- */

$p1 = trim($_GET['p1'] ?? '');
$p2 = trim($_GET['p2'] ?? '');

if ($p1 === '' || $p2 === '') {
    send_json(['wins' => 0, 'losses' => 0, 'draws' => 0]);
}

$pdo = get_db();

$stmt = $pdo->prepare(
    'SELECT winner FROM games
     WHERE (LOWER(player1) = LOWER(:a1) AND LOWER(player2) = LOWER(:b1))
        OR (LOWER(player1) = LOWER(:b2) AND LOWER(player2) = LOWER(:a2))'
);
$stmt->execute([':a1' => $p1, ':b1' => $p2, ':b2' => $p2, ':a2' => $p1]);

$wins = 0;
$losses = 0;
$draws = 0;
$p1Lower = mb_strtolower($p1);

foreach ($stmt->fetchAll() as $row) {
    $winner = $row['winner'];
    if ($winner === null || $winner === '') {
        $draws++;
    } elseif (mb_strtolower($winner) === $p1Lower) {
        $wins++;
    } else {
        $losses++;
    }
}

send_json(['wins' => $wins, 'losses' => $losses, 'draws' => $draws]);
