#!/bin/sh
set -e

cd /var/www/html

if [ ! -f .env ]; then
  cp .env.example .env
fi

# Sync Docker-injected environment variables into .env so Laravel reads the
# correct values (e.g. DB_HOST=mysql instead of 127.0.0.1 from .env.example).
update_env() {
  local key="$1" val="$2"
  [ -z "$val" ] && return
  if grep -q "^${key}=" .env 2>/dev/null; then
    # Write to a temp file then move — works on both GNU and BusyBox sed
    tmp="$(mktemp)"
    grep -v "^${key}=" .env > "$tmp"
    echo "${key}=${val}" >> "$tmp"
    mv "$tmp" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

update_env DB_HOST        "$DB_HOST"
update_env DB_PORT        "$DB_PORT"
update_env DB_DATABASE    "$DB_DATABASE"
update_env DB_USERNAME    "$DB_USERNAME"
update_env DB_PASSWORD    "$DB_PASSWORD"
update_env SESSION_DRIVER "$SESSION_DRIVER"
update_env CACHE_STORE    "$CACHE_STORE"
update_env QUEUE_CONNECTION "$QUEUE_CONNECTION"

# Wait for MySQL (docker-compose healthcheck usually enough; this helps on slow starts)
if [ -n "$DB_HOST" ]; then
  echo "Waiting for database at ${DB_HOST}:${DB_PORT:-3306}..."
  for i in $(seq 1 30); do
    php -r "
      try {
        new PDO(
          'mysql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: '3306'),
          getenv('DB_USERNAME') ?: 'root',
          getenv('DB_PASSWORD') ?: ''
        );
        exit(0);
      } catch (Throwable \$e) {
        exit(1);
      }
    " 2>/dev/null && break
    sleep 2
  done
fi

# Named volume can create an empty vendor/ dir — check autoload, not just the folder
if [ ! -f vendor/autoload.php ]; then
  echo "Installing PHP dependencies (composer install)..."
  composer install --no-interaction --prefer-dist --no-progress
fi

if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
  php artisan key:generate --force --no-interaction
fi

if ! php -m 2>/dev/null | grep -q pdo_mysql; then
  echo "ERROR: PHP pdo_mysql extension is missing. Rebuild the app image: docker compose build app --no-cache"
  exit 1
fi

php artisan migrate --force --no-interaction

if [ "${RUN_SEED:-false}" = "true" ]; then
  php artisan db:seed --force --no-interaction
fi

exec "$@"
