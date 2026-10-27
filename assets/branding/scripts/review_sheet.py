"""Review sheet: icon concepts at real home-screen sizes next to plain stand-in icons.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/branding/scripts/review_sheet.py -- <out.png> <dir> <concept> [<concept> ...]

One row per concept (top to bottom in the order given), three walls per row: light wallpaper with the
light icon, dark wallpaper with the dark icon, and a tinted home screen (the tinted icon multiplied by
an amber tint, as iOS does). Each wall: the concept at 60 pt between four stand-in icons, then the
concept alone at 60, 40 and 29 pt. Drawn at @3x, so viewing the sheet at one third of its pixel size
shows real point sizes. Stand-ins are flat color tiles with simple white shapes (no trademarks); the
corner mask approximates the iOS squircle.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import numpy as np  # noqa: E402

import icon_compose as ic  # noqa: E402

SCALE = 3
PT = (60, 40, 29)
GAP = 22 * SCALE
PAD = 20 * SCALE
TILE = PT[0] * SCALE
WALL_W = 5 * TILE + 4 * GAP + 2 * PAD
WALL_H = 2 * PAD + TILE + PAD + TILE
TINT = ic._hex("#F2B84B")
WALLS = {
    "light": ("#EEC6A6", "#9CB9DB"),
    "dark": ("#1A1F3A", "#090D18"),
    "tinted": ("#2A2418", "#15110B"),
}
STAND_INS = (("#5AC8FA", "#1E88E5", "ring"), ("#FFD54F", "#FB8C00", "card"),
             ("#81C784", "#2E7D32", "peak"), ("#F48FB1", "#D81B60", "dot"))


def squircle(size, n=5.0, ss=4):
    """Coverage of the superellipse |x|^n + |y|^n <= 1, 4x4 supersampled."""
    c = (np.arange(size * ss, dtype=np.float32) + 0.5) / (size * ss) * 2.0 - 1.0
    inside = (np.abs(c)[None, :] ** n + np.abs(c)[:, None] ** n) <= 1.0
    return inside.reshape(size, ss, size, ss).mean(axis=(1, 3)).astype(np.float32)


def shape(kind, size):
    c = (np.arange(size, dtype=np.float32) + 0.5) / size * 2.0 - 1.0
    x, y = c[None, :], -c[:, None]
    r = np.sqrt(x * x + y * y)
    if kind == "ring":
        return ((r < 0.48) & (r > 0.3)).astype(np.float32)
    if kind == "card":
        return ((np.abs(x) < 0.45) & (np.abs(y) < 0.33)).astype(np.float32)
    if kind == "peak":
        return ((y > -0.35) & (y < 0.45) & (np.abs(x) < (0.45 - y) * 0.6)).astype(np.float32)
    return (r < 0.32).astype(np.float32)


def stand_in(top, bottom, kind, size):
    rgb = ic.gradient(size, size, top, bottom)
    s = shape(kind, size)[..., None]
    return rgb * (1.0 - s) + s


def icon_tile(path, size):
    px = ic.load(path)
    if px.shape[0] != size:
        px = ic.resize(px, size, size)
    return px[..., :3]


def place(canvas, rgb, x, y, wall):
    size = rgb.shape[0]
    if wall == "tinted":
        lum = 0.2126 * rgb[..., 0:1] + 0.7152 * rgb[..., 1:2] + 0.0722 * rgb[..., 2:3]
        rgb = lum * TINT[None, None, :]
    m = squircle(size)[..., None]
    h = canvas.shape[0]
    y0 = h - y - size  # bpy rows are bottom-up; y is measured from the top
    region = canvas[y0:y0 + size, x:x + size]
    canvas[y0:y0 + size, x:x + size] = rgb * m + region * (1.0 - m)


def wall(canvas, x0, y0, concept_dir, concept, kind):
    top, bottom = WALLS[kind]
    h = canvas.shape[0]
    canvas[h - y0 - WALL_H:h - y0, x0:x0 + WALL_W] = ic.gradient(WALL_H, WALL_W, top, bottom)
    ours = os.path.join(concept_dir, f"{concept}_{kind}.png")
    x = x0 + PAD
    for i in range(5):
        if i == 2:
            place(canvas, icon_tile(ours, TILE), x, y0 + PAD, kind)
        else:
            t, b, k = STAND_INS[i if i < 2 else i - 1]
            place(canvas, stand_in(t, b, k, TILE), x, y0 + PAD, kind)
        x += TILE + GAP
    x = x0 + PAD
    base = y0 + 2 * PAD + 2 * TILE
    for pt in PT:
        size = pt * SCALE
        place(canvas, icon_tile(ours, size), x, base - size, kind)
        x += size + GAP


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    out, concept_dir, concepts = argv[0], argv[1], argv[2:]
    margin = 16 * SCALE
    width = 3 * WALL_W + 4 * margin
    height = len(concepts) * (WALL_H + margin) + margin
    canvas = np.empty((height, width, 3), dtype=np.float32)
    canvas[...] = ic._hex("#F6F4EA")
    for row, concept in enumerate(concepts):
        y = margin + row * (WALL_H + margin)
        for col, kind in enumerate(("light", "dark", "tinted")):
            wall(canvas, margin + col * (WALL_W + margin), y, concept_dir, concept, kind)
    ic.save(np.concatenate([canvas, np.ones((height, width, 1), dtype=np.float32)], axis=2), out, alpha=False)
    print("wrote", out, f"{width}x{height}")


main()
