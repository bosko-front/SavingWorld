"""Frame real app captures into App Store screenshots (Phase 22).

Each input is an unedited capture of the release-candidate build (simulator iPhone 17 Pro, 1206 x 2622,
or a device capture of the same size class). This script never paints over the app: it scales the
capture, rounds its corners, and puts it under one short caption on the icon's sky (D139), like the
product page header (compose_header.py). Apple accepts 1206 x 2622 for "iPhone with Dynamic Island
(medium display)", the one required iPhone set.

Captions follow Apple's asset guidance: a short phrase that adds to the picture, no price, URL, award
or other platform. Colors are the app's palette (src/shared/theme/palette.ts): forest900 text.

Input list: store/screenshots/shots.json, [{"file": "raw/01-home.png", "caption": "..."}, ...].
An item with "hero" instead of "file" makes the opening panel from the approved Island renders
(assets/worlds/island/renders/milestones): the same island at the listed stages, growing, with a
percentage pill on each. Nothing is invented; it is the art the app shows at those milestones.
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
# SF Rounded on a Mac; Poppins where SF is not installed (Linux). One run uses one font for every panel.
FONTS = [
    ('/System/Library/Fonts/SFNSRounded.ttf', '/System/Library/Fonts/SFNSRounded.ttf'),
    ('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', '/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf'),
]
SUBTEXT = (0x3D, 0x5A, 0x4C)
ISLAND = ROOT / 'assets/worlds/island/renders/milestones'

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


def font_pair() -> tuple[str, str]:
    for bold, medium in FONTS:
        if Path(bold).exists():
            return bold, medium
    raise SystemExit('no caption font found')


def caption_font(size: int = CAPTION_SIZE, weight: str = 'Bold') -> ImageFont.FreeTypeFont:
    bold, medium = font_pair()
    font = ImageFont.truetype(bold if weight == 'Bold' else medium, size)
    try:
        font.set_variation_by_name(weight)
    except (OSError, ValueError):
        pass
    return font


def draw_caption(canvas: Image.Image, caption: str, top: int, size: int = CAPTION_SIZE) -> int:
    draw = ImageDraw.Draw(canvas)
    font = caption_font(size)
    y = top
    # A "\n" in the caption sets the line break (balanced lines); each part still wraps if too wide.
    lines = [line for part in caption.split('\n') for line in wrap(draw, part, font, WIDTH - 2 * 90)]
    for line in lines:
        width = draw.textlength(line, font=font)
        draw.text(((WIDTH - width) / 2, y), line, font=font, fill=TEXT)
        y += size + LINE_GAP
    return y


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
    draw_caption(canvas, caption, CAPTION_TOP)

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


def island(stage: int, width: int) -> Image.Image:
    art = Image.open(ISLAND / f'island_stage{stage:02d}_preview.png').convert('RGBA')
    art = art.crop(art.getchannel('A').getbbox())
    return art.resize((width, round(art.height * width / art.width)), Image.LANCZOS)


def pill(canvas: Image.Image, text: str, center: tuple[int, int], size: int = 54) -> None:
    font = caption_font(size)
    draw = ImageDraw.Draw(canvas)
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    w, h = right - left + 64, bottom - top + 36
    x, y = center[0] - w // 2, center[1] - h // 2
    shadow = Image.new('RGBA', (w + 60, h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((30, 36, w + 30, h + 36), radius=h // 2, fill=(32, 53, 45, 50))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)), (x - 30, y - 30))
    ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=(255, 255, 255, 245))
    draw.text((x + 32 - left, y + 18 - top), text, font=font, fill=TEXT)


def dots(canvas: Image.Image, start: tuple[int, int], end: tuple[int, int], bend: int) -> None:
    draw = ImageDraw.Draw(canvas)
    (x0, y0), (x1, y1) = start, end
    cx, cy = (x0 + x1) / 2 + bend, (y0 + y1) / 2
    for i in range(1, 12):
        t = i / 12
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(255, 255, 255, 235))


def hero(spec: dict, caption: str) -> Image.Image:
    canvas = sky().convert('RGBA')
    y = draw_caption(canvas, caption, CAPTION_TOP - 10, 104)
    if spec.get('subtitle'):
        font = caption_font(50, 'Medium')
        draw = ImageDraw.Draw(canvas)
        width = draw.textlength(spec['subtitle'], font=font)
        draw.text(((WIDTH - width) / 2, y + 14), spec['subtitle'], font=font, fill=SUBTEXT)
    # Small -> large, zig-zag down the panel: start (left), halfway (right), complete (centre).
    layout = [  # (width, left x, top y)
        (520, 80, 500),
        (660, 470, 950),
        (1080, 63, 1650),
    ]
    placed = []
    for stage, (width, x, top) in zip(spec['stages'], layout):
        art = island(stage, width)
        canvas.alpha_composite(art, (x, top))
        placed.append((x, top, art.width, art.height))
    (x0, t0, w0, h0), (x1, t1, w1, h1), (x2, t2, w2, h2) = placed
    dots(canvas, (x0 + w0 // 2 + 130, t0 + h0 - 20), (x1 + 40, t1 + h1 // 2 - 40), -60)
    dots(canvas, (x1 + 60, t1 + h1 - 60), (x2 + w2 // 2 - 300, t2 + 90), 40)
    for label, (x, t, w, h) in zip(spec['labels'], placed):
        pill(canvas, label, (x + w // 2, t + h - 40))
    return canvas.convert('RGB')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for index, item in enumerate(json.loads((SHOTS / 'shots.json').read_text()), start=1):
        if 'hero' in item:
            name = f'{index:02d}-{item["name"]}.png'
            image = hero(item['hero'], item['caption'])
        else:
            source = SHOTS / item['file']
            name = f"{index:02d}-{Path(item['file']).stem.split('-', 1)[-1]}.png"
            image = frame(source, item['caption'])
        image.save(OUT / name, optimize=True)
        print('wrote', OUT / name)


if __name__ == '__main__':
    main()
