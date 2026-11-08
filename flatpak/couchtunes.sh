#!/bin/sh
# Electron needs zypak to start its sandbox inside Flatpak.
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"

# Use the desktop's mouse cursor theme and size (asked from the desktop through the settings portal).
portal() { gdbus call --session --dest org.freedesktop.portal.Desktop --object-path /org/freedesktop/portal/desktop \
  --method org.freedesktop.portal.Settings.Read org.gnome.desktop.interface "$1" 2>/dev/null; }
if [ -z "$XCURSOR_THEME" ]; then t="$(portal cursor-theme | sed -n "s/.*'\([^']*\)'.*/\1/p")"; [ -n "$t" ] && export XCURSOR_THEME="$t"; fi
if [ -z "$XCURSOR_SIZE" ]; then z="$(portal cursor-size | grep -o '[0-9][0-9]*' | head -n1)"; [ -n "$z" ] && export XCURSOR_SIZE="$z"; fi
export XCURSOR_PATH="$HOME/.icons:$HOME/.local/share/icons:/run/host/share/icons:/run/host/user-share/icons:/usr/share/icons${XCURSOR_PATH:+:$XCURSOR_PATH}"

# Native Wayland by default (sharp picture on scaled screens). If it misbehaves on your desktop, run with the X11 fallback:
#   flatpak run --env=COUCHTUNES_X11=1 <app id>
if [ -n "$COUCHTUNES_X11" ]; then PLATFORM="--ozone-platform=x11"; else PLATFORM="--ozone-platform-hint=auto"; fi
exec zypak-wrapper /app/couchtunes/couchtunes $PLATFORM "$@"
