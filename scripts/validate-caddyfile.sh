#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

image=$(node --input-type=module -e 'import { readFileSync } from "node:fs"; import { productionCaddyImage } from "./scripts/deploy-gate.mjs"; process.stdout.write(productionCaddyImage(readFileSync("apps/web/Dockerfile", "utf8")))')

if [ -z "$image" ]; then
  echo "production Caddy image not found in apps/web/Dockerfile" >&2
  exit 1
fi

caddyfile=${CADDYFILE:-apps/web/Caddyfile}
echo "validating ${caddyfile} with ${image}"
docker run --rm \
  -v "${PWD}/${caddyfile}:/etc/caddy/Caddyfile:ro" \
  "$image" \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
