<?php

/**
 * Copy this file to `config.local.php` on the server and fill in the real
 * MySQL credentials from your cPanel "MySQL Databases" page.
 *
 * config.local.php is gitignored and is NOT uploaded by the deploy workflow,
 * so your credentials never live in the repository.
 */

return [
    // Usually 'localhost' on cPanel shared hosting.
    'db_host'    => 'localhost',

    // cPanel prefixes DB and user names, e.g. "tookay_scrabble".
    'db_name'    => 'your_cpanel_dbname',
    'db_user'    => 'your_cpanel_dbuser',
    'db_pass'    => 'your_db_password',

    'db_charset' => 'utf8mb4',

    // Leave empty for a same-origin deployment (frontend + API on the same
    // domain, e.g. scrabblescore.tookay.net). Only set this if the frontend is
    // served from a DIFFERENT origin than the API, e.g. 'https://example.com'.
    'allowed_origin' => '',
];
