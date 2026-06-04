# PHP + Composer; install MySQL driver (composer:2 image does not include pdo_mysql by default)
FROM composer:2

RUN apk add --no-cache mariadb-dev \
    && docker-php-ext-install pdo_mysql

WORKDIR /var/www/html

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
