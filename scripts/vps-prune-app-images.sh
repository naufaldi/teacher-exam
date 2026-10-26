#!/bin/sh
# After a good deploy, remove old teacher-exam API and web image tags.
# Keeps the running IMAGE_TAG, the rollback tag, and any image a running container still uses.
set -eu

safe_tag() {
  case $1 in
    *[!A-Za-z0-9._-]*)
      return 1
      ;;
  esac
  return 0
}

if [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "GITHUB_REPOSITORY is required" >&2
  exit 1
fi

if [ -z "${IMAGE_TAG:-}" ] || ! safe_tag "$IMAGE_TAG"; then
  echo "refusing unsafe image tag" >&2
  exit 1
fi

if [ -n "${PREVIOUS_TAG+x}" ]; then
  previous=$PREVIOUS_TAG
elif [ -f .deploy-previous-tag ]; then
  previous=$(tr -d '[:space:]' < .deploy-previous-tag)
else
  previous=
fi

if [ -n "$previous" ] && ! safe_tag "$previous"; then
  echo "refusing unsafe image tag" >&2
  exit 1
fi

api_repo="ghcr.io/${GITHUB_REPOSITORY}/teacher-exam-api"
web_repo="ghcr.io/${GITHUB_REPOSITORY}/teacher-exam-web"
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

docker image ls --format '{{.Repository}}|{{.Tag}}|{{.ID}}' > "$workdir/images"
docker ps --format '{{.Image}}' > "$workdir/running"
: > "$workdir/keep-ids"

remember_id() {
  printf '%s\n' "$1" >> "$workdir/keep-ids"
}

id_for_ref() {
  ref=$1
  while IFS='|' read -r repo tag id; do
    [ -n "${repo}" ] || continue
    if [ "$ref" = "$id" ] || [ "$ref" = "${repo}:${tag}" ]; then
      remember_id "$id"
    fi
  done < "$workdir/images"
}

while IFS='|' read -r repo tag id; do
  [ -n "${repo}" ] || continue
  if [ "$repo" != "$api_repo" ] && [ "$repo" != "$web_repo" ]; then
    continue
  fi
  if [ "$tag" = "$IMAGE_TAG" ] || { [ -n "$previous" ] && [ "$tag" = "$previous" ]; }; then
    remember_id "$id"
  fi
done < "$workdir/images"

while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  id_for_ref "$ref"
done < "$workdir/running"

if [ -s "$workdir/keep-ids" ]; then
  sort -u "$workdir/keep-ids" -o "$workdir/keep-ids"
fi

: > "$workdir/remove"
while IFS='|' read -r repo tag id; do
  [ -n "${repo}" ] || continue
  if [ "$repo" != "$api_repo" ] && [ "$repo" != "$web_repo" ]; then
    continue
  fi
  if [ "$tag" = "<none>" ] || ! safe_tag "$tag"; then
    continue
  fi
  if [ "$tag" = "$IMAGE_TAG" ] || { [ -n "$previous" ] && [ "$tag" = "$previous" ]; }; then
    continue
  fi
  if [ -s "$workdir/keep-ids" ] && grep -Fxq "$id" "$workdir/keep-ids"; then
    continue
  fi
  printf '%s:%s\n' "$repo" "$tag" >> "$workdir/remove"
done < "$workdir/images"

if [ -s "$workdir/remove" ]; then
  sort -u "$workdir/remove" -o "$workdir/remove"
fi

if [ ! -s "$workdir/remove" ]; then
  echo "no old app images to remove"
  exit 0
fi

while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  echo "removing ${ref}"
  docker image rm "$ref"
done < "$workdir/remove"
