# Deployment

The app is a static React frontend plus a small PHP + MySQL API. Both are served
from the same domain (`scrabblescore.tookay.net`), so there is no CORS to
configure.

```
public_html/
├── index.html, assets/, sw.js, ...   ← built frontend (from dist/)
└── api/
    ├── db.php
    ├── games.php
    ├── head-to-head.php
    ├── ai.php
    ├── words.php
    ├── nwl2023.txt                   ← the Scrabble word list (7.5 MB)
    ├── config.example.php
    ├── config.local.php              ← created manually, holds DB credentials
    └── .htaccess
```

CI (`.github/workflows/deploy.yml`) builds the frontend, copies `api/` into
`dist/api/`, and FTP-uploads `dist/` to `public_html/`. `config.local.php` is
never committed or uploaded, so the deploy never touches your credentials.

## One-time setup on Ecoweb (cPanel)

### 1. Create the database

In cPanel → **MySQL® Databases**:

1. Create a database, e.g. `tookay_scrabble`.
2. Create a user with a strong password.
3. Add the user to the database with **All Privileges**.

cPanel prefixes the names (e.g. `tookay_scrabble`, `tookay_scrabbleuser`) — note
the exact final names.

### 2. Create the table

In cPanel → **phpMyAdmin**, select the new database, open the **Import** tab, and
import [`db/schema.sql`](db/schema.sql) (or paste it into the **SQL** tab and run).

### 3. Add the API credentials

Copy `api/config.example.php` to `api/config.local.php` in `public_html/api/`
(via cPanel File Manager or FTP) and fill in the values from step 1:

```php
return [
    'db_host'        => 'localhost',
    'db_name'        => 'tookay_scrabble',
    'db_user'        => 'tookay_scrabbleuser',
    'db_pass'        => 'your_db_password',
    'db_charset'     => 'utf8mb4',
    'allowed_origin' => '',   // same-origin: leave empty

    // Optional — enables AI poems/quips. Stays server-side, never in the browser.
    'anthropic_api_key' => 'sk-ant-...',
    'anthropic_model'   => 'claude-sonnet-4-20250514',
];
```

That's it — push to `master` (or run the workflow) and the frontend + API deploy
together.

> **AI poems/quips:** the Anthropic key lives only in `config.local.php` on the
> server and is proxied through `api/ai.php`, so it is never shipped to the
> browser. Leave `anthropic_api_key` empty to use the built-in fallback text.

## The word list

`api/words.php` answers the **Words** lookup in the app. It binary-searches
`api/nwl2023.txt` — the NASPA Word List 2023, 196,601 entries with their own
definitions — so a lookup needs no database and no outbound call, and the 7.5 MB
file is never read into memory. The list deploys with the rest of `api/`, and
`.htaccess` keeps it from being served as a download.

Not every entry defines itself. Inflected forms point at their base word
(`AAHED <aah=v>`), which `words.php` resolves with a second search, but around a
fifth of the list gives only a part of speech (`ACCOUNTANT [n ACCOUNTANTS]`). For
those the app asks Claude when the user expands the result, caching the answer in
the system temp directory and labelling it on screen as written by Claude.
Without `anthropic_api_key` the app just says the list doesn't define the word —
the green/red verdict never depends on it.

To rebuild the file from a newer word list:

```bash
node scripts/build-lexicon.mjs path/to/NWL2024.txt   # validates and re-sorts
```

The word list and its definitions are the copyright of NASPA and Merriam-Webster;
they ship here for personal use, not redistribution.

## Verifying

- `https://scrabblescore.tookay.net/api/games.php` should return `[]` (or a JSON
  list of games), not a PHP error.
- `https://scrabblescore.tookay.net/api/words.php?w=qi` should return
  `"valid":true` with a definition.
- `https://scrabblescore.tookay.net/api/nwl2023.txt` should be **forbidden**.
- Play and finish a game; it should appear under **Game History**.

## Running on a Raspberry Pi instead

The same PHP code runs on a Pi:

1. Install Apache, PHP, and MariaDB: `sudo apt install apache2 php php-mysql mariadb-server`
2. Create the DB/user and import `db/schema.sql` (`mysql -u root -p < db/schema.sql`).
3. Copy the `api/` folder into the web root (e.g. `/var/www/html/api/`) and create
   `config.local.php` there.
4. Serve the built frontend from the same web root, **or** host the frontend
   elsewhere and point it at the Pi by setting `VITE_API_BASE_URL` (and set
   `allowed_origin` in `config.local.php` to the frontend's origin).

## Local development

```bash
npm install
npm run dev          # frontend on http://localhost:5173
```

For the API locally, run PHP's built-in server against the `api/` folder and set
`VITE_API_BASE_URL=http://localhost:8000` in a `.env` file:

```bash
php -S localhost:8000 -t api
```
