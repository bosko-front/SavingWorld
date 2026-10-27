"""Frame real app captures into App Store screenshots (Phase 22).

Each input is an unedited capture of the release-candidate build (simulator iPhone 17 Pro, 1206 x 2622,
or a device capture of the same size class). This script never paints over the app: it scales the
capture, rounds its corners, and puts it under one short caption on the icon's sky (D139), like the
product page header (compose_header.py). Apple accepts 1206 x 2622 for "iPhone with Dynamic Island
(medium display)", the one required iPhone set.

Captions follow Apple's asset guidance: a short phrase that adds to the picture, no price, URL, award
or other platform. Colors are the app's palette (src/shared/theme/palette.ts): forest900 text.

Input list: store/screenshots/shots.json, [{"file": "raw/01-home.png", "caption": "..."}, ...]
Output: store/screenshots/en-US/NN-<name>.png (RGB, no alpha).

Run (Pillow in any Python 3 environment):
  python3 store/scripts/frame_screenshots.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SHOTS = ROOT / 'store/screenshots'
OUT = SHOTS / 'en-US'

WIDTH, HEIGHT = 1206, 2622
SKY_TOP = (0x9F, 0xD2, 0xEA)
SKY_BOTTOM = (0xFB, 0xF0, 0xDC)
TEXT = (0x20, 0x35, 0x2D)  # palette.forest900
FONT = '/System/Library/Fonts/SFNSRounded.ttf'

SCREEN_SCALE = 0.80
CORNER = 150  # iPhone 17 Pro display corner at 3x, scaled
CAPTION_TOP = 150
CAPTION_SIZE = 92
LINE_GAP = 18


def sky() -> Image.Image:
    column = Image.new('RGB', (1, HEIGHT))
    for y in range(HEIGHT):
        t = (y / (HEIGHT - 1)) ** 1.35
        column.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(SKY_TOP, SKY_BOTTOM)))
    return column.resize((WIDTH, HEIGHT), Image.BICUBIC)


def caption_font() -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(FONT, CAPTION_SIZE)
    try:
        font.set_variation_by_name('Bold')
    except (OSError, ValueError):
        pass
    return font


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        candidate = f'{lines[-1]} {word}' if lines else word
        if lines and draw.textlength(candidate, font=font) <= max_width:
            lines[-1] = candidate
        else:
            lines.append(word)
    return lines


def frame(capture: Path, caption: str) -> Image.Image:
    canvas = sky().convert('RGBA')
    draw = ImageDraw.Draw(canvas)
    font = caption_font()
    y = CAPTION_TOP
    # A "\n" in the caption sets the line break (balanced lines); each part still wraps if too wide.
    lines = [line for part in caption.split('\n') for line in wrap(draw, part, font, WIDTH - 2 * 90)]
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((WIDTH - width) / 2, y), line, font=font, fill=TEXT)
        y += CAPTION_SIZE + LINE_GAP

    shot = Image.open(capture).convert('RGB')
    if shot.size != (WIDTH, HEIGHT):
        raise SystemExit(f'{capture}: expected {WIDTH}x{HEIGHT}, got {shot.size}')
    size = (round(WIDTH * SCREEN_SCALE), round(HEIGHT * SCREEN_SCALE))
    shot = shot.resize(size, Image.LANCZOS)
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=CORNER, fill=255)
    x = (WIDTH - size[0]) // 2
    top = HEIGHT - size[1] - 70

    shadow = Image.new('RGBA', (size[0] + 120, size[1] + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((60, 75, size[0] + 60, size[1] + 75), radius=CORNER, fill=(32, 53, 45, 46))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)), (x - 60, top - 60))
    border = Image.new('RGBA', (size[0] + 8, size[1] + 8), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle((0, 0, size[0] + 7, size[1] + 7), radius=CORNER + 4, fill=(255, 255, 255, 230))
    canvas.alpha_composite(border, (x - 4, top - 4))
    canvas.paste(shot, (x, top), mask)
    return canvas.convert('RGB')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for index, item in enumerate(json.loads((SHOTS / 'shots.json').read_text()), start=1):
        source = SHOTS / item['file']
        name = f"{index:02d}-{Path(item['file']).stem.split('-', 1)[-1]}.png"
        frame(source, item['caption']).save(OUT / name, optimize=True)
        print('wrote', OUT / name)


if __name__ == '__main__':
    main()
