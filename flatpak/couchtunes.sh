#!/bin/sh
# Electron needs zypak to start its sandbox inside Flatpak.
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"
# Full screen is reliable through XWayland (like the AppImage); native Wayland left a gap at the screen edges on GNOME.
# To try native Wayland instead:  flatpak run --env=COUCHTUNES_WAYLAND=1 <app id>
if [ -n "$COUCHTUNES_WAYLAND" ]; then PLATFORM="--ozone-platform-hint=auto"; else PLATFORM="--ozone-platform=x11"; fi
exec zypak-wrapper /app/couchtunes/couchtunes $PLATFORM "$@"
