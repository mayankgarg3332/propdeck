# Propdeck (TripDeck)

Laravel + React proposal studio — **one project**, React in `resources/js`, API in `routes/api.php`.

## Requirements

- PHP 8.3+ and Composer
- Node.js 20+

## Setup

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
