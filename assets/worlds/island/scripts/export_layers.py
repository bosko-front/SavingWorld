"""Export the approved milestone renders as stacked layers plus manifest data.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/island/scripts/export_layers.py

Input: renders/milestones/island_stageNN_preview.png (transparent masters,
2048x1536, all with the frozen rig). Output in export/:

- <size>/island_base.png       stage 0, cropped to its visible pixels
- <size>/island_sNN_pK.png     part K of milestone NN: the pixels that changed
                               from stage NN-1, one part per separate object
- island_manifest.json         positions (top-left origin, 2048x1536 logical
                               canvas), anchors, stage ids, names, thresholds,
                               the stage 8 replacement and provenance

Ambient motion (Phase 10.5, D90) needs renders/ambient/ from render_ambient.py:

- <size>/island_cloud_K.png    one layer per cloud, drawn just above the base
                               (the base itself has no clouds; where a cloud
                               covered something, the base takes those pixels
                               from the cloud-free render)
- <size>/island_water_a/b/c.png three flowing-streak layers on the stream and
                               waterfall (the same streaks a third of a period
                               further downstream each), invisible at rest; the
                               app fades them in turn so the water flows
- milestones 1 and 7 give one layer per tree (sway, pivot at the trunk base);
                               the rest of those stages stays in plain parts

Drawing the base, the clouds and then every part of stages 1..n in order
reproduces stage n; the script checks that against the renders and prints the
error. The water layers are left out of that check because they rest at
opacity 0. Sizes:
"2048" (master) and "1536" (app candidate, 0.75 scale). Crop boxes snap to a
4 px grid so both sizes get integer positions.
"""

import hashlib
import json
import os
import sys
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

from swi import rig, stages  # noqa: E402

ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "renders", "milestones")
OUT = os.path.join(ROOT, "export")
SIZES = {"2048": 1.0, "1536": 0.75}
W, H = rig.RES

CHANGE = 0.05      # premultiplied change that counts as "new" (13/255)
DENSITY = 0.3      # share of changed pixels in a 7x7 window to keep (drops render noise)
GROW = 4           # px the kept mask grows to include soft outline/AO edges
FEATHER = 2        # px soft edge of each layer
GRID = 8           # cell size for splitting a stage into separate objects
JOIN = 2           # cells: pieces closer than this become one part
SNAP = 4
INCIDENTAL = 900   # parts smaller than this (px) are side effects: show, don't animate

AMBIENT = os.path.join(ROOT, "renders", "ambient")
CLOUD_GROW = 8     # px: the storybook filter spreads a cloud's edge beyond its flat mask
CLOUD_BLEND = 4    # px: ramp from the approved base to the cloud-free render around a cloud
CLOUD_CLOSE = 32   # px: fills the notch the waterfall cuts into the low cloud's flat mask
KEEP_LOW, KEEP_HIGH = 4 / 255, 13 / 255  # unchanged milestone pixels over a cloud are dropped
TREE_GROW = 9      # px: outline, filter spread and the change mask's growth around a tree
TREE_EXTEND = 4    # px: a back tree continues this far under the tree in front of it
TREE_STAGES = {1: [1], 7: list(range(2, 10))}  # tree numbers in island_mask_stage07.png
TREE_REACH = 26    # px: how far a leaning tree's crown can move (5 degrees of skew on the tallest)
# Flowing water (D93): white streaks drawn in the water's own Flow UV (renders/ambient
# island_flow_stage00.png), periodic along the flow. The three layers hold the same
# streaks shifted a third of a period downstream each; the app fades them in turn,
# so the streaks travel down the stream and the waterfall.
FLOW_V_MAX = 12.0  # render_ambient.FLOW_V_MAX
WATER_PHASES = ("a", "b", "c")
WATER_STREAM = {"seed": 5101, "period": 0.36, "lanes": 16, "steps": 24, "blur_u": 1, "blur_v": 6}
WATER_FALL = {"seed": 5102, "period": 0.30, "lanes": 14, "steps": 24, "blur_u": 1, "blur_v": 7}
WATER_ALPHA = 0.85
WATER_WHITEN = 0.92

STAGE_IDS = ["empty_island", "first_tree", "path", "flowers_bushes", "small_house", "bridge",
             "pond", "more_trees", "larger_house", "final_decorations", "completed_island"]
# Draft English scene descriptions for VoiceOver; Phase 09 owns the final copy.
DESCRIPTIONS = [
    "An empty floating island with grassy terraces, a stream and a waterfall.",
    "A large leafy tree now grows on the upper terrace.",
    "A stone path with steps climbs from the island's edge to the top terrace.",
    "Flowering bushes and flowers bloom along the path and the stream.",
    "A small wooden cabin stands on the upper terrace.",
    "An arched wooden bridge crosses the stream.",
    "A pond with lily pads appears, with a path and flowers around it.",
    "More pine and leafy trees grow around the island.",
    "A cottage with a red tiled roof and lit windows replaces the small cabin.",
    "Fences, lanterns, a bench and barrels decorate the island.",
    "The island is complete: a vegetable garden, a dock with a rowing boat and small floating islets.",
]


# ------------------------------------------------------------------ image io
# Blender pixel buffers are bottom-up; everything here works top-down.

def load(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1].copy()


def load_mask(path):
    """Flat ID mask from render_ambient.py, read without color conversion."""
    img = bpy.data.images.load(path, check_existing=False)
    img.colorspace_settings.name = "Non-Color"
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1].copy()


def straight(pre):
    out = pre.copy()
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0.0)
    return np.clip(out, 0, 1)


def save(rgba, path, scale=1.0):
    """Save straight-alpha RGBA (top-down). Scaling is done premultiplied so
    transparent edges keep their color."""
    h, w = rgba.shape[:2]
    pre = rgba.copy()
    pre[..., :3] *= pre[..., 3:4]
    img = bpy.data.images.new("sw_export", w, h, alpha=True)
    img.pixels.foreach_set(pre[::-1].ravel())
    if scale != 1.0:
        img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
        w2, h2 = img.size
        buf = np.empty(w2 * h2 * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        pre = buf.reshape(h2, w2, 4)[::-1]
    out = pre.copy()
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0.0)
    img2 = bpy.data.images.new("sw_export_out", out.shape[1], out.shape[0], alpha=True)
    img2.pixels.foreach_set(np.clip(out, 0, 1)[::-1].ravel())
    img2.filepath_raw = path
    img2.file_format = "PNG"
    img2.save()
    bpy.data.images.remove(img)
    bpy.data.images.remove(img2)


# ------------------------------------------------------------------ masks

def box(a, r):
    """Mean over a (2r+1)^2 window (edges clamped)."""
    p = np.pad(a.astype(np.float32), r, mode="edge")
    c = p.cumsum(0).cumsum(1)
    c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1
    s = c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    return s / (k * k)


def premul(img):
    out = img.copy()
    out[..., :3] *= out[..., 3:4]
    return out


def change_mask(prev, cur):
    d = np.abs(premul(cur) - premul(prev)).max(axis=2) > CHANGE
    core = box(d, 3) > DENSITY
    grown = box(core, GROW) > 0.0
    return grown


def parts_of(mask):
    """Split a stage mask into separate objects on a coarse grid."""
    h, w = mask.shape
    gh, gw = (h + GRID - 1) // GRID, (w + GRID - 1) // GRID
    pad = np.zeros((gh * GRID, gw * GRID), bool)
    pad[:h, :w] = mask
    cells = pad.reshape(gh, GRID, gw, GRID).any(axis=(1, 3))
    joined = box(cells, JOIN) > 0.0
    label = np.zeros((gh, gw), np.int32)
    n = 0
    for y in range(gh):
        for x in range(gw):
            if joined[y, x] and not label[y, x]:
                n += 1
                q = deque([(y, x)])
                label[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < gh and 0 <= nx < gw and joined[ny, nx] and not label[ny, nx]:
                                label[ny, nx] = n
                                q.append((ny, nx))
    full = np.repeat(np.repeat(label, GRID, 0), GRID, 1)[:h, :w]
    out = []
    for k in range(1, n + 1):
        m = mask & (full == k)
        if m.sum() > 40:
            out.append(m)
    return out


def bbox(m, pad=FEATHER + 2):
    ys, xs = np.nonzero(m)
    x0 = max(0, (xs.min() - pad) // SNAP * SNAP)
    y0 = max(0, (ys.min() - pad) // SNAP * SNAP)
    x1 = min(W, -(-(xs.max() + pad + 1) // SNAP) * SNAP)
    y1 = min(H, -(-(ys.max() + pad + 1) // SNAP) * SNAP)
    return int(x0), int(y0), int(x1), int(y1)


def over(dst_pre, layer_straight, x0, y0):
    h, w = layer_straight.shape[:2]
    a = layer_straight[..., 3:4]
    src = layer_straight[..., :3] * a
    region = dst_pre[y0:y0 + h, x0:x0 + w]
    region[..., :3] = src + region[..., :3] * (1 - a)
    region[..., 3:4] = a + region[..., 3:4] * (1 - a)


# ------------------------------------------------------------------ ambient layers (Phase 10.5)

def dilate(m, r):
    return box(m, r) > 0.0 if r > 0 else m.copy()


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def box1(a, r, axis):
    """Mean over 2r+1 pixels along one axis (edges clamped)."""
    pad = [(r, r) if i == axis else (0, 0) for i in range(2)]
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    c = np.concatenate([np.zeros_like(c[:1] if axis == 0 else c[:, :1]), c], axis=axis)
    k = 2 * r + 1
    return (c[k:] - c[:-k] if axis == 0 else c[:, k:] - c[:, :-k]) / k


def clamp_box(b, limit):
    return max(b[0], limit[0]), max(b[1], limit[1]), min(b[2], limit[2]), min(b[3], limit[3])


def split_clouds(render0, noclouds, mask0):
    """The base without clouds, one layer per cloud and the area around the
    clouds. Base + cloud layers reproduce the approved stage 0 render: where a
    cloud lies over empty sky its layer is the render itself; over the waterfall
    or the rock the base takes the cloud-free render and the layer holds what
    the cloud adds on top of it."""
    flat = mask0[..., 1] > 0.5
    clouds = sorted(parts_of(flat), key=lambda m: np.nonzero(m)[1].mean())
    # the faint waterfall lies over the low cloud's top; the cloud still shows
    # through it, so its layer keeps that part (closing the flat mask's notch)
    clouds = [~dilate(~dilate(c, CLOUD_CLOSE), CLOUD_CLOSE) for c in clouds]
    regions = [dilate(c, CLOUD_GROW) for c in clouds]
    union = np.logical_or.reduce(regions)
    w = np.clip(box(dilate(union, CLOUD_BLEND).astype(np.float32), CLOUD_BLEND), 0, 1)[..., None]
    r_pre = premul(render0)
    base_pre = r_pre * (1 - w) + premul(noclouds) * w
    ba = base_pre[..., 3]
    exact = (r_pre[..., 3] - ba) / np.maximum(1.0 - ba, 1e-4)
    opaque = smoothstep(0.6, 0.95, ba)
    layers = []
    for flat_k, region in zip(clouds, regions):
        cover = np.clip(box(flat_k.astype(np.float32), 2), 0, 1)
        a = np.clip(exact * (1 - opaque) + cover * opaque, 0, 1) * region
        c_pre = np.clip(r_pre[..., :3] - base_pre[..., :3] * (1 - a[..., None]), 0, a[..., None])
        layers.append(np.concatenate([c_pre, a[..., None]], axis=2))
    return straight(base_pre), layers, dilate(union, CLOUD_BLEND * 2)


def streak_tile(seed, lanes, steps, blur_u, blur_v):
    """Streak pattern on a (lanes x steps) grid: across the water x one flow
    period, wrapping along the flow so the streaks repeat seamlessly."""
    noise = np.random.default_rng(seed).random((lanes, steps)).astype(np.float32)
    acc = sum(np.roll(noise, d, axis=1) for d in range(-blur_v, blur_v + 1)) / (2 * blur_v + 1)
    p = np.pad(acc, ((blur_u, blur_u), (0, 0)), mode="edge")
    acc = sum(p[d:d + lanes] for d in range(2 * blur_u + 1)) / (2 * blur_u + 1)
    z = (acc - acc.mean()) / max(float(acc.std()), 1e-6)
    return smoothstep(0.5, 1.5, z)


def sample_tile(tile, u, v, period, shift):
    """Bilinear sample at flow coordinates (u across 0..1, v along), wrapping v."""
    lanes, steps = tile.shape
    fu = np.clip(u, 0.0, 1.0) * (lanes - 1)
    fv = np.mod(v + shift, period) / period * steps
    u0 = np.floor(fu).astype(np.int32)
    v0 = np.floor(fv).astype(np.int32) % steps
    u1 = np.minimum(u0 + 1, lanes - 1)
    v1 = (v0 + 1) % steps
    tu, tv = fu - u0, fv - np.floor(fv)
    top = tile[u0, v0] * (1 - tv) + tile[u0, v1] * tv
    bottom = tile[u1, v0] * (1 - tv) + tile[u1, v1] * tv
    return top * (1 - tu) + bottom * tu


def water_layers(render0, flow):
    """Three flowing-streak layers on the stream and the waterfall (see
    WATER_PHASES). Color: the water's own, almost white; strength fades toward
    the banks and with the waterfall's own transparency. Invisible at rest."""
    kind = flow[..., 2]
    water = flow[..., 3] > 0.5
    stream = water & (kind > 0.75)
    fall = water & (kind > 0.25) & (kind <= 0.75)
    u, v = flow[..., 0], flow[..., 1] * FLOW_V_MAX
    banks = smoothstep(0.04, 0.22, u) * smoothstep(0.96, 0.78, u)
    tiles = {name: (cfg, streak_tile(cfg["seed"], cfg["lanes"], cfg["steps"], cfg["blur_u"], cfg["blur_v"]))
             for name, cfg in (("stream", WATER_STREAM), ("fall", WATER_FALL))}
    out = {}
    for k, name in enumerate(WATER_PHASES):
        pattern = np.zeros((H, W), np.float32)
        for region, (cfg, tile) in ((stream, tiles["stream"]), (fall, tiles["fall"])):
            shift = -k * cfg["period"] / len(WATER_PHASES)  # later phases sit further downstream
            pattern[region] = sample_tile(tile, u[region], v[region], cfg["period"], shift)
        a = box(pattern * banks * water, 1) * render0[..., 3] * WATER_ALPHA
        rgb = render0[..., :3] * (1 - WATER_WHITEN) + WATER_WHITEN
        out[name] = np.concatenate([rgb, a[..., None]], axis=2)
    return out


def pivot_of(tree):
    """Where the trunk meets the ground: the lowest tree pixel, centred on the
    trunk's bottom rows."""
    ys, xs = np.nonzero(tree)
    y = ys.max()
    low = ys >= y - 6
    return {"x": int(round(xs[low].mean())), "y": int(y)}


def tree_parts(hard, ids, numbers):
    """Split a stage's changed pixels into one part per tree (its pixels plus
    TREE_GROW px of outline and filter spread; a pixel near two trees goes to
    the nearer one, the front one on a tie) and plain parts for the rest."""
    trees = {k: ids == k for k in numbers if (ids == k).any()}
    pivots = {k: pivot_of(m) for k, m in trees.items()}
    owner = np.zeros(hard.shape, np.int32)
    for r in range(TREE_GROW + 1):
        for k in sorted(trees, key=lambda k: -pivots[k]["y"]):
            owner[dilate(trees[k], r) & hard & (owner == 0)] = k
    parts = [{"mask": m, "pivot": None} for m in parts_of(hard & (owner == 0))]
    parts += [{"mask": owner == k, "pivot": pivots[k]} for k in trees if (owner == k).any()]
    return parts


def disjoint_regions(masks):
    """Drawing region of each part: its pixels plus the feather band, each band
    pixel given to one part, so neighbouring parts of a stage never overlap and
    stacking them gives the same image as one layer."""
    label = np.zeros(masks[0].shape, np.int32)
    for i, m in enumerate(masks, 1):
        label[m] = i
    for _ in range(FEATHER + 1):
        for i in range(1, len(masks) + 1):
            label[dilate(label == i, 1) & (label == 0)] = i
    return [label == i for i in range(1, len(masks) + 1)]


# ------------------------------------------------------------------ main

def main():
    renders = [load(os.path.join(SRC, f"island_stage{n:02d}_preview.png")) for n in range(11)]
    noclouds = load(os.path.join(AMBIENT, "island_stage00_noclouds.png"))
    mask0 = load_mask(os.path.join(AMBIENT, "island_mask_stage00.png"))
    mask7 = load_mask(os.path.join(AMBIENT, "island_mask_stage07.png"))
    flow = load_mask(os.path.join(AMBIENT, "island_flow_stage00.png"))
    tree_ids = np.round(mask7[..., 2] * 255 / 16).astype(np.int32) * (mask7[..., 3] > 0.5)
    previous = None
    prev_path = os.path.join(OUT, "island_manifest.json")
    if os.path.exists(prev_path):
        with open(prev_path) as f:
            previous = json.load(f)
    for sz in SIZES:
        os.makedirs(os.path.join(OUT, sz), exist_ok=True)
        for f in os.listdir(os.path.join(OUT, sz)):
            if f.endswith(".png"):
                os.remove(os.path.join(OUT, sz, f))
    labels = {n: label for n, _, label in stages.STAGES}
    replaced_by = {}
    for n, names in stages.REPLACES.items():
        for name in names:
            replaced_by[int(name.split("_")[1])] = n

    manifest = {
        "themeId": "island",
        "version": 2,
        "canvas": {"width": W, "height": H, "aspectRatio": "4:3"},
        "sizes": {k: {"scale": v, "directory": k} for k, v in SIZES.items()},
        "base": None,
        "ambient": [],
        "unlocks": [],
        "provenance": {},
    }

    # base layer without clouds, in the approved base's box (keeps the framing)
    base_box = bbox(renders[0][..., 3] > 0.002, pad=2)
    base, clouds, cloud_area = split_clouds(renders[0], noclouds, mask0)
    x0, y0, x1, y1 = base_box
    for sz, sc in SIZES.items():
        save(base[y0:y1, x0:x1], os.path.join(OUT, sz, "island_base.png"), sc)
    manifest["base"] = {"id": STAGE_IDS[0], "name": labels[0], "description": DESCRIPTIONS[0],
                        "file": "island_base.png", "x": x0, "y": y0, "width": x1 - x0,
                        "height": y1 - y0}

    # ambient layers drawn above the base and below every milestone
    for k, cloud in enumerate(clouds, 1):
        x0, y0, x1, y1 = clamp_box(bbox(cloud[..., 3] > 0.002, pad=2), base_box)
        fname = f"island_cloud_{k}.png"
        for sz, sc in SIZES.items():
            save(straight(cloud[y0:y1, x0:x1]), os.path.join(OUT, sz, fname), sc)
        manifest["ambient"].append({"id": f"cloud_{k}", "file": fname, "x": x0, "y": y0,
                                    "width": x1 - x0, "height": y1 - y0,
                                    "ambient": {"kind": "cloud"}})
    for name, layer in water_layers(renders[0], flow).items():
        x0, y0, x1, y1 = clamp_box(bbox(layer[..., 3] > 0.002, pad=2), base_box)
        fname = f"island_water_{name}.png"
        for sz, sc in SIZES.items():
            save(layer[y0:y1, x0:x1], os.path.join(OUT, sz, fname), sc)
        manifest["ambient"].append({"id": f"water_{name}", "file": fname, "x": x0, "y": y0,
                                    "width": x1 - x0, "height": y1 - y0,
                                    "ambient": {"kind": "water"}})

    masks = {}
    for n in range(1, 11):
        hard = change_mask(renders[n - 1], renders[n])
        replaced = np.zeros_like(hard)
        if n in stages.REPLACES:
            # the replacement layer must cover everything the replaced stage drew,
            # so hiding that stage from here on is exact
            for name in stages.REPLACES[n]:
                replaced |= masks[int(name.split("_")[1])]
            hard |= replaced
        masks[n] = hard
        soft = np.clip(box(hard.astype(np.float32), FEATHER) * 1.6, 0, 1)
        soft = np.maximum(soft, hard * 1.0)
        # over a cloud or a tree of an earlier milestone, pixels that did not change
        # belong to the moving layer below; dropping them here leaves the resting
        # picture unchanged and leaves no still copy behind when it moves
        diff = np.abs(premul(renders[n]) - premul(renders[n - 1])).max(axis=2)
        moving = cloud_area.copy()
        for m, numbers in TREE_STAGES.items():
            if m < n:
                for k in numbers:
                    moving |= dilate(tree_ids == k, TREE_REACH)
        keep = np.where(moving & ~replaced, smoothstep(KEEP_LOW, KEEP_HIGH, diff), 1.0)
        if n in TREE_STAGES:
            parts = tree_parts(hard, tree_ids, TREE_STAGES[n])
            for part, region in zip(parts, disjoint_regions([p["mask"] for p in parts])):
                part["region"] = region
            fronts = [p for p in parts if p["pivot"]]
            for part in fronts:
                behind = [q["mask"] for q in fronts if q["pivot"]["y"] > part["pivot"]["y"]]
                if behind:
                    # a back tree continues a little under the tree in front of it, so
                    # swaying trees never open a gap between them
                    ext = dilate(part["mask"], TREE_EXTEND) & np.logical_or.reduce(behind) & (soft >= 0.99)
                    part["region"] = part["region"] | ext
            key = lambda p: p["pivot"]["y"] if p["pivot"] else np.nonzero(p["mask"])[0].mean()
        else:
            parts = [{"mask": m, "pivot": None, "region": box(m.astype(np.float32), FEATHER + 1) > 0}
                     for m in parts_of(hard)]
            key = lambda p: np.nonzero(p["mask"])[0].mean()
        layers = []
        for k, part in enumerate(sorted(parts, key=key), 1):
            x0, y0, x1, y1 = bbox(part["mask"])
            rgba = renders[n][y0:y1, x0:x1].copy()
            rgba[..., 3] *= (soft * part["region"] * keep)[y0:y1, x0:x1]
            fname = f"island_s{n:02d}_p{k}.png"
            for sz, sc in SIZES.items():
                save(rgba, os.path.join(OUT, sz, fname), sc)
            ys, xs = np.nonzero(part["mask"])
            pivot = part["pivot"]
            anchor = pivot or {"x": int(round(xs.mean())), "y": int(ys.max())}
            layer = {"id": f"{STAGE_IDS[n]}_{k}", "file": fname, "x": x0, "y": y0,
                     "width": x1 - x0, "height": y1 - y0, "anchor": anchor,
                     "incidental": bool(part["mask"].sum() < INCIDENTAL)}
            if pivot:
                layer["ambient"] = {"kind": "sway", "pivot": pivot}
            layers.append(layer)
        unlock = {"milestone": n, "thresholdPercent": n * 10, "id": STAGE_IDS[n],
                  "name": labels[n], "description": DESCRIPTIONS[n], "layers": layers,
                  "hides": [STAGE_IDS[int(x.split("_")[1])] for x in stages.REPLACES.get(n, [])]}
        if n in replaced_by:
            unlock["hiddenFromMilestone"] = replaced_by[n]
        manifest["unlocks"].append(unlock)
        sway = sum(1 for layer in layers if "ambient" in layer)
        print(f"stage {n:2d}: {len(layers)} part(s){f', {sway} swaying tree(s)' if sway else ''}, "
              f"{int(hard.sum())} px")

    # reconstruction check against the renders (master size): base, clouds, then
    # milestones; the water layers rest at opacity 0 and are not drawn
    def resting_base():
        comp = np.zeros((H, W, 4), np.float32)
        for layer in [manifest["base"]] + [a for a in manifest["ambient"]
                                           if a["ambient"]["kind"] == "cloud"]:
            over(comp, load(os.path.join(OUT, "2048", layer["file"])), layer["x"], layer["y"])
        return comp

    # each stage exactly as the app draws it: an unlock hidden from a later
    # milestone (the cabin from 80%) is left out from there on
    cache = {}

    def layer_image(layer):
        if layer["file"] not in cache:
            cache[layer["file"]] = load(os.path.join(OUT, "2048", layer["file"]))
        return cache[layer["file"]]

    errors = []
    for n in range(0, 11):
        comp = resting_base()
        for u in manifest["unlocks"][:n]:
            if u.get("hiddenFromMilestone") and u["hiddenFromMilestone"] <= n:
                continue
            for layer in u["layers"]:
                over(comp, layer_image(layer), layer["x"], layer["y"])
        d = np.abs(comp - premul(renders[n])).max(axis=2) * 255
        errors.append((n, float(d.mean()), float(np.percentile(d, 99.9)), float(d.max())))
        print(f"rebuild stage {n:2d}: mean {d.mean():.2f}/255, 99.9% {np.percentile(d, 99.9):.1f}, "
              f"max {d.max():.0f}")

    # the union of every layer box frames the scene in the app (sceneViewport);
    # it must not move, or the approved framing would change
    def bounds(m):
        boxes = [m["base"]] + m.get("ambient", []) + [l for u in m["unlocks"] for l in u["layers"]]
        return (min(b["x"] for b in boxes), min(b["y"] for b in boxes),
                max(b["x"] + b["width"] for b in boxes), max(b["y"] + b["height"] for b in boxes))
    print("layer bounds:", bounds(manifest), "previous export:", bounds(previous) if previous else None)

    # decoded RGBA memory when every layer up to stage 10 is loaded at once
    everything = [manifest["base"]] + manifest["ambient"] + [l for u in manifest["unlocks"]
                                                            for l in u["layers"]]
    area = sum(l["width"] * l["height"] for l in everything)
    manifest["decodedBytesAllLayers"] = {k: int(area * v * v * 4) for k, v in SIZES.items()}
    ambient_area = sum(l["width"] * l["height"] for l in manifest["ambient"])
    manifest["decodedBytesAmbientLayers"] = {k: int(ambient_area * v * v * 4) for k, v in SIZES.items()}
    print("decoded RGBA, all layers:", {k: f"{v / 2**20:.1f} MiB"
                                        for k, v in manifest["decodedBytesAllLayers"].items()},
          "of which ambient:", {k: f"{v / 2**20:.1f} MiB"
                                for k, v in manifest["decodedBytesAmbientLayers"].items()})

    blend = os.path.join(ROOT, "source", "island.blend")
    manifest["provenance"] = {
        "source": "assets/worlds/island (Blender 5.2.3 LTS, procedural, no third-party assets)",
        "decision": "D76; ambient layers D90 (Phase 10.5)",
        "approved": "2026-10-24, owner approved all eleven states",
        "renders": "Cycles 256 samples + swi/stylize.py storybook pass, 2048x1536",
        "ambientInputs": "renders/ambient from scripts/render_ambient.py: stage 0 with the clouds "
                         "invisible to the camera (same rig, samples and storybook pass) and flat "
                         "ID masks of the clouds, stream, waterfall (stage 0) and trees (stage 7)",
        "sourceBlendSha256": hashlib.sha256(open(blend, "rb").read()).hexdigest()[:16],
        "rebuildErrorPer255": [{"stage": n, "mean": round(m, 3), "p999": round(p, 1),
                                "max": round(x, 1)} for n, m, p, x in errors],
        "stackRule": "Draw base, then the ambient layers, then the layers of milestones 1..n in "
                     "order. Cloud layers rest where they are; water layers rest at opacity 0 "
                     "(invisible). A milestone with hiddenFromMilestone may be hidden from that "
                     "milestone on; the later layer already covers it. Positions are top-left in "
                     "the 2048x1536 canvas; scale them for other sizes. anchor is the ground point "
                     "to grow a part from; incidental parts are side effects (shadow or outline "
                     "shifts) to show without animation. A layer with ambient.kind 'sway' is one "
                     "tree; ambient.pivot is its trunk base, the point it sways around.",
        "knownDifference": "The thin Freestyle outline along the island's back rim is redrawn "
                           "slightly differently in every render; the layers keep the stage 0 "
                           "rim line, so the rim never flickers between stages. This is the "
                           "max-error figure below; visually the stacked image matches.",
    }
    with open(os.path.join(OUT, "island_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest:", os.path.join(OUT, "island_manifest.json"))
    layer_sheet(manifest)
    ambient_sheet(manifest)


def layer_sheet(manifest, cols=4, cell=(512, 384), gap=12):
    """Review sheet: base, then each milestone's own layers alone (what the
    unlock animation shows), on the preview backdrop."""
    bg = np.array([int(rig.BACKDROP[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    cw, ch = cell
    rows = -(-11 // cols)
    sheet = np.ones((rows * (ch + gap) + gap, cols * (cw + gap) + gap, 4), np.float32)
    sheet[..., :3] = bg
    clouds = [a for a in manifest["ambient"] if a["ambient"]["kind"] == "cloud"]
    groups = [[manifest["base"]] + clouds] + [u["layers"] for u in manifest["unlocks"]]
    for i, layers in enumerate(groups):
        comp = np.zeros((H, W, 4), np.float32)
        for layer in layers:
            over(comp, load(os.path.join(OUT, "2048", layer["file"])), layer["x"], layer["y"])
        small = comp[::4, ::4]
        y, x = gap + (i // cols) * (ch + gap), gap + (i % cols) * (cw + gap)
        a = small[..., 3:4]
        sheet[y:y + ch, x:x + cw, :3] = small[..., :3] + bg * (1 - a)
    img = bpy.data.images.new("sw_layers", sheet.shape[1], sheet.shape[0], alpha=False)
    img.pixels.foreach_set(np.clip(sheet, 0, 1)[::-1].ravel())
    img.filepath_raw = os.path.join(OUT, "island_layers_review.png")
    img.file_format = "PNG"
    img.save()
    print("layer review:", img.filepath_raw)


def ambient_sheet(manifest, cell=(1024, 768), gap=16):
    """Review sheet for ambient motion: the base without clouds, the cloud
    layers alone, stage 0 with both water layers at full strength and stage 10
    with each swaying tree tinted and its pivot marked."""
    bg = np.array([int(rig.BACKDROP[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    kinds = {}
    for a in manifest["ambient"]:
        kinds.setdefault(a["ambient"]["kind"], []).append(a)

    def stack(layers, tint=None):
        comp = np.zeros((H, W, 4), np.float32)
        for layer in layers:
            img = load(os.path.join(OUT, "2048", layer["file"]))
            if tint and "ambient" in layer and layer["ambient"]["kind"] == "sway":
                img[..., :3] = img[..., :3] * 0.6 + np.array(tint, np.float32) * 0.4
            over(comp, img, layer["x"], layer["y"])
        return comp

    unlocked = [l for u in manifest["unlocks"] if not u.get("hiddenFromMilestone")
                for l in u["layers"]]
    cells = [stack([manifest["base"]]), stack(kinds["cloud"]),
             stack([manifest["base"]] + kinds["cloud"] + kinds["water"]),
             stack([manifest["base"]] + kinds["cloud"] + unlocked, tint=(1.0, 0.35, 0.2))]
    for layer in unlocked:
        if "ambient" in layer:
            px, py = layer["ambient"]["pivot"]["x"], layer["ambient"]["pivot"]["y"]
            cells[3][max(0, py - 6):py + 6, max(0, px - 6):px + 6] = (0.1, 0.2, 0.9, 1.0)
    cw, ch = cell
    sheet = np.ones((2 * (ch + gap) + gap, 2 * (cw + gap) + gap, 4), np.float32)
    sheet[..., :3] = bg
    for i, comp in enumerate(cells):
        small = comp[::2, ::2]
        y, x = gap + (i // 2) * (ch + gap), gap + (i % 2) * (cw + gap)
        a = small[..., 3:4]
        sheet[y:y + ch, x:x + cw, :3] = small[..., :3] + bg * (1 - a)
    img = bpy.data.images.new("sw_ambient", sheet.shape[1], sheet.shape[0], alpha=False)
    img.pixels.foreach_set(np.clip(sheet, 0, 1)[::-1].ravel())
    img.filepath_raw = os.path.join(OUT, "island_ambient_review.png")
    img.file_format = "PNG"
    img.save()
    print("ambient review:", img.filepath_raw)


main()
