#!/bin/sh
set -eu
node --experimental-strip-types /opt/preview/preview-server.mjs &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
