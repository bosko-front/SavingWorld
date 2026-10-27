"""Milestone object previews (Phase 19, D136): small still pictures of each unlock's main object.

For every theme and milestone in assets/worlds/milestone-previews.json this composites the listed
layers of the approved 2048 export at their canvas positions (premultiplied "over", the order the
manifest lists them), crops the given canvas rectangle, trims the transparent margin, and fits the
result in a `size` px square with an area filter. Output: assets/themes/<theme>/previews/
<theme>_preview_NN.png (straight-alpha RGBA PNG) and a review sheet of all previews. The art itself
is not changed; rerun after a re-export. Run with Blender's Python, which ships numpy:

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/make_milestone_previews.py -- \
        assets/worlds/milestone-previews.json [review.png]
"""

import json
import os
import sys

import bpy
import numpy as np

ROOT = os.getcwd()


def load(path):
    img = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    img.alpha_mode = 'STRAIGHT'
    w, h = img.size
    pixels = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(pixels)
    bpy.data.images.remove(img)
    rgba = pixels.reshape(h, w, 4)[::-1]
    # Premultiply for compositing and filtering.
    return np.concatenate([rgba[..., :3] * rgba[..., 3:4], rgba[..., 3:4]], axis=2)


def save(premultiplied, path):
    alpha = premultiplied[..., 3:4]
    rgb = np.where(alpha > 1e-6, premultiplied[..., :3] / np.maximum(alpha, 1e-6), 0.0)
    straight = np.clip(np.concatenate([rgb, alpha], axis=2), 0.0, 1.0)
    h, w, _ = straight.shape
    img = bpy.data.images.new('preview', w, h, alpha=True)
    img.alpha_mode = 'STRAIGHT'
    img.pixels.foreach_set(straight[::-1].astype(np.float32).ravel())
    scene = bpy.context.scene
    # Write the pixels as they are: no view transform or look on the way out.
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    settings = scene.render.image_settings
    settings.file_format = 'PNG'
    settings.color_mode = 'RGBA'
    settings.color_depth = '8'
    settings.compression = 100
    img.save_render(os.path.abspath(path), scene=scene)
    bpy.data.images.remove(img)


def area_resize(image, out_w, out_h):
    """Box-filter resize of a premultiplied image (each output pixel averages the input it covers)."""
    h, w, c = image.shape
    integral = np.zeros((h + 1, w + 1, c), dtype=np.float64)
    integral[1:, 1:] = image.cumsum(0).cumsum(1)
    ys = np.linspace(0, h, out_h + 1)
    xs = np.linspace(0, w, out_w + 1)
    y0 = np.floor(ys[:-1]).astype(int)
    y1 = np.maximum(np.ceil(ys[1:]).astype(int), y0 + 1)
    x0 = np.floor(xs[:-1]).astype(int)
    x1 = np.maximum(np.ceil(xs[1:]).astype(int), x0 + 1)
    total = (
        integral[y1][:, x1] - integral[y0][:, x1] - integral[y1][:, x0] + integral[y0][:, x0]
    )
    area = ((y1 - y0)[:, None] * (x1 - x0)[None, :])[..., None]
    return (total / area).astype(np.float32)


def build(theme, milestone, spec, size):
    export = os.path.join(ROOT, 'assets', 'worlds', theme, 'export')
    manifest = json.load(open(os.path.join(export, f'{theme}_manifest.json')))
    unlock = next(u for u in manifest['unlocks'] if u['milestone'] == milestone)
    layers = {layer['id']: layer for layer in unlock['layers']}
    x0, y0, x1, y1 = spec['crop']
    canvas = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.float32)
    # Composite in manifest order (back to front), whatever order the spec lists.
    for layer in unlock['layers']:
        if layer['id'] not in spec['layers']:
            continue
        art = load(os.path.join(export, '2048', layer['file']))
        lh, lw, _ = art.shape
        # The layer's rectangle inside the crop.
        cx0, cy0 = max(layer['x'], x0), max(layer['y'], y0)
        cx1, cy1 = min(layer['x'] + lw, x1), min(layer['y'] + lh, y1)
        if cx0 >= cx1 or cy0 >= cy1:
            continue
        src = art[cy0 - layer['y']:cy1 - layer['y'], cx0 - layer['x']:cx1 - layer['x']]
        dst = canvas[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
        dst[:] = src + dst * (1.0 - src[..., 3:4])
    missing = set(spec['layers']) - set(layers)
    if missing:
        raise SystemExit(f'{theme} {milestone}: unknown layers {sorted(missing)}')
    # Trim the transparent margin, keeping a one-pixel edge.
    solid = np.argwhere(canvas[..., 3] > 0.02)
    if solid.size == 0:
        raise SystemExit(f'{theme} {milestone}: the crop holds no art')
    (ty0, tx0), (ty1, tx1) = solid.min(0), solid.max(0) + 1
    trimmed = canvas[max(ty0 - 1, 0):ty1 + 1, max(tx0 - 1, 0):tx1 + 1]
    th, tw, _ = trimmed.shape
    scale = min(1.0, size / max(th, tw))
    out_w, out_h = max(1, round(tw * scale)), max(1, round(th * scale))
    return area_resize(trimmed, out_w, out_h)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    spec_path = argv[0]
    review_path = argv[1] if len(argv) > 1 else None
    spec = json.load(open(spec_path))
    size = spec['size']
    previews = []
    for theme, milestones in spec['themes'].items():
        out_dir = os.path.join(ROOT, 'assets', 'themes', theme, 'previews')
        os.makedirs(out_dir, exist_ok=True)
        for key in sorted(milestones, key=int):
            image = build(theme, int(key), milestones[key], size)
            path = os.path.join(out_dir, f'{theme}_preview_{int(key):02d}.png')
            save(image, path)
            previews.append(image)
            print(f'{theme} {int(key):2d}: {image.shape[1]}x{image.shape[0]} -> {os.path.relpath(path, ROOT)} ({os.path.getsize(path)} bytes)')
    if review_path:
        # Two rows (Island, Garden) of ten previews on the app's cream, each in a size x size cell.
        cell = size + 16
        sheet = np.zeros((2 * cell, 10 * cell, 4), dtype=np.float32)
        sheet[...] = (0.965, 0.945, 0.9, 1.0)
        for index, image in enumerate(previews):
            row, col = divmod(index, 10)
            h, w, _ = image.shape
            top = row * cell + (cell - h) // 2
            left = col * cell + (cell - w) // 2
            region = sheet[top:top + h, left:left + w]
            region[:] = image + region * (1.0 - image[..., 3:4])
        save(sheet, review_path)


main()
