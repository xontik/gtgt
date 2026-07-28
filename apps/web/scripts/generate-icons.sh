#!/usr/bin/env bash
# Regenerates apps/web/public/icon-*.png from favicon.svg. Safe to re-run
# any time favicon.svg changes - always overwrites, never accumulates.
#
# Requires: rsvg-convert and convert (ImageMagick)
#   brew install librsvg imagemagick
set -euo pipefail

cd "$(dirname "$0")/../public"

rsvg-convert -w 192 -h 192 favicon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 favicon.svg -o icon-512.png

# Maskable icon needs ~20% safe-zone padding so OS icon masks don't crop
# the logo - render smaller onto a square canvas instead of edge-to-edge.
tmp_inner=$(mktemp -t icon-inner-XXXX.png)
trap 'rm -f "$tmp_inner"' EXIT
rsvg-convert -w 410 -h 410 favicon.svg -o "$tmp_inner"
magick_cmd=$(command -v magick || echo convert)
"$magick_cmd" -size 512x512 xc:white "$tmp_inner" -gravity center -composite icon-maskable-512.png

echo "Regenerated icon-192.png, icon-512.png, icon-maskable-512.png"
