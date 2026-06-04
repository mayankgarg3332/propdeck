# Propdeck (TripDeck)

Laravel + React proposal studio — **one project**, React in `resources/js`, API in `routes/api.php`.

## Requirements

- PHP 8.3+ and Composer
- Node.js 20+
- **Or** Docker Desktop (see [Docker](#docker) below)

## Docker

Run the full stack (MySQL, Laravel API, Vite dev server):

```bash
docker compose up --build
```

### Build fails with `rpc error: code = Unavailable ... EOF`

This usually means **Docker Desktop crashed or timed out** during the image build (common on Windows), not a bug in the app.

1. **Restart Docker Desktop** (whale icon → Restart), then retry.
2. **Settings → Resources**: give Docker at least **4 GB RAM** and **20 GB** disk.
3. Build the app image alone with plain logs:
   ```bash
   docker compose build app --no-cache --progress=plain
   ```
4. If it still fails, disable BuildKit and rebuild:
   ```powershell
   $env:DOCKER_BUILDKIT=0
   $env:COMPOSE_DOCKER_CLI_BUILD=0
   docker compose build app
   docker compose up
   ```
5. The dev `Dockerfile` uses the **`composer:2`** image (PHP extensions preinstalled) so the build should finish in seconds after the first pull.

First time, seed demo data (optional):

```bash
docker compose exec app php artisan db:seed --force
```

| Service | URL |
|---------|-----|
| App | http://localhost:8000 |
| Vite (HMR) | http://localhost:5173 |
| MySQL | `localhost:3307` (user `root`, password `secret`, database `propdeck`) |

Stop:

```bash
docker compose down
```

If the app logs `vendor/autoload.php` missing after an earlier run, remove the old empty vendor volume and restart:

```bash
docker compose down
docker volume rm propdeck_vendor_data 2>/dev/null || true
docker compose up --build
```

Environment overrides (optional `.env` in project root):

- `APP_PORT` — Laravel port (default `8000`)
- `VITE_PORT` — Vite port (default `5173`)
- `DB_PORT` — MySQL host port (default `3307`)
- `DB_PASSWORD` — MySQL root password (default `secret`)

Production-style image (built assets, no Vite container):

```bash
docker build -f Dockerfile.prod -t propdeck:prod .
docker run --rm -p 8000:8000 --env-file .env.docker.example propdeck:prod
```

## Setup (local, without Docker)

```bash
composer install
cp .env.example .env   # if needed
php artisan key:generate
php artisan migrate:fresh --seed
npm install
```

## Development

Run Laravel and Vite together:

```bash
composer dev
```

On Windows, `composer dev` runs only the PHP server and Vite (Pail and the queue worker need Unix `pcntl`). On macOS/Linux you can use `composer dev:full` for queue + log tailing too.

Or separately:

```bash
php artisan serve
npm run dev
```

Open **http://127.0.0.1:8000** (Laravel serves the app; Vite hot-reloads assets).

## Project layout

```
app/                 # Laravel (API controllers, models)
database/migrations/ # MySQL schema (clients, products, proposals, …)
database/seeders/    # Demo data (TripDeckSeeder → DB only)
resources/js/        # React SPA (reads/writes via API → MySQL)
resources/css/       # App styles
resources/views/     # app.blade.php shell
routes/api.php       # REST API
routes/web.php       # SPA fallback → React
public/              # Static assets + Laravel entry
```

All app data is stored in **MySQL**. The React UI never uses local JSON or IndexedDB. New clients, proposals, and products are saved through the API into the database.

## Production build

```bash
npm run build
php artisan serve
```

Assets are compiled into `public/build/` via Vite.
