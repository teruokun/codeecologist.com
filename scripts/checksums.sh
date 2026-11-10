#!/bin/sh
# Writes dist/.well-known/site-checksums.txt: the SHA-256 of every file in
# dist/ except the checksums file itself, sorted by path, with paths relative
# to dist/. actions/attest signs one provenance subject per line, so every
# served file can be verified on its own with `gh attestation verify`.
#
# Usage: scripts/checksums.sh [distDir]
set -eu

dist=${1:-dist}
out_rel=.well-known/site-checksums.txt
# actions/attest accepts at most 1024 subjects per attestation.
limit=1024

if [ ! -d "$dist" ]; then
  echo "$dist not found. Run \`npm run build\` first." >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  hash() { sha256sum "$@"; }
else
  hash() { shasum -a 256 "$@"; }
fi

mkdir -p "$dist/.well-known"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

(
  cd "$dist"
  # LC_ALL=C gives the same order on every machine.
  find . -type f ! -path "./$out_rel" | sed 's|^\./||' | LC_ALL=C sort | while IFS= read -r file; do
    hash "$file"
  done
) >"$tmp"

count=$(wc -l <"$tmp" | tr -d ' ')
if [ "$count" -gt "$limit" ]; then
  echo "$count files: more than the $limit subjects actions/attest accepts." >&2
  exit 1
fi

mv "$tmp" "$dist/$out_rel"
trap - EXIT
echo "Wrote $dist/$out_rel ($count files)."
