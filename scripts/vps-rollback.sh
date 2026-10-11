#!/bin/sh
set -eu

if [ -n "${PREVIOUS_TAG+x}" ]; then
  prev=$PREVIOUS_TAG
else
  prev=$(tr -d '[:space:]' < .deploy-previous-tag)
fi

case $prev in
  "" )
    echo "no previous image tag" >&2
    exit 1
    ;;
  *[!A-Za-z0-9._-]*)
    echo "refusing unsafe image tag" >&2
    exit 1
    ;;
esac

printf '%s\n' "IMAGE_TAG=${prev} docker compose -f docker-compose.prod.yml --env-file .env.production up -d"

if [ "${DRY_RUN:-0}" = 1 ]; then
  exit 0
fi

grep -v '^IMAGE_TAG=' .env.production > .env.production.tmp
mv .env.production.tmp .env.production
printf 'IMAGE_TAG=%s\n' "$prev" >> .env.production
IMAGE_TAG="$prev" docker compose -f docker-compose.prod.yml --env-file .env.production up -d
echo "rolled back to ${prev}"
# The deploy job must stay red after the previous image is restored.
exit 1
