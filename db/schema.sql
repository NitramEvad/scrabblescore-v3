-- Scrabble Score Tracker — MySQL / MariaDB schema
--
-- Import this once via cPanel > phpMyAdmin (select your database first, then the
-- "Import" tab), or from the command line:
--   mysql -u <user> -p <database> < db/schema.sql

CREATE TABLE IF NOT EXISTS games (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_date        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    player1          VARCHAR(64)     NOT NULL,
    player2          VARCHAR(64)     NOT NULL,
    player1_score    INT             NOT NULL,
    player2_score    INT             NOT NULL,
    winner           VARCHAR(64)     NULL,
    turns            LONGTEXT        NOT NULL,           -- JSON-encoded array of turns
    duration_minutes INT             NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_players (player1, player2),
    KEY idx_game_date (game_date)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
