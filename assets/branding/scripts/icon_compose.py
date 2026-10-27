"""Compose app icons and the launch mark from a transparent icon render (Blender's Python + numpy).

Called by render_icon.py after each render. To recompose from an existing render (for example after
changing a sky color below) without rendering again:

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/branding/scripts/icon_compose.py -- <concept> [dir]

Colors are written as display (sRGB) values, the same convention as swi.preview. Blender stores
bpy image rows bottom-up, so row 0 is the bottom of the picture.
"""

import os

import bpy
import numpy as np

ICON_SIZE = 1024
MARK_SIZE = 600  # longest side of the launch mark in pixels (shown at about 150 pt, @3x = 450 px)

# Day sky: the app's Home sky (palette skyTop #CFE6EE into sceneCream #FBF3E4), a step richer so
# the icon holds its own on a home screen.
DAY_TOP = "#9FD2EA"
DAY_BOTTOM = "#FBF0DC"
# Night sky for the dark home screen: deep blue into a softer blue at the horizon.
NIGHT_TOP = "#0E1B2E"
NIGHT_BOTTOM = "#2C4363"
NIGHT_ART = 0.9  # the island a little dimmer at night, so it does not glare on a dark home screen
# Tinted: iOS colors a grayscale icon by its brightness. Black ground, island levels spread wide.
TINT_LOW, TINT_HIGH, TINT_GAMMA = 0.10, 0.95, 1.1


def _hex(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


def load(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)


def save(px, path, alpha):
    h, w = px.shape[:2]
    if not alpha:
        px = np.concatenate([px[..., :3], np.ones((h, w, 1), dtype=np.float32)], axis=2)
    img = bpy.data.images.new("sw_icon", w, h, alpha=alpha)
    img.pixels.foreach_set(np.clip(px, 0.0, 1.0).astype(np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
    return path


def resize(px, w, h):
    """Box-filtered downscale through Blender (premultiplied, so no dark fringes)."""
    a = px[..., 3:4]
    pre = np.concatenate([px[..., :3] * a, a], axis=2)
    sh, sw = pre.shape[:2]
    img = bpy.data.images.new("sw_resize", sw, sh, alpha=True, float_buffer=True)
    img.pixels.foreach_set(pre.ravel())
    img.scale(w, h)
    out = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(out)
    bpy.data.images.remove(img)
    out = out.reshape(h, w, 4)
    a = out[..., 3:4]
    rgb = np.where(a > 1e-6, out[..., :3] / np.maximum(a, 1e-6), 0.0)
    return np.concatenate([rgb, a], axis=2)


def gradient(h, w, top, bottom):
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]  # 0 bottom, 1 top
    t = t * t * (3.0 - 2.0 * t)  # smoothstep: calm top and bottom bands
    col = _hex(bottom)[None, None, :] * (1.0 - t) + _hex(top)[None, None, :] * t
    return np.broadcast_to(col, (h, w, 3)).copy()


def over(art, ground, art_gain=1.0):
    a = art[..., 3:4]
    return art[..., :3] * art_gain * a + ground * (1.0 - a)


def tinted(art):
    a = art[..., 3:4]
    rgb = art[..., :3]
    lum = 0.2126 * rgb[..., 0:1] + 0.7152 * rgb[..., 1:2] + 0.0722 * rgb[..., 2:3]
    lum = np.clip((lum - TINT_LOW) / (TINT_HIGH - TINT_LOW), 0.0, 1.0) ** TINT_GAMMA
    g = lum * a  # over black
    return np.concatenate([g, g, g], axis=2)


def mark(art):
    a = art[..., 3]
    rows = np.where(a.max(axis=1) > 0.01)[0]
    cols = np.where(a.max(axis=0) > 0.01)[0]
    crop = art[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    ch, cw = crop.shape[:2]
    pad = int(0.04 * max(ch, cw))
    side = max(ch, cw) + 2 * pad
    canvas = np.zeros((side, side, 4), dtype=np.float32)
    y0, x0 = (side - ch) // 2, (side - cw) // 2
    canvas[y0:y0 + ch, x0:x0 + cw] = crop
    return resize(canvas, MARK_SIZE, MARK_SIZE)


def save_mark(art_path, out_dir, name):
    return save(mark(load(art_path)), os.path.join(out_dir, f"{name}_mark.png"), alpha=True)


def compose_all(art_path, out_dir, name):
    art = load(art_path)
    h, w = art.shape[:2]
    # Composite at full size, then scale the opaque result: cleaner edges than scaling the cut-out.
    day = over(art, gradient(h, w, DAY_TOP, DAY_BOTTOM))
    night = over(art, gradient(h, w, NIGHT_TOP, NIGHT_BOTTOM), NIGHT_ART)
    tint = tinted(art)
    ones = np.ones((h, w, 1), dtype=np.float32)
    out = []
    for suffix, rgb in (("light", day), ("dark", night), ("tinted", tint)):
        px = resize(np.concatenate([rgb, ones], axis=2), ICON_SIZE, ICON_SIZE)
        out.append(save(px, os.path.join(out_dir, f"{name}_{suffix}.png"), alpha=False))
    return out


if __name__ == "__main__":
    import sys

    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
    name = argv[0]
    out_dir = argv[1] if len(argv) > 1 else os.path.join("assets", "branding", "renders", "concepts")
    out_dir = out_dir if os.path.isabs(out_dir) else os.path.join(root, out_dir)
    for path in compose_all(os.path.join(out_dir, f"{name}_art.png"), out_dir, name):
        print("wrote", path)
