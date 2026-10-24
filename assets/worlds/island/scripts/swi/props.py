"""Paths (stages 2 and 5), pond (6), final decorations (9) and the completed
island extras (10)."""

import math

from . import layout as L
from . import materials as M
from . import nature as N
from . import structures as S
from . import terrain as T
from .common import TAU, Geo, Vector, fbm, flow_uv, mix_color, rng, scale_color, smoothstep, srgb

SAND = srgb("#DCC193")
SAND_DARK = srgb("#C6A57A")
FLAG = [srgb("#EDE3CF"), srgb("#D9CBB0"), srgb("#E4D6BB")]
STAIR = [srgb("#D6C9AE"), srgb("#C7B99C"), srgb("#DDD1B6")]
RISER = srgb("#8E7660")

# ------------------------------------------------------------------ paths


def _steep_intervals(pl, threshold=0.42):
    out, start = [], None
    s = 0.0
    while s < pl.length:
        p0, _ = pl.point(s)
        p1, _ = pl.point(s + 0.05)
        slope = abs(T.height_at(p1.x, p1.y) - T.height_at(p0.x, p0.y)) / 0.05
        if slope > threshold and start is None:
            start = s
        elif slope <= threshold and start is not None:
            out.append((max(0.0, start - 0.2), min(pl.length, s + 0.2)))
            start = None
        s += 0.05
    if start is not None:
        out.append((max(0.0, start - 0.2), pl.length))
    return out


def _in(intervals, s, pad=0.0):
    return any(a - pad <= s <= b + pad for a, b in intervals)


def _path(geo_sand, geo_stone, pts, seed, half_w=L.PATH_HALF_WIDTH, fade_start=True,
          fade_end=True):
    pl = T.Polyline(pts)
    stairs = _steep_intervals(pl)
    r = rng(seed)
    across, step = 11, 0.1
    rows = []
    s = 0.0
    while s <= pl.length + 1e-6:
        p, t = pl.smooth_point(s, 0.45)
        n = Vector((-t.y, t.x, 0))
        w = half_w * (1.0 + 0.18 * fbm(s * 0.9, 0.0, 0.0, 2, seed))
        row = []
        for k in range(across):
            o = (k / (across - 1) - 0.5) * 2.0
            q = p + n * o * w * 1.25
            z = T.height_at(q.x, q.y) + 0.03
            edge = 0.55 + 0.2 * fbm(q.x * 2.2, q.y * 2.2, 0.0, 2, seed + 1)
            a = 1.0 - smoothstep(edge, 1.0, abs(o))
            if fade_start:
                a *= smoothstep(0.0, 0.5, s)
            if fade_end:
                a *= smoothstep(pl.length, pl.length - 0.5, s)
            c = mix_color(SAND, SAND_DARK, 0.5 + 0.5 * fbm(q.x * 1.6, q.y * 1.6, 0, 2, seed + 2))
            row.append(((q.x, q.y, z), (c[0], c[1], c[2], a)))
        rows.append(row)
        s += step
    coords = [v for row in rows for v, _ in row]
    colors = [c for row in rows for _, c in row]
    faces = []
    for j in range(len(rows) - 1):
        for k in range(across - 1):
            a = j * across + k
            faces.append((a, a + 1, a + across + 1, a + across))
    geo_sand.raw(coords, faces, colors)

    # flagstones on the flat parts
    s = 0.35
    side = 1
    while s < pl.length - 0.2:
        if not _in(stairs, s, 0.25):
            p, t = pl.smooth_point(s, 0.45)
            n = Vector((-t.y, t.x, 0))
            q = p + n * side * r.uniform(0.12, 0.28)
            rad = r.uniform(0.17, 0.26)
            radii = [rad * r.uniform(0.75, 1.1) for _ in range(8)]
            col = r.choice(FLAG)
            geo_stone.prism((q.x, q.y, T.height_at(q.x, q.y) + 0.03), radii, 0.08, col,
                            rot_z=r.uniform(0, TAU), bevel=0.025)
            side = -side
        s += r.uniform(0.32, 0.42)

    # stone stairs where the path climbs a terrace step
    for a, b in stairs:
        pa, _ = pl.point(a)
        pb, _ = pl.point(b)
        za, zb = T.height_at(pa.x, pa.y), T.height_at(pb.x, pb.y)
        n_steps = max(3, int(round(abs(zb - za) / 0.14)))
        span = (b - a) / n_steps
        low = min(za, zb)
        for k in range(n_steps):
            sc = a + (k + 0.5) * span
            p, t = pl.point(sc)
            yaw = math.atan2(t.y, t.x)
            lin = za + (zb - za) * ((k + 1) / n_steps if zb > za else k / n_steps)
            if zb <= za:
                lin = za + (zb - za) * (k + 1) / n_steps + abs(zb - za) / n_steps
            top = lin
            nrm = Vector((-t.y, t.x, 0))
            for du in (-0.45, 0.0, 0.45):
                for dv in (-span * 0.5, 0.0, span * 0.5):
                    q = p + nrm * du + t * dv
                    top = max(top, T.height_at(q.x, q.y) + 0.04)
            # light stone tread on a darker earth riser, so each step reads
            tread = r.choice(STAIR)
            geo_stone.box((p.x, p.y, top - 0.09), (span * 1.3, 1.2, 0.18), tread,
                          rot=(0, 0, yaw + r.uniform(-0.04, 0.04)), bevel=0.05,
                          color_fn=lambda v, c, top=top: c if v.co.z > top - 0.05 else scale_color(c, 0.78))
            fill = top - 0.16 - (low - 0.35)
            if fill > 0.05:
                geo_stone.box((p.x, p.y, top - 0.16 - fill / 2), (span * 1.02, 1.05, fill), RISER,
                              rot=(0, 0, yaw), bevel=0.03)
        for k, sc in enumerate((a + 0.1, b - 0.1)):
            p, t = pl.point(sc)
            nrm = Vector((-t.y, t.x, 0))
            for sd in (-1, 1):
                q = p + nrm * sd * 0.72
                T.add_rock(geo_stone, (q.x, q.y, T.height_at(q.x, q.y)), 0.2, seed * 7 + k * 2 + sd,
                           moss=0.5)
    return pl


def _path_objects(name, col, paths):
    sand, stone = Geo(), Geo()
    for pts, fs, fe, seed in paths:
        _path(sand, stone, pts, seed, fade_start=fs, fade_end=fe)
    sand.to_object(name + "_Sand", col, [M.painted("SW_PathSand", roughness=0.95, ao_strength=0.4,
                                                     top_light=0.05, grain=0.1, grain_scale=18.0,
                                                     alpha=True)])
    stone.to_object(name + "_Stones", col, [M.rock("SW_Stone")], sharp_angle=40)


def build_path(col):
    _path_objects("Path_Main", col, [(L.MAIN_PATH, True, False, 70)])


def build_branch_path_west(col):
    """Stage 5: from the main path to the bridge."""
    _path_objects("Path_BranchWest", col, [(L.BRANCH_PATH_WEST, True, False, 70)])


def build_branch_path_east(col):
    """Stage 6: from the bridge past the pond toward the garden site."""
    _path_objects("Path_BranchEast", col, [(L.BRANCH_PATH_EAST, False, True, 81)])


# ------------------------------------------------------------------ pond

POND_DEEP = srgb("#00A2BF")
POND_LIGHT = srgb("#68EEDA")


def pond_radius(a):
    return L.POND_RADIUS * (1.0 + 0.12 * fbm(math.cos(a) * 1.3, math.sin(a) * 1.3, 0.0, 2, 31.0))


def pond_level():
    cx, cy = L.POND_CENTER
    zs = []
    for i in range(48):
        a = TAU * i / 48
        for f in (0.0, 0.5, 1.0, 1.3):
            r = pond_radius(a) * f
            zs.append(T.height_at(cx + math.cos(a) * r, cy + math.sin(a) * r))
    return max(zs) + 0.04


def build_pond(col):
    cx, cy = L.POND_CENTER
    wl = pond_level()
    seg, rings = 72, 10
    water = Geo()
    coords, colors, faces = [(cx, cy, wl)], [POND_DEEP], []
    uvs = [(0.5, 0.0)]
    for j in range(1, rings + 1):
        f = j / rings
        for i in range(seg):
            a = TAU * i / seg
            r = pond_radius(a) * f
            coords.append((cx + math.cos(a) * r, cy + math.sin(a) * r, wl))
            uvs.append((0.5 + 0.5 * f, a * L.POND_RADIUS * 0.6))
            c = mix_color(POND_DEEP, POND_LIGHT, smoothstep(0.35, 1.0, f))
            colors.append(mix_color(c, srgb("#E8FAFF"), 0.5 * smoothstep(0.9, 1.0, f)))
    for i in range(seg):
        faces.append((0, 1 + i, 1 + (i + 1) % seg))
    for j in range(rings - 1):
        for i in range(seg):
            a0, a1 = 1 + j * seg, 1 + (j + 1) * seg
            i2 = (i + 1) % seg
            faces.append((a0 + i, a1 + i, a1 + i2, a0 + i2))
    water.raw(coords, faces, colors)
    water.to_object("Pond_Water", col, [M.water("SW_PondWater", streaks=0.35, glints=0.7)],
                    uv_fn=flow_uv(uvs))

    # grassy, sandy bank ring that hides the water edge
    bank = Geo()
    prof = [(0.96, -0.03), (1.04, 0.07), (1.12, 0.09), (1.24, None), (1.36, None)]
    coords, colors, faces = [], [], []
    for f, dz in prof:
        for i in range(seg):
            a = TAU * i / seg
            r = pond_radius(a) * f
            x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
            z = wl + dz if dz is not None else T.height_at(x, y) - (0.0 if f > 1.3 else -0.04)
            coords.append((x, y, z))
            g = T.grass_color(x, y)
            colors.append(mix_color(SAND, g, smoothstep(1.02, 1.22, f)))
    for j in range(len(prof) - 1):
        for i in range(seg):
            i2 = (i + 1) % seg
            faces.append((j * seg + i, (j + 1) * seg + i, (j + 1) * seg + i2, j * seg + i2))
    bank.raw(coords, faces, colors)
    bank.to_object("Pond_Bank", col, [M.terrain()])

    deco = Geo()
    r = rng(600)
    for i in range(22):
        a = TAU * i / 22 + r.uniform(-0.1, 0.1)
        rr = pond_radius(a) * r.uniform(1.0, 1.1)
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        T.add_rock(deco, (x, y, wl + 0.02), r.uniform(0.1, 0.22), 610 + i, moss=0.45, sink=0.5)
    pads = Geo()
    for i in range(7):
        a, d = r.uniform(0, TAU), r.uniform(0.25, 0.75)
        x = cx + math.cos(a) * d * L.POND_RADIUS
        y = cy + math.sin(a) * d * L.POND_RADIUS
        rad = r.uniform(0.16, 0.26)
        radii = [rad * (0.35 if k == 0 else 1.0) for k in range(14)]
        col_pad = mix_color(srgb("#4E9A38"), srgb("#86C04C"), r.random())
        pads.prism((x, y, wl + 0.012), radii, 0.02, col_pad, rot_z=r.uniform(0, TAU))
        if i % 3 == 0:
            p = Vector((x, y, wl + 0.06))
            for k in range(6):
                aa = TAU * k / 6
                pads.ico(p + Vector((math.cos(aa) * 0.05, math.sin(aa) * 0.05, 0.02)), 0.06,
                         srgb("#F4A6C6"), subdiv=1, scale=(1, 0.6, 0.6), rot=(0, -0.6, aa))
            pads.ico(p + Vector((0, 0, 0.04)), 0.035, srgb("#F7D45A"), subdiv=1)
    # two reed clumps with cattails on the back bank: tall enough to read
    for k, deg in enumerate((48, 96)):
        a = math.radians(deg)
        rr = pond_radius(a) * 1.0
        x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        T.add_tuft(pads, (x, y, wl), 650 + k, height=0.75, color=srgb("#5C9A3A"))
        T.add_tuft(pads, (x + 0.15, y - 0.1, wl), 660 + k, height=0.55, color=srgb("#6FAE45"))
        for j in range(3):
            b0 = Vector((x + r.uniform(-0.15, 0.15), y + r.uniform(-0.15, 0.15), wl))
            tip = b0 + Vector((r.uniform(-0.06, 0.06), r.uniform(-0.06, 0.06), r.uniform(0.75, 0.95)))
            pads.tube([b0, tip], [0.022, 0.012], srgb("#4F8A34"), segs=5, cap_start=False)
            pads.tube([tip - Vector((0, 0, 0.24)), tip - Vector((0, 0, 0.04))], [0.055, 0.055],
                      srgb("#7A4A2A"), segs=8)
    deco.to_object("Pond_Rocks", col, [M.rock()], sharp_angle=34)
    pads.to_object("Pond_Plants", col, [M.foliage()])


# ------------------------------------------------------------------ decorations


def fence(geo, pts, seed, post_gap=0.75, height=0.7):
    r = rng(seed)
    pl = T.Polyline(pts)
    n = max(2, int(pl.length / post_gap) + 1)
    tops = []
    for i in range(n):
        p, t = pl.point(pl.length * i / (n - 1))
        z = T.height_at(p.x, p.y)
        geo.box((p.x, p.y, z + height / 2 - 0.1), (0.16, 0.16, height + 0.2),
                mix_color(S.WOOD_DARK, S.WOOD, r.random() * 0.3), rot=(0, 0, math.atan2(t.y, t.x)),
                bevel=0.02)
        tops.append(Vector((p.x, p.y, z)))
    for lift in (height * 0.45, height * 0.85):
        geo.tube([v + Vector((0, 0, lift)) for v in tops], [0.065] * len(tops), S.WOOD, segs=6)


def lamp_post(geo, glow, pos, seed, height=2.1):
    """Wooden post with a large, bright hanging lantern sized to read on a phone."""
    x, y = pos
    z = T.height_at(x, y)
    geo.box((x, y, z + height / 2 - 0.15), (0.19, 0.19, height + 0.3), S.WOOD_DARK, bevel=0.03)
    geo.box((x, y, z + 0.09), (0.34, 0.34, 0.18), S.WOOD_DARK, bevel=0.03)
    arm = Vector((0.707, -0.707, 0.0))
    geo.box((x + arm.x * 0.3, y + arm.y * 0.3, z + height - 0.05), (0.72, 0.1, 0.1),
            S.WOOD_DARK, rot=(0, 0, -math.pi / 4), bevel=0.02)
    lx, ly = x + arm.x * 0.58, y + arm.y * 0.58
    lz = z + height - 0.58
    geo.box((lx, ly, lz + 0.42), (0.035, 0.035, 0.16), S.TIMBER)
    geo.cone((lx, ly, lz + 0.26), (lx, ly, lz + 0.45), 0.34, 0.03, S.TIMBER, segs=4)
    geo.box((lx, ly, lz - 0.22), (0.4, 0.4, 0.06), S.TIMBER, bevel=0.015)
    for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        geo.box((lx + dx * 0.16, ly + dy * 0.16, lz + 0.02), (0.045, 0.045, 0.46), S.TIMBER)
    glow.box((lx, ly, lz + 0.02), (0.3, 0.3, 0.42), S.GLOW, bevel=0.04)


def bench(geo, pos, yaw):
    x, y = pos
    z = T.height_at(x, y)
    c, s = math.cos(yaw), math.sin(yaw)

    def w(lx, ly, lz):
        return (x + lx * c - ly * s, y + lx * s + ly * c, z + lz)

    geo.box(w(0, 0, 0.36), (0.36, 1.2, 0.07), S.WOOD, rot=(0, 0, yaw), bevel=0.02)
    geo.box(w(-0.17, 0, 0.62), (0.06, 1.2, 0.26), S.WOOD, rot=(0, 0, yaw), bevel=0.02)
    for ly in (-0.5, 0.5):
        geo.box(w(0, ly, 0.17), (0.32, 0.07, 0.36), S.WOOD_DARK, rot=(0, 0, yaw), bevel=0.015)
        geo.box(w(-0.17, ly, 0.45), (0.06, 0.07, 0.5), S.WOOD_DARK, rot=(0, 0, yaw), bevel=0.015)


def barrel(geo, pos, rad=0.24, hgt=0.55):
    x, y, z = pos
    pts = [(x, y, z + hgt * t) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    radii = [rad * (0.88 + 0.12 * math.sin(math.pi * t)) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
    geo.tube(pts, radii, S.WOOD, segs=14)
    for t in (0.15, 0.85):
        geo.tube([(x, y, z + hgt * t - 0.025), (x, y, z + hgt * t + 0.025)],
                 [rad * 0.97 + 0.012] * 2, srgb("#5E5A55"), segs=14, cap_start=False, cap_end=False)


def crate(geo, pos, size, yaw):
    geo.box((pos[0], pos[1], pos[2] + size / 2), (size, size, size), S.WOOD, rot=(0, 0, yaw),
            bevel=0.025)
    geo.box((pos[0], pos[1], pos[2] + size / 2), (size * 1.02, size * 0.25, size * 1.02),
            S.WOOD_DARK, rot=(0, 0, yaw), bevel=0.01)


def build_final_decorations(col):
    wood, glow = Geo(), Geo()
    fence(wood, [(-8.3, 0.8), (-7.2, 1.3), (-6.0, 1.9), (-4.9, 2.3)], 901)
    fence(wood, [(-4.5, -8.4), (-5.6, -7.6), (-6.6, -6.7)], 902)
    lamp_post(wood, glow, (-1.9, -4.1), 904)
    lamp_post(wood, glow, (-2.25, 2.85), 905)
    lamp_post(wood, glow, (2.75, -6.15), 906)
    bench(wood, (-1.95, 0.45), 0.0)
    for i, (x, y) in enumerate([(-6.75, 2.35), (-7.25, 2.75)]):
        barrel(wood, (x, y, T.height_at(x, y) - 0.03))
    crate(wood, (-6.35, 2.05, T.height_at(-6.35, 2.05) - 0.02), 0.38, 0.4)
    crate(wood, (-6.35, 2.05, T.height_at(-6.35, 2.05) + 0.35), 0.28, 0.9)
    # flowers along the fences and the bench
    flowers, leaves = Geo(), Geo()
    for i, (x, y) in enumerate([(-7.6, 1.6), (-5.4, 2.6), (-5.2, -7.6), (-2.1, -0.2),
                                (-0.6, -8.4)]):
        N.flower_patch(flowers, leaves, (x, y), 0.35, 940 + i, ["#F6A9C4", "#FFFFFF", "#F7D45A"])
    wood.to_object("Decor_Wood", col, [M.wood()], sharp_angle=40)
    glow.to_object("Decor_LanternGlow", col, [M.emissive("SW_LanternGlow", (1.0, 0.7, 0.32, 1), 16.0)])
    flowers.to_object("Decor_Flowers", col, [M.painted("SW_Petals")])
    leaves.to_object("Decor_FlowerLeaves", col, [M.foliage()])


# ------------------------------------------------------------------ completion


def vegetable_garden(wood, plants, center, seed):
    r = rng(seed)
    cx, cy = center
    for i in range(3):
        bx = cx + (i - 1) * 1.15
        z = max(T.height_at(bx + dx, cy + dy) for dx in (-0.45, 0.45) for dy in (-1.0, 1.0))
        wood.box((bx, cy, z + 0.05), (0.95, 2.2, 0.3), S.WOOD_DARK, bevel=0.03)
        wood.box((bx, cy, z + 0.17), (0.8, 2.05, 0.1), srgb("#6B4A33"), bevel=0.03)
        kind = i % 3
        for j in range(6):
            p = Vector((bx + r.uniform(-0.12, 0.12), cy - 0.85 + j * 0.34, z + 0.25))
            if kind == 0:  # cabbages
                for k in range(5):
                    plants.ico(p + Vector((0, 0, 0.05 + k * 0.012)), 0.17 - k * 0.025,
                               mix_color(srgb("#7DBE5A"), srgb("#B4DC7C"), k / 4), subdiv=2,
                               scale=(1, 1, 0.7), displace=0.2, seed=seed + j * 7 + k)
            elif kind == 1:  # carrots: leafy tops
                for k in range(5):
                    a = TAU * k / 5
                    plants.tube([p, p + Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.28))],
                                [0.025, 0.01], srgb("#5FA73E"), segs=4)
                plants.ico(p + Vector((0, 0, -0.01)), 0.06, srgb("#F08A3C"), subdiv=1)
            else:  # tomato bushes
                plants.ico(p + Vector((0, 0, 0.18)), 0.2, srgb("#4F9A38"), subdiv=2,
                           displace=0.25, seed=seed + j)
                for k in range(4):
                    a = r.uniform(0, TAU)
                    plants.ico(p + Vector((math.cos(a) * 0.17, math.sin(a) * 0.17,
                                           0.12 + r.uniform(0, 0.15))), 0.055, srgb("#E2463A"),
                               subdiv=1)
    fence(wood, [(cx - 1.95, cy - 1.45), (cx + 1.95, cy - 1.45), (cx + 1.95, cy + 1.45)], seed + 1,
          post_gap=0.6, height=0.5)
    fence(wood, [(cx - 1.95, cy + 0.3), (cx - 1.95, cy + 1.45), (cx + 1.95, cy + 1.45)], seed + 2,
          post_gap=0.6, height=0.5)


def dock_and_boat(wood, cloth, col_center, wl, seed):
    r = rng(seed)
    c = Vector((col_center[0], col_center[1], 0))
    d = Vector((0.62, 0.78, 0)).normalized()
    start = c + d * L.POND_RADIUS * 1.45
    end = c + d * L.POND_RADIUS * 0.4
    axis = (end - start).normalized()
    side = Vector((-axis.y, axis.x, 0))
    yaw = math.atan2(axis.y, axis.x)
    length = (end - start).length
    deck = wl + 0.2
    n = int(length / 0.2)
    for i in range(n):
        p = start + axis * (i + 0.5) * length / n
        wood.box((p.x, p.y, deck), (length / n * 0.88, 1.0, 0.07),
                 mix_color(S.WOOD, S.WOOD_DARK, r.random() * 0.4), rot=(0, 0, yaw), bevel=0.015)
    for t in (0.35, 0.7, 1.0):
        for sd in (-1, 1):
            p = start + axis * length * t + side * sd * 0.45
            wood.tube([(p.x, p.y, wl - 0.3), (p.x, p.y, deck + 0.12)], [0.07, 0.07], S.WOOD_DARK,
                      segs=8)
    # striped canvas awning on four posts over the end of the dock
    posts = [end - axis * 0.1 + side * 0.42, end - axis * 0.1 - side * 0.42,
             end - axis * 1.0 + side * 0.42, end - axis * 1.0 - side * 0.42]
    for p in posts:
        wood.tube([(p.x, p.y, deck), (p.x, p.y, deck + 1.05)], [0.045, 0.04], S.WOOD_DARK, segs=6)
    nu, nv = 8, 6
    coords, faces, colors = [], [], []
    for j in range(nv + 1):
        tv = j / nv
        for i in range(nu + 1):
            tu = i / nu
            q = (end - axis * 0.1) - axis * 0.9 * tu + side * (0.48 - 0.96 * tv)
            sag = 0.09 * math.sin(math.pi * tu) * math.sin(math.pi * tv)
            coords.append((q.x, q.y, deck + 1.08 - 0.12 * tu - sag))
            colors.append(srgb("#FBF5E8") if (i // 2) % 2 == 0 else srgb("#E8B04A"))
    for j in range(nv):
        for i in range(nu):
            k = j * (nu + 1) + i
            faces.append((k, k + 1, k + nu + 2, k + nu + 1))
    # scalloped valance hanging from the front edge
    base_i = len(coords)
    for j in range(nv + 1):
        tv = j / nv
        q = (end - axis * 0.1) + side * (0.48 - 0.96 * tv)
        coords.append((q.x, q.y, deck + 1.08))
        coords.append((q.x, q.y, deck + 1.08 - (0.17 if j % 2 else 0.1)))
        colors += [srgb("#E8B04A")] * 2
    for j in range(nv):
        k = base_i + j * 2
        faces.append((k, k + 2, k + 3, k + 1))
    cloth.raw(coords, faces, colors)
    # rowing boat moored beside the dock
    bp = c + d * L.POND_RADIUS * 0.5 + side * 1.0
    rowboat(wood, Vector((bp.x, bp.y, wl)), yaw + 0.3)


def rowboat(geo, at, yaw):
    """Lofted rowing boat: pointed bow, flat transom, planked painted hull,
    darker inside, gunwale, two thwarts and a pair of oars."""
    length, stations, ring = 1.55, 14, 11
    paint, paint_dark = srgb("#4F86A8"), srgb("#3E6C8C")
    inside = srgb("#8A5A36")
    c, s_ = math.cos(yaw), math.sin(yaw)

    def w(x, y, z):
        return (at.x + x * c - y * s_, at.y + x * s_ + y * c, at.z + z)

    outer, inner, colors_o, colors_i = [], [], [], []
    rims = ([], [])
    for i in range(stations + 1):
        t = i / stations
        hw = 0.4 * math.sin(math.pi * (0.16 + 0.84 * t)) ** 0.75
        depth = 0.26 * (1.0 - 0.25 * t)
        sheer = 0.16 + 0.14 * t ** 3
        x = (t - 0.5) * length
        for k in range(ring):
            th = math.pi * k / (ring - 1)
            y = -math.cos(th) * hw
            z = sheer - math.sin(th) ** 0.75 * (depth + sheer * 0.6)
            outer.append(w(x, y, z))
            band = int((sheer - z) / 0.075)
            colors_o.append(srgb("#F4EEE2") if band == 0 else (paint if band % 2 else paint_dark))
            inner.append(w(x * 0.97, y * 0.86, z + 0.05 + 0.02 * math.sin(th)))
            colors_i.append(inside)
        rims[0].append(Vector(w(x, -hw, sheer + 0.02)))
        rims[1].append(Vector(w(x, hw, sheer + 0.02)))
    n_o = len(outer)
    coords = outer + inner
    colors = colors_o + colors_i
    faces = []
    for i in range(stations):
        for k in range(ring - 1):
            a = i * ring + k
            faces.append((a, a + 1, a + ring + 1, a + ring))
            faces.append((n_o + a, n_o + a + ring, n_o + a + ring + 1, n_o + a + 1))
        for k in (0, ring - 1):
            a = i * ring + k
            faces.append((a, a + ring, n_o + a + ring, n_o + a))
    faces.append(tuple(range(ring)))
    faces.append(tuple(n_o + k for k in range(ring - 1, -1, -1)))
    geo.raw(coords, faces, colors)
    for rim in rims:
        geo.tube(rim, [0.035] * len(rim), S.WOOD_DARK, segs=6)
    for tx in (-0.2, 0.25):
        geo.box(w(tx, 0, 0.1), (0.16, 0.66, 0.045), S.WOOD, rot=(0, 0, yaw), bevel=0.012)
    for sd in (-1, 1):
        a0, a1 = w(-0.55, sd * 0.12, 0.2), w(0.5, sd * 0.2, 0.17)
        geo.tube([a0, a1], [0.025, 0.025], S.WOOD, segs=6)
        geo.box(a1, (0.3, 0.1, 0.02), S.WOOD, rot=(0, 0, yaw), bevel=0.01)


def islet(top, rock, foliage, center, size, seed):
    r = rng(seed)
    c = Vector(center)
    seg = 28
    coords_t, coords_r, faces_t, faces_r, cols_t, cols_r = [], [], [], [], [], []
    rad = [size * (1 + 0.15 * fbm(math.cos(TAU * i / seg), math.sin(TAU * i / seg), 0, 2, seed))
           for i in range(seg)]
    coords_t.append((c.x, c.y, c.z + 0.08))
    cols_t.append(T.GRASS)
    for i in range(seg):
        a = TAU * i / seg
        coords_t.append((c.x + math.cos(a) * rad[i], c.y + math.sin(a) * rad[i], c.z))
        cols_t.append(T.GRASS_SUN)
    for i in range(seg):
        a = TAU * i / seg
        coords_t.append((c.x + math.cos(a) * rad[i] * 1.04, c.y + math.sin(a) * rad[i] * 1.04, c.z - 0.12))
        cols_t.append(T.GRASS_LIP)
    for i in range(seg):
        faces_t.append((0, 1 + i, 1 + (i + 1) % seg))
        faces_t.append((1 + i, 1 + seg + i, 1 + seg + (i + 1) % seg, 1 + (i + 1) % seg))
    top.raw(coords_t, faces_t, cols_t)
    depth = size * 2.2
    rows = 8
    for j in range(rows + 1):
        q = j / rows
        for i in range(seg):
            a = TAU * i / seg
            rr = rad[i] * 0.98 * (1 - q ** 1.3) ** 0.8 + 0.02
            rr *= 1 - 0.12 * abs(fbm(math.cos(a) * 3, math.sin(a) * 3, q * 2, 2, seed + 1))
            coords_r.append((c.x + math.cos(a) * rr, c.y + math.sin(a) * rr, c.z - 0.1 - q * depth))
            cols_r.append(T.rock_color(c.z - q * depth, a, q))
    for j in range(rows):
        for i in range(seg):
            i2 = (i + 1) % seg
            faces_r.append((j * seg + i, j * seg + i2, (j + 1) * seg + i2, (j + 1) * seg + i))
    rock.raw(coords_r, faces_r, cols_r)
    if r.random() < 0.6:
        N.bush(foliage, (c.x, c.y, c.z + 0.02), size * 0.45, seed + 3)
    else:
        N.pine(rock, foliage, (c.x, c.y, c.z), size * 2.4, size * 0.7, seed + 4)
    T.add_tuft(foliage, (c.x + size * 0.5, c.y - size * 0.3, c.z), seed + 5)


def build_completion(col):
    wood, plants, cloth = Geo(), Geo(), Geo()
    vegetable_garden(wood, plants, L.GARDEN_CENTER, 1100)
    dock_and_boat(wood, cloth, L.POND_CENTER, pond_level(), 1200)
    wood.to_object("Complete_Wood", col, [M.wood()], sharp_angle=40)
    plants.to_object("Complete_Garden", col, [M.foliage()])
    cloth.to_object("Complete_Awning", col, [M.painted("SW_Canvas", roughness=0.9, ao_strength=0.35)])

    top, rock, foliage = Geo(), Geo(), Geo()
    for center, size, seed in L.FLOATING_ISLETS:
        islet(top, rock, foliage, center, size, seed)
    top.to_object("Complete_Islets_Top", col, [M.terrain()])
    rock.to_object("Complete_Islets_Rock", col, [M.rock("SW_Cliff")])
    foliage.to_object("Complete_Islets_Plants", col, [M.foliage()])

    flowers, leaves = Geo(), Geo()
    for i, (x, y) in enumerate([(3.3, 2.4), (7.3, 1.2), (2.2, -1.2), (-0.8, 6.4), (-6.0, -5.2),
                                (6.4, -6.0)]):
        if T.reserved(x, y, -0.6):
            continue
        N.flower_patch(flowers, leaves, (x, y), 0.4, 1400 + i, ["#F7D45A", "#FFFFFF", "#B9A2E8"])
    flowers.to_object("Complete_Flowers", col, [M.painted("SW_Petals")])
    leaves.to_object("Complete_FlowerLeaves", col, [M.foliage()])
