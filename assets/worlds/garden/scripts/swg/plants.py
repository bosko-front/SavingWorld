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
        if T.reserved(x, y, -0.15) or stream.pl.nearest(x, y)[0] < 1.2 or T.steep(x, y, 0.3, 0.12):
            continue
        flowers = r.choice([None, None, "#F6A9C4", "#FFFFFF", "#F49AB8", "#F7D45A"])
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
        blooms.ico(tip - Vector((0, 0, 0.07)), 0.05, srgb(r.choice(["#9C7CD6", "#8A6AC8", "#B095E2"])),
                   subdiv=1, scale=(1, 1, 2.6))


def build_more_flowers(col):
    """More flowers: hydrangeas along the wall feet, lavender, flower patches
    on the lawns and flowering bushes at the rim."""
    leaves, blooms, flowers = Geo(), Geo(), Geo()
    hydr = [((-6.6, -1.85), "#9DB8F0"), ((4.8, -1.55), "#C4A6EE"), ((-3.9, 3.5), "#F3A8C8"),
            ((1.6, 3.85), "#9DB8F0"), ((-7.4, 2.7), "#C4A6EE"), ((6.2, 3.95), "#F3A8C8")]
    for i, (pos, c) in enumerate(hydr):
        p = ground(*pos)
        if T.reserved(p.x, p.y, -0.3):
            continue
        hydrangea(leaves, blooms, p, 0.42, c, 1700 + i)
    for i, pos in enumerate([(-0.9, -3.2), (-0.6, -2.7), (-3.6, -1.2), (2.2, 1.9), (2.4, 2.4),
                             (-6.9, -5.2), (5.0, 2.4), (5.4, 2.9)]):
        p = ground(*pos)
        if not T.reserved(p.x, p.y, -0.35):
            lavender(leaves, blooms, p, 1750 + i)
    for i, pos in enumerate([(4.8, -7.6), (-4.4, -8.6), (7.4, -4.9), (-8.3, -1.8), (0.4, -9.6),
                             (6.9, -6.1), (-2.9, 8.7), (-6.3, 8.2), (4.6, 8.9), (8.4, 5.6)]):
        flower_patch(flowers, leaves, pos, 0.42, 1800 + i)
    for i, (pos, c) in enumerate([((-9.2, -3.9), "#F6A9C4"), ((9.0, -1.0), "#FFFFFF"),
                                  ((3.6, -9.0), "#F7D45A"), ((-7.6, 6.9), "#F6A9C4")]):
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
        if T.reserved(q.x, q.y, -0.25) or T.radial_t(q.x, q.y) > 0.95:
            continue
        flowers = r.choice([None, None, "#F6A9C4", "#FFFFFF", "#F7D45A", "#F49AB8"])
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
    """Finishing touch: tiny wildflowers sprinkled over the open lawns."""
    flowers = Geo()
    r = rng(2600)
    n = tries = 0
    palette = ["#FFFFFF", "#FFF4D6", "#F7D45A", "#F6A9C4", "#B9A2E8"]
    while n < 260 and tries < 20000:
        tries += 1
        x, y = r.uniform(-10.5, 10.5), r.uniform(-10.5, 10.5)
        if T.radial_t(x, y) > 0.95 or T.reserved(x, y, 0.05) or T.steep(x, y, 0.25, 0.08):
            continue
        if fbm(x * 0.35, y * 0.35, 0, 2, 2601.0) < -0.1:
            continue
        N.flower(flowers, (x, y, T.height_at(x, y) + 0.08), r.choice(palette), r.uniform(0.09, 0.12),
                 2700 + n)
        n += 1
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
    rows = 4
    r = rng(102)
    for j in range(rows):
        uo = (j / (rows - 1) - 0.5) * d * 0.72
        a = origin + AY * uo - AX * (w / 2 - 0.15)
        b = origin + AY * uo + AX * (w / 2 - 0.15)
        soil.tube([Vector((a.x, a.y, z + 0.08)), Vector((b.x, b.y, z + 0.08))], [0.09, 0.09],
                  SOIL_LIGHT, segs=8, color_fn=lambda v, cc: scale_color(cc, 0.9 + 0.1 * fbm(v.co.x * 9, v.co.y * 9, 0, 1, 103.0)))
        n = 7
        for i in range(n):
            p = a.lerp(b, (i + 0.5) / n) + Vector((0, 0, z + 0.14 - a.z))
            h = r.uniform(0.12, 0.2)
            sprouts.tube([p, p + Vector((0, 0, h))], [0.016, 0.012], srgb("#6FB240"), segs=4,
                         cap_start=False)
            for side in (-1, 1):
                ang = yaw + side * math.pi / 2 + r.uniform(-0.4, 0.4)
                lp = p + Vector((math.cos(ang) * 0.07, math.sin(ang) * 0.07, h * 0.95))
                sprouts.ico(lp, 0.075, mix_color(SPROUT, srgb("#B6E06A"), r.random() * 0.5),
                            subdiv=1, scale=(1.0, 0.55, 0.28), rot=(0, -side * 0.35, ang))
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
    palette = ["#F6A9C4", "#FFFFFF", "#F7D45A", "#F49A7A", "#B9A2E8"]
    for i in range(7):
        t = (i + 0.5) / 7 - 0.5
        for j, uo in enumerate((-0.2, 0.18)):
            p = c + AY * t * (length - 0.3) + AX * uo
            p.z = top
            leaf_mound(leaves, p + Vector((0, 0, 0.02)), 0.17, 1200 + i * 2 + j)
            flower_cluster(flowers, p + Vector((0, 0, 0.2 + r.uniform(0, 0.06))),
                           palette[(i + j * 2) % len(palette)], 0.13, 1300 + i * 2 + j)
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
                flower_cluster(flowers, p + out * 0.1, r.choice(["#F6A9C4", "#FFFFFF", "#F49AB8"]),
                               0.13, 1600 + i * 10 + k)
        made += 1
    stems.to_object("Vines_Stems", col, [M.foliage("SWG_VineStem", rim=0.1, leafy=False)])
    leaves.to_object("Vines_Leaves", col, [M.foliage()])
    flowers.to_object("Vines_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])
    return made


def build_final_flowers(col):
    leaves, flowers = Geo(), Geo()
    for i, pos in enumerate([(-5.4, -7.3), (5.6, 1.7), (-2.6, 1.9), (0.9, -7.0), (3.3, 7.6),
                             (-7.5, -0.4), (7.6, -0.9)]):
        p = ground(*pos)
        if T.reserved(p.x, p.y, -0.5):
            continue
        flower_patch(flowers, leaves, pos, 0.4, 1900 + i, ["#F7D45A", "#FFFFFF", "#B9A2E8", "#F6A9C4"])
    leaves.to_object("Complete_FlowerLeaves", col, [M.foliage()])
    flowers.to_object("Complete_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])
