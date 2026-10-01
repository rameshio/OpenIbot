FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:0 \
    HOME=/home/bot \
    LANG=C.UTF-8 \
    IBOT_WORKSPACE=/workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git bash tini python3 python3-pip python3-venv \
    python3-pil python3-requests python3-bs4 \
    xvfb x11vnc openbox dbus-x11 xterm pcmanfm chromium \
    novnc websockify scrot xdotool x11-utils x11-xserver-utils fonts-dejavu fonts-liberation \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 --shell /bin/bash bot \
    && mkdir -p /workspace /home/bot/.config /home/bot/Desktop \
    && chown -R bot:bot /workspace /home/bot

COPY entrypoint.sh /opt/ibot/entrypoint.sh
COPY workspace_files.py /opt/ibot/workspace_files.py
COPY run_command.py /opt/ibot/run_command.py
COPY desktop.html /usr/share/novnc/desktop.html
COPY openbox-menu.xml /etc/xdg/openbox/menu.xml
COPY workspace-welcome.html /opt/ibot/workspace-welcome.html
RUN chmod 755 /opt/ibot/entrypoint.sh \
    && printf '[Desktop Entry]\nType=Application\nName=Browser\nExec=chromium --no-sandbox --disable-dev-shm-usage --no-first-run /opt/ibot/workspace-welcome.html\nIcon=chromium\n' > /home/bot/Desktop/browser.desktop \
    && printf '[Desktop Entry]\nType=Application\nName=Workspace\nExec=pcmanfm /workspace\nIcon=folder\n' > /home/bot/Desktop/workspace.desktop \
    && printf '[Desktop Entry]\nType=Application\nName=Terminal\nExec=xterm -bg "#161922" -fg "#e1e6ed" -fa Monospace -fs 12\nIcon=utilities-terminal\n' > /home/bot/Desktop/terminal.desktop \
    && chown -R bot:bot /home/bot

USER 1000:1000
WORKDIR /workspace
EXPOSE 6080
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 CMD curl --fail --silent http://127.0.0.1:6080/desktop.html >/dev/null && xdpyinfo -display :0 >/dev/null
ENTRYPOINT ["/usr/bin/tini", "--", "/opt/ibot/entrypoint.sh"]
