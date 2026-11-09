#!/usr/bin/env bash
# Makes the AppImage self-updating (for Gear Lever, AppImageLauncher, AppImageUpdate, ...).
# It writes update information into the AppImage and creates the matching .zsync file next to it.
# Usage: scripts/make-zsync.sh <AppImage> <github-owner> <repo-name>
# Needs: zsyncmake (package "zsync") and internet access to fetch appimagetool.
set -euo pipefail
APPIMAGE="$(realpath "${1:?Give the AppImage file}")"
OWNER="${2:?Give the GitHub owner}"
REPO="${3:?Give the GitHub repository name}"
command -v zsyncmake >/dev/null || { echo "zsyncmake is missing: install the 'zsync' package" >&2; exit 1; }
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cp "$APPIMAGE" "$WORK/in.AppImage"; chmod +x "$WORK/in.AppImage"
( cd "$WORK" && ./in.AppImage --appimage-extract >/dev/null && chmod -R a+rX squashfs-root )   # unpack to squashfs-root, readable by everyone
# GitHub downloads sometimes answer 502/504, so retry a few times
dl() { curl -fsSL --retry 6 --retry-delay 5 --retry-all-errors -o "$1" "$2"; }
dl "$WORK/appimagetool" https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
dl "$WORK/runtime-x86_64" https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-x86_64
chmod +x "$WORK/appimagetool"
# Store the app description (with its screenshots) inside the AppImage, so catalogs and Gear Lever can show them.
SAFE="$(echo "$OWNER" | tr 'A-Z-' 'a-z_')"; APP_ID="io.github.${SAFE}.Couchtunes"
mkdir -p "$WORK/squashfs-root/usr/share/metainfo"
sed -e "s/@APP_ID@/${APP_ID}/g" -e "s/@OWNER@/${OWNER}/g" -e 's#<launchable type="desktop-id">[^<]*</launchable>#<launchable type="desktop-id">couchtunes.desktop</launchable>#' \
  "$(dirname "$0")/../flatpak/couchtunes.metainfo.xml" > "$WORK/squashfs-root/usr/share/metainfo/${APP_ID}.appdata.xml"
NAME="$(basename "$APPIMAGE")"
# "latest" means the newest full release on GitHub: pre-releases are never offered as updates.
INFO="gh-releases-zsync|${OWNER}|${REPO}|latest|Couchtunes-*-linux-x86_64.AppImage.zsync"
( cd "$WORK" && ARCH=x86_64 ./appimagetool --appimage-extract-and-run --no-appstream --runtime-file runtime-x86_64 -u "$INFO" squashfs-root "$NAME" >/dev/null )
mv "$WORK/$NAME" "$APPIMAGE"
mv "$WORK/$NAME.zsync" "$APPIMAGE.zsync"
echo "Update info: $INFO"
ls -l "$APPIMAGE" "$APPIMAGE.zsync"
