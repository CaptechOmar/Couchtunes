#!/usr/bin/env bash
# Turns Couchtunes.flatpak into a small signed Flatpak repository that can be hosted on GitHub Pages,
# so people can install once and then update with `flatpak update` or their software center.
# Usage: scripts/gen-flatpak-repo.sh <Couchtunes.flatpak> <github-owner> <repo-name> <site-dir>
# The channels already published (stable = master, beta) are fetched from the live site first, so adding one keeps the other.
# Needs flatpak and gpg. Set FLATPAK_GPG_KEY_ID (a key in the local keyring) to sign; without it the repo is unsigned.
set -euo pipefail
BUNDLE="${1:?bundle}"; OWNER="${2:?owner}"; NAME="${3:?repo name}"; SITE="${4:?site dir}"
SAFE="$(echo "$OWNER" | tr 'A-Z-' 'a-z_')"; APP_ID="io.github.${SAFE}.Couchtunes"
LOWER="$(echo "$OWNER" | tr 'A-Z' 'a-z')"
URL="https://${LOWER}.github.io/${NAME}/flatpak/repo/"
DIR="$SITE/flatpak"; REPO="$DIR/repo"
mkdir -p "$DIR"; rm -rf "$REPO"
SIGN=(); GPGLINE=""
if [ -n "${FLATPAK_GPG_KEY_ID:-}" ]; then
  SIGN=(--gpg-sign="$FLATPAK_GPG_KEY_ID")
  GPGLINE="GPGKey=$(gpg --export "$FLATPAK_GPG_KEY_ID" | base64 -w0)"
fi
ostree --repo="$REPO" init --mode=archive-z2
# Bring back what is already published (the other channel and its history). The first time there is nothing yet.
code="$(curl -s -o /dev/null -w '%{http_code}' --retry 3 "${URL}config" || true)"
if [ "$code" = 200 ]; then
  ostree --repo="$REPO" remote add --no-gpg-verify live "$URL"
  ostree --repo="$REPO" pull --mirror live
  ostree --repo="$REPO" remote delete live
elif [ "$code" != 404 ]; then echo "Could not reach the published repo (HTTP $code); stopping so nothing gets overwritten."; exit 1; fi
flatpak build-import-bundle "${SIGN[@]}" "$REPO" "$BUNDLE"
flatpak build-update-repo "${SIGN[@]}" --generate-static-deltas --prune "$REPO"
cat > "$DIR/couchtunes.flatpakrepo" <<EOT
[Flatpak Repo]
Title=Couchtunes
Url=${URL}
Homepage=https://github.com/${OWNER}/${NAME}
Comment=Couchtunes, a Navidrome player for TVs and big screens
${GPGLINE}
EOT
cat > "$DIR/couchtunes.flatpakref" <<EOT
[Flatpak Ref]
Title=Couchtunes
Name=${APP_ID}
Branch=master
Url=${URL}
SuggestRepoName=couchtunes
IsRuntime=false
RuntimeRepo=https://dl.flathub.org/repo/flathub.flatpakrepo
Homepage=https://github.com/${OWNER}/${NAME}
${GPGLINE}
EOT
sed 's/^Branch=master/Branch=beta/; s/^Title=Couchtunes/Title=Couchtunes (Beta)/' "$DIR/couchtunes.flatpakref" > "$DIR/couchtunes-beta.flatpakref"
echo "Flatpak repo written to $DIR  (${URL})"
