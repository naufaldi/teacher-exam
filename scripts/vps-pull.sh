#!/bin/sh
set -eu

if [ -z "${API_IMAGE:-}" ] || [ -z "${WEB_IMAGE:-}" ]; then
  echo "API_IMAGE and WEB_IMAGE are required" >&2
  exit 1
fi

if [ -z "${GHCR_USER:-}" ]; then
  echo "GHCR_USER is required" >&2
  exit 1
fi

if [ -n "${GHCR_PULL_TOKEN:-}" ]; then
  token=$GHCR_PULL_TOKEN
elif [ -n "${GHCR_TOKEN:-}" ]; then
  token=$GHCR_TOKEN
else
  echo "GHCR_TOKEN is required when GHCR_PULL_TOKEN is unset" >&2
  exit 1
fi

login() {
  printf '%s\n' "$token" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
}

pull_image() {
  image=$1
  attempt=1
  while [ "$attempt" -le 3 ]; do
    echo "Pulling ${image} (attempt ${attempt} of 3)..."
    if docker pull "$image"; then
      return 0
    fi
    if [ "$attempt" -eq 3 ]; then
      echo "pull failed after 3 attempts: ${image}" >&2
      return 1
    fi
    echo "pull failed, re-login and retry: ${image}" >&2
    login
    attempt=$((attempt + 1))
  done
}

docker image prune -f
login
pull_image "$API_IMAGE"
pull_image "$WEB_IMAGE"
