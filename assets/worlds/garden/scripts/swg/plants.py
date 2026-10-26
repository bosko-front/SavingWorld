"""Garden plants: trees (each its own trunk and canopy object, so the export
can sway canopies on their own pivot), the pink blossom tree, seedlings,
flower beds, flower patches, hydrangeas, lavender and the flowering vines
that hang over the cliff."""

import math

from swi import materials as M
from swi import nature as N
from swi.common import (TAU, Geo, Vector, clamp, fbm, metaball_object, mix_color, rng,
                        scale_color, smoothstep, srgb)

from . import layout as L
from . import terrain as T
from . import water as W

AX = Vector((1.0, 0.0, 0.0))  # world X: screen lower right
AY = Vector((0.0, 1.0, 0.0))  # world Y: screen upper right

LEAF_DARK = srgb("#3C7D2E")
LEAF = srgb("#5FA63A")
SOIL = srgb("#6A452F")
SOIL_LIGHT = srgb("#8C6142")
SPROUT = srgb("#8ED24E")
PALETTE = ["#F6A9C4", "#FFFFFF", "#F7D45A", "#B9A2E8", "#F49A7A", "#FFE3EE"]
# Polish pass: stronger garden colours so flower masses survive the storybook
# filter at phone size (pink, purple, white and yellow lead)
PINK, ROSE, BLUSH = "#F27BAA", "#E25C93", "#F9B8D0"
LILAC, PURPLE, VIOLET = "#B892EC", "#8F66D6", "#7B5BD6"
WHITE, CREAM = "#FFFDF7", "#FFF0C2"
YELLOW, GOLD, CORAL = "#F9CC3E", "#F2A93B", "#F58C74"
PALETTES = {"pink": [PINK, ROSE, WHITE], "purple": [PURPLE, LILAC, WHITE],
            "yellow": [YELLOW, GOLD, CREAM], "white": [WHITE, BLUSH, LILAC],
            "mixed": [PINK, YELLOW, LILAC, WHITE]}


def ground(v, u, lift=0.0):
    x, y = L.xy(v, u)
    return Vector((x, y, T.height_at(x, y) + lift))


# ------------------------------------------------------------------ trees


def tree(col, name, kind, pos_vu, height, size, seed, colors=None, material=None):
    """One tree as Tree_<name>_Trunk + Tree_<name>_Canopy. Returns the trunk
    base (the sway pivot)."""
    base = ground(*pos_vu)
    trunk, needles, crowns = Geo(), Geo(), []
    if kind == "pine":
        N.pine(trunk, needles, base, height, size, seed)
        trunk.to_object(f"Tree_{name}_Trunk", col, [M.wood("SW_Bark")])
        needles.to_object(f"Tree_{name}_Canopy", col, [M.foliage()])
    else:
        N.broadleaf(trunk, crowns, base, height, size, seed)
        if colors:
            crowns[0].update(colors)
        trunk.to_object(f"Tree_{name}_Trunk", col, [M.wood("SW_Bark")])
        metaball_object(f"Tree_{name}_Canopy", col, N.crown_elements(crowns),
                        [material or M.foliage()], N.crown_color_fn(crowns), resolution=0.07,
                        displace_fn=N.crown_displace_fn(seed))
    return base


BLOSSOM = dict(dark=srgb("#D7739A"), mid=srgb("#F4A3C2"), sun=srgb("#FFDCE8"))


def build_blossom_tree(col):
    """The decorative tree: a pink-blossom tree on the greenhouse terrace, with
    fallen petals on the lawn under it."""
    t = L.BLOSSOM_TREE
    tree(col, "Blossom", "broad", t["pos"], t["height"], t["canopy"], t["seed"], colors=BLOSSOM,
         material=M.foliage("SWG_Blossom", rim=0.18))
    petals = Geo()
    r = rng(330)
    cx, cy = L.xy(*t["pos"])
    for i in range(70):
        a, d = r.uniform(0, TAU), t["canopy"] * 1.15 * math.sqrt(r.random())
        x, y = cx + math.cos(a) * d + 0.5, cy + math.sin(a) * d - 0.3
        if T.radial_t(x, y) > 0.96 or T.steep(x, y, 0.15, 0.1):
            continue
        petals.ico((x, y, T.height_at(x, y) + 0.025), r.uniform(0.045, 0.07),
                   mix_color(BLOSSOM["mid"], BLOSSOM["sun"], r.random()), subdiv=1,
                   scale=(1, 0.7, 0.25), rot=(0, 0, r.uniform(0, TAU)))
    petals.to_object("Blossom_FallenPetals", col, [M.painted("SWG_Petals", roughness=0.7)])


def build_final_trees(col):
    for i, (kind, pos, h, size, seed) in enumerate(L.FINAL_TREES):
        tree(col, f"Final{i + 1}", kind, pos, h, size, seed)
    build_rim_border(col)


def build_rim_border(col):
    """A loose border of shrubs and flowering bushes along the garden's rim,
    so the lawn edge reads planted like the reference."""
    leaves, blooms = Geo(), Geo()
    r = rng(2200)
    stream = W.stream()
    n = 120
    for i in range(n):
        a = TAU * (i + r.uniform(-0.3, 0.3)) / n
        if r.random() < 0.45:
            continue
        rb = T.boundary_radius(a) * r.uniform(0.88, 0.93)
        x, y = math.cos(a) * rb, math.sin(a) * rb
        if (T.reserved(x, y, -0.15) or stream.pl.nearest(x, y)[0] < 1.2 or T.steep(x, y, 0.3, 0.12)
                or planted(x, y, -0.3)):
            continue
        flowers = r.choice([None, PINK, WHITE, ROSE, YELLOW, LILAC])
        N.bush(leaves, Vector((x, y, T.height_at(x, y))), r.uniform(0.4, 0.62), 2210 + i,
               flowers=flowers, blossom_geo=blooms)
    leaves.to_object("Final_RimShrubs", col, [M.foliage()])
    blooms.to_object("Final_RimBlooms", col, [M.painted("SWG_Petals", roughness=0.7)])


# ------------------------------------------------------------------ small plants


def flower_cluster(geo, p, color, size, seed):
    """A blossom clump big enough to survive the painterly filter at phone size."""
    r = rng(seed)
    fc = srgb(color)
    for i in range(r.randint(3, 5)):
        a = r.uniform(0, TAU)
        q = Vector(p) + Vector((math.cos(a) * size * 0.6, math.sin(a) * size * 0.6, r.uniform(0, size * 0.4)))
        geo.ico(q, size * r.uniform(0.45, 0.6), scale_color(fc, r.uniform(0.94, 1.08)), subdiv=2,
                scale=(1, 1, 0.75), displace=0.18, freq=3.0, seed=seed + i,
                color_fn=lambda v, cc, q=q: scale_color(cc, 0.84 + 0.26 * clamp((v.co.z - q.z) * 6 + 0.5)))


def leaf_mound(geo, p, size, seed, color=None):
    r = rng(seed)
    col = color or mix_color(LEAF_DARK, LEAF, r.uniform(0.2, 0.8))
    for i in range(r.randint(3, 5)):
        a = r.uniform(0, TAU)
        q = Vector(p) + Vector((math.cos(a) * size * 0.5, math.sin(a) * size * 0.5, size * 0.25))
        geo.ico(q, size * r.uniform(0.5, 0.7), col, subdiv=2, scale=(1, 1, 0.7), displace=0.12,
                freq=2.0, seed=seed + i, color_fn=N._blob_fn(q, col, 0.36))


def flower_patch(flowers, leaves, center_vu, radius, seed, palette=PALETTE, clusters=True):
    r = rng(seed)
    cx, cy = L.xy(*center_vu)
    for i in range(int(3 + radius * 6)):
        a, d = r.uniform(0, TAU), radius * math.sqrt(r.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if T.steep(x, y) or T.radial_t(x, y) > 0.97:
            continue
        z = T.height_at(x, y)
        leaf_mound(leaves, (x, y, z), r.uniform(0.16, 0.24), seed * 7 + i)
        if clusters:
            flower_cluster(flowers, (x, y, z + 0.2), r.choice(palette), r.uniform(0.12, 0.16),
                           seed * 11 + i)
    for i in range(int(4 + radius * radius * 10)):
        a, d = r.uniform(0, TAU), radius * 1.1 * math.sqrt(r.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if T.steep(x, y) or T.radial_t(x, y) > 0.97:
            continue
        z = T.height_at(x, y) + r.uniform(0.1, 0.2)
        N.flower(flowers, (x, y, z), r.choice(palette), r.uniform(0.13, 0.17), seed * 31 + i)
        leaves.tube([(x, y, z - 0.2), (x, y, z - 0.01)], [0.014, 0.009], LEAF_DARK, segs=4,
                    cap_start=False, cap_end=False)


def planted(x, y, margin=0.0):
    """True inside one of the layout's flower drifts (later scatter avoids them)."""
    for c, radius, _, _ in L.DRIFTS_MORE_FLOWERS + L.DRIFTS_COMPLETED:
        cx, cy = L.xy(*c)
        if math.hypot(x - cx, y - cy) < radius * 1.15 + margin:
            return True
    return False


def flower_drift(flowers, leaves, center_vu, radius, palette, seed, spacing=0.3, clear=-0.15):
    """A large, domed mass of flower clumps in one leading colour with soft
    sub-patches of the others, so it reads as one patch on a phone instead of
    scattered dots. Points under later objects or on steps are left out."""
    r = rng(seed)
    cx, cy = L.xy(*center_vu)
    cols = PALETTES[palette]
    n = int(radius / spacing) + 2
    for j in range(-n, n + 1):
        for i in range(-n, n + 1):
            x = cx + (i + 0.5 * (j % 2) + r.uniform(-0.3, 0.3)) * spacing
            y = cy + (j * 0.87 + r.uniform(-0.3, 0.3)) * spacing
            dx, dy = x - cx, y - cy
            a = math.atan2(dy, dx)
            edge = radius * (1.0 + 0.22 * fbm(math.cos(a) * 1.5, math.sin(a) * 1.5, 0.0, 2, seed))
            d = math.hypot(dx, dy)
            if d > edge or T.radial_t(x, y) > 0.95 or T.reserved(x, y, clear) or T.steep(x, y, 0.2, 0.09):
                continue
            z = T.height_at(x, y)
            f = 1.0 - d / edge
            size = 0.15 + 0.06 * f + r.uniform(0.0, 0.02)
            k = (j + n) * (2 * n + 1) + (i + n)
            leaf_mound(leaves, (x, y, z), size * 1.1, seed * 13 + k)
            t = 0.5 + 0.5 * fbm(x * 1.3, y * 1.3, 0.0, 2, seed + 0.5)
            c = cols[0] if t < 0.58 else cols[1] if t < 0.8 or len(cols) < 3 else cols[2 + k % (len(cols) - 2)]
            flower_cluster(flowers, (x, y, z + 0.17 + 0.08 * f), c, size, seed * 17 + k)


def sunflower(leaves, flowers, base, height, seed, scale=1.0):
    """A sunflower whose head turns toward the camera: stem, two leaves, a ring
    of yellow petals and a brown centre."""
    r = rng(seed)
    b = Vector(base)
    top = b + Vector((r.uniform(-0.05, 0.05), r.uniform(-0.05, 0.05), height))
    leaves.tube([b, b.lerp(top, 0.5), top], [0.035, 0.03, 0.025], srgb("#4E8F34"), segs=6, cap_start=False)
    for k, f in enumerate((0.35, 0.6)):
        a = r.uniform(0, TAU)
        q = b.lerp(top, f) + Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, 0))
        leaves.ico(q, 0.16, mix_color(LEAF_DARK, LEAF, 0.5), subdiv=1, scale=(1, 0.6, 0.3), rot=(0, -0.4, a))
    n = Vector((1.0, -1.0, 1.1)).normalized()      # toward the camera
    e1 = Vector((1.0, 1.0, 0.0)).normalized()
    e2 = n.cross(e1)
    head = top + n * 0.05
    for k in range(13):
        a = TAU * k / 13
        q = head + (e1 * math.cos(a) + e2 * math.sin(a)) * 0.2 * scale
        flowers.ico(q, 0.1 * scale, scale_color(srgb(YELLOW), r.uniform(0.95, 1.06)), subdiv=1,
                    scale=(1, 1, 0.55))
    flowers.ico(head + n * 0.03, 0.13 * scale, srgb("#7A4A22"), subdiv=2, scale=(1, 1, 0.7))


def iris(leaves, flowers, p, seed):
    """Waterside iris: sword leaves and two or three violet flowers."""
    r = rng(seed)
    p = Vector(p)
    for k in range(5):
        a = r.uniform(0, TAU)
        tip = p + Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, r.uniform(0.4, 0.55)))
        leaves.tube([p, tip], [0.03, 0.006], srgb("#4C8C3A"), segs=4, cap_start=False)
    for k in range(r.randint(2, 3)):
        a = r.uniform(0, TAU)
        q = p + Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, r.uniform(0.55, 0.7)))
        leaves.tube([p, q], [0.012, 0.01], srgb("#5B9A40"), segs=4, cap_start=False)
        c = srgb(r.choice([VIOLET, PURPLE, LILAC]))
        for m in range(3):
            b = TAU * m / 3 + a
            flowers.ico(q + Vector((math.cos(b) * 0.05, math.sin(b) * 0.05, -0.02)), 0.06, c, subdiv=1,
                        scale=(1, 0.8, 0.6))
        flowers.ico(q + Vector((0, 0, 0.04)), 0.04, srgb(LILAC), subdiv=1)


def plume(leaves, flowers, p, color, seed, height=0.6):
    """Astilbe-like plume: a leaf mound with a tapering spire of blossom."""
    r = rng(seed)
    p = Vector(p)
    leaf_mound(leaves, p, 0.2, seed)
    c = srgb(color)
    for k in range(2):
        a = r.uniform(0, TAU)
        b = p + Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, height * 0.45))
        for m in range(6):
            flowers.ico(b + Vector((0, 0, m * height * 0.09)), 0.1 - m * 0.013,
                        scale_color(c, 0.9 + 0.03 * m), subdiv=1, scale=(1, 1, 0.9))


def hydrangea(leaves, blooms, p, size, color, seed):
    """Round bush with big mophead flower balls (blue, lilac or pink)."""
    r = rng(seed)
    leaf_mound(leaves, p, size, seed)
    fc = srgb(color)
    for i in range(r.randint(4, 6)):
        a, el = r.uniform(0, TAU), r.uniform(0.3, 1.1)
        q = Vector(p) + Vector((math.cos(a) * math.cos(el) * size * 0.75,
                                math.sin(a) * math.cos(el) * size * 0.75,
                                size * 0.3 + math.sin(el) * size * 0.45))
        c = scale_color(fc, r.uniform(0.92, 1.08))
        blooms.ico(q, size * r.uniform(0.3, 0.38), c, subdiv=2, displace=0.22, freq=4.0,
                   seed=seed * 3 + i,
                   color_fn=lambda v, cc, q=q: scale_color(cc, 0.82 + 0.3 * clamp((v.co.z - q.z) * 5 + 0.5)))


def lavender(leaves, blooms, p, seed, spikes=9):
    r = rng(seed)
    p = Vector(p)
    leaves.ico(p + Vector((0, 0, 0.08)), 0.2, srgb("#7E9E6A"), subdiv=2, scale=(1, 1, 0.55),
               displace=0.2, seed=seed)
    for i in range(spikes):
        a = r.uniform(0, TAU)
        lean = r.uniform(0.05, 0.16)
        b = p + Vector((math.cos(a) * 0.07, math.sin(a) * 0.07, 0.12))
        tip = b + Vector((math.cos(a) * lean, math.sin(a) * lean, r.uniform(0.38, 0.5)))
        leaves.tube([b, tip], [0.012, 0.008], srgb("#6E8F58"), segs=4, cap_start=False)
        blooms.ico(tip - Vector((0, 0, 0.07)), 0.055, srgb(r.choice([PURPLE, VIOLET, LILAC])),
                   subdiv=1, scale=(1, 1, 2.6))


def build_more_flowers(col):
    """More flowers: large flower drifts (pink, purple, white, yellow) on all
    three lawns, hydrangeas along the wall feet, lavender clumps and flowering
    bushes at the rim."""
    leaves, blooms, flowers = Geo(), Geo(), Geo()
    hydr = [((-6.6, -1.85), "#8FB0F2"), ((4.8, -1.55), "#B892EC"), ((-3.9, 3.5), "#F28DB8"),
            ((1.6, 3.85), "#8FB0F2"), ((-7.4, 2.7), "#B892EC"), ((6.2, 3.95), "#F28DB8")]
    for i, (pos, c) in enumerate(hydr):
        p = ground(*pos)
        if T.reserved(p.x, p.y, -0.3):
            continue
        hydrangea(leaves, blooms, p, 0.5, c, 1700 + i)
    for i, pos in enumerate([(-0.9, -3.2), (-0.6, -2.7), (-3.6, -1.2), (2.2, 1.9), (2.4, 2.4),
                             (-6.9, -5.2), (5.0, 2.4), (5.4, 2.9)]):
        # each lavender is a clump of three plants, so it reads as a purple mass
        for k, (dv, du) in enumerate(((0.0, 0.0), (0.3, 0.12), (0.1, -0.28))):
            p = ground(pos[0] + dv, pos[1] + du)
            if not T.reserved(p.x, p.y, -0.35) and not T.steep(p.x, p.y, 0.2, 0.09):
                lavender(leaves, blooms, p, 1750 + i * 3 + k, spikes=11)
    for center, radius, palette, seed in L.DRIFTS_MORE_FLOWERS:
        flower_drift(flowers, leaves, center, radius, palette, seed)
    for i, (pos, c) in enumerate([((-9.2, -3.9), PINK), ((9.0, -1.0), WHITE),
                                  ((3.6, -9.0), YELLOW), ((-7.6, 6.9), LILAC)]):
        p = ground(*pos)
        N.bush(leaves, p, 0.55, 1850 + i, flowers=c, blossom_geo=blooms)
    wall_borders(leaves, blooms, 1860)
    leaves.to_object("Flowers_Leaves", col, [M.foliage()])
    blooms.to_object("Flowers_Blooms", col, [M.painted("SWG_Petals", roughness=0.7)])
    flowers.to_object("Flowers_Patches", col, [M.painted("SWG_Petals", roughness=0.7)])


def _wall_points(spacing):
    """(point, toward-lower-terrace) pairs along both walls, outside the gaps."""
    gaps = T.wall_gaps()
    out = []
    for k in range(2):
        pts = T.step_line(k)
        last = None
        for p in pts:
            if last is not None and (p - last).length < spacing:
                continue
            last = p
            if any(pl.nearest(p.x, p.y)[0] < w + 0.25 for pl, w in gaps):
                continue
            out.append((p, T.downhill(p.x, p.y), k))
    return out


def wall_borders(leaves, blooms, seed):
    """Rounded shrubs and flowering bushes along the foot of each wall."""
    r = rng(seed)
    for i, (p, down, k) in enumerate(_wall_points(0.75)):
        if r.random() < 0.35:
            continue
        q = p + down * r.uniform(0.75, 1.0) if r.random() < 0.6 else p - down * r.uniform(0.6, 0.8)
        if T.reserved(q.x, q.y, -0.25) or T.radial_t(q.x, q.y) > 0.95 or planted(q.x, q.y):
            continue
        flowers = r.choice([None, PINK, WHITE, YELLOW, LILAC, ROSE])
        N.bush(leaves, Vector((q.x, q.y, T.height_at(q.x, q.y))), r.uniform(0.38, 0.55), seed + i,
               flowers=flowers, blossom_geo=blooms)


def build_wall_ivy(col):
    """Trailing ivy with small flowers over the wall faces."""
    stems, leaves, flowers = Geo(), Geo(), Geo()
    r = rng(2400)
    for i, (p, down, k) in enumerate(_wall_points(0.5)):
        if r.random() < 0.55:
            continue
        top = p - down * 0.2
        z0 = T.height_at(top.x, top.y) + 0.04
        zb = T.height_at(p.x + down.x * 0.7, p.y + down.y * 0.7)
        length = (z0 - zb) * r.uniform(0.45, 0.95)
        face = p + down * 0.22
        pts = [Vector((top.x, top.y, z0))] + [
            Vector((face.x, face.y, z0 - 0.05 - length * f)) + down * (0.04 * math.sin(f * 5 + i))
            for f in (0.15, 0.4, 0.65, 0.9)]
        stems.tube(pts, [0.028, 0.026, 0.022, 0.018, 0.012], srgb("#3F7A2E"), segs=5)
        for j, q in enumerate(pts[1:]):
            lc = mix_color(srgb("#3D8030"), srgb("#86C44E"), r.random())
            leaves.ico(q + down * 0.05, r.uniform(0.1, 0.15), lc, subdiv=1, scale=(1, 1, 0.75),
                       displace=0.2, seed=i * 10 + j)
            if r.random() < 0.3:
                flower_cluster(flowers, q + down * 0.12, r.choice(["#FFFFFF", "#F6A9C4", "#B9A2E8"]), 0.08,
                               2500 + i * 10 + j)
    stems.to_object("Vines_WallStems", col, [M.foliage("SWG_VineStem", rim=0.1, leafy=False)])
    leaves.to_object("Vines_WallLeaves", col, [M.foliage()])
    flowers.to_object("Vines_WallFlowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def build_meadow(col):
    """Finishing touch: wildflowers in small single-colour groups on the open
    lawns (groups read at phone size where single dots smear away)."""
    flowers = Geo()
    r = rng(2600)
    groups = tries = 0
    palette = [WHITE, CREAM, YELLOW, PINK, LILAC]
    while groups < 34 and tries < 20000:
        tries += 1
        x, y = r.uniform(-10.5, 10.5), r.uniform(-10.5, 10.5)
        if (T.radial_t(x, y) > 0.93 or T.reserved(x, y, 0.15) or T.steep(x, y, 0.35, 0.1)
                or planted(x, y, 0.3)):
            continue
        color = r.choice(palette)
        for k in range(r.randint(6, 9)):
            a, d = r.uniform(0, TAU), 0.4 * math.sqrt(r.random())
            q = (x + math.cos(a) * d, y + math.sin(a) * d)
            if T.reserved(*q, 0.05) or T.steep(*q, 0.25, 0.08):
                continue
            N.flower(flowers, (q[0], q[1], T.height_at(*q) + 0.09), color, r.uniform(0.12, 0.15),
                     2700 + groups * 10 + k)
        groups += 1
    flowers.to_object("Complete_Meadow_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])


# ------------------------------------------------------------------ seedlings and beds


def build_seedlings(col):
    """First seedlings: a dug vegetable plot edged with boards, rows of
    sprouts, a little wooden label and a watering can."""
    c = L.SEEDLINGS["center"]
    w, d = L.SEEDLINGS["size"]
    soil, sprouts, wood = Geo(), Geo(), Geo()
    origin = ground(*c)
    yaw = 0.0
    zmax = max(T.height_at(origin.x + sv * w / 2, origin.y + su * d / 2)
               for sv in (-1, 0, 1) for su in (-1, 0, 1))
    z = zmax + 0.02
    soil.box((origin.x, origin.y, z), (w, d, 0.14), SOIL, rot=(0, 0, yaw), bevel=0.06,
             color_fn=lambda v, cc: mix_color(cc, SOIL_LIGHT, 0.3 + 0.3 * fbm(v.co.x * 5, v.co.y * 5, 0, 2, 101.0)))
    rows = 5
    r = rng(102)
    for j in range(rows):
        uo = (j / (rows - 1) - 0.5) * d * 0.76
        a = origin + AY * uo - AX * (w / 2 - 0.18)
        b = origin + AY * uo + AX * (w / 2 - 0.18)
        soil.tube([Vector((a.x, a.y, z + 0.08)), Vector((b.x, b.y, z + 0.08))], [0.1, 0.1],
                  SOIL_LIGHT, segs=8, color_fn=lambda v, cc: scale_color(cc, 0.9 + 0.1 * fbm(v.co.x * 9, v.co.y * 9, 0, 1, 103.0)))
        n = 8
        for i in range(n):
            p = a.lerp(b, (i + 0.5) / n) + Vector((0, 0, z + 0.15 - a.z))
            if j % 2:
                # young lettuce rosettes: a few broad leaves, bright enough to read on a phone
                for k in range(4):
                    ang = TAU * k / 4 + r.uniform(-0.3, 0.3)
                    lp = p + Vector((math.cos(ang) * 0.09, math.sin(ang) * 0.09, 0.07))
                    sprouts.ico(lp, 0.13, mix_color(SPROUT, srgb("#C4E57A"), r.random() * 0.6),
                                subdiv=1, scale=(1.0, 0.65, 0.35), rot=(0, -0.5, ang))
                sprouts.ico(p + Vector((0, 0, 0.12)), 0.08, srgb("#A9DA62"), subdiv=1)
                continue
            h = r.uniform(0.18, 0.28)
            sprouts.tube([p, p + Vector((0, 0, h))], [0.02, 0.014], srgb("#6FB240"), segs=4,
                         cap_start=False)
            for k, side in enumerate((-1, 1, 0)):
                ang = yaw + side * math.pi / 2 + r.uniform(-0.4, 0.4) + (0.0 if side else math.pi / 4)
                reach = 0.1 if side else 0.03
                lp = p + Vector((math.cos(ang) * reach, math.sin(ang) * reach, h * (0.95 if side else 1.05)))
                sprouts.ico(lp, 0.12 if side else 0.09, mix_color(SPROUT, srgb("#B6E06A"), r.random() * 0.5),
                            subdiv=1, scale=(1.0, 0.55, 0.3), rot=(0, -side * 0.35, ang))
    # board edging
    for sv in (-1, 1):
        p = origin + AX * sv * (w / 2 + 0.04)
        wood.box((p.x, p.y, z + 0.03), (0.08, d + 0.16, 0.22), srgb("#9A6A40"), rot=(0, 0, yaw), bevel=0.02)
    for su in (-1, 1):
        p = origin + AY * su * (d / 2 + 0.04)
        wood.box((p.x, p.y, z + 0.03), (w + 0.16, 0.08, 0.22), srgb("#A8743F"), rot=(0, 0, yaw), bevel=0.02)
    # label stake
    p = origin - AX * (w / 2 + 0.25) - AY * (d / 2 - 0.1)
    zz = T.height_at(p.x, p.y)
    wood.box((p.x, p.y, zz + 0.25), (0.04, 0.04, 0.5), srgb("#7C4E2C"))
    wood.box((p.x, p.y, zz + 0.5), (0.04, 0.26, 0.16), srgb("#E9D3A8"), rot=(0, 0, yaw + 0.3), bevel=0.015)
    wood.to_object("Seedlings_Wood", col, [M.wood()], sharp_angle=40)
    soil.to_object("Seedlings_Soil", col, [M.painted("SWG_Soil", roughness=0.95, pattern=None)])
    sprouts.to_object("Seedlings_Sprouts", col, [M.foliage("SWG_Sprouts", rim=0.3, leafy=False)])
    # watering can beside the plot
    can = Geo()
    q = origin + AX * (w / 2 + 0.45) - AY * 0.1
    zz = T.height_at(q.x, q.y)
    green = srgb("#5E9AA8")
    can.tube([(q.x, q.y, zz), (q.x, q.y, zz + 0.3)], [0.15, 0.15], green, segs=14)
    sp = q + AX * 0.12
    can.tube([(sp.x, sp.y, zz + 0.1), (sp.x + AX.x * 0.25, sp.y + AX.y * 0.25, zz + 0.36)],
             [0.035, 0.025], green, segs=8)
    hp = [q - AX * 0.12 + Vector((0, 0, zz + 0.25)), q + Vector((0, 0, zz + 0.45)),
          q + AX * 0.1 + Vector((0, 0, zz + 0.28))]
    can.tube(hp, [0.025] * 3, green, segs=6)
    can.to_object("Seedlings_WateringCan", col, [M.painted("SWG_Metal", roughness=0.45, specular=0.5)])
    # a seed tray of young plants waiting to go in, on the other side of the plot
    tray, tray_plants = Geo(), Geo()
    q = origin - AX * (w / 2 + 0.55) + AY * 0.35
    zz = T.height_at(q.x, q.y)
    tray.box((q.x, q.y, zz + 0.07), (0.62, 0.9, 0.14), srgb("#A8743F"), bevel=0.02)
    tray.box((q.x, q.y, zz + 0.13), (0.54, 0.82, 0.04), SOIL, bevel=0.01)
    for i in range(2):
        for k in range(3):
            p = Vector((q.x + (i - 0.5) * 0.26, q.y + (k - 1) * 0.26, zz + 0.16))
            leaf_mound(tray_plants, p, 0.1, 1150 + i * 3 + k, color=mix_color(SPROUT, LEAF, 0.3))
    tray.to_object("Seedlings_Tray", col, [M.wood()], sharp_angle=40)
    tray_plants.to_object("Seedlings_TrayPlants", col, [M.foliage()])
    # companion flowers, so the first step already brings colour: a marigold
    # edging along the front board and young sunflowers along the back
    fl, fleaves = Geo(), Geo()
    edging = [origin + AX * (((i + 0.5) / 9 - 0.5) * (w - 0.1)) - AY * (d / 2 + 0.26) for i in range(9)]
    edging += [origin + AX * (w / 2 + 0.28) + AY * t for t in (0.3, 0.62, 0.94)]  # the can stands lower
    for i, p in enumerate(edging):
        p.z = T.height_at(p.x, p.y)
        leaf_mound(fleaves, p, 0.18, 1170 + i)
        flower_cluster(fl, p + Vector((0, 0, 0.2)), [YELLOW, GOLD][i % 2], 0.19, 1180 + i)
    for i in range(5):
        p = origin + AX * (-w / 2 + 0.3 + i * (w - 0.6) / 4) + AY * (d / 2 + 0.32)
        p.z = T.height_at(p.x, p.y)
        sunflower(fleaves, fl, p, 1.05 + 0.18 * (i % 2), 1190 + i, scale=1.25)
    fleaves.to_object("Seedlings_FlowerLeaves", col, [M.foliage()])
    fl.to_object("Seedlings_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def raised_bed(wood, soil_geo, center, length, width, yaw, height=0.32, color=None):
    """Wooden raised bed: plank frame and soil top. Returns the soil top z."""
    c = Vector(center)
    dv = Vector((math.cos(yaw), math.sin(yaw), 0))
    du = Vector((-dv.y, dv.x, 0))
    z = max(T.height_at(c.x + dv.x * sl * length / 2 + du.x * sw * width / 2,
                        c.y + dv.y * sl * length / 2 + du.y * sw * width / 2)
            for sl in (-1, 1) for sw in (-1, 1))
    # the frame reaches down to the lowest corner, so a bed on a slope never floats
    zlo = min(T.height_at(c.x + dv.x * sl * length / 2 + du.x * sw * width / 2,
                          c.y + dv.y * sl * length / 2 + du.y * sw * width / 2)
              for sl in (-1, 1) for sw in (-1, 1)) - 0.08
    top = z + height
    wc = color or srgb("#A36F42")
    for sw in (-1, 1):
        p = c + du * sw * (width / 2)
        wood.box((p.x, p.y, (zlo + top) / 2), (length + 0.1, 0.1, top - zlo), wc,
                 rot=(0, 0, yaw), bevel=0.025)
    for sl in (-1, 1):
        p = c + dv * sl * (length / 2)
        wood.box((p.x, p.y, (zlo + top) / 2), (0.1, width + 0.1, top - zlo),
                 scale_color(wc, 0.88), rot=(0, 0, yaw), bevel=0.025)
    for sl in (-1, 1):
        for sw in (-1, 1):
            p = c + dv * sl * (length / 2) + du * sw * (width / 2)
            wood.box((p.x, p.y, (zlo + top + 0.06) / 2), (0.14, 0.14, top + 0.06 - zlo),
                     srgb("#7C4E2C"), rot=(0, 0, yaw), bevel=0.02)
    soil_geo.box((c.x, c.y, z + height - 0.08), (length - 0.04, width - 0.04, 0.12), SOIL,
                 rot=(0, 0, yaw), bevel=0.03)
    return z + height - 0.02


def build_flower_bed(col):
    """Small flower bed: a raised wooden planter full of mixed flowers."""
    wood, soil, leaves, flowers = Geo(), Geo(), Geo(), Geo()
    fb = L.FLOWER_BED
    c = ground(*fb["center"])
    length, width = fb["size"]
    yaw = math.pi / 2
    top = raised_bed(wood, soil, c, length, width, yaw, height=0.36, color=srgb("#B07A48"))
    r = rng(120)
    palette = [PINK, WHITE, YELLOW, CORAL, LILAC]
    for i in range(9):
        t = (i + 0.5) / 9 - 0.5
        for j, uo in enumerate((-0.34, 0.0, 0.32)):
            p = c + AY * t * (length - 0.3) + AX * uo
            p.z = top
            leaf_mound(leaves, p + Vector((0, 0, 0.02)), 0.21, 1200 + i * 3 + j)
            flower_cluster(flowers, p + Vector((0, 0, 0.25 + r.uniform(0, 0.07))),
                           palette[(i + j * 2) % len(palette)], 0.2, 1300 + i * 3 + j)
        if i % 2 == 0:
            # tall foxglove spikes along the back edge give the bed height
            p = c + AY * t * (length - 0.3) + AX * -0.36
            p.z = top + 0.15
            spike = srgb([ROSE, WHITE, PURPLE][i // 2 % 3])
            leaves.tube([p, p + Vector((0, 0, 0.82))], [0.03, 0.018], LEAF_DARK, segs=5, cap_start=False)
            for k in range(7):
                q = p + Vector((0, 0, 0.26 + k * 0.085))
                flowers.ico(q, 0.095 - k * 0.008, scale_color(spike, 0.9 + 0.03 * k), subdiv=1,
                            scale=(1, 1, 0.8))
    # a skirt of low flowers around the planter's foot (not the far end, where
    # the 30% lavender grows)
    rows = [k * 0.36 - 1.3 for k in range(8)]
    skirt = [(AX * -(width / 2 + 0.3) + AY * t, 0) for t in rows]                 # path side: one row
    skirt += [(AX * (width / 2 + o) + AY * t, i) for i, o in enumerate((0.3, 0.64)) for t in rows]
    skirt += [(-AY * (length / 2 + o) + AX * t, i) for i, o in enumerate((0.3, 0.64))
              for t in (-0.55, -0.18, 0.18, 0.55, 0.9)]
    stones = Geo()
    for k, (off, row) in enumerate(skirt):
        q = c + off
        q.z = T.height_at(q.x, q.y)
        if T.steep(q.x, q.y, 0.2, 0.09):
            continue
        leaf_mound(leaves, q, 0.19, 1240 + k)
        color = [LILAC, WHITE, PINK, YELLOW][(k + row) % 4] if row else [PINK, WHITE, PURPLE][k % 3]
        flower_cluster(flowers, q + Vector((0, 0, 0.2)), color, 0.19, 1260 + k)
    # cream edging stones round the open sides of the bed
    edge = [AX * (width / 2 + 0.92) + AY * (k * 0.3 - 1.35) for k in range(10)]
    edge += [-AY * (length / 2 + 0.92) + AX * (k * 0.3 - 0.75) for k in range(7)]
    for k, off in enumerate(edge):
        q = c + off
        if T.steep(q.x, q.y, 0.15, 0.08):
            continue
        q.z = T.height_at(q.x, q.y) + 0.02
        stones.ico(q, 0.12, scale_color(srgb("#E6D9BE"), r.uniform(0.9, 1.05)), subdiv=2,
                   scale=(1.1, 0.9, 0.55), rot=(0, 0, r.uniform(0, TAU)), displace=0.1, seed=1290 + k)
    stones.to_object("FlowerBed_EdgeStones", col, [M.rock("SWG_PathStone")], sharp_angle=50)
    wood.to_object("FlowerBed_Wood", col, [M.wood()], sharp_angle=40)
    soil.to_object("FlowerBed_Soil", col, [M.painted("SWG_Soil", roughness=0.95)])
    leaves.to_object("FlowerBed_Leaves", col, [M.foliage()])
    flowers.to_object("FlowerBed_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def vegetable_beds(col):
    """Raised vegetable beds beside the greenhouse: lettuce, carrots, tomatoes."""
    wood, soil, plants, fruit = Geo(), Geo(), Geo(), Geo()
    vb = L.VEG_BEDS
    cv, cu = vb["center"]
    yaw = math.pi / 2  # beds run along world Y
    r = rng(140)
    for i in range(vb["count"]):
        c = ground(cv, cu) + AX * (i - (vb["count"] - 1) / 2) * vb["gap"]
        c.z = T.height_at(c.x, c.y)
        top = raised_bed(wood, soil, c, vb["length"], 0.86, yaw)
        kind = i % 3
        for j in range(6):
            p = c + AY * ((j + 0.5) / 6 - 0.5) * (vb["length"] - 0.3)
            p = Vector((p.x, p.y, top + 0.02))
            if kind == 0:  # lettuce
                for k in range(4):
                    plants.ico(p + Vector((0, 0, 0.05 + k * 0.015)), 0.17 - k * 0.03,
                               mix_color(srgb("#7DC25A"), srgb("#C2E585"), k / 3), subdiv=2,
                               scale=(1, 1, 0.65), displace=0.22, seed=1400 + j * 7 + k)
            elif kind == 1:  # carrots
                for k in range(6):
                    a = TAU * k / 6
                    plants.tube([p, p + Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.3))],
                                [0.025, 0.01], srgb("#5FA73E"), segs=4)
                fruit.ico(p + Vector((0, 0, 0.0)), 0.065, srgb("#F08A3C"), subdiv=1)
            else:  # tomatoes on a cane
                plants.ico(p + Vector((0, 0, 0.22)), 0.22, srgb("#4F9A38"), subdiv=2, displace=0.25,
                           seed=1500 + j)
                plants.tube([p, p + Vector((0, 0, 0.6))], [0.018, 0.015], srgb("#C9A46A"), segs=5)
                for k in range(4):
                    a = r.uniform(0, TAU)
                    fruit.ico(p + Vector((math.cos(a) * 0.19, math.sin(a) * 0.19, 0.15 + r.uniform(0, 0.18))),
                              0.06, srgb("#E2463A"), subdiv=1)
    wood.to_object("VegBeds_Wood", col, [M.wood()], sharp_angle=40)
    soil.to_object("VegBeds_Soil", col, [M.painted("SWG_Soil", roughness=0.95)])
    plants.to_object("VegBeds_Plants", col, [M.foliage()])
    fruit.to_object("VegBeds_Vegetables", col, [M.painted("SWG_Veg", roughness=0.5)])


# ------------------------------------------------------------------ cliff vines


def build_cliff_vines(col):
    """Flowering vines hanging from the lip over the visible cliff faces."""
    stems, leaves, flowers = Geo(), Geo(), Geo()
    r = rng(160)
    view = Vector(L.xy(0.0, -1.0)).normalized().to_3d()  # toward the camera on the ground
    stream = W.stream()
    n = 150
    made = 0
    for i in range(n):
        a = TAU * (i + r.uniform(-0.3, 0.3)) / n
        out = Vector((math.cos(a), math.sin(a), 0))
        if out.dot(view) < -0.3 or r.random() < 0.25:
            continue
        rb = T.boundary_radius(a)
        x0, y0 = out.x * rb, out.y * rb
        if stream.pl.nearest(x0, y0)[0] < 1.4:  # keep the waterfall clear
            continue
        z0 = T.height_at(out.x * rb * 0.99, out.y * rb * 0.99) - 0.25
        length = r.uniform(1.0, 3.2)
        pts = []
        for k in range(9):
            f = k / 8
            sway = 0.12 * math.sin(f * 3 + i)
            rr = rb + 0.16 - 0.1 * f + sway * 0.3
            p = Vector((out.x * rr, out.y * rr, z0 - length * f)) + Vector((-out.y, out.x, 0)) * sway
            pts.append(p)
        stems.tube(pts, [0.05] * 4 + [0.04] * 3 + [0.03, 0.02], srgb("#3F7A2E"), segs=5)
        for k in range(1, 9):
            f = k / 8
            p = pts[k] + out * 0.05
            lc = mix_color(srgb("#3D8030"), srgb("#7DBE4A"), r.random())
            leaves.ico(p + Vector((r.uniform(-0.08, 0.08), r.uniform(-0.08, 0.08), 0)),
                       r.uniform(0.15, 0.22) * (1.1 - 0.4 * f), lc, subdiv=1, scale=(1, 1, 0.7),
                       displace=0.2, seed=i * 10 + k)
            if r.random() < 0.5:
                flower_cluster(flowers, p + out * 0.1, r.choice([PINK, WHITE, BLUSH, LILAC]),
                               0.13, 1600 + i * 10 + k)
        if i % 3 == 0:
            # wisteria: hanging purple racemes along every third vine
            for k in (2, 4, 6):
                q = pts[k] + out * 0.14
                c = srgb(r.choice([LILAC, PURPLE, "#C9AEF2"]))
                for m in range(5):
                    flowers.ico(q - Vector((0, 0, m * 0.07)), 0.085 - m * 0.012, scale_color(c, 0.9 + 0.04 * m),
                                subdiv=1)
        made += 1
    stems.to_object("Vines_Stems", col, [M.foliage("SWG_VineStem", rim=0.1, leafy=False)])
    leaves.to_object("Vines_Leaves", col, [M.foliage()])
    flowers.to_object("Vines_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])
    return made


def build_final_flowers(col):
    leaves, flowers = Geo(), Geo()
    for center, radius, palette, seed in L.DRIFTS_COMPLETED:
        flower_drift(flowers, leaves, center, radius, palette, seed, clear=-0.3)
    leaves.to_object("Complete_FlowerLeaves", col, [M.foliage()])
    flowers.to_object("Complete_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])


# ------------------------------------------------------------------ polish: path, water, greenhouse


def build_path_border(col):
    """Garden pathway border: lavender-purple and white mounds in a rhythm on
    both sides of the flat path (not on the stairs, at the stream crossing or
    where later lanterns, pots and the greenhouse stand)."""
    leaves, flowers = Geo(), Geo()
    pl = T.polyline_vu(L.MAIN_PATH)
    stream = W.stream()
    keep_clear = [(L.xy(*p), 0.55) for p in L.LANTERNS + L.POTS]
    keep_clear.append((L.xy(*L.GREENHOUSE["center"]), 3.1))
    r = rng(2800)
    s, k = 0.5, 0
    while s < pl.length - 0.3:
        p, t = pl.smooth_point(s, 0.45)
        n = Vector((-t.y, t.x, 0))
        for side in (-1, 1):
            q = p + n * side * (L.PATH_HALF_WIDTH + 0.3 + r.uniform(-0.05, 0.08))
            k += 1
            if (T.radial_t(q.x, q.y) > 0.93 or T.steep(q.x, q.y, 0.3, 0.1)
                    or stream.pl.nearest(q.x, q.y)[0] < L.STREAM_HALF_WIDTH + 1.0
                    or any(math.hypot(q.x - c[0], q.y - c[1]) < rad for c, rad in keep_clear)):
                continue
            q.z = T.height_at(q.x, q.y)
            if k % 2:
                lavender(leaves, flowers, q, 2810 + k, spikes=8)
            else:
                leaf_mound(leaves, q, 0.16, 2810 + k)
                flower_cluster(flowers, q + Vector((0, 0, 0.17)), WHITE if k % 4 == 0 else BLUSH, 0.16,
                               2830 + k)
        s += 0.62
    leaves.to_object("Path_BorderLeaves", col, [M.foliage()])
    flowers.to_object("Path_BorderFlowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def build_water_planting(col):
    """Planting that comes with the water at 60%: irises and pink plumes on the
    pond's far side, yellow marsh marigolds and white flowers low at its front,
    a ring of flowers around the fountain and small clumps along the rill."""
    leaves, flowers = Geo(), Geo()
    rill, stream = W.rill(), W.stream()
    keep_clear = [(L.xy(*L.BENCH_POND["pos"]), 0.9), (L.xy(*L.BIRDBATH), 0.7)]
    keep_clear += [(L.xy(*p), 0.5) for p in L.LANTERNS]
    path = T.polyline_vu(L.MAIN_PATH)

    def free(q, near_water=0.55):
        return not (T.radial_t(q.x, q.y) > 0.93 or T.steep(q.x, q.y, 0.25, 0.1)
                    or rill.pl.nearest(q.x, q.y)[0] < L.RILL_HALF_WIDTH + near_water
                    or stream.pl.nearest(q.x, q.y)[0] < L.STREAM_HALF_WIDTH + near_water
                    or path.nearest(q.x, q.y)[0] < L.PATH_HALF_WIDTH + 0.4
                    or any(math.hypot(q.x - c[0], q.y - c[1]) < rad for c, rad in keep_clear))

    # pond margin
    pc = W.pond_center()
    back = Vector(L.xy(0.0, 1.0)).normalized().to_3d()   # into the picture
    for k in range(22):
        a = TAU * k / 22
        out = Vector((math.cos(a), math.sin(a), 0))
        q = pc + out * (W.pond_radius(a) + 0.55)
        q.z = T.height_at(q.x, q.y)
        if not free(q):
            continue
        if out.dot(back) > 0.25:      # far side: tall plants frame the water
            if k % 3 == 1:
                plume(leaves, flowers, q, [PINK, ROSE][k % 2], 2900 + k)
            else:
                iris(leaves, flowers, q, 2900 + k)
        else:                         # near side stays low so the water shows
            leaf_mound(leaves, q, 0.15, 2950 + k)
            flower_cluster(flowers, q + Vector((0, 0, 0.16)), YELLOW if k % 2 else WHITE, 0.15, 2970 + k)
    # fountain ring
    fc = W.fountain_center()
    for k in range(16):
        a = TAU * k / 16
        q = fc + Vector((math.cos(a), math.sin(a), 0)) * (L.FOUNTAIN_RADIUS + 0.42)
        if not free(q, 0.35):
            continue
        q.z = T.height_at(q.x, q.y)
        leaf_mound(leaves, q, 0.16, 3000 + k)
        flower_cluster(flowers, q + Vector((0, 0, 0.17)), [WHITE, PINK, LILAC][k % 3], 0.16, 3020 + k)
    # along the rill, alternating sides
    s, k = 0.9, 0
    while s < rill.pl.length - 0.6:
        p, t = rill.pl.smooth_point(s, 0.3)
        n = Vector((-t.y, t.x, 0)) * (1 if k % 2 else -1)
        q = p + n * (L.RILL_HALF_WIDTH + 0.6)
        k += 1
        s += 0.75
        q.z = T.height_at(q.x, q.y)
        if not free(q, 0.45) or math.hypot(q.x - pc.x, q.y - pc.y) < L.POND_RADIUS + 0.9:
            continue
        leaf_mound(leaves, q, 0.15, 3050 + k)
        flower_cluster(flowers, q + Vector((0, 0, 0.16)), [YELLOW, WHITE, LILAC][k % 3], 0.15, 3070 + k)
    leaves.to_object("Pond_EdgeLeaves", col, [M.foliage()])
    flowers.to_object("Pond_EdgeFlowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def build_greenhouse_flowers(col):
    """Around the greenhouse at 80%: climbing-rose bushes along the white
    picket fence, lavender between fence and glass, two flower pots by the
    door and a row of sunflowers behind the vegetable beds."""
    leaves, blooms, flowers, pots = Geo(), Geo(), Geo(), Geo()
    (v0, u0), (v1, u1) = L.PICKET_FENCE
    a, b = Vector((*L.xy(v0, u0), 0)), Vector((*L.xy(v1, u1), 0))
    for k in range(5):
        q = a.lerp(b, (k + 0.5) / 5) + AX * 0.38
        q.z = T.height_at(q.x, q.y)
        N.bush(leaves, q, 0.4, 3100 + k, flowers=[ROSE, PINK][k % 2], blossom_geo=blooms)
    for k in range(10):
        q = a.lerp(b, (k + 0.5) / 10) - AX * 0.22
        q.z = T.height_at(q.x, q.y)
        lavender(leaves, flowers, q, 3120 + k, spikes=9)
    gh = L.GREENHOUSE
    cx, cy = L.xy(*gh["center"])
    for k, sx in enumerate((-1, 1)):
        q = Vector((cx + sx * (gh["width"] / 2 + 0.35), cy - gh["length"] / 2 - 0.55, 0))
        q.z = T.height_at(q.x, q.y)
        prof_h = 0.36
        W._lathe(pots, q, [(0.0, 0.0), (0.18, 0.0), (0.24, prof_h * 0.9), (0.27, prof_h),
                             (0.22, prof_h)],
                 lambda j, an, p: scale_color(srgb("#C7744A"), 0.85 + 0.05 * j), segs=18)
        leaf_mound(leaves, q + Vector((0, 0, prof_h)), 0.2, 3140 + k)
        flower_cluster(flowers, q + Vector((0, 0, prof_h + 0.2)), [PINK, YELLOW][k], 0.2, 3150 + k)
    vb = L.VEG_BEDS
    vx, vy = L.xy(*vb["center"])
    hw = (vb["count"] * vb["gap"]) / 2
    for k in range(4):
        q = Vector((vx - hw + 0.3 + k * (2 * hw - 0.9) / 3, vy + vb["length"] / 2 + 0.75, 0))
        q.z = T.height_at(q.x, q.y)
        if T.steep(q.x, q.y, 0.2, 0.1) or T.radial_t(q.x, q.y) > 0.93:
            continue
        sunflower(leaves, flowers, q, 1.0 + 0.15 * (k % 2), 3160 + k)
    pots.to_object("Greenhouse_Pots", col, [M.painted("SWG_Terracotta", roughness=0.8)])
    leaves.to_object("Greenhouse_BorderLeaves", col, [M.foliage()])
    blooms.to_object("Greenhouse_BorderBlooms", col, [M.painted("SWG_Petals", roughness=0.7)])
    flowers.to_object("Greenhouse_BorderFlowers", col, [M.painted("SWG_Petals", roughness=0.7)])


def build_islet_flowers(col):
    """A few flower clumps on each floating islet at 100%."""
    leaves, flowers = Geo(), Geo()
    for i, ((v, u, z), size, seed) in enumerate(L.FLOATING_ISLETS):
        x, y = L.xy(v, u)
        r = rng(seed + 50)
        for k in range(3):
            a, d = r.uniform(0, TAU), size * r.uniform(0.2, 0.55)
            q = Vector((x + math.cos(a) * d, y + math.sin(a) * d, z + 0.04))
            leaf_mound(leaves, q, 0.13, seed * 5 + k)
            flower_cluster(flowers, q + Vector((0, 0, 0.14)), [PINK, YELLOW, WHITE, LILAC][(i + k) % 4],
                           0.13, seed * 7 + k)
    leaves.to_object("Complete_Islets_FlowerLeaves", col, [M.foliage()])
    flowers.to_object("Complete_Islets_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])
