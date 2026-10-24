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

Drawing the base and then every part of stages 1..n in order reproduces stage
n; the script checks that against the renders and prints the error. Sizes:
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


# ------------------------------------------------------------------ main

def main():
    renders = [load(os.path.join(SRC, f"island_stage{n:02d}_preview.png")) for n in range(11)]
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
        "version": 1,
        "canvas": {"width": W, "height": H, "aspectRatio": "4:3"},
        "sizes": {k: {"scale": v, "directory": k} for k, v in SIZES.items()},
        "base": None,
        "unlocks": [],
        "provenance": {},
    }

    # base layer
    base = renders[0]
    x0, y0, x1, y1 = bbox(base[..., 3] > 0.002, pad=2)
    for sz, sc in SIZES.items():
        save(base[y0:y1, x0:x1], os.path.join(OUT, sz, "island_base.png"), sc)
    manifest["base"] = {"id": STAGE_IDS[0], "name": labels[0], "description": DESCRIPTIONS[0],
                        "file": "island_base.png", "x": x0, "y": y0, "width": x1 - x0,
                        "height": y1 - y0}

    masks = {}
    for n in range(1, 11):
        hard = change_mask(renders[n - 1], renders[n])
        if n in stages.REPLACES:
            # the replacement layer must cover everything the replaced stage drew,
            # so hiding that stage from here on is exact
            for name in stages.REPLACES[n]:
                hard |= masks[int(name.split("_")[1])]
        masks[n] = hard
        soft = np.clip(box(hard.astype(np.float32), FEATHER) * 1.6, 0, 1)
        soft = np.maximum(soft, hard * 1.0)
        layers = []
        for k, part in enumerate(sorted(parts_of(hard), key=lambda m: np.nonzero(m)[0].mean()), 1):
            region = box(part.astype(np.float32), FEATHER + 1) > 0
            x0, y0, x1, y1 = bbox(part)
            rgba = renders[n][y0:y1, x0:x1].copy()
            rgba[..., 3] *= (soft * region)[y0:y1, x0:x1]
            fname = f"island_s{n:02d}_p{k}.png"
            for sz, sc in SIZES.items():
                save(rgba, os.path.join(OUT, sz, fname), sc)
            ys, xs = np.nonzero(part)
            anchor = {"x": int(round(xs.mean())), "y": int(ys.max())}
            layers.append({"id": f"{STAGE_IDS[n]}_{k}", "file": fname, "x": x0, "y": y0,
                           "width": x1 - x0, "height": y1 - y0, "anchor": anchor,
                           "incidental": bool(part.sum() < INCIDENTAL)})
        unlock = {"milestone": n, "thresholdPercent": n * 10, "id": STAGE_IDS[n],
                  "name": labels[n], "description": DESCRIPTIONS[n], "layers": layers,
                  "hides": [STAGE_IDS[int(x.split("_")[1])] for x in stages.REPLACES.get(n, [])]}
        if n in replaced_by:
            unlock["hiddenFromMilestone"] = replaced_by[n]
        manifest["unlocks"].append(unlock)
        print(f"stage {n:2d}: {len(layers)} part(s), {int(hard.sum())} px")

    # reconstruction check against the renders (master size)
    errors = []
    comp = np.zeros((H, W, 4), np.float32)
    bl = load(os.path.join(OUT, "2048", "island_base.png"))
    b = manifest["base"]
    over(comp, bl, b["x"], b["y"])
    for n in range(1, 11):
        for layer in manifest["unlocks"][n - 1]["layers"]:
            over(comp, load(os.path.join(OUT, "2048", layer["file"])), layer["x"], layer["y"])
        d = np.abs(comp - premul(renders[n])).max(axis=2) * 255
        errors.append((n, float(d.mean()), float(np.percentile(d, 99.9)), float(d.max())))
        print(f"rebuild stage {n:2d}: mean {d.mean():.2f}/255, 99.9% {np.percentile(d, 99.9):.1f}, "
              f"max {d.max():.0f}")
    # hiding the replaced small house from stage 8 on must give the same picture
    comp2 = np.zeros((H, W, 4), np.float32)
    over(comp2, bl, b["x"], b["y"])
    for n in range(1, 11):
        u = manifest["unlocks"][n - 1]
        if u.get("hiddenFromMilestone") and u["hiddenFromMilestone"] <= 10:
            continue
        for layer in u["layers"]:
            over(comp2, load(os.path.join(OUT, "2048", layer["file"])), layer["x"], layer["y"])
    d2 = np.abs(comp2 - comp).max(axis=2) * 255
    print(f"stage 10 with the small house hidden vs stacked: max {d2.max():.1f}/255")

    # decoded RGBA memory when every layer up to stage 10 is loaded at once
    area = b["width"] * b["height"] + sum(l["width"] * l["height"]
                                          for u in manifest["unlocks"] for l in u["layers"])
    manifest["decodedBytesAllLayers"] = {k: int(area * v * v * 4) for k, v in SIZES.items()}
    print("decoded RGBA, all layers:", {k: f"{v / 2**20:.1f} MiB"
                                        for k, v in manifest["decodedBytesAllLayers"].items()})

    blend = os.path.join(ROOT, "source", "island.blend")
    manifest["provenance"] = {
        "source": "assets/worlds/island (Blender 5.2.3 LTS, procedural, no third-party assets)",
        "decision": "D76",
        "approved": "2026-10-24, owner approved all eleven states",
        "renders": "Cycles 256 samples + swi/stylize.py storybook pass, 2048x1536",
        "sourceBlendSha256": hashlib.sha256(open(blend, "rb").read()).hexdigest()[:16],
        "rebuildErrorPer255": [{"stage": n, "mean": round(m, 3), "p999": round(p, 1),
                                "max": round(x, 1)} for n, m, p, x in errors],
        "stackRule": "Draw base, then the layers of milestones 1..n in order. A milestone with "
                     "hiddenFromMilestone may be hidden from that milestone on; the later layer "
                     "already covers it. Positions are top-left in the 2048x1536 canvas; scale "
                     "them for other sizes. anchor is the ground point to grow a part from; "
                     "incidental parts are side effects (shadow or outline shifts) to show "
                     "without animation.",
        "knownDifference": "The thin Freestyle outline along the island's back rim is redrawn "
                           "slightly differently in every render; the layers keep the stage 0 "
                           "rim line, so the rim never flickers between stages. This is the "
                           "max-error figure below; visually the stacked image matches.",
    }
    with open(os.path.join(OUT, "island_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest:", os.path.join(OUT, "island_manifest.json"))
    layer_sheet(manifest)


def layer_sheet(manifest, cols=4, cell=(512, 384), gap=12):
    """Review sheet: base, then each milestone's own layers alone (what the
    unlock animation shows), on the preview backdrop."""
    bg = np.array([int(rig.BACKDROP[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    cw, ch = cell
    rows = -(-11 // cols)
    sheet = np.ones((rows * (ch + gap) + gap, cols * (cw + gap) + gap, 4), np.float32)
    sheet[..., :3] = bg
    groups = [[manifest["base"]]] + [u["layers"] for u in manifest["unlocks"]]
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


main()
