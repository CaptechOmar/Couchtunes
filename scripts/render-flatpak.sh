#!/usr/bin/env bash
# Fills in the app id and owner in the Flatpak files and writes them to flatpak/out/.
# Usage: scripts/render-flatpak.sh <github-owner> [branch]      (prints the app id; branch defaults to master, use beta for pre-releases)
set -euo pipefail
cd "$(dirname "$0")/.."
OWNER="${1:?Give your GitHub user or organisation name}"
BRANCH="${2:-master}"
# Flatpak ids are lower-case words separated by dots; hyphens in a user name become underscores.
SAFE="$(echo "$OWNER" | tr 'A-Z-' 'a-z_')"
APP_ID="io.github.${SAFE}.Couchtunes"
OUT=flatpak/out
mkdir -p "$OUT"
cp flatpak/couchtunes.sh flatpak/couchtunes-*.png "$OUT/"
sed "s/@APP_ID@/${APP_ID}/g" flatpak/couchtunes.desktop > "$OUT/couchtunes.desktop"
if [ "$BRANCH" != master ]; then sed -i "s/^Name=Couchtunes\$/Name=Couchtunes (${BRANCH^})/" "$OUT/couchtunes.desktop"; fi
sed -e "s/@APP_ID@/${APP_ID}/g" -e "s/@OWNER@/${OWNER}/g" flatpak/couchtunes.metainfo.xml > "$OUT/couchtunes.metainfo.xml"
sed "s/@APP_ID@/${APP_ID}/g" flatpak/couchtunes.yml > "$OUT/${APP_ID}.yml"
if [ "$BRANCH" != master ]; then sed -i "s/^app-id: .*/&\nbranch: ${BRANCH}/" "$OUT/${APP_ID}.yml"; fi
echo "$APP_ID"
