"""Trees, bushes and flowers (stages 1, 3 and 7)."""

import math

from . import layout as L
from . import materials as M
from . import terrain as T
from .common import (TAU, Geo, Vector, clamp, fbm, metaball_object, mix_color, rng, scale_color,
                     smoothstep, srgb)

LEAF_DARK = srgb("#3A7A2C")
LEAF = srgb("#67A83A")
LEAF_SUN = srgb("#B3D650")
BARK = srgb("#7E5538")
BARK_DARK = srgb("#55392A")
PINE_DARK = srgb("#24593A")
PINE = srgb("#357F45")
PINE_TIP = srgb("#6FAF52")
BUSH = srgb("#5A9E3A")
BUSH_SUN = srgb("#8CC24A")

FLOWER_COLORS = ["#FFFFFF", "#FFF4D6", "#F6A9C4", "#B9A2E8", "#F7D45A", "#F49A55", "#E8666A"]


def _bark_fn(base_z, height):
    def fn(v, c):
        k = clamp((v.co.z - base_z) / max(height, 0.01))
        streak = 0.5 + 0.5 * fbm(v.co.x * 9, v.co.y * 9, v.co.z * 1.5, 2, 3.0)
        return mix_color(BARK_DARK, BARK, clamp(0.35 + 0.5 * streak + 0.2 * k))
    return fn


def _blob_fn(center, base_color, top_lift=0.32):
    """Each leaf clump is lighter on top and darker underneath, like painted
    cauliflower clusters."""
    def fn(v, c):
        n = (v.co - center).normalized()
        k = 0.78 + top_lift * clamp(n.z * 0.5 + 0.5) + 0.1 * clamp(-(n.x * 0.6 + n.y * 0.4))
        return scale_color(base_color, k)
    return fn


def broadleaf(trunk, crowns, base, height, canopy, seed):
    r = rng(seed)
    b = Vector(base)
    lean = Vector((r.uniform(-0.25, 0.25), r.uniform(-0.25, 0.25), 0.0))
    top = b + Vector((0, 0, height * 0.6)) + lean
    pts = []
    for t in (0.0, 0.2, 0.42, 0.66, 0.85, 1.0):
        wob = Vector((0.1 * math.sin(t * 4 + seed), 0.1 * math.cos(t * 3 + seed), 0)) * t
        pts.append(b.lerp(top, t) + wob)
    pts[0] = pts[0] - Vector((0, 0, 0.25))
    r0 = 0.07 * height + 0.06
    radii = [r0 * 1.15, r0, r0 * 0.86, r0 * 0.74, r0 * 0.62, r0 * 0.5]
    phase = r.uniform(0, TAU)

    def roots(i, a):
        if i == 0:
            return 1.0 + 0.9 * max(0.0, math.cos(3 * a + phase)) ** 3
        if i == 1:
            return 1.0 + 0.35 * max(0.0, math.cos(3 * a + phase)) ** 3
        return 1.0

    trunk.tube(pts, radii, BARK, segs=12, cap_start=False, radial_fn=roots,
               color_fn=_bark_fn(b.z, height * 0.6))
    canopy_c = b + Vector((0, 0, height * 0.66)) + lean * 1.2
    for k in range(3):
        a = phase + k * TAU / 3 + r.uniform(-0.3, 0.3)
        s = pts[3]
        e = canopy_c + Vector((math.cos(a) * canopy * 0.55, math.sin(a) * canopy * 0.55,
                               r.uniform(-0.1, 0.4) * canopy))
        trunk.tube([s, s.lerp(e, 0.5) + Vector((0, 0, 0.12)), e], [r0 * 0.5, r0 * 0.36, r0 * 0.2],
                   BARK, segs=7, cap_start=False, color_fn=_bark_fn(b.z, height * 0.6))
    # shape variety from the seed: round, tall or wide crowns, each tree with
    # its own leaf hue so neighbours never look copy-pasted
    shape = seed % 3
    sx, sz = {0: (1.0, 0.82), 1: (0.86, 1.08), 2: (1.14, 0.7)}[shape]
    rx, ry, rz = canopy * sx, canopy * sx * r.uniform(0.88, 1.0), canopy * sz
    hue = r.uniform(-1.0, 1.0)
    leaf_dark = mix_color(LEAF_DARK, srgb("#2F6E34") if hue < 0 else srgb("#4A7F22"), abs(hue) * 0.6)
    leaf = mix_color(LEAF, srgb("#4F9A3E") if hue < 0 else srgb("#86B83A"), abs(hue) * 0.6)
    leaf_sun = mix_color(LEAF_SUN, srgb("#9FD15A") if hue < 0 else srgb("#D3DC5A"), abs(hue) * 0.5)
    # one merged crown: a core plus large lobes, so the silhouette is a soft
    # scalloped cloud of leaves instead of many separate balls
    core = [(canopy_c, canopy * 0.95, (sx, sx * ry / rx, sz))]
    lobes = []
    count = int(9 + canopy * 3)
    golden = math.pi * (3.0 - math.sqrt(5.0))
    for i in range(count):
        zz = 0.95 - (i + 0.5) / count * 1.45
        rad = math.sqrt(max(0.0, 1.0 - zz * zz))
        a = i * golden + phase
        n = Vector((math.cos(a) * rad, math.sin(a) * rad, zz))
        p = canopy_c + Vector((n.x * rx * 0.8, n.y * ry * 0.8, n.z * rz * 0.8))
        lobes.append((p, canopy * r.uniform(0.56, 0.68) * (1.0 - 0.2 * max(0.0, -zz))))
    if shape == 1:  # a smaller crown on top makes the tall variant read as layered
        lobes.append((canopy_c + Vector((0, 0, rz * 0.82)), canopy * 0.7))
    crowns.append(dict(center=canopy_c, radii=(rx, ry, rz), lobes=lobes, core=core,
                       dark=leaf_dark, mid=leaf, sun=leaf_sun, size=canopy))


def crown_elements(crowns):
    out = []
    for c in crowns:
        out += c["core"]
        out += [(p, rad, (1.0, 1.0, 0.9)) for p, rad in c["lobes"]]
    return out


def crown_color_fn(crowns):
    """Global light-to-dark gradient over the crown, toward the sun, plus a
    highlight on top of each lobe so the clumps read like painted foliage."""
    def fn(co):
        c = min(crowns, key=lambda cc: (co - cc["center"]).length)
        rx, ry, rz = c["radii"]
        d = co - c["center"]
        n = Vector((d.x / rx, d.y / ry, d.z / rz)).normalized()
        sun_side = -0.84 * n.x - 0.54 * n.y
        col = mix_color(c["dark"], c["mid"], smoothstep(-0.7, 0.15, n.z + 0.25 * sun_side))
        col = mix_color(col, c["sun"], 0.75 * smoothstep(0.25, 0.95, n.z * 0.7 + 0.45 * sun_side))
        p, _ = min(c["lobes"], key=lambda pr: (co - pr[0]).length - pr[1])
        nl = (co - p).normalized()
        k = 0.86 + 0.22 * clamp(nl.z * 0.5 + 0.5) + 0.06 * clamp(-0.84 * nl.x - 0.54 * nl.y)
        return scale_color(col, k)
    return fn


def crown_displace_fn(seed):
    def fn(co, normal):
        return 0.07 * fbm(co.x * 2.0, co.y * 2.0, co.z * 2.0, 2, seed)
    return fn


def _pine_tier(geo, center, top_z, h, radius, seed):
    r = rng(seed)
    lobes = r.randint(8, 10)
    phase = r.uniform(0, TAU)
    seg = lobes * 6
    rows = 6
    coords, colors, faces = [], [], []
    coords.append((center.x, center.y, top_z))
    colors.append(PINE_TIP)

    def scallop(a):
        return abs(math.cos(lobes * a * 0.5 + phase)) ** 0.7

    for j in range(1, rows + 1):
        s = j / rows
        for i in range(seg):
            a = TAU * i / seg
            sc = scallop(a)
            rr = radius * s ** 0.85 * (0.84 + 0.2 * sc * s * s)
            z = top_z - h * s ** 1.2 - 0.12 * h * sc * s ** 3
            coords.append((center.x + math.cos(a) * rr, center.y + math.sin(a) * rr, z))
            col = mix_color(PINE_DARK, PINE, smoothstep(0.1, 0.8, s))
            col = mix_color(col, PINE_TIP, 0.55 * sc * smoothstep(0.55, 1.0, s))
            colors.append(col)
    # underside back toward the trunk
    for i in range(seg):
        a = TAU * i / seg
        rr = radius * 0.4
        coords.append((center.x + math.cos(a) * rr, center.y + math.sin(a) * rr,
                       top_z - h * 0.82))
        colors.append(scale_color(PINE_DARK, 0.6))
    coords.append((center.x, center.y, top_z - h * 0.7))
    colors.append(scale_color(PINE_DARK, 0.5))
    for i in range(seg):
        faces.append((0, 1 + i, 1 + (i + 1) % seg))
    for j in range(rows):
        o0, o1 = 1 + j * seg, 1 + (j + 1) * seg
        if j == rows - 1:
            break
        for i in range(seg):
            i2 = (i + 1) % seg
            faces.append((o0 + i, o1 + i, o1 + i2, o0 + i2))
    rim, under = 1 + (rows - 1) * seg, 1 + rows * seg
    for i in range(seg):
        i2 = (i + 1) % seg
        faces.append((rim + i, under + i, under + i2, rim + i2))
    last = len(coords) - 1
    for i in range(seg):
        faces.append((under + i, last, under + (i + 1) % seg))
    geo.raw(coords, faces, colors)


def pine(trunk, leaves, base, height, radius, seed):
    r = rng(seed)
    b = Vector(base)
    trunk.tube([b - Vector((0, 0, 0.2)), b + Vector((0, 0, height * 0.5))],
               [0.07 * height + 0.04, 0.05], BARK, segs=10, cap_start=False,
               color_fn=_bark_fn(b.z, height * 0.5))
    tiers = 4 + seed % 3
    lean = Vector((r.uniform(-0.05, 0.05), r.uniform(-0.05, 0.05), 0))
    slim = r.uniform(0.88, 1.1)
    for i in range(tiers):
        t = i / (tiers - 1)
        h = height * (0.36 - 0.1 * t) * (5 / tiers) ** 0.5
        top = b.z + height * (0.42 + 0.56 * t)
        rad = radius * slim * (1.0 - 0.62 * t)
        _pine_tier(leaves, b + lean * t * height + Vector((r.uniform(-0.03, 0.03), r.uniform(-0.03, 0.03), 0)),
                   top, h, rad, seed * 10 + i)


def bush(geo, pos, size, seed, flowers=None, ground=False, blossom_geo=None):
    """ground=True seats every clump on the terrain under it (slopes).
    blossom_geo puts the blossoms in their own (brighter petal) object."""
    r = rng(seed)
    p = Vector(pos)
    n = r.randint(5, 8)
    blobs = []
    for i in range(n):
        a = r.uniform(0, TAU)
        d = r.uniform(0.0, 0.6) * size
        rad = size * r.uniform(0.42, 0.62)
        c = p + Vector((math.cos(a) * d, math.sin(a) * d, rad * 0.55 + r.uniform(0, 0.15) * size))
        if ground:
            c.z = T.height_at(c.x, c.y) + rad * 0.45 + r.uniform(0, 0.1) * size
        col = mix_color(BUSH, BUSH_SUN, r.uniform(0.0, 0.6))
        geo.ico(c, rad, col, subdiv=2, scale=(1, 1, 0.85), displace=0.08, freq=2.0,
                seed=seed + i, color_fn=_blob_fn(c, col, 0.36))
        blobs.append((c, rad))
    if flowers:
        fc = srgb(flowers)
        # blossom clusters large enough to survive the painterly filter and
        # read as a flowering bush on a phone (single small dots smear away)
        bg = blossom_geo or geo
        for i in range(int(5 + size * 8)):
            c, rad = blobs[r.randrange(len(blobs))]
            a = r.uniform(0, TAU)
            el = r.uniform(0.35, 1.25)
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            p = c + Vector((d.x * rad, d.y * rad, d.z * rad * 0.85))
            k = r.uniform(0.94, 1.08)
            bg.ico(p, r.uniform(0.15, 0.2), scale_color(fc, k), subdiv=2, scale=(1, 1, 0.75),
                   displace=0.18, freq=3.0, seed=seed + i,
                   color_fn=lambda v, cc, p=p: scale_color(cc, 0.86 + 0.24 * clamp((v.co.z - p.z) * 6 + 0.5)))


def flower(geo, pos, color, size, seed):
    r = rng(seed)
    p = Vector(pos)
    petals = 5
    rot = r.uniform(0, TAU)
    pc = srgb(color)
    for k in range(petals):
        a = rot + TAU * k / petals
        q = p + Vector((math.cos(a) * size * 0.55, math.sin(a) * size * 0.55, 0))
        geo.ico(q, size * 0.5, pc, subdiv=1, scale=(1.0, 0.75, 0.32), rot=(0, 0, a),
                color_fn=lambda v, c: scale_color(c, 0.9 + 0.2 * clamp((v.co.z - p.z) * 20 + 0.5)))
    geo.ico(p + Vector((0, 0, size * 0.12)), size * 0.3, srgb("#F2B33D"), subdiv=1,
            scale=(1, 1, 0.6))


def _steep(x, y, reach=0.15, limit=0.07):
    z = T.height_at(x, y)
    return any(abs(T.height_at(x + dx, y + dy) - z) > limit
               for dx, dy in ((reach, 0), (-reach, 0), (0, reach), (0, -reach)))


def flower_patch(flowers, leaves, center, radius, seed, palette):
    """Flowers and leaves only on level ground, so nothing hangs off a step."""
    r = rng(seed)
    cx, cy = center
    for i in range(int(4 + radius * 5)):
        a, d = r.uniform(0, TAU), r.uniform(0, radius)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if _steep(x, y):
            continue
        z = T.height_at(x, y)
        col = mix_color(BUSH, LEAF_DARK, r.random() * 0.6)
        leaves.ico((x, y, z + 0.04), r.uniform(0.09, 0.16), col, subdiv=1,
                   scale=(1, 1, 0.55), seed=seed + i)
    count = int(5 + radius * radius * 14)
    for i in range(count):
        a, d = r.uniform(0, TAU), radius * math.sqrt(r.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        if _steep(x, y):
            continue
        z = T.height_at(x, y) + r.uniform(0.08, 0.18)
        flower(flowers, (x, y, z), r.choice(palette), r.uniform(0.12, 0.16), seed * 31 + i)
        leaves.tube([(x, y, z - 0.2), (x, y, z - 0.01)], [0.012, 0.008], LEAF_DARK, segs=4,
                    cap_start=False, cap_end=False)


# ------------------------------------------------------------------ stages


def _trees_object(name, col, specs):
    trunk, needles, crowns = Geo(), Geo(), []
    for kind, (x, y), h, size, seed in specs:
        z = T.height_at(x, y)
        if kind == "pine":
            pine(trunk, needles, (x, y, z), h, size, seed)
        else:
            broadleaf(trunk, crowns, (x, y, z), h, size, seed)
    trunk.to_object(name + "_Trunks", col, [M.wood("SW_Bark")])
    if crowns:
        metaball_object(name + "_Leaves", col, crown_elements(crowns), [M.foliage()],
                        crown_color_fn(crowns), resolution=0.07,
                        displace_fn=crown_displace_fn(len(name)))
    if len(needles.bm.verts):
        needles.to_object(name + "_Needles", col, [M.foliage("SW_Needles", rim=0.35, leafy=False)])
    else:
        needles.bm.free()


def build_first_tree(col):
    t = L.FIRST_TREE
    _trees_object("FirstTree", col, [("broad", t["pos"], t["height"], t["canopy"], t["seed"])])


def build_more_trees(col):
    _trees_object("MoreTrees", col, L.MORE_TREES)
    geo = Geo()
    r = rng(77)
    for i, (_, (x, y), _, size, _) in enumerate(L.MORE_TREES):
        a = r.uniform(0, TAU)
        bx, by = x + math.cos(a) * size * 0.9, y + math.sin(a) * size * 0.9
        bush(geo, (bx, by, T.height_at(bx, by)), 0.42, 4000 + i, ground=True)
    geo.to_object("MoreTrees_Bushes", col, [M.foliage()])


def _side_points(pts, offsets, seed):
    """Points beside a polyline, alternating sides."""
    pl = T.Polyline(pts)
    r = rng(seed)
    out = []
    s, side = 0.6, 1
    while s < pl.length - 0.4:
        p, t = pl.point(s)
        n = Vector((-t.y, t.x, 0))
        off = r.uniform(*offsets)
        q = p + n * side * off
        out.append((q.x, q.y))
        side = -side
        s += r.uniform(1.3, 2.1)
    return out


def _clearance(x, y):
    """Distance from (x, y) to the nearest path edge or stream bank."""
    d = min(T.Polyline(pts).nearest(x, y)[0] - L.PATH_HALF_WIDTH
            for pts in (L.MAIN_PATH, L.BRANCH_PATH_WEST, L.BRANCH_PATH_EAST))
    ds, s, _ = T.STREAM.nearest(x, y)
    return min(d, ds - T.stream_half_width(s) - L.STREAM_BANK)


def _east_side(x, y):
    """Spots along the east branch path and around the pond: they bloom with
    the pond at stage 6 instead of leading nowhere at stage 5."""
    near_path = T.Polyline(L.BRANCH_PATH_EAST).nearest(x, y)[0] < 2.0
    near_pond = math.hypot(x - L.POND_CENTER[0], y - L.POND_CENTER[1]) < L.POND_RADIUS + 1.8
    return near_path or near_pond


def build_flowers_bushes(col, east=False, name=""):
    """Stage 3 builds the west side (east=False); stage 6 builds the east side
    with name="Pond". The full spot loop always runs so every spot keeps the
    same random choices whichever stage it lands in."""
    bushes, flowers, leaves, blossoms = Geo(), Geo(), Geo(), Geo()
    r = rng(3000)
    spots = _side_points(L.MAIN_PATH, (1.25, 1.7), 3001)
    spots += [(-1.8, 6.6), (1.2, 4.6), (-1.6, 2.2), (1.4, 0.4), (-1.9, -1.6), (2.4, -5.8),
              (-0.4, -6.8), (4.2, 6.8), (7.6, 2.2), (-6.6, -6.2), (-8.0, 3.8), (3.0, -8.4),
              (8.4, -4.6), (-4.6, -8.2), (5.8, 0.4), (-6.2, 1.0)]
    used = []
    for i, (x, y) in enumerate(spots):
        if T.radial_t(x, y) > 0.93 or T.reserved(x, y, -0.55):
            continue
        if any(math.hypot(x - a, y - b) < 0.9 for a, b in used):
            continue
        used.append((x, y))
        z = T.height_at(x, y)
        target = _east_side(x, y) == east
        if i % 2 == 0:
            # flowering bushes: bigger and always in bloom, but kept off the
            # paths and the stream banks
            size = min(r.uniform(0.55, 0.72), max(0.38, _clearance(x, y) / 1.15))
            fl = r.choice(["#F6A9C4", "#FFFFFF", "#F7D45A", "#F28DB2"])
            if target:
                bush(bushes, (x, y, z), size, 3100 + i, flowers=fl, ground=True,
                     blossom_geo=blossoms)
        else:
            pal = r.sample(FLOWER_COLORS, 3)
            radius = r.uniform(0.35, 0.6)
            if target:
                flower_patch(flowers, leaves, (x, y), radius, 3200 + i, pal)
    _emit(bushes, name + "Bushes", col)
    _emit(flowers, name + "Flowers", col, M.painted("SW_Petals", roughness=0.6, ao_strength=0.3,
                                                    top_light=0.12, grain=0.03))
    _emit(leaves, name + "Flower_Leaves", col)
    _emit(blossoms, name + "Blossoms", col, M.painted("SW_Blossom", roughness=0.55,
                                                     ao_strength=0.2, top_light=0.12,
                                                     grain=0.03, contact=0.15))


def _emit(geo, name, col, material=None):
    if len(geo.bm.verts):
        geo.to_object(name, col, [material or M.foliage()])
    else:
        geo.bm.free()


def build_pond_flowers(col):
    build_flowers_bushes(col, east=True, name="Pond")
