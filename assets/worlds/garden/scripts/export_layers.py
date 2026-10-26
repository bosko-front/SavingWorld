"""Export the approved Garden milestone renders as stacked layers plus manifest.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/garden/scripts/export_layers.py

The same export as the Island's (D76, D91-D93): the Island script's helper half
(change masks, part splitting, cloud split, flow streaks, feathering, image io)
is loaded read-only from assets/worlds/island/scripts/export_layers.py, so both
worlds are cut identically and the Island file stays untouched.

Inputs: renders/milestones/garden_stageNN_preview.png (the eleven transparent
2048x1536 masters) and renders/ambient/ from render_ambient.py.

Output in export/ (sizes "2048" master and "1536" app candidate):

- garden_base.png            stage 0 without the two drifting clouds
- garden_cloud_K.png         the drifting clouds (manifest "ambient", kind cloud)
- garden_sNN_pK.png          part K of milestone NN; trees are one part each with
                             ambient.kind "sway" and the trunk base as pivot
- garden_manifest.json       the contract the current app reads (themeId, version,
                             canvas, base, ambient, unlocks...) plus
                             "ambientExtensions": Garden motion the current contract
                             cannot express yet (water and pond ripples arriving at
                             60%, koi, lantern glow, butterflies, falling petals).
                             The current adapter ignores that key; Phase 17 extends
                             the contract before the app uses it.

Rest rule: drawing the base, the cloud layers, every part of milestones 1..n and
the koi (from 60%) reproduces stage n; the script checks that against all eleven
renders. Every other extension layer rests invisible.
"""

import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

import swg  # noqa: E402  (puts the Island's swi package on the path)
from swg import layout as L  # noqa: E402
from swg import stages  # noqa: E402
from swi import rig  # noqa: E402


def island_helpers():
    """The Island export's helper functions and constants (everything above its
    main section), executed in their own namespace."""
    path = os.path.join(swg.ISLAND_SCRIPTS, "export_layers.py")
    src = open(path).read()
    cut = src.index("# ------------------------------------------------------------------ main")
    ns = {"__file__": path, "__name__": "island_export_helpers"}
    exec(compile(src[:cut], path, "exec"), ns)
    return ns


I = island_helpers()
load, load_mask, save, straight, premul = I["load"], I["load_mask"], I["save"], I["straight"], I["premul"]
box, dilate, smoothstep, bbox, over = I["box"], I["dilate"], I["smoothstep"], I["bbox"], I["over"]
parts_of, change_mask, clamp_box = I["parts_of"], I["change_mask"], I["clamp_box"]
split_clouds, tree_parts, disjoint_regions = I["split_clouds"], I["tree_parts"], I["disjoint_regions"]
streak_tile, sample_tile = I["streak_tile"], I["sample_tile"]
FEATHER, INCIDENTAL, TREE_EXTEND, TREE_REACH = I["FEATHER"], I["INCIDENTAL"], I["TREE_EXTEND"], I["TREE_REACH"]
KEEP_LOW, KEEP_HIGH, SNAP = I["KEEP_LOW"], I["KEEP_HIGH"], I["SNAP"]
WATER_STREAM, WATER_FALL, WATER_ALPHA, WATER_WHITEN = (I["WATER_STREAM"], I["WATER_FALL"],
                                                       I["WATER_ALPHA"], I["WATER_WHITEN"])
WATER_PHASES, FLOW_V_MAX = I["WATER_PHASES"], I["FLOW_V_MAX"]

ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "renders", "milestones")
AMBIENT = os.path.join(ROOT, "renders", "ambient")
OUT = os.path.join(ROOT, "export")
SIZES = {"2048": 1.0, "1536": 0.75}
W, H = rig.RES
VERSION = 1  # first Garden art version (CURRENT_THEME_VERSIONS reserves garden 1)

TREE_STAGES = {4: [1], 9: list(range(2, 2 + len(L.FINAL_TREES)))}  # ids in garden_mask_stage09
MIN_TREE_PX = 1500   # a tree mostly hidden behind another stays a still part
KOI_STAGE = 6
KOI_REACH = 60       # px: how far a koi swims from its resting place
WATER_STAGE = 6
# pond and fountain basins: U runs from the centre (0.5) to the rim (1), so the
# streak pattern is sampled with the radius as "along", giving rings that travel
# outward (ripples) instead of a current
# streaks stretched around the pond (blur_u) and thin along the radius (blur_v)
WATER_POND = {"seed": 5103, "period": 0.2, "lanes": 32, "steps": 16, "blur_u": 6, "blur_v": 1}
POND_ALPHA = 0.55
LIGHTS = [  # id in the stage 9 mask red channel (x 32), milestone that adds it
    (1, "lantern_1", 7), (2, "lantern_2", 7), (3, "lantern_3", 7), (4, "lantern_4", 7),
    (5, "pergola_lantern", 9), (6, "greenhouse_lights", 8)]
MIN_LIGHT_PX = 40
HALO_RADIUS = 18     # px of soft warm glow around a light
HALO_ALPHA = 0.5
HALO_COLOR = (1.0, 0.83, 0.52)
BUTTERFLY_MILESTONE = 3   # proposal: butterflies once the flowers bloom
PETAL_MILESTONE = 4       # with the blossom tree
PETAL_COUNT = 3

STAGE_IDS = ["empty_garden", "first_seedlings", "small_flower_bed", "more_flowers",
             "decorative_tree", "garden_pathway", "small_fountain", "bench_decorations",
             "greenhouse", "final_plants", "completed_garden"]
# Draft English scene descriptions for VoiceOver; Phase 17 owns the final copy.
DESCRIPTIONS = [
    "An empty floating garden with three lawn terraces held up by stone walls.",
    "A small vegetable plot with rows of seedlings appears on the middle terrace.",
    "A raised wooden planter full of flowers sits on the middle terrace.",
    "Hydrangeas, lavender and flowering bushes bloom around the garden.",
    "A pink blossom tree grows on the top terrace.",
    "A paved path with stone stairs climbs to the top terrace.",
    "A small fountain sends water down a stream into a lily pond with koi, under a bridge "
    "and over the edge as a waterfall.",
    "A bench by the pond, lanterns along the path, a birdbath and flower pots appear.",
    "A glass greenhouse with vegetable beds and a white fence stands on the top terrace.",
    "A rose-covered pergola, more trees and shrubs fill the garden.",
    "The garden is complete: a seating nook, flowering vines over the cliff and small "
    "floating islets.",
]


def write_layer(rgba, fname, x0, y0, x1, y1):
    for sz, sc in SIZES.items():
        save(rgba[y0:y1, x0:x1], os.path.join(OUT, sz, fname), sc)
    return {"file": fname, "x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}


def water_layers(render, flow):
    """Three flowing-streak layers (the Island's D93 method) over the rill, the
    stream and both falls, with pond and basin ripples travelling outward."""
    kind = flow[..., 2]
    water = flow[..., 3] > 0.5
    stream = water & (kind > 0.75)
    fall = water & (kind > 0.375) & (kind <= 0.75)
    pond = water & (kind > 0.125) & (kind <= 0.375)
    u, v = flow[..., 0], flow[..., 1] * FLOW_V_MAX
    banks = smoothstep(0.04, 0.22, u) * smoothstep(0.96, 0.78, u)
    radial = (u - 0.5) * 2.0                         # pond: 0 at the centre, 1 at the rim
    around = np.mod(v / 4.0, 1.0)  # Flow V around the pond is angle x radius x 0.6 (up to ~7.3)
    rim = smoothstep(0.98, 0.85, radial) * smoothstep(0.05, 0.25, radial)
    tiles = {n: (c, streak_tile(c["seed"], c["lanes"], c["steps"], c["blur_u"], c["blur_v"]))
             for n, c in (("stream", WATER_STREAM), ("fall", WATER_FALL), ("pond", WATER_POND))}
    out = {}
    for k, name in enumerate(WATER_PHASES):
        pattern = np.zeros((H, W), np.float32)
        strength = np.zeros((H, W), np.float32)
        for region, key, uu, vv, edge in ((stream, "stream", u, v, banks), (fall, "fall", u, v, banks),
                                          (pond, "pond", around, radial, rim * POND_ALPHA / WATER_ALPHA)):
            cfg, tile = tiles[key]
            shift = -k * cfg["period"] / len(WATER_PHASES)
            pattern[region] = sample_tile(tile, uu[region], vv[region], cfg["period"], shift)
            strength[region] = edge[region]
        a = box(pattern * strength * water, 1) * render[..., 3] * WATER_ALPHA
        rgb = render[..., :3] * (1 - WATER_WHITEN) + WATER_WHITEN
        out[name] = np.concatenate([rgb, a[..., None]], axis=2)
    return out


def halo(mask):
    """Soft warm glow around a light, resting invisible (the app raises it a little)."""
    g = box(box(dilate(mask, 2).astype(np.float32), HALO_RADIUS // 2), HALO_RADIUS // 2)
    a = np.clip(g * 3.0, 0, 1) * HALO_ALPHA
    rgb = np.ones((H, W, 3), np.float32) * np.array(HALO_COLOR, np.float32)
    return np.concatenate([rgb, a[..., None]], axis=2)


def petal_sprites(blossom_mask, render):
    """A few single petals for the occasional fall: small soft pink ovals taken
    from the blossom canopy's own colors, placed at its lower edge."""
    ys, xs = np.nonzero(blossom_mask)
    canopy = render[blossom_mask]
    pink = np.median(canopy[:, :3][canopy[:, 3] > 0.9], axis=0)
    out = []
    rng = np.random.default_rng(5104)
    low = ys > np.percentile(ys, 70)
    for k in range(PETAL_COUNT):
        i = rng.choice(np.nonzero(low)[0])
        cx, cy = int(xs[i]), int(ys[i]) + 10
        w, h = 12, 8
        yy, xx = np.mgrid[-h:h + 1, -w:w + 1].astype(np.float32)
        ang = rng.uniform(0, np.pi)
        rx = xx * np.cos(ang) + yy * np.sin(ang)
        ry = -xx * np.sin(ang) + yy * np.cos(ang)
        d = np.sqrt((rx / 9.0) ** 2 + (ry / 5.5) ** 2)
        a = smoothstep(1.0, 0.75, d)
        shade = 1.0 + 0.12 * smoothstep(0.6, 0.0, d)
        sprite = np.zeros((H, W, 4), np.float32)
        sprite[cy - h:cy + h + 1, cx - w:cx + w + 1, :3] = np.clip(pink * shade[..., None], 0, 1)
        sprite[cy - h:cy + h + 1, cx - w:cx + w + 1, 3] = a
        out.append(sprite)
    return out


def main():
    renders = [load(os.path.join(SRC, f"garden_stage{n:02d}_preview.png")) for n in range(11)]
    noclouds = load(os.path.join(AMBIENT, "garden_stage00_noclouds.png"))
    nokoi = load(os.path.join(AMBIENT, "garden_stage06_nokoi.png"))
    butterflies = load(os.path.join(AMBIENT, "garden_butterflies.png"))
    mask0 = load_mask(os.path.join(AMBIENT, "garden_mask_stage00.png"))
    mask6 = load_mask(os.path.join(AMBIENT, "garden_mask_stage06.png"))
    mask9 = load_mask(os.path.join(AMBIENT, "garden_mask_stage09.png"))
    flow = load_mask(os.path.join(AMBIENT, "garden_flow_stage06.png"))
    tree_ids = np.round(mask9[..., 2] * 255 / 16).astype(np.int32) * (mask9[..., 3] > 0.5)
    light_ids = np.round(mask9[..., 0] * 255 / 32).astype(np.int32) * (mask9[..., 3] > 0.5)
    koi_ids = np.round(mask6[..., 1] * 255 / 64).astype(np.int32) * (mask6[..., 3] > 0.5)
    koi_ids[koi_ids > 2] = 0  # green 255 is the drifting clouds
    for sz in SIZES:
        os.makedirs(os.path.join(OUT, sz), exist_ok=True)
        for f in os.listdir(os.path.join(OUT, sz)):
            if f.endswith(".png"):
                os.remove(os.path.join(OUT, sz, f))
    labels = {n: label for n, _, label in stages.STAGES}

    manifest = {
        "themeId": "garden",
        "version": VERSION,
        "canvas": {"width": W, "height": H, "aspectRatio": "4:3"},
        "sizes": {k: {"scale": v, "directory": k} for k, v in SIZES.items()},
        "base": None,
        "ambient": [],
        "unlocks": [],
        "ambientExtensions": {},
        "provenance": {},
    }
    ext = []

    # base without the drifting clouds, in the approved base's box (keeps the framing)
    base_box = bbox(renders[0][..., 3] > 0.002, pad=2)
    base, clouds, cloud_area = split_clouds(renders[0], noclouds, mask0)
    x0, y0, x1, y1 = base_box
    manifest["base"] = {"id": STAGE_IDS[0], "name": labels[0], "description": DESCRIPTIONS[0],
                        **write_layer(base, "garden_base.png", x0, y0, x1, y1)}
    for k, cloud in enumerate(clouds, 1):
        b = clamp_box(bbox(cloud[..., 3] > 0.002, pad=2), base_box)
        manifest["ambient"].append({"id": f"cloud_{k}", **write_layer(straight(cloud), f"garden_cloud_{k}.png", *b),
                                    "ambient": {"kind": "cloud"}})

    # koi: stage 6 is cut from the koi-free render; each koi is its own resting layer
    koi_region = {k: dilate(koi_ids == k, 3) for k in (1, 2) if (koi_ids == k).any()}
    stage_src = list(renders)
    stage_src[KOI_STAGE] = nokoi

    for n in range(1, 11):
        prev = renders[n - 1]
        cur = stage_src[n]
        hard = change_mask(prev, cur)
        soft = np.clip(box(hard.astype(np.float32), FEATHER) * 1.6, 0, 1)
        soft = np.maximum(soft, hard * 1.0)
        diff = np.abs(premul(cur) - premul(prev)).max(axis=2)
        # over something that moves later (a drifting cloud, a swaying tree of an
        # earlier milestone, a swimming koi) unchanged pixels belong to the moving
        # layer below; dropping them keeps the still picture and leaves no copy behind
        moving = cloud_area.copy()
        for m, numbers in TREE_STAGES.items():
            if m < n:
                for k in numbers:
                    moving |= dilate(tree_ids == k, TREE_REACH)
        if n > KOI_STAGE:
            for region in koi_region.values():
                moving |= dilate(region, KOI_REACH)
        keep = np.where(moving, smoothstep(KEEP_LOW, KEEP_HIGH, diff), 1.0)
        numbers = [k for k in TREE_STAGES.get(n, []) if (tree_ids == k).sum() >= MIN_TREE_PX]
        if numbers:
            parts = tree_parts(hard, tree_ids, numbers)
            for part, region in zip(parts, disjoint_regions([p["mask"] for p in parts])):
                part["region"] = region
            fronts = [p for p in parts if p["pivot"]]
            for part in fronts:
                behind = [q["mask"] for q in fronts if q["pivot"]["y"] > part["pivot"]["y"]]
                if behind:
                    e = dilate(part["mask"], TREE_EXTEND) & np.logical_or.reduce(behind) & (soft >= 0.99)
                    part["region"] = part["region"] | e
            key = lambda p: p["pivot"]["y"] if p["pivot"] else np.nonzero(p["mask"])[0].mean()
        else:
            parts = [{"mask": m, "pivot": None, "region": box(m.astype(np.float32), FEATHER + 1) > 0}
                     for m in parts_of(hard)]
            key = lambda p: np.nonzero(p["mask"])[0].mean()
        layers = []
        for k, part in enumerate(sorted(parts, key=key), 1):
            x0, y0, x1, y1 = bbox(part["mask"])
            rgba = cur.copy()
            rgba[..., 3] *= soft * part["region"] * keep
            ys, xs = np.nonzero(part["mask"])
            pivot = part["pivot"]
            layer = {"id": f"{STAGE_IDS[n]}_{k}",
                     **write_layer(rgba, f"garden_s{n:02d}_p{k}.png", x0, y0, x1, y1),
                     "anchor": pivot or {"x": int(round(xs.mean())), "y": int(ys.max())},
                     "incidental": bool(part["mask"].sum() < INCIDENTAL)}
            if pivot:
                layer["ambient"] = {"kind": "sway", "pivot": pivot}
            layers.append(layer)
        manifest["unlocks"].append({"milestone": n, "thresholdPercent": n * 10, "id": STAGE_IDS[n],
                                    "name": labels[n], "description": DESCRIPTIONS[n],
                                    "layers": layers, "hides": []})
        sway = sum(1 for layer in layers if "ambient" in layer)
        print(f"stage {n:2d}: {len(layers)} part(s){f', {sway} swaying tree(s)' if sway else ''}, "
              f"{int(hard.sum())} px")

    # ------------------------------------------------------------ extension layers
    for name, layer in water_layers(nokoi, flow).items():
        b = clamp_box(bbox(layer[..., 3] > 0.002, pad=2), base_box)
        ext.append({"id": f"water_{name}", **write_layer(layer, f"garden_water_{name}.png", *b),
                    "kind": "water", "milestone": WATER_STAGE, "drawAfterMilestone": WATER_STAGE,
                    "rest": "hidden"})
    for k, region in koi_region.items():
        rgba = renders[KOI_STAGE].copy()
        rgba[..., 3] *= np.clip(box(region.astype(np.float32), 1), 0, 1)
        b = bbox(region)
        ys, xs = np.nonzero(koi_ids == k)
        ext.append({"id": f"koi_{k}", **write_layer(rgba, f"garden_koi_{k}.png", *b),
                    "kind": "koi", "milestone": KOI_STAGE, "drawAfterMilestone": KOI_STAGE,
                    "rest": "visible", "center": {"x": int(round(xs.mean())), "y": int(round(ys.mean()))}})
    for lid, name, milestone in LIGHTS:
        m = light_ids == lid
        if m.sum() < MIN_LIGHT_PX:
            print(f"light {name}: {int(m.sum())} px visible, no glow layer")
            continue
        layer = halo(m)
        b = bbox(layer[..., 3] > 0.004, pad=2)
        ys, xs = np.nonzero(m)
        ext.append({"id": f"glow_{name}", **write_layer(layer, f"garden_glow_{name}.png", *b),
                    "kind": "glow", "milestone": milestone, "drawAfterMilestone": milestone,
                    "rest": "hidden", "center": {"x": int(round(xs.mean())), "y": int(round(ys.mean()))}})
    for k, m in enumerate(sorted(parts_of(butterflies[..., 3] > 0.05),
                                 key=lambda m: np.nonzero(m)[1].mean()), 1):
        region = dilate(m, 3)
        rgba = butterflies.copy()
        rgba[..., 3] *= region
        b = bbox(region)
        ys, xs = np.nonzero(m)
        ext.append({"id": f"butterfly_{k}", **write_layer(rgba, f"garden_butterfly_{k}.png", *b),
                    "kind": "butterfly", "milestone": BUTTERFLY_MILESTONE, "drawAfterMilestone": 10,
                    "rest": "hidden", "center": {"x": int(round(xs.mean())), "y": int(round(ys.mean()))}})
    for k, sprite in enumerate(petal_sprites(tree_ids == 1, renders[4]), 1):
        b = bbox(sprite[..., 3] > 0.01, pad=2)
        ext.append({"id": f"petal_{k}", **write_layer(sprite, f"garden_petal_{k}.png", *b),
                    "kind": "petal", "milestone": PETAL_MILESTONE, "drawAfterMilestone": 10,
                    "rest": "hidden"})
    manifest["ambientExtensions"] = {
        "status": "Not read by the current app. The current manifest contract has cloud and water "
                  "only in the base and sway on unlock layers; Phase 17 extends it (water owned by an "
                  "unlock, koi, glow, butterfly, petal) before Garden uses these layers.",
        "rule": "A layer appears from its milestone on and is drawn right after the layers of "
                "drawAfterMilestone (10 = above everything). rest 'visible' layers are part of the "
                "approved still picture (the koi rest where they are); rest 'hidden' layers are "
                "invisible at rest and only shown by ambient motion (water flow and ripples: the "
                "three layers faded in turn as on the Island, D93; glow: a little warmth; "
                "butterfly and petal: an occasional short flight or fall from where they rest). "
                "Ambient motion follows D90: Home visible, app active, off under Reduce Motion.",
        "layers": ext,
    }
    print("extension layers:", ", ".join(e["id"] for e in ext))

    # ------------------------------------------------------------ rebuild check
    cache = {}

    def img(layer):
        if layer["file"] not in cache:
            cache[layer["file"]] = load(os.path.join(OUT, "2048", layer["file"]))
        return cache[layer["file"]]

    errors = []
    for n in range(11):
        comp = np.zeros((H, W, 4), np.float32)
        for layer in [manifest["base"]] + manifest["ambient"]:
            over(comp, img(layer), layer["x"], layer["y"])
        for u in manifest["unlocks"][:n]:
            for layer in u["layers"]:
                over(comp, img(layer), layer["x"], layer["y"])
            for e in ext:
                if e["rest"] == "visible" and e["drawAfterMilestone"] == u["milestone"]:
                    over(comp, img(e), e["x"], e["y"])
        d = np.abs(comp - premul(renders[n])).max(axis=2) * 255
        errors.append((n, float(d.mean()), float(np.percentile(d, 99.9)), float(d.max())))
        print(f"rebuild stage {n:2d}: mean {d.mean():.2f}/255, 99.9% {np.percentile(d, 99.9):.1f}, "
              f"max {d.max():.0f}")

    boxes = [manifest["base"]] + manifest["ambient"] + [l for u in manifest["unlocks"] for l in u["layers"]]
    print("layer bounds:", (min(b["x"] for b in boxes), min(b["y"] for b in boxes),
                            max(b["x"] + b["width"] for b in boxes), max(b["y"] + b["height"] for b in boxes)))

    def decoded(layers):
        area = sum(l["width"] * l["height"] for l in layers)
        return {k: int(area * v * v * 4) for k, v in SIZES.items()}

    manifest["decodedBytesAllLayers"] = decoded(boxes)
    manifest["decodedBytesAmbientLayers"] = decoded(manifest["ambient"])
    manifest["decodedBytesExtensionLayers"] = decoded(ext)
    counts = {"contract": len(boxes), "extension": len(ext)}
    print("layers:", counts, "decoded RGBA:",
          {k: f"{v / 2**20:.1f} MiB" for k, v in manifest["decodedBytesAllLayers"].items()},
          "+ extension", {k: f"{v / 2**20:.1f} MiB" for k, v in manifest["decodedBytesExtensionLayers"].items()})

    blend = os.path.join(ROOT, "source", "garden.blend")
    manifest["provenance"] = {
        "source": "assets/worlds/garden (Blender 5.2.3 LTS, procedural, no third-party assets; "
                  "shared Island rig, storybook pass and shaders)",
        "decision": "D118 (art workstream), D119 (milestone sequence)",
        "approved": "2026-10-26, owner approved all eleven states and this export (strengthened "
                    "10% and 20%); D120",
        "renders": "Cycles 256 samples + swi/stylize.py storybook pass, 2048x1536",
        "ambientInputs": "renders/ambient from scripts/render_ambient.py: stage 0 without the two "
                         "drifting clouds, stage 6 without the koi, the butterflies alone (same rig, "
                         "samples and storybook pass), flat ID masks and the 16-bit water flow pass",
        "sourceBlendSha256": hashlib.sha256(open(blend, "rb").read()).hexdigest()[:16],
        "rebuildErrorPer255": [{"stage": n, "mean": round(m, 3), "p999": round(p, 1), "max": round(x, 1)}
                               for n, m, p, x in errors],
        "stackRule": "Draw base, then the ambient (cloud) layers, then the layers of milestones 1..n "
                     "in order (and the ambientExtensions rest-visible layers after their milestone). "
                     "Positions are top-left in the 2048x1536 canvas; scale them for other sizes. "
                     "anchor is the ground point to grow a part from; incidental parts show without "
                     "animation. A layer with ambient.kind 'sway' is one tree; ambient.pivot is its "
                     "trunk base. Nothing is replaced (D119).",
    }
    with open(os.path.join(OUT, "garden_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("manifest:", os.path.join(OUT, "garden_manifest.json"))
    review_sheets(manifest, ext, img)


def review_sheets(manifest, ext, img, cols=4, cell=(512, 384), gap=12):
    """garden_layers_review.png: the base, then each milestone's own layers alone.
    garden_ambient_review.png: base without clouds, the cloud layers, stage 6
    with water, ripples and koi at full strength, and stage 10 with every
    swaying tree tinted (pivot marked), the glows and the butterflies and petals."""
    bg = np.array([int(rig.BACKDROP[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)

    def stack(layers, tint=None):
        comp = np.zeros((H, W, 4), np.float32)
        for layer in layers:
            im = img(layer).copy()
            if tint and layer.get("ambient", {}).get("kind") == "sway":
                im[..., :3] = im[..., :3] * 0.6 + np.array(tint, np.float32) * 0.4
            over(comp, im, layer["x"], layer["y"])
        return comp

    def sheet(comps, cols, step, name):
        cw, ch = W // step, H // step
        rows = -(-len(comps) // cols)
        out = np.ones((rows * (ch + gap) + gap, cols * (cw + gap) + gap, 4), np.float32)
        out[..., :3] = bg
        for i, comp in enumerate(comps):
            small = comp[::step, ::step]
            y, x = gap + (i // cols) * (ch + gap), gap + (i % cols) * (cw + gap)
            a = small[..., 3:4]
            out[y:y + ch, x:x + cw, :3] = small[..., :3] + bg * (1 - a)
        im = bpy.data.images.new(name, out.shape[1], out.shape[0], alpha=False)
        im.pixels.foreach_set(np.clip(out, 0, 1)[::-1].ravel())
        im.filepath_raw = os.path.join(OUT, name)
        im.file_format = "PNG"
        im.save()
        print("review:", im.filepath_raw)

    clouds = manifest["ambient"]
    sheet([stack([manifest["base"]] + clouds)] + [stack(u["layers"]) for u in manifest["unlocks"]],
          cols, 4, "garden_layers_review.png")
    full = lambda kinds: [e for e in ext if e["kind"] in kinds]
    upto6 = [l for u in manifest["unlocks"][:6] for l in u["layers"]]
    all_layers = [l for u in manifest["unlocks"] for l in u["layers"]]
    s10 = stack([manifest["base"]] + clouds + all_layers + full({"koi", "glow", "butterfly", "petal"}),
                tint=(1.0, 0.35, 0.2))
    for layer in all_layers:
        if "ambient" in layer:
            px, py = layer["ambient"]["pivot"]["x"], layer["ambient"]["pivot"]["y"]
            s10[max(0, py - 6):py + 6, max(0, px - 6):px + 6] = (0.1, 0.2, 0.9, 1.0)
    sheet([stack([manifest["base"]]), stack(clouds),
           stack([manifest["base"]] + clouds + upto6 + full({"water"}) + full({"koi"})), s10],
          2, 2, "garden_ambient_review.png")


main()
