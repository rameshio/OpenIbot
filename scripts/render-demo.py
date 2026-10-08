"""Create beginner guide cards and a short captioned MP4 from real UI captures.

Requires Python + Pillow and FFmpeg on PATH. Does not modify app/profile data.
"""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'docs/assets/demo'
W, H = 1600, 1000
BG, TEXT, MUTED, MINT = '#0c1413', '#f1f2e9', '#a0afa7', '#b9e9ce'
FONT_DIR = Path('C:/Windows/Fonts')


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_DIR / ('segoeuib.ttf' if bold else 'segoeui.ttf')), size)


def base(step, title, description):
    canvas = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    draw.text((55, 26), 'OpenIbot  /  QUICK START', font=font(22, True), fill=MINT)
    draw.text((55, 65), title, font=font(44, True), fill=TEXT)
    draw.text((55, 126), description, font=font(24), fill=MUTED)
    draw.text((55, 953), 'Actual desktop interface · Disposable demo profile', font=font(19), fill=MUTED)
    draw.text((1445, 953), f'{step} / 5', font=font(19), fill=MINT)
    return canvas


def render():
    ffmpeg = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('Install FFmpeg and add it to PATH before rendering the video.')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    cards = []
    overview = base(1, 'Your first task, step by step', 'Connect a model. Describe a goal. Review the answer.')
    draw = ImageDraw.Draw(overview)
    icon = Image.open(ROOT / 'assets/icon.png').convert('RGBA')
    icon.thumbnail((200, 200))
    overview.paste(icon, (65, 235), icon)
    draw.text((325, 240), 'A desktop home for your AI bots', font=font(42, True), fill=TEXT)
    draw.text((325, 305), 'Use one conversation to get started.', font=font(28), fill=MUTED)
    steps = [('01', 'Connect', 'Bring your own provider or local model.'),
             ('02', 'Describe', 'State your goal, limits and desired output.'),
             ('03', 'Review', 'Check the answer and ask for changes.')]
    for i, (number, title, detail) in enumerate(steps):
        y = 485 + i * 125
        draw.rounded_rectangle((55, y, 1545, y + 105), 20, fill='#1e2d28')
        draw.text((80, y + 22), number, font=font(34, True), fill=MINT)
        draw.text((180, y + 22), title, font=font(34, True), fill=TEXT)
        draw.text((425, y + 30), detail, font=font(26), fill=MUTED)
    p = OUTPUT / '00-overview.png'
    overview.save(p)
    cards.append(p)
    scenes = [
        ('01-connect', '1. Connect an AI model', 'Click Connect a model. Set up your provider, then choose a model.'),
        ('02-task', '2. Tell your bot what you need', 'Include your goal, available time and output format. Press Enter to send.'),
        ('03-bot', '3. Add a bot when you need one', 'Click the sidebar + to open a new bot conversation. Edit its role in Bot settings.'),
        ('04-result', '4. Review and refine the answer', 'Read the result, check the details and ask for changes. Sample answer shown below.'),
    ]
    for i, (name, title, description) in enumerate(scenes, 2):
        card = base(i, title, description)
        screen = Image.open(OUTPUT / f'{name}-screen.png').convert('RGB')
        screen.thumbnail((1490, 760), Image.Resampling.LANCZOS)
        card.paste(screen, ((W - screen.width) // 2, 178 + (760 - screen.height) // 2))
        p = OUTPUT / f'{name}.png'
        card.save(p)
        cards.append(p)
    # Scale a gentle pan into each six-second card. Encode for normal web players.
    with tempfile.TemporaryDirectory(prefix='openibot-demo-render-') as temp:
        segments = []
        for i, card in enumerate(cards):
            segment = Path(temp) / f'{i}.mp4'
            subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(card),
                            '-vf', "zoompan=z='min(zoom+0.00006,1.01)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=180:s=1600x1000:fps=30",
                            '-frames:v', '180', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                            '-pix_fmt', 'yuv420p', str(segment)], check=True)
            segments.append(segment)
        listing = Path(temp) / 'segments.txt'
        listing.write_text('\n'.join(f"file '{p.as_posix()}'" for p in segments), encoding='utf-8')
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat',
                        '-safe', '0', '-i', str(listing), '-c', 'copy', '-movflags', '+faststart',
                        str(OUTPUT / 'openibot-demo.mp4')], check=True)
    print('Created five 1600x1000 guide images and a silent 30-second captioned MP4.')


if __name__ == '__main__':
    render()
