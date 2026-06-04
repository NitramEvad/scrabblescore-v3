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
];
```

That's it — push to `master` (or run the workflow) and the frontend + API deploy
together.

## Verifying

- `https://scrabblescore.tookay.net/api/games.php` should return `[]` (or a JSON
  list of games), not a PHP error.
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
