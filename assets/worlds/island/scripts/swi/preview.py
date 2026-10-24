"""Composite a transparent render over the preview backdrop (viewing only)."""

import bpy
import numpy as np


def _hex(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], dtype=np.float32)


def compose_on_backdrop(src_path, dst_path, backdrop_hex):
    img = bpy.data.images.load(src_path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    a = px[..., 3:4]
    bg = _hex(backdrop_hex)
    # soft vertical vignette so the backdrop is not a flat card
    y = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    bgv = bg[None, None, :] * (0.985 + 0.03 * y)
    rgb = px[..., :3] * a + bgv * (1.0 - a)
    out = np.concatenate([rgb, np.ones_like(a)], axis=2)
    dst = bpy.data.images.new("sw_preview", w, h, alpha=False)
    dst.pixels.foreach_set(out.ravel())
    dst.filepath_raw = dst_path
    dst.file_format = "PNG"
    dst.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(dst)
    return dst_path


# Home's world region (ADAPTIVE_LAYOUT: column width, 4:3, at most 40% of the
# visible height), estimated in points for two reference phones.
PHONE_SIZES = [
    ("iphone17pro_3x", 1104, 828),   # ~368 x 276 pt at @3x
    ("iphoneSE_2x", 534, 400),       # ~267 x 200 pt at @2x
]


def export_phone_sizes(src_path):
    """Downscaled copies at the pixel size the scene occupies on a phone."""
    out = []
    for suffix, w, h in PHONE_SIZES:
        img = bpy.data.images.load(src_path, check_existing=False)
        img.scale(w, h)
        dst = src_path.replace(".png", f"_{suffix}.png")
        img.filepath_raw = dst
        img.file_format = "PNG"
        img.save()
        bpy.data.images.remove(img)
        out.append(dst)
    return out


def side_by_side(paths, dst_path, gap=24, backdrop_hex="#FBF3E4"):
    """Place equally sized images left to right on the backdrop color."""
    imgs = []
    for p in paths:
        img = bpy.data.images.load(p, check_existing=False)
        w, h = img.size
        px = np.empty(w * h * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        imgs.append(px.reshape(h, w, 4))
        bpy.data.images.remove(img)
    h = max(i.shape[0] for i in imgs)
    total = sum(i.shape[1] for i in imgs) + gap * (len(imgs) + 1)
    sheet = np.ones((h + 2 * gap, total, 4), dtype=np.float32)
    sheet[..., :3] = _hex(backdrop_hex)
    x = gap
    for i in imgs:
        sheet[gap:gap + i.shape[0], x:x + i.shape[1]] = i
        x += i.shape[1] + gap
    out = bpy.data.images.new("sw_sheet", total, h + 2 * gap, alpha=False)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = dst_path
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    return dst_path


def mean_difference(a_path, b_path):
    """Mean and 99th-percentile absolute difference of two images (0-255)."""
    vals = []
    for p in (a_path, b_path):
        img = bpy.data.images.load(p, check_existing=False)
        px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
        img.pixels.foreach_get(px)
        vals.append(px.reshape(-1, 4)[:, :3])
        bpy.data.images.remove(img)
    d = np.abs(vals[0] - vals[1]) * 255.0
    return float(d.mean()), float(np.percentile(d, 99))
