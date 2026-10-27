"""Compose the App Store product page header (Phase 22) from the approved world renders.

Inputs are the owner-approved stage 10 renders, used unchanged (no new art, D97):
  assets/worlds/island/renders/milestones/island_stage10_preview.png  (D76, approved 24 Oct 2026)
  assets/worlds/garden/renders/milestones/garden_stage10_preview.png  (D120/D123, approved 26 Oct 2026)
They are placed side by side on the icon's sky gradient (D139: #9FD2EA -> #FBF0DC).

Output (Apple "Creative assets specifications"): 21:9, 3840 x 1646, RGB PNG without alpha,
  store/header/header-21x9.png
and a 16:9 5244 x 2950 PNG version, store/header/header-16x9.png.
No text, price, URL or logo, so it fits Apple's asset rules and any header crop. Key art stays inside
the central band (about 66% of the width and 80% of the height).

Run (Pillow in any Python 3 environment):
  python3 store/scripts/compose_header.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ISLAND = ROOT / 'assets/worlds/island/renders/milestones/island_stage10_preview.png'
GARDEN = ROOT / 'assets/worlds/garden/renders/milestones/garden_stage10_preview.png'
OUT = ROOT / 'store/header'

SKY_TOP = (0x9F, 0xD2, 0xEA)
SKY_BOTTOM = (0xFB, 0xF0, 0xDC)


def sky(width: int, height: int) -> Image.Image:
    # Vertical gradient with a gentle ease, so the warm horizon sits in the lower third.
    column = Image.new('RGB', (1, height))
    for y in range(height):
        t = (y / (height - 1)) ** 1.35
        column.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(SKY_TOP, SKY_BOTTOM)))
    return column.resize((width, height), Image.BICUBIC)


def trimmed(path: Path) -> Image.Image:
    image = Image.open(path).convert('RGBA')
    return image.crop(image.split()[-1].getbbox())


def place(canvas: Image.Image, world: Image.Image, center_x: float, width: float, center_y: float) -> None:
    # The renders carry their own contact shading; no extra drop shadow (it read as grey haze).
    scale = width / world.width
    art = world.resize((round(world.width * scale), round(world.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(art, (round(center_x - art.width / 2), round(center_y - art.height / 2)))


def compose(width: int, height: int) -> Image.Image:
    canvas = sky(width, height).convert('RGBA')
    island, garden = trimmed(ISLAND), trimmed(GARDEN)
    # Both worlds share one width, sized so neither is taller than 80% of the header and both fit
    # side by side in the central 66% with a gap between them.
    world_width = min(width * 0.31, height * 0.80 * min(island.width / island.height, garden.width / garden.height))
    place(canvas, island, width * 0.33, world_width, height * 0.50)
    place(canvas, garden, width * 0.67, world_width, height * 0.50)
    return canvas.convert('RGB')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    compose(3840, 1646).save(OUT / 'header-21x9.png', optimize=True)
    compose(5244, 2950).save(OUT / 'header-16x9.png', optimize=True)
    print('wrote', OUT / 'header-21x9.png', OUT / 'header-16x9.png')


if __name__ == '__main__':
    main()
