"""Small house (stage 4), bridge (stage 5) and the larger cottage (stage 8).

Houses are modelled in local space with the front door facing local -Y and
placed with an object transform (layout.HOUSE_POS / HOUSE_ROT_Z)."""

import math

from . import layout as L
from . import materials as M
from . import terrain as T
from .common import Geo, Vector, clamp, fbm, mix_color, rng, srgb

PLASTER = srgb("#F3E6CB")
PLASTER_SHADE = srgb("#E3CFAA")
TIMBER = srgb("#6E4529")
WOOD = srgb("#A8703F")
WOOD_DARK = srgb("#7C4E2C")
DOOR = srgb("#86522E")
STONE = srgb("#BFB3A0")
STONE_DARK = srgb("#988B79")
TILE = [srgb("#C9583A"), srgb("#B84A32"), srgb("#D86A47"), srgb("#C25234")]
SHINGLE = [srgb("#9A6A45"), srgb("#8A5D3B"), srgb("#AE7A4F")]
SHUTTER = srgb("#5E93A6")
GLOW = srgb("#FFD27A")
GLOW_EDGE = srgb("#FFB24A")

# material slots used by house objects
S_PAINT, S_WOOD, S_STONE, S_GLOW, S_LEAF, S_TILE = range(6)


def _materials():
    return [M.painted("SW_Plaster", roughness=0.9, grain=0.05, grain_scale=14.0, edge_wear=0.08),
            M.wood(), M.rock("SW_Stone"), M.glass_glow(), M.foliage(), M.roof_tile()]


def _ground_z(pos, rot, half_w, half_d):
    zs = []
    for sx in (-1, 0, 1):
        for sy in (-1, 0, 1):
            c, s = math.cos(rot), math.sin(rot)
            lx, ly = sx * half_w, sy * half_d
            zs.append(T.height_at(pos[0] + lx * c - ly * s, pos[1] + lx * s + ly * c))
    return max(zs), min(zs)


def _stone_course(g, w, d, z0, z1, seed):
    """Foundation of rounded stones around a rectangle."""
    r = rng(seed)
    g.box((0, 0, (z0 + z1) / 2), (w, d, z1 - z0), STONE_DARK, bevel=0.05, mat=S_STONE)
    per = [((-w / 2, -d / 2), (w / 2, -d / 2)), ((w / 2, -d / 2), (w / 2, d / 2)),
           ((w / 2, d / 2), (-w / 2, d / 2)), ((-w / 2, d / 2), (-w / 2, -d / 2))]
    for (ax, ay), (bx, by) in per:
        length = math.hypot(bx - ax, by - ay)
        n = int(length / 0.32)
        for row, zz in enumerate((z0 + 0.12, z0 + 0.32)):
            if zz > z1:
                continue
            for i in range(n):
                t = (i + 0.5 + (0.5 if row else 0)) / n
                if t > 1:
                    continue
                x, y = ax + (bx - ax) * t, ay + (by - ay) * t
                col = mix_color(STONE, STONE_DARK, r.random() * 0.5)
                g.ico((x, y, zz), 0.17, col, subdiv=2, scale=(1.2, 1.0, 0.7),
                      rot=(0, 0, math.atan2(by - ay, bx - ax)), displace=0.15, seed=r.random(),
                      mat=S_STONE)


def _gable_roof_slabs(g, w, d, eave_z, rise, overhang, thick, color, mat):
    half = d / 2 + overhang
    ang = math.atan2(rise, d / 2)
    slope_len = half / math.cos(ang)
    for side in (-1, 1):
        cy = side * (half / 2)
        cz = eave_z + rise - (half / 2) * math.tan(ang) + thick * 0.5
        g.box((0, cy, cz), (w + overhang * 2, slope_len, thick), color,
              rot=(-side * ang, 0, 0), bevel=0.03, mat=mat)


def _gables(g, w, d, eave_z, rise, color):
    for sx in (-1, 1):
        x = sx * w / 2
        coords = [(x, -d / 2, eave_z), (x, d / 2, eave_z), (x, 0, eave_z + rise),
                  (x - sx * 0.12, -d / 2, eave_z), (x - sx * 0.12, d / 2, eave_z),
                  (x - sx * 0.12, 0, eave_z + rise)]
        faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        g.raw(coords, faces, color=color, mat=S_PAINT)


def _window(g, center, axis, w, h, shutters=True, box=None, seed=0):
    """axis: 'x' window on a face whose normal is +-Y (sign in center), 'y' on +-X."""
    cx, cy, cz = center
    if axis == "x":
        frame = (w + 0.12, 0.08, h + 0.12)
        pane = (w, 0.1, h)
        mull_v, mull_h = (0.05, 0.12, h), (w, 0.12, 0.05)
        off = (1, 0, 0)
    else:
        frame = (0.08, w + 0.12, h + 0.12)
        pane = (0.1, w, h)
        mull_v, mull_h = (0.12, 0.05, h), (0.12, w, 0.05)
        off = (0, 1, 0)
    g.box(center, frame, TIMBER, bevel=0.02, mat=S_WOOD)

    def glow_fn(v, c):
        d = max(abs(v.co.x - cx) * off[0] + abs(v.co.y - cy) * off[1], 0) / (w / 2)
        return mix_color(GLOW, GLOW_EDGE, clamp(d))

    g.box(center, pane, GLOW, mat=S_GLOW, color_fn=glow_fn)
    g.box(center, mull_v, TIMBER, mat=S_WOOD)
    g.box(center, mull_h, TIMBER, mat=S_WOOD)
    if shutters:
        for s in (-1, 1):
            p = (cx + off[0] * s * (w / 2 + 0.2), cy + off[1] * s * (w / 2 + 0.2), cz)
            size = (0.26, 0.06, h + 0.08) if axis == "x" else (0.06, 0.26, h + 0.08)
            g.box(p, size, SHUTTER, bevel=0.02, mat=S_WOOD)
    if box:
        r = rng(seed)
        bz = cz - h / 2 - 0.12
        size = (w + 0.2, 0.22, 0.16) if axis == "x" else (0.22, w + 0.2, 0.16)
        g.box((cx, cy, bz), size, WOOD_DARK, bevel=0.02, mat=S_WOOD)
        for i in range(9):
            t = (i / 8 - 0.5) * (w + 0.1)
            p = Vector((cx + off[0] * t, cy + off[1] * t, bz + 0.12))
            g.ico(p, 0.09, mix_color(srgb("#4F9A38"), srgb("#7FBE48"), r.random()), subdiv=1,
                  mat=S_LEAF)
            g.ico(p + Vector((0, 0, 0.07)), 0.045, srgb(r.choice(box)), subdiv=1, mat=S_PAINT)


def _vines(g, base, height, seed):
    r = rng(seed)
    b = Vector(base)
    for i in range(14):
        t = i / 13
        p = b + Vector((r.uniform(-0.08, 0.08), r.uniform(-0.08, 0.08), t * height))
        rad = 0.16 * (1.1 - 0.5 * t) * r.uniform(0.8, 1.2)
        col = mix_color(srgb("#3F7F2E"), srgb("#79B544"), r.random())
        g.ico(p, rad, col, subdiv=2, displace=0.15, seed=seed + i, mat=S_LEAF)
        if r.random() < 0.35:
            g.ico(p + Vector((rad * 0.7, -rad * 0.5, 0.03)), 0.04, srgb("#F6A9C4"), subdiv=1,
                  mat=S_PAINT)


# ------------------------------------------------------------------ small house


def build_small_house(col):
    w, d, h = 2.0, 1.7, 1.15
    pos, rot = L.HOUSE_POS, L.HOUSE_ROT_Z
    ztop, zlow = _ground_z(pos, rot, w / 2 + 0.2, d / 2 + 0.2)
    g = Geo()
    base_h = 0.25
    _stone_course(g, w + 0.2, d + 0.2, zlow - ztop - 0.3, base_h, 41)
    g.box((0, 0, base_h + h / 2), (w, d, h), PLASTER, bevel=0.04, mat=S_PAINT,
          color_fn=lambda v, c: mix_color(PLASTER_SHADE, c, clamp((v.co.z - base_h) / h + 0.3)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            g.box((sx * w / 2, sy * d / 2, base_h + h / 2), (0.14, 0.14, h + 0.02), TIMBER,
                  bevel=0.02, mat=S_WOOD)
    eave = base_h + h
    rise = 0.85
    _gables(g, w, d, eave, rise, PLASTER)
    # wooden shingle roof
    r = rng(42)
    half = d / 2 + 0.28
    ang = math.atan2(rise, d / 2)
    rows, n = 6, 9
    for side in (-1, 1):
        for row in range(rows):
            t = (row + 0.5) / rows
            yy = side * half * (1 - t)
            zz = eave + rise - (half * (1 - t)) * math.tan(ang) + 0.1
            for i in range(n + (row % 2)):
                x = -w / 2 - 0.25 + (i + (0.0 if row % 2 else 0.5)) * (w + 0.5) / n
                if abs(x) > w / 2 + 0.3:
                    continue
                g.box((x, yy, zz), ((w + 0.5) / n * 0.96, half / rows * 1.35, 0.06),
                      r.choice(SHINGLE), rot=(-side * (ang + 0.06), 0, r.uniform(-0.03, 0.03)),
                      bevel=0.015, mat=S_WOOD)
    g.tube([(-w / 2 - 0.3, 0, eave + rise + 0.1), (w / 2 + 0.3, 0, eave + rise + 0.1)],
           [0.07, 0.07], WOOD_DARK, segs=8, mat=S_WOOD)
    # door and window on the front (-Y)
    g.box((0.35, -d / 2 - 0.03, base_h + 0.45), (0.5, 0.08, 0.9), DOOR, bevel=0.02, mat=S_WOOD)
    g.ico((0.52, -d / 2 - 0.09, base_h + 0.45), 0.03, srgb("#E8C46A"), subdiv=1, mat=S_PAINT)
    _window(g, (-0.45, -d / 2 - 0.02, base_h + 0.62), "x", 0.42, 0.42, shutters=False)
    _window(g, (-w / 2 - 0.02, 0.0, base_h + 0.62), "y", 0.4, 0.4, shutters=False)
    g.box((0.35, -d / 2 - 0.3, base_h - 0.07), (0.7, 0.4, 0.14), STONE, bevel=0.04, mat=S_STONE)
    ob = g.to_object("SmallHouse", col, _materials(), smooth=True, sharp_angle=35)
    ob.location = (pos[0], pos[1], ztop)
    ob.rotation_euler = (0, 0, rot)
    return ob


# ------------------------------------------------------------------ large cottage


def build_large_house(col):
    w, d, h = 3.1, 2.5, 1.7
    pos, rot = L.HOUSE_POS, L.HOUSE_ROT_Z
    ztop, zlow = _ground_z(pos, rot, w / 2 + 0.3, d / 2 + 0.3)
    g = Geo()
    base_h = 0.4
    _stone_course(g, w + 0.24, d + 0.24, zlow - ztop - 0.3, base_h, 81)
    g.box((0, 0, base_h + h / 2), (w, d, h), PLASTER, bevel=0.05, mat=S_PAINT,
          color_fn=lambda v, c: mix_color(PLASTER_SHADE, c, clamp((v.co.z - base_h) / h + 0.25)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            g.box((sx * w / 2, sy * d / 2, base_h + h / 2), (0.18, 0.18, h + 0.04), TIMBER,
                  bevel=0.025, mat=S_WOOD)
    for zz in (base_h + 0.05, base_h + h - 0.04):
        for sy in (-1, 1):
            g.box((0, sy * (d / 2 + 0.02), zz), (w, 0.1, 0.12), TIMBER, bevel=0.02, mat=S_WOOD)
        for sx in (-1, 1):
            g.box((sx * (w / 2 + 0.02), 0, zz), (0.1, d, 0.12), TIMBER, bevel=0.02, mat=S_WOOD)
    eave = base_h + h
    rise = 1.45
    _gables(g, w, d, eave, rise, PLASTER)
    # gable timber (visible -X end) and round attic window
    for sx in (-1, 1):
        x = sx * (w / 2 + 0.03)
        g.box((x, 0, eave + rise * 0.45), (0.08, 0.1, rise * 0.9), TIMBER, mat=S_WOOD)
    _window(g, (-w / 2 - 0.04, 0.0, eave + 0.55), "y", 0.36, 0.36, shutters=False)
    # terracotta tile roof: overlapping rows of rounded tiles
    r = rng(82)
    over = 0.34
    half = d / 2 + over
    ang = math.atan2(rise, d / 2)
    slope = half / math.cos(ang)
    rows, n = 8, 13
    _gable_roof_slabs(g, w + 0.1, d, eave, rise, over - 0.04, 0.1, srgb("#8E3C2A"), S_PAINT)
    for side in (-1, 1):
        for row in range(rows):
            t = (row + 0.5) / rows
            dist = half * (1 - t)
            yy = side * dist
            zz = eave + rise - dist * math.tan(ang) + 0.11
            for i in range(n + 1):
                x = -w / 2 - over + (i + (0.5 if row % 2 else 0.0)) * (w + 2 * over) / n
                if abs(x) > w / 2 + over:
                    continue
                tile = mix_color(r.choice(TILE), srgb("#E9906A"), 0.25 * (1 - t))
                g.box((x, yy, zz), ((w + 2 * over) / n * 0.92, slope / rows * 1.3, 0.08), tile,
                      rot=(-side * (ang + 0.07), 0, r.uniform(-0.03, 0.03)), bevel=0.03,
                      mat=S_TILE)
    g.tube([(-w / 2 - over - 0.05, 0, eave + rise + 0.14), (w / 2 + over + 0.05, 0, eave + rise + 0.14)],
           [0.11, 0.11], srgb("#9C432E"), segs=10, mat=S_TILE)
    # chimney (back right) with cap
    cx, cy = w * 0.28, d * 0.2
    cz0 = eave + rise - cy * math.tan(ang) - 0.2
    g.box((cx, cy, cz0 + 0.65), (0.5, 0.5, 1.3), STONE, bevel=0.04, mat=S_STONE,
          color_fn=lambda v, c: mix_color(STONE_DARK, c, 0.5 + 0.5 * fbm(v.co.x * 9, v.co.y * 9, v.co.z * 9, 2, 5.0)))
    g.box((cx, cy, cz0 + 1.33), (0.62, 0.62, 0.12), STONE_DARK, bevel=0.03, mat=S_STONE)
    # front (-Y): arched door, two windows with shutters and flower boxes
    dz = base_h + 0.62
    g.box((0, -d / 2 - 0.04, dz), (0.7, 0.1, 1.15), DOOR, bevel=0.03, mat=S_WOOD)
    g.tube([(0, -d / 2 - 0.09, dz + 0.57), (0, -d / 2 + 0.01, dz + 0.57)], [0.35, 0.35], DOOR,
           segs=16, mat=S_WOOD)
    g.box((0, -d / 2 - 0.02, dz + 0.1), (0.9, 0.08, 1.45), TIMBER, bevel=0.02, mat=S_WOOD)
    for i in range(3):
        g.box((-0.18 + i * 0.18, -d / 2 - 0.1, dz), (0.025, 0.02, 1.1), WOOD_DARK, mat=S_WOOD)
    g.ico((0.22, -d / 2 - 0.12, dz), 0.04, srgb("#E8C46A"), subdiv=1, mat=S_PAINT)
    for k, x in enumerate((-0.95, 0.95)):
        _window(g, (x, -d / 2 - 0.03, base_h + 1.0), "x", 0.55, 0.6, shutters=True,
                box=["#F6A9C4", "#FFFFFF", "#F7D45A", "#E8666A"], seed=90 + k)
    # side windows on the visible gable wall (-X)
    _window(g, (-w / 2 - 0.03, -0.45, base_h + 1.0), "y", 0.5, 0.55, shutters=True,
            box=["#B9A2E8", "#FFFFFF", "#F6A9C4"], seed=95)
    # stone steps and a porch lantern
    for i, (sz, yo) in enumerate(((0.16, 0.55), (0.32, 0.3))):
        g.box((0, -d / 2 - yo, base_h - sz / 2 - 0.02 * i), (1.0 - 0.1 * i, 0.32, sz), STONE,
              bevel=0.04, mat=S_STONE)
    g.box((0.62, -d / 2 - 0.08, base_h + 1.3), (0.06, 0.18, 0.06), TIMBER, mat=S_WOOD)
    g.box((0.62, -d / 2 - 0.2, base_h + 1.17), (0.16, 0.16, 0.22), GLOW, mat=S_GLOW)
    g.box((0.62, -d / 2 - 0.2, base_h + 1.31), (0.22, 0.22, 0.06), TIMBER, mat=S_WOOD)
    _vines(g, (-w / 2 - 0.05, -d / 2 - 0.05, base_h), h + 0.3, 97)
    ob = g.to_object("LargeHouse", col, _materials(), smooth=True, sharp_angle=35)
    ob.location = (pos[0], pos[1], ztop)
    ob.rotation_euler = (0, 0, rot)
    return ob


# ------------------------------------------------------------------ bridge


def build_bridge(col):
    c = Vector((L.BRIDGE_CENTER[0], L.BRIDGE_CENTER[1], 0))
    _, s, _ = T.STREAM.nearest(c.x, c.y)
    _, tan = T.STREAM.smooth_point(s, 0.6)
    axis = Vector((tan.y, -tan.x, 0)).normalized()  # across the stream
    if axis.x < 0:
        axis = -axis
    side = Vector((-axis.y, axis.x, 0))
    half = L.BRIDGE_LENGTH / 2
    a_end, b_end = c - axis * half, c + axis * half
    za = T.height_at(a_end.x, a_end.y) + 0.06
    zb = T.height_at(b_end.x, b_end.y) + 0.06
    rise = 0.55
    yaw = math.atan2(axis.y, axis.x)
    g = Geo()
    r = rng(55)

    def arc(t, lift=0.0, lateral=0.0):
        p = a_end.lerp(b_end, t) + side * lateral
        z = za + (zb - za) * t + rise * math.sin(math.pi * t) + lift
        return Vector((p.x, p.y, z))

    n = 16
    for i in range(n):
        t = (i + 0.5) / n
        p = arc(t)
        dz = (arc(t + 0.01).z - arc(t - 0.01).z) / (0.02 * L.BRIDGE_LENGTH)
        g.box(p, (L.BRIDGE_LENGTH / n * 0.88, 1.2, 0.08), mix_color(WOOD, WOOD_DARK, r.random() * 0.4),
              rot=(0, -math.atan(dz), yaw), bevel=0.02)
    for lat in (-0.52, 0.52):
        g.tube([arc(t / 12, -0.1, lat) for t in range(13)], [0.07] * 13, WOOD_DARK, segs=8)
    for lat in (-0.56, 0.56):
        posts = [0.0, 0.25, 0.5, 0.75, 1.0]
        for t in posts:
            p = arc(t, 0.0, lat)
            g.box(p + Vector((0, 0, 0.3)), (0.11, 0.11, 0.72), WOOD_DARK, rot=(0, 0, yaw),
                  bevel=0.02)
            g.box(p + Vector((0, 0, 0.68)), (0.15, 0.15, 0.05), WOOD, rot=(0, 0, yaw), bevel=0.015)
        g.tube([arc(t / 16, 0.62, lat) for t in range(17)], [0.045] * 17, WOOD, segs=8)
        g.tube([arc(t / 16, 0.33, lat) for t in range(17)], [0.03] * 17, WOOD_DARK, segs=6)
    return g.to_object("Bridge", col, [M.wood()], smooth=True, sharp_angle=35)
