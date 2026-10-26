"""Garden structures and decorations: the paved path with stairs, the bridge,
lanterns, benches, birdbath and pots, the greenhouse, fences, the rose
pergola, the seating nook, floating islets and the butterflies (ambient)."""

import math

from swi import materials as M
from swi import nature as N
from swi import props as IP
from swi.common import (TAU, Geo, Vector, clamp, fbm, metaball_object, mix_color, rng, scale_color,
                        smoothstep, srgb)

from . import layout as L
from . import plants as P
from . import terrain as T
from . import water as W

WOOD = srgb("#A8703F")
WOOD_DARK = srgb("#7C4E2C")
TIMBER = srgb("#6E4529")
FRAME = srgb("#8C5A34")
WHITE_WOOD = srgb("#F4EEE2")
GLOW = srgb("#FFD27A")
FLAG = [srgb("#EDE3CF"), srgb("#DCCFB4"), srgb("#E6D9BE"), srgb("#D4C6AA")]
STAIR = [srgb("#D9CCB1"), srgb("#CBBC9F"), srgb("#E0D4BA")]
RISER = srgb("#8E7660")
SAND = srgb("#D9C59D")
SAND_DARK = srgb("#C4A77C")
TERRACOTTA = srgb("#C7744A")

AX = P.AX
AY = P.AY


def zg(x, y):
    return T.height_at(x, y)


# ------------------------------------------------------------------ path


def _steep_intervals(pl, threshold=0.42):
    out, start, s = [], None, 0.0
    while s < pl.length:
        p0, _ = pl.point(s)
        p1, _ = pl.point(s + 0.05)
        slope = abs(zg(p1.x, p1.y) - zg(p0.x, p0.y)) / 0.05
        if slope > threshold and start is None:
            start = s
        elif slope <= threshold and start is not None:
            out.append((max(0.0, start - 0.25), min(pl.length, s + 0.25)))
            start = None
        s += 0.05
    if start is not None:
        out.append((max(0.0, start - 0.25), pl.length))
    return out


def build_path(col):
    """Main garden pathway: a sand bed paved with cream flagstones, and stone
    stairs through the two wall gaps up to the greenhouse terrace."""
    pl = T.polyline_vu(L.MAIN_PATH)
    stairs = _steep_intervals(pl)
    r = rng(500)
    sand, stone = Geo(), Geo()
    half_w = L.PATH_HALF_WIDTH
    across, step = 11, 0.1
    rows = []
    s = 0.0
    while s <= pl.length + 1e-6:
        p, t = pl.smooth_point(s, 0.45)
        n = Vector((-t.y, t.x, 0))
        w = half_w * (1.0 + 0.12 * fbm(s * 0.9, 0.0, 0.0, 2, 501.0))
        row = []
        for k in range(across):
            o = (k / (across - 1) - 0.5) * 2.0
            q = p + n * o * w * 1.2
            z = zg(q.x, q.y) + 0.03
            edge = 0.62 + 0.18 * fbm(q.x * 2.2, q.y * 2.2, 0.0, 2, 502.0)
            a = (1.0 - smoothstep(edge, 1.0, abs(o))) * smoothstep(0.0, 0.5, s)
            c = mix_color(SAND, SAND_DARK, 0.5 + 0.5 * fbm(q.x * 1.6, q.y * 1.6, 0, 2, 503.0))
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
    sand.raw(coords, faces, colors)

    # paving: two or three flagstones per row on the flat parts
    s = 0.3
    flip = 0
    while s < pl.length - 0.15:
        if not any(a - 0.2 <= s <= b + 0.2 for a, b in stairs):
            p, t = pl.smooth_point(s, 0.45)
            n = Vector((-t.y, t.x, 0))
            offs = (-0.42, 0.0, 0.42) if flip % 2 else (-0.24, 0.24)
            for o in offs:
                q = p + n * (o + r.uniform(-0.05, 0.05)) * half_w / 0.72
                rad = r.uniform(0.17, 0.23) if len(offs) == 3 else r.uniform(0.21, 0.27)
                radii = [rad * r.uniform(0.82, 1.08) for _ in range(8)]
                stone.prism((q.x, q.y, zg(q.x, q.y) + 0.035), radii, 0.08, r.choice(FLAG),
                            rot_z=r.uniform(0, TAU), bevel=0.025)
            flip += 1
        s += r.uniform(0.36, 0.42)

    # stairs: light treads on darker risers, cheek stones at both ends
    for a, b in stairs:
        pa, _ = pl.point(a)
        pb, _ = pl.point(b)
        za, zb = zg(pa.x, pa.y), zg(pb.x, pb.y)
        n_steps = max(3, int(round(abs(zb - za) / 0.15)))
        span = (b - a) / n_steps
        low = min(za, zb)
        for k in range(n_steps):
            sc = a + (k + 0.5) * span
            p, t = pl.point(sc)
            yaw = math.atan2(t.y, t.x)
            top = za + (zb - za) * (k + 1) / n_steps if zb > za else za + (zb - za) * k / n_steps
            nrm = Vector((-t.y, t.x, 0))
            for du in (-0.55, 0.0, 0.55):
                for dv in (-span * 0.5, 0.0, span * 0.5):
                    q = p + nrm * du + t * dv
                    top = max(top, zg(q.x, q.y) + 0.04)
            stone.box((p.x, p.y, top - 0.09), (span * 1.3, half_w * 2.15, 0.18), r.choice(STAIR),
                      rot=(0, 0, yaw + r.uniform(-0.03, 0.03)), bevel=0.05,
                      color_fn=lambda v, c, top=top: c if v.co.z > top - 0.05 else scale_color(c, 0.78))
            fill = top - 0.16 - (low - 0.35)
            if fill > 0.05:
                stone.box((p.x, p.y, top - 0.16 - fill / 2), (span * 1.02, half_w * 1.9, fill), RISER,
                          rot=(0, 0, yaw), bevel=0.03)
        for k, sc in enumerate((a + 0.05, b - 0.05)):
            p, t = pl.point(sc)
            nrm = Vector((-t.y, t.x, 0))
            for sd in (-1, 1):
                q = p + nrm * sd * (half_w + 0.2)
                T.add_rock(stone, (q.x, q.y, zg(q.x, q.y)), 0.24, 520 + k * 2 + sd + int(a * 10), moss=0.5)
    sand.to_object("Path_Sand", col, [M.terrain("SWG_PathSand")])
    stone.to_object("Path_Stones", col, [M.rock("SWG_PathStone")], sharp_angle=34)


# ------------------------------------------------------------------ bridge


def bridge_crossing():
    pl = T.polyline_vu(L.MAIN_PATH)
    sc = W.stream()
    best = (1e9, 0.0)
    s = 0.0
    while s < pl.length:
        p, _ = pl.point(s)
        d = sc.pl.nearest(p.x, p.y)[0]
        if d < best[0]:
            best = (d, s)
        s += 0.02
    p, t = pl.smooth_point(best[1], 0.5)
    return p, t, sc


def build_bridge(col):
    c, axis, sc = bridge_crossing()
    side = Vector((-axis.y, axis.x, 0))
    half = L.BRIDGE_LENGTH / 2
    a_end, b_end = c - axis * half, c + axis * half
    za, zb = zg(a_end.x, a_end.y) + 0.06, zg(b_end.x, b_end.y) + 0.06
    rise = 0.5
    yaw = math.atan2(axis.y, axis.x)
    g = Geo()
    r = rng(560)

    def arc(t, lift=0.0, lateral=0.0):
        p = a_end.lerp(b_end, t) + side * lateral
        return Vector((p.x, p.y, za + (zb - za) * t + rise * math.sin(math.pi * t) + lift))

    n = 15
    for i in range(n):
        t = (i + 0.5) / n
        p = arc(t)
        dz = (arc(t + 0.01).z - arc(t - 0.01).z) / (0.02 * L.BRIDGE_LENGTH)
        g.box(p, (L.BRIDGE_LENGTH / n * 0.88, 1.35, 0.08), mix_color(WOOD, WOOD_DARK, r.random() * 0.4),
              rot=(0, -math.atan(dz), yaw), bevel=0.02)
    for lat in (-0.58, 0.58):
        g.tube([arc(t / 12, -0.1, lat) for t in range(13)], [0.07] * 13, WOOD_DARK, segs=8)
        for t in (0.0, 0.25, 0.5, 0.75, 1.0):
            p = arc(t, 0.0, lat * 1.07)
            g.box(p + Vector((0, 0, 0.3)), (0.11, 0.11, 0.72), WOOD_DARK, rot=(0, 0, yaw), bevel=0.02)
            g.box(p + Vector((0, 0, 0.68)), (0.15, 0.15, 0.05), WOOD, rot=(0, 0, yaw), bevel=0.015)
        g.tube([arc(t / 16, 0.62, lat * 1.07) for t in range(17)], [0.045] * 17, WOOD, segs=8)
        g.tube([arc(t / 16, 0.33, lat * 1.07) for t in range(17)], [0.03] * 17, WOOD_DARK, segs=6)
    g.to_object("Bridge", col, [M.wood()], sharp_angle=35)


# ------------------------------------------------------------------ small decorations


def lantern_post(geo, glow, pos, height=1.9):
    """Dark post with a hanging lantern; the glass is its own glow geometry."""
    x, y = pos
    z = zg(x, y)
    dark = srgb("#4A3A30")
    geo.box((x, y, z + height / 2 - 0.15), (0.14, 0.14, height + 0.3), dark, bevel=0.03)
    geo.box((x, y, z + 0.08), (0.28, 0.28, 0.16), dark, bevel=0.03)
    arm = Vector((0.707, -0.707, 0.0))
    geo.box((x + arm.x * 0.25, y + arm.y * 0.25, z + height - 0.05), (0.6, 0.08, 0.08), dark,
            rot=(0, 0, -math.pi / 4), bevel=0.02)
    lx, ly, lz = x + arm.x * 0.5, y + arm.y * 0.5, z + height - 0.52
    geo.box((lx, ly, lz + 0.38), (0.03, 0.03, 0.14), dark)
    geo.cone((lx, ly, lz + 0.22), (lx, ly, lz + 0.4), 0.3, 0.03, dark, segs=4)
    geo.box((lx, ly, lz - 0.2), (0.34, 0.34, 0.05), dark, bevel=0.015)
    for dx, dy in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        geo.box((lx + dx * 0.14, ly + dy * 0.14, lz + 0.01), (0.04, 0.04, 0.42), dark)
    glow.box((lx, ly, lz + 0.01), (0.26, 0.26, 0.38), GLOW, bevel=0.04)


def bench(geo, center, yaw):
    """Bench seat centered at center (on the ground), facing local +X."""
    x, y = center[0], center[1]
    z = zg(x, y)
    c, s = math.cos(yaw), math.sin(yaw)

    def w(lx, ly, lz):
        return (x + lx * c - ly * s, y + lx * s + ly * c, z + lz)

    geo.box(w(0, 0, 0.36), (0.38, 1.25, 0.07), WOOD, rot=(0, 0, yaw), bevel=0.02)
    geo.box(w(-0.18, 0, 0.64), (0.06, 1.25, 0.28), WOOD, rot=(0, 0, yaw), bevel=0.02)
    for ly in (-0.52, 0.52):
        geo.box(w(0, ly, 0.17), (0.34, 0.07, 0.36), WOOD_DARK, rot=(0, 0, yaw), bevel=0.015)
        geo.box(w(-0.18, ly, 0.46), (0.06, 0.07, 0.52), WOOD_DARK, rot=(0, 0, yaw), bevel=0.015)


def pot(geo, plants, flowers, pos, size, seed, color="#F6A9C4"):
    x, y = pos[0], pos[1]
    z = zg(x, y)
    prof = [(0.0, 0.0), (size * 0.6, 0.0), (size * 0.8, size * 0.9), (size * 0.92, size * 0.95),
            (size * 0.9, size * 1.08), (size * 0.75, size * 1.05)]
    W._lathe(geo, (x, y, z), prof, lambda j, a, p: scale_color(TERRACOTTA, 0.85 + 0.2 * (j / 5)), segs=20)
    P.leaf_mound(plants, Vector((x, y, z + size * 1.0)), size * 0.75, seed)
    P.flower_cluster(flowers, Vector((x, y, z + size * 1.4)), color, size * 0.32, seed + 1)


def birdbath(stone, water_geo, pos):
    x, y = pos
    z = zg(x, y)
    s0 = srgb("#D6CCBA")
    W._lathe(stone, (x, y, z), [(0.0, 0.0), (0.26, 0.0), (0.24, 0.1), (0.1, 0.18), (0.08, 0.6),
                                (0.14, 0.68), (0.4, 0.78), (0.43, 0.86), (0.36, 0.86), (0.3, 0.8),
                                (0.0, 0.8)],
             lambda j, a, p: scale_color(s0, 0.82 + 0.22 * clamp((p.z - z) / 0.9)), segs=24)
    W._disk(water_geo, (x, y), 0.34, z + 0.835, W.DEEP, W.LIGHT, segs=24, rings=2)


def build_bench_decor(col):
    """Bench by the pond, four lanterns along the path, a birdbath and pots."""
    wood, glow_geo, stone, water_geo, plants, flowers = Geo(), Geo(), Geo(), Geo(), Geo(), Geo()
    b = L.BENCH_POND
    bx, by = L.xy(*b["pos"])
    tx, ty = L.xy(*b["yaw_toward"])
    bench(wood, (bx, by), math.atan2(ty - by, tx - bx))
    for k, pos in enumerate(L.LANTERNS):
        g = Geo()
        lantern_post(wood, g, L.xy(*pos))
        g.to_object(f"Lantern_Glow_{k + 1}", col, [M.emissive("SWG_LanternGlow", (1.0, 0.72, 0.34, 1), 14.0)])
    birdbath(stone, water_geo, L.xy(*L.BIRDBATH))
    for k, pos in enumerate(L.POTS):
        pot(stone, plants, flowers, L.xy(*pos), 0.32, 2100 + k * 3, ["#F6A9C4", "#F7D45A"][k % 2])
    wood.to_object("Decor_Wood", col, [M.wood()], sharp_angle=40)
    stone.to_object("Decor_Stone", col, [M.rock("SWG_DecorStone")], sharp_angle=50)
    water_geo.to_object("Water_Birdbath", col, [M.water("SWG_FountainWater", streaks=0.3, glints=0.8)])
    plants.to_object("Decor_Plants", col, [M.foliage()])
    flowers.to_object("Decor_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])


# ------------------------------------------------------------------ greenhouse


def glass_material(name="SWG_Glass"):
    """Pale frosted glass: mostly see-through in the middle of a pane, more
    opaque and bright toward grazing angles, with a soft sky tint."""
    import bpy  # noqa: PLC0415
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.78, 0.93, 0.95, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.15
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    bsdf.inputs["Emission Color"].default_value = (0.85, 0.96, 1.0, 1.0)
    bsdf.inputs["Emission Strength"].default_value = 0.25
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = 0.38
    mr.inputs["To Max"].default_value = 0.85
    nt.links.new(lw.outputs["Facing"], mr.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(bsdf.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def _quad(geo, a, b, c, d, color):
    geo.raw([a, b, c, d], [(0, 1, 2, 3)], [color] * 4)


def build_greenhouse(col):
    """Glass greenhouse on the top terrace: brick plinth, wooden frame, glass
    walls and roof, plants on benches inside and warm lights."""
    gh = L.GREENHOUSE
    cx, cy = L.xy(*gh["center"])
    hx, hy = gh["width"] / 2, gh["length"] / 2   # X half width, Y half length
    z0 = max(zg(cx + sx * hx, cy + sy * hy) for sx in (-1, 0, 1) for sy in (-1, 0, 1)) + 0.02
    base_h = 0.42
    eave, ridge = z0 + gh["eave"], z0 + gh["ridge"]
    frame, glass, brick, inside, inside_fl, glow, floor = (Geo() for _ in range(7))
    r = rng(800)

    # plinth and floor
    brick_c = [srgb("#C98A66"), srgb("#B97A58"), srgb("#D49A74")]
    for sx in (-1, 1):
        brick.box((cx + sx * hx, cy, z0 + base_h / 2 - 0.1), (0.2, hy * 2 + 0.2, base_h + 0.2),
                  r.choice(brick_c), bevel=0.03)
    for sy in (-1, 1):
        for part in (-1, 1):  # front wall split by the door
            w = hx - 0.45
            brick.box((cx + part * (0.45 + w / 2), cy + sy * hy, z0 + base_h / 2 - 0.1),
                      (w + 0.1, 0.2, base_h + 0.2), r.choice(brick_c), bevel=0.03)
    brick.box((cx, cy + hy, z0 + base_h / 2 - 0.1), (0.95, 0.2, base_h + 0.2), brick_c[0], bevel=0.03)
    floor.box((cx, cy, z0 - 0.02), (hx * 2, hy * 2, 0.08), srgb("#BFAF94"), bevel=0.02)
    # door step
    floor.box((cx, cy - hy - 0.3, zg(cx, cy - hy - 0.3) + 0.06), (1.0, 0.45, 0.14), srgb("#D7CBB3"), bevel=0.04)

    zt = z0 + base_h
    post = 0.085
    # vertical posts along the long sides (X = +-hx) and the gable ends (Y = +-hy)
    ny = 6
    for i in range(ny + 1):
        y = cy - hy + 2 * hy * i / ny
        for sx in (-1, 1):
            frame.box((cx + sx * hx, y, (zt + eave) / 2), (post, post, eave - zt), FRAME, bevel=0.012)
    nx = 4
    for i in range(nx + 1):
        x = cx - hx + 2 * hx * i / nx
        hgt = eave + (ridge - eave) * (1 - abs(x - cx) / hx)
        for sy in (-1, 1):
            if sy < 0 and abs(x - cx) < 0.3:
                continue  # door opening
            frame.box((x, cy + sy * hy, (zt + hgt) / 2), (post, post, hgt - zt), FRAME, bevel=0.012)
    # rails
    for z in (zt, (zt + eave) / 2, eave):
        for sx in (-1, 1):
            frame.box((cx + sx * hx, cy, z), (post * 1.2, hy * 2 + post, post * 1.1), FRAME, bevel=0.012)
        for sy in (-1, 1):
            frame.box((cx, cy + sy * hy, z), (hx * 2 + post, post * 1.2, post * 1.1), FRAME, bevel=0.012)
    # roof: rafters, ridge, gable edges
    pitch = math.atan2(ridge - eave, hx)
    slope_len = math.hypot(hx, ridge - eave)
    for i in range(ny + 1):
        y = cy - hy + 2 * hy * i / ny
        for sx in (-1, 1):
            mid = Vector((cx + sx * hx / 2, y, (eave + ridge) / 2))
            frame.box(mid, (slope_len + 0.08, post, post * 1.1), FRAME, rot=(0, sx * pitch, 0), bevel=0.012)
    frame.box((cx, cy, ridge + 0.04), (0.16, hy * 2 + 0.3, 0.12), WHITE_WOOD, bevel=0.03)
    for i in range(7):  # finials on the ridge
        y = cy - hy + 2 * hy * i / 6
        frame.ico((cx, y, ridge + 0.14), 0.05, WHITE_WOOD, subdiv=1)
    # door
    dy = cy - hy - 0.02
    frame.box((cx, dy, zt - base_h + 0.72), (0.66, 0.06, 1.42), srgb("#7FA88A"), bevel=0.02)
    frame.box((cx - 0.36, dy, z0 + 0.78), (0.07, 0.08, 1.56), FRAME, bevel=0.01)
    frame.box((cx + 0.36, dy, z0 + 0.78), (0.07, 0.08, 1.56), FRAME, bevel=0.01)
    frame.box((cx, dy, z0 + 1.56), (0.8, 0.08, 0.07), FRAME, bevel=0.01)
    frame.ico((cx + 0.22, dy - 0.04, z0 + 0.8), 0.03, srgb("#E2B85A"), subdiv=1)

    # glass panes (slightly inside the frame)
    gc = (1, 1, 1, 1)
    inset = 0.01
    for sx in (-1, 1):
        x = cx + sx * (hx - inset)
        _quad(glass, (x, cy - hy, zt), (x, cy + hy, zt), (x, cy + hy, eave), (x, cy - hy, eave), gc)
    for sy in (-1, 1):
        y = cy + sy * (hy - inset)
        pts = [(cx - hx, y, zt), (cx + hx, y, zt), (cx + hx, y, eave), (cx, y, ridge), (cx - hx, y, eave)]
        if sy < 0:  # leave the door open in the pane
            glass.raw(pts + [(cx - 0.3, y, zt), (cx + 0.3, y, zt), (cx + 0.3, y, z0 + 1.5), (cx - 0.3, y, z0 + 1.5)],
                      [(0, 5, 8, 4), (6, 1, 2, 7), (8, 7, 2, 3, 4)], [gc] * 9)
        else:
            glass.raw(pts, [(0, 1, 2, 3, 4)], [gc] * 5)
    for sx in (-1, 1):
        _quad(glass, (cx + sx * hx, cy - hy, eave), (cx + sx * hx, cy + hy, eave),
              (cx, cy + hy, ridge), (cx, cy - hy, ridge), gc)

    # inside: two plant benches along the long sides, pots and greenery, lights
    for sx in (-1, 1):
        bx = cx + sx * (hx - 0.42)
        inside.box((bx, cy + 0.1, z0 + 0.62), (0.62, hy * 2 - 0.5, 0.06), WOOD, bevel=0.015)
        for sy in (-1, 1):
            inside.box((bx, cy + 0.1 + sy * (hy - 0.4), z0 + 0.3), (0.06, 0.06, 0.6), WOOD_DARK)
        for i in range(6):
            p = Vector((bx + r.uniform(-0.12, 0.12), cy - hy + 0.5 + i * (2 * hy - 0.8) / 5, z0 + 0.65))
            W._lathe(inside, p, [(0.0, 0.0), (0.1, 0.0), (0.14, 0.18), (0.12, 0.2)],
                     lambda j, a, q: TERRACOTTA, segs=12)
            P.leaf_mound(inside, p + Vector((0, 0, 0.22)), r.uniform(0.15, 0.22), 830 + i + sx * 10)
            if r.random() < 0.6:
                P.flower_cluster(inside_fl, p + Vector((0, 0, 0.36)),
                                 r.choice(["#F6A9C4", "#F49A7A", "#FFFFFF", "#F7D45A"]), 0.09, 860 + i + sx * 10)
    # a tall potted palm-like plant at the back
    P.leaf_mound(inside, Vector((cx, cy + hy - 0.45, z0 + 0.5)), 0.42, 890)
    P.leaf_mound(inside, Vector((cx + 0.2, cy + hy - 0.5, z0 + 0.9)), 0.32, 891)
    for i in range(4):
        y = cy - hy + 0.6 + i * (2 * hy - 1.2) / 3
        glow.ico((cx, y, eave - 0.08), 0.07, GLOW, subdiv=2)
        frame.box((cx, y, (eave + ridge) / 2 - 0.05), (0.012, 0.012, ridge - eave - 0.1), TIMBER)

    brick.to_object("Greenhouse_Brick", col, [M.painted("SWG_Brick", roughness=0.85, pattern="tile")], sharp_angle=40)
    floor.to_object("Greenhouse_Floor", col, [M.rock("SWG_PathStone")], sharp_angle=40)
    frame.to_object("Greenhouse_Frame", col, [M.wood("SWG_FrameWood")], sharp_angle=40)
    inside.to_object("Greenhouse_Plants", col, [M.foliage()])
    inside_fl.to_object("Greenhouse_Flowers", col, [M.painted("SWG_Petals", roughness=0.7)])
    glow.to_object("Greenhouse_LightGlow", col, [M.emissive("SWG_LanternGlow", (1.0, 0.72, 0.34, 1), 14.0)])
    glass.to_object("Greenhouse_Glass", col, [glass_material()], smooth=False)

    # planters along the front wall, outside
    pl, fl = Geo(), Geo()
    for sx in (-1, 1):
        x = cx + sx * (hx - 0.55)
        y = cy - hy - 0.35
        pl.box((x, y, zg(x, y) + 0.15), (0.75, 0.32, 0.3), srgb("#B07A48"), bevel=0.03)
        for k in range(3):
            P.leaf_mound(fl, Vector((x - 0.22 + k * 0.22, y, zg(x, y) + 0.32)), 0.13, 870 + k + sx * 5)
            P.flower_cluster(fl, Vector((x - 0.22 + k * 0.22, y, zg(x, y) + 0.44)),
                             ["#F6A9C4", "#FFFFFF", "#F49A7A"][k], 0.1, 880 + k + sx * 5)
    pl.to_object("Greenhouse_Planters", col, [M.wood()], sharp_angle=40)
    fl.to_object("Greenhouse_PlanterFlowers", col, [M.foliage()])


# ------------------------------------------------------------------ fences


def wood_fence(geo, pts, seed, post_gap=0.6, height=0.55):
    r = rng(seed)
    pl = T.Polyline(pts)
    n = max(2, int(pl.length / post_gap) + 1)
    tops = []
    for i in range(n):
        p, t = pl.point(pl.length * i / (n - 1))
        z = zg(p.x, p.y)
        geo.box((p.x, p.y, z + height / 2 - 0.1), (0.13, 0.13, height + 0.2),
                mix_color(WOOD_DARK, WOOD, r.random() * 0.3), rot=(0, 0, math.atan2(t.y, t.x)), bevel=0.02)
        tops.append(Vector((p.x, p.y, z)))
    for lift in (height * 0.45, height * 0.85):
        geo.tube([v + Vector((0, 0, lift)) for v in tops], [0.05] * len(tops), WOOD, segs=6)


def picket_fence(geo, pts_vu, gap=0.2, height=0.62):
    pl = T.polyline_vu(pts_vu)
    n = int(pl.length / gap)
    rails = []
    for i in range(n + 1):
        p, t = pl.point(pl.length * i / n)
        z = zg(p.x, p.y)
        yaw = math.atan2(t.y, t.x)
        geo.box((p.x, p.y, z + height / 2 - 0.08), (0.05, 0.11, height), WHITE_WOOD, rot=(0, 0, yaw), bevel=0.012)
        geo.cone((p.x, p.y, z + height - 0.09), (p.x, p.y, z + height + 0.04), 0.075, 0.005, WHITE_WOOD, segs=4)
        rails.append(Vector((p.x, p.y, z)))
    for lift in (0.18, 0.42):
        geo.tube([v + Vector((0, 0, lift)) for v in rails], [0.035] * len(rails), WHITE_WOOD, segs=6)


def build_greenhouse_garden(col):
    build_greenhouse(col)
    P.vegetable_beds(col)
    wood, white = Geo(), Geo()
    cx, cy = L.xy(*L.VEG_BEDS["center"])
    hw = (L.VEG_BEDS["count"] * L.VEG_BEDS["gap"]) / 2 + 0.1
    hl = L.VEG_BEDS["length"] / 2 + 0.45
    wood_fence(wood, [(cx - hw, cy + hl - 0.6), (cx - hw, cy + hl), (cx + hw, cy + hl)], 900)
    wood_fence(wood, [(cx - hw, cy - hl + 0.6), (cx - hw, cy - hl), (cx - 0.5, cy - hl)], 901)
    picket_fence(white, L.PICKET_FENCE)
    wood.to_object("VegBeds_Fence", col, [M.wood()], sharp_angle=40)
    white.to_object("PicketFence", col, [M.painted("SWG_WhitePaint", roughness=0.6, ao_strength=0.4)],
                    sharp_angle=40)


# ------------------------------------------------------------------ pergola


def build_pergola(col):
    """Rose-covered pergola with a bench and a hanging lantern."""
    pg = L.PERGOLA
    cx, cy = L.xy(*pg["center"])
    hl, hw, h = pg["length"] / 2, pg["width"] / 2, pg["height"]
    z0 = min(zg(cx + sx * hl, cy + sy * hw) for sx in (-1, 1) for sy in (-1, 1))
    wood, leaves, roses, glow, paving = Geo(), Geo(), Geo(), Geo(), Geo()
    r = rng(950)
    posts = [(cx + sx * hl, cy + sy * hw) for sx in (-1, 0, 1) for sy in (-1, 1)]
    for x, y in posts:
        zz = zg(x, y)
        wood.box((x, y, (zz + z0 + h) / 2 - 0.05), (0.16, 0.16, z0 + h - zz + 0.1), WOOD, bevel=0.025)
        wood.box((x, y, zz + 0.06), (0.24, 0.24, 0.14), srgb("#D6CCBA"), bevel=0.03)
    for sy in (-1, 1):
        wood.box((cx, cy + sy * hw, z0 + h + 0.08), (hl * 2 + 0.6, 0.13, 0.2), WOOD_DARK, bevel=0.025)
    for i in range(9):
        x = cx - hl - 0.1 + (2 * hl + 0.2) * i / 8
        wood.box((x, cy, z0 + h + 0.25), (0.09, hw * 2 + 0.5, 0.13), WOOD, bevel=0.02)
    # paving under it
    for i in range(10):
        x = cx + r.uniform(-hl, hl)
        y = cy + r.uniform(-hw, hw)
        paving.prism((x, y, zg(x, y) + 0.03), [r.uniform(0.18, 0.26) for _ in range(7)], 0.07,
                     r.choice(FLAG), rot_z=r.uniform(0, TAU), bevel=0.02)
    bench(wood, (cx, cy + hw - 0.35), -math.pi / 2)
    # climbing roses: stems up the posts, leaf mounds and rose clusters on top
    rose_cols = ["#F48FB4", "#F7B3CC", "#FFFFFF", "#E8668E"]
    for k, (x, y) in enumerate(posts):
        zz = zg(x, y)
        pts = [Vector((x + 0.12 * math.cos(t * 2.5 + k), y + 0.12 * math.sin(t * 2.5 + k), zz + t * h / 4))
               for t in range(5)]
        leaves.tube(pts, [0.035] * 5, srgb("#3F7A2E"), segs=5)
        for t in range(1, 5):
            p = pts[t] + Vector((r.uniform(-0.1, 0.1), r.uniform(-0.1, 0.1), 0))
            P.leaf_mound(leaves, p, 0.18, 960 + k * 10 + t)
            if r.random() < 0.7:
                P.flower_cluster(roses, p + Vector((0.08, -0.08, 0.05)), r.choice(rose_cols), 0.09, 970 + k * 10 + t)
    blobs = []
    for i in range(26):
        x = cx + r.uniform(-hl - 0.15, hl + 0.15)
        y = cy + r.uniform(-hw - 0.1, hw + 0.1)
        blobs.append((Vector((x, y, z0 + h + 0.32 + r.uniform(-0.04, 0.1))), r.uniform(0.38, 0.5),
                      (1.0, 1.0, 0.55)))
    for i in range(10):  # tumbling over the front and the ends
        t = (i + 0.5) / 10
        x = cx - hl + 2 * hl * t
        blobs.append((Vector((x, cy - hw - 0.12, z0 + h + 0.05 - 0.2 * (i % 3 == 0))), 0.26, (1.0, 0.8, 1.2)))
    crown = dict(center=Vector((cx, cy, z0 + h + 0.3)), radii=(hl + 0.4, hw + 0.4, 0.5),
                 lobes=[(b[0], b[1]) for b in blobs], core=[],
                 dark=srgb("#3E7E2E"), mid=srgb("#5FA63A"), sun=srgb("#A9D354"), size=0.5)
    metaball_object("Pergola_Canopy", col, [(b[0], b[1], b[2]) for b in blobs], [M.foliage()],
                    N.crown_color_fn([crown]), resolution=0.06, displace_fn=N.crown_displace_fn(951))
    for i in range(70):
        x = cx + r.uniform(-hl - 0.2, hl + 0.2)
        y = cy + r.uniform(-hw - 0.2, hw + 0.15)
        p = Vector((x, y, z0 + h + 0.55 + r.uniform(-0.05, 0.12)))
        P.flower_cluster(roses, p, r.choice(rose_cols), r.uniform(0.11, 0.15), 1100 + i)
    # garlands draping over the front beam
    for i in range(9):
        x = cx - hl + 2 * hl * (i + 0.5) / 9
        for d in range(r.randint(2, 4)):
            p = Vector((x + r.uniform(-0.1, 0.1), cy - hw - 0.08, z0 + h - 0.05 - d * 0.22))
            P.leaf_mound(leaves, p, 0.15, 1200 + i * 4 + d)
            if r.random() < 0.7:
                P.flower_cluster(roses, p + Vector((0, -0.1, 0)), r.choice(rose_cols), 0.11, 1300 + i * 4 + d)
    # hanging lantern
    lx, ly = cx + 0.3, cy
    wood.box((lx, ly, z0 + h - 0.1), (0.02, 0.02, 0.3), srgb("#4A3A30"))
    wood.cone((lx, ly, z0 + h - 0.32), (lx, ly, z0 + h - 0.22), 0.16, 0.02, srgb("#4A3A30"), segs=4)
    glow.box((lx, ly, z0 + h - 0.45), (0.15, 0.15, 0.22), GLOW, bevel=0.03)
    wood.to_object("Pergola_Wood", col, [M.wood()], sharp_angle=40)
    paving.to_object("Pergola_Paving", col, [M.rock("SWG_PathStone")], sharp_angle=34)
    leaves.to_object("Pergola_Leaves", col, [M.foliage()])
    roses.to_object("Pergola_Roses", col, [M.painted("SWG_Petals", roughness=0.7)])
    glow.to_object("Lantern_Glow_Pergola", col, [M.emissive("SWG_LanternGlow", (1.0, 0.72, 0.34, 1), 14.0)])


# ------------------------------------------------------------------ completion


def build_nook(col):
    """A little seating nook: round table, two chairs, a teapot and a fence."""
    wood, deco = Geo(), Geo()
    cx, cy = L.xy(*L.NOOK["center"])
    z = zg(cx, cy)
    wood.tube([(cx, cy, z), (cx, cy, z + 0.62)], [0.06, 0.05], WOOD_DARK, segs=10)
    wood.tube([(cx, cy, z + 0.6), (cx, cy, z + 0.68)], [0.45, 0.45], WOOD, segs=24)
    wood.tube([(cx, cy, z), (cx, cy, z + 0.04)], [0.2, 0.2], WOOD_DARK, segs=16)
    for k, a in enumerate((math.radians(-60), math.radians(120))):
        x, y = cx + math.cos(a) * 0.75, cy + math.sin(a) * 0.75
        zz = zg(x, y)
        yaw = a + math.pi
        c, s = math.cos(yaw), math.sin(yaw)

        def w(lx, ly, lz, x=x, y=y, zz=zz, c=c, s=s):
            return (x + lx * c - ly * s, y + lx * s + ly * c, zz + lz)

        wood.box(w(0, 0, 0.4), (0.42, 0.42, 0.06), WOOD, rot=(0, 0, yaw), bevel=0.02)
        wood.box(w(-0.2, 0, 0.68), (0.05, 0.42, 0.5), WOOD, rot=(0, 0, yaw), bevel=0.02)
        for lx in (-0.17, 0.17):
            for ly in (-0.17, 0.17):
                wood.box(w(lx, ly, 0.2), (0.05, 0.05, 0.4), WOOD_DARK, rot=(0, 0, yaw))
    deco.tube([(cx + 0.1, cy, z + 0.68), (cx + 0.1, cy, z + 0.82)], [0.09, 0.07], srgb("#F4EEE2"), segs=12)
    deco.ico((cx + 0.1, cy, z + 0.86), 0.035, srgb("#F4EEE2"), subdiv=1)
    deco.tube([(cx - 0.15, cy + 0.1, z + 0.68), (cx - 0.15, cy + 0.1, z + 0.75)], [0.05, 0.05], srgb("#F4EEE2"), segs=10)
    wood.to_object("Nook_Wood", col, [M.wood()], sharp_angle=40)
    deco.to_object("Nook_Teaset", col, [M.painted("SWG_WhitePaint", roughness=0.6, ao_strength=0.4)])
    fence = Geo()
    p0 = L.xy(L.NOOK["center"][0] - 1.4, L.NOOK["center"][1] + 0.6)
    p1 = L.xy(L.NOOK["center"][0] - 1.5, L.NOOK["center"][1] - 0.9)
    p2 = L.xy(L.NOOK["center"][0] - 0.3, L.NOOK["center"][1] - 1.5)
    wood_fence(fence, [p0, p1, p2], 990, post_gap=0.55, height=0.6)
    fence.to_object("Nook_Fence", col, [M.wood()], sharp_angle=40)


def build_islets(col):
    top, rock, foliage = Geo(), Geo(), Geo()
    for (v, u, z), size, seed in L.FLOATING_ISLETS:
        x, y = L.xy(v, u)
        IP.islet(top, rock, foliage, (x, y, z), size, seed)
    top.to_object("Complete_Islets_Top", col, [M.terrain("SWG_Lawn")])
    rock.to_object("Complete_Islets_Rock", col, [M.rock("SWG_Cliff")])
    foliage.to_object("Complete_Islets_Plants", col, [M.foliage()])


def build_completion(col):
    build_nook(col)
    build_islets(col)
    P.build_cliff_vines(col)
    P.build_final_flowers(col)
    P.build_meadow(col)


def build_butterflies(col):
    """Three butterflies, each its own object (ambient layers later)."""
    specs = [((5.4, 2.4, 1.2), "#F7A93A", "#FFD978", 0.3), ((-3.5, -2.0, 1.0), "#8DB6F0", "#E3EEFF", -0.6),
             ((0.3, 1.9, 1.15), "#F7A93A", "#FFD978", 1.2)]
    for k, ((v, u, lift), c1, c2, yaw) in enumerate(specs):
        g = Geo()
        x, y = L.xy(v, u)
        p = Vector((x, y, zg(x, y) + lift))
        fwd = Vector((math.cos(yaw), math.sin(yaw), 0))
        side = Vector((-fwd.y, fwd.x, 0))
        g.tube([p - fwd * 0.08, p + fwd * 0.08], [0.018, 0.012], srgb("#3A2A22"), segs=6)
        for sd in (-1, 1):
            for fwd_off, size, col_ in ((0.05, 0.19, c1), (-0.08, 0.14, c2)):
                q = p + side * sd * size * 0.9 + fwd * fwd_off + Vector((0, 0, 0.04))
                g.ico(q, size, srgb(col_), subdiv=2, scale=(0.85, 1.0, 0.12),
                      rot=(sd * 0.5, 0, yaw))
        g.to_object(f"Butterfly_{k + 1}", col, [M.painted("SWG_Butterfly", roughness=0.6, ao_strength=0.2)])
