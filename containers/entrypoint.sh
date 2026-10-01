#!/bin/bash
set -euo pipefail
umask 077
mkdir -p "$HOME/.vnc" "$HOME/.config/openbox" "$HOME/Desktop" /tmp/ibot-jobs
# Injected over docker exec stdin by the desktop host; never in Docker env/argv.
while [ ! -s /tmp/ibot-vnc-secret ]; do sleep 0.2; done
IFS= read -r password < /tmp/ibot-vnc-secret || true
x11vnc -storepasswd "$password" "$HOME/.vnc/passwd" >/dev/null 2>&1
unset password
rm -f /tmp/ibot-vnc-secret

# Container restarts preserve /tmp and the browser profile, but none of the
# previous desktop processes remain. Clear their transient display/profile locks.
rm -f -- /tmp/.X0-lock /tmp/.X11-unix/X0 "$HOME/.config/chromium/SingletonLock" "$HOME/.config/chromium/SingletonSocket" "$HOME/.config/chromium/SingletonCookie"
Xvfb :0 -screen 0 1440x900x24 -nolisten tcp -ac >/tmp/ibot-xvfb.log 2>&1 &
for try in {1..100}; do xdpyinfo -display :0 >/dev/null 2>&1 && break; sleep 0.1; done
xdpyinfo -display :0 >/dev/null 2>&1 || { echo 'Linux display failed to start; see /tmp/ibot-xvfb.log.' >&2; exit 1; }
export DBUS_SESSION_BUS_ADDRESS
eval "$(dbus-launch --sh-syntax)"
openbox-session >/tmp/ibot-openbox.log 2>&1 &
xsetroot -solid '#151a24'
pcmanfm --desktop --profile ibot >/tmp/ibot-files.log 2>&1 &
# Only the websocket proxy is published to host loopback. Raw VNC stays in-container.
x11vnc -display :0 -localhost -rfbport 5900 -rfbauth "$HOME/.vnc/passwd" -forever -shared -noxdamage >/tmp/ibot-vnc.log 2>&1 &
chromium --no-sandbox --disable-dev-shm-usage --no-first-run --disable-session-crashed-bubble \
    --user-data-dir="$HOME/.config/chromium" --start-maximized /opt/ibot/workspace-welcome.html >/tmp/ibot-browser.log 2>&1 &
exec websockify --web=/usr/share/novnc 6080 127.0.0.1:5900
