#!/bin/sh
# Electron needs zypak to start its sandbox inside Flatpak.
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"

# Let the app find your mouse cursor theme.
export XCURSOR_PATH="$HOME/.icons:$HOME/.local/share/icons:/run/host/share/icons:/run/host/user-share/icons:/usr/share/icons${XCURSOR_PATH:+:$XCURSOR_PATH}"

# Native Wayland (sharp picture and the right cursor on scaled screens). If it misbehaves on your desktop, run with the X11 fallback:
#   flatpak run --env=COUCHTUNES_X11=1 <app id>
if [ -n "$COUCHTUNES_X11" ]; then PLATFORM="--ozone-platform=x11"; else PLATFORM="--ozone-platform-hint=auto"; fi
exec zypak-wrapper /app/couchtunes/couchtunes $PLATFORM "$@"
