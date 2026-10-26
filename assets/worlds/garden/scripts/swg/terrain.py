"""Base garden (stage 0): rounded floating terrain with three lawn terraces
held by dry-stone retaining walls, a rounded grass lip, the rock underside
with stone shelves, base rocks, grass tufts and clouds.

height_at(x, y) is the one terrain height every other module uses to sit
objects on the ground. The Garden has no water at stage 0: the fountain,
rill, pond, stream and waterfall all arrive as their own objects later, so
the terrain never changes between stages. The walls leave two gaps (the
future stairs and the future cascade) that read as grassy ramps until then.
"""

import math

from swi import materials as M
from swi import rig
from swi.common import (TAU, Geo, Vector, clamp, fbm, metaball_object, mix_color, rng,
                        scale_color, smoothstep, srgb)
from swi.terrain import Polyline, add_tuft, cloud_color_fn, cloud_elements, stone_stack, _h

from . import layout as L

SQ2 = math.sqrt(2.0)

# ------------------------------------------------------------------ footprint


def boundary_radius(theta):
    c, s = abs(math.cos(theta)), abs(math.sin(theta))
    n = L.SQUARENESS
    r = L.RADIUS / (c ** n + s ** n) ** (1.0 / n)
    wob = 0.06 * fbm(math.cos(theta) * 1.3, math.sin(theta) * 1.3, 0.0, 3, seed=51.0)
    wob += 0.022 * fbm(math.cos(theta) * 4.5, math.sin(theta) * 4.5, 0.0, 2, seed=52.0)
    return r * (1.0 + wob)


def radial_t(x, y):
    return math.hypot(x, y) / boundary_radius(math.atan2(y, x))


# ------------------------------------------------------------------ heights


def terrace_u(x, y):
    """Depth coordinate of the terraces; the v**2 term bends each step back at
    the sides so the upper terraces read as rounded garden plateaus."""
    v, u = L.vu(x, y)
    return u - L.STEP_CURVE * v * v + 0.8 * fbm(x * 0.11, y * 0.11, 0.0, 3, seed=53.0)


def height_at(x, y):
    u = terrace_u(x, y)
    z0, z1, z2 = L.LEVEL_Z
    a, b = L.STEP_U
    k = L.STEP_SOFTNESS
    z = z0 + (z1 - z0) * smoothstep(a - k, a + k, u) + (z2 - z1) * smoothstep(b - k, b + k, u)
    z += 0.06 * fbm(x * 0.4, y * 0.4, 0.0, 3, seed=54.0)
    z -= 0.16 * smoothstep(0.9, 1.0, radial_t(x, y))
    return z


def height_vu(v, u):
    return height_at(*L.xy(v, u))


def level_of(x, y):
    u = terrace_u(x, y)
    return 0 if u < L.STEP_U[0] else 1 if u < L.STEP_U[1] else 2


def steep(x, y, reach=0.15, limit=0.07):
    z = height_at(x, y)
    return any(abs(height_at(x + dx, y + dy) - z) > limit
               for dx, dy in ((reach, 0), (-reach, 0), (0, reach), (0, -reach)))


def downhill(x, y, e=0.05):
    """Unit ground vector from a terrace step toward the lower terrace."""
    g = Vector((terrace_u(x + e, y) - terrace_u(x - e, y), terrace_u(x, y + e) - terrace_u(x, y - e), 0.0))
    return -g.normalized()


def polyline_vu(pts):
    return Polyline([L.xy(v, u) for v, u in pts])


# ------------------------------------------------------------------ palette

GRASS_DARK = srgb("#4A8C30")
GRASS = srgb("#6DB93C")
GRASS_SUN = srgb("#B5DA52")
GRASS_LIP = srgb("#43802B")
SOIL = srgb("#8A6247")
ROCK_A = srgb("#D2B08A")
ROCK_B = srgb("#A58063")
ROCK_LIGHT = srgb("#E8CFAA")
ROCK_DEEP = srgb("#6F5347")
MOSS = srgb("#5E9A38")
WALL = [srgb("#D3C4A8"), srgb("#C2B194"), srgb("#DCD0B6"), srgb("#B8A68A"), srgb("#CBB79A")]


def grass_color(x, y):
    n1 = fbm(x * 0.14, y * 0.14, 0.0, 3, seed=57.0)
    n2 = fbm(x * 0.85, y * 0.85, 0.0, 2, seed=58.0)
    c = mix_color(GRASS_DARK, GRASS, smoothstep(-0.4, 0.2, n1))
    return mix_color(c, GRASS_SUN, 0.38 * smoothstep(0.0, 0.5, n2))


def rock_color(z, theta, depth_q=0.0):
    ca, sa = math.cos(theta), math.sin(theta)
    column = fbm(ca * 6.0, sa * 6.0, z * 0.05, 3, 59.0)
    band = z * 0.8 + 0.5 * fbm(ca * 2.0, sa * 2.0, z * 0.2, 2, 59.5)
    f = band - math.floor(band)
    c = mix_color(ROCK_A, ROCK_B, smoothstep(-0.3, 0.35, column))
    c = mix_color(c, ROCK_LIGHT, 0.25 * smoothstep(0.75, 0.95, f))
    return mix_color(c, ROCK_DEEP, clamp(depth_q) ** 0.9 * 0.7)


# ------------------------------------------------------------------ reserved ground

_reserved = []


def _reserved_shapes():
    if _reserved:
        return _reserved
    lines = [(polyline_vu(L.MAIN_PATH), L.PATH_HALF_WIDTH + 0.35),
             (polyline_vu(L.RILL), L.RILL_HALF_WIDTH + 0.45),
             (polyline_vu(L.STREAM), L.STREAM_HALF_WIDTH + 0.45)]
    circles = [(L.POND, L.POND_RADIUS + 0.7), (L.FOUNTAIN, L.FOUNTAIN_RADIUS + 0.5),
               (L.GREENHOUSE["center"], 2.6), (L.VEG_BEDS["center"], 2.2),
               (L.SEEDLINGS["center"], 1.95), (L.FLOWER_BED["center"], 1.5),
               (L.PERGOLA["center"], 1.7), (L.NOOK["center"], 1.1),
               (L.BLOSSOM_TREE["pos"], 0.8), (L.BENCH_POND["pos"], 0.8), (L.BIRDBATH, 0.5)]
    circles += [(p, 0.45) for p in L.LANTERNS + L.POTS]
    circles += [(t[1], 0.8) for t in L.FINAL_TREES]
    _reserved.extend([lines, [(Vector((*L.xy(*c), 0.0)), r) for c, r in circles]])
    return _reserved


def reserved(x, y, margin=0.0):
    """True where later stages need the ground clear."""
    lines, circles = _reserved_shapes()
    for pl, w in lines:
        if pl.nearest(x, y)[0] < w + margin:
            return True
    for c, r in circles:
        if math.hypot(x - c.x, y - c.y) < r + margin:
            return True
    return False


# ------------------------------------------------------------------ lawn top

N_ANG = 420
N_RING = 115


def build_top(col):
    geo = Geo()
    bm, cl = geo.bm, geo.col
    center = bm.verts.new((0.0, 0.0, height_at(0.0, 0.0)))
    rings = []
    rb = [boundary_radius(TAU * i / N_ANG) for i in range(N_ANG)]
    for k in range(1, N_RING + 1):
        t = k / N_RING
        ring = []
        for i in range(N_ANG):
            a = TAU * i / N_ANG
            x, y = math.cos(a) * rb[i] * t, math.sin(a) * rb[i] * t
            ring.append(bm.verts.new((x, y, height_at(x, y))))
        rings.append(ring)
    lip_profile = [(0.11, -0.07), (0.12, -0.2), (0.07, -0.34), (-0.05, -0.46)]
    edge_z = [rings[-1][i].co.z for i in range(N_ANG)]
    for dr, dz in lip_profile:
        ring = []
        for i in range(N_ANG):
            a = TAU * i / N_ANG
            r = rb[i] + dr
            ring.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, edge_z[i] + dz)))
        rings.append(ring)
    for i in range(N_ANG):
        bm.faces.new((center, rings[0][i], rings[0][(i + 1) % N_ANG]))
    for k in range(len(rings) - 1):
        for i in range(N_ANG):
            i2 = (i + 1) % N_ANG
            bm.faces.new((rings[k][i], rings[k + 1][i], rings[k + 1][i2], rings[k][i2]))
    bm.normal_update()
    for k, ring in enumerate([[center]] + rings):
        lip = k > N_RING
        for v in ring:
            x, y, z = v.co
            c = grass_color(x, y)
            slope = smoothstep(0.9, 0.6, v.normal.z)
            if slope > 0 and not lip:
                soil = mix_color(SOIL, MOSS, 0.45 * smoothstep(0.1, 0.5, fbm(x * 2, y * 2, 0, 2, 60.0)))
                c = mix_color(c, soil, slope * 0.85)
            if lip:
                c = mix_color(c, GRASS_LIP, 0.35 + 0.15 * (k - N_RING))
            v[cl] = c
    return geo.to_object("Garden_Top", col, [M.terrain("SWG_Lawn")])


# ------------------------------------------------------------------ retaining walls


_step_lines = {}


def step_line(k):
    """Points (x, y) along terrace step k, left to right."""
    if k not in _step_lines:
        _step_lines[k] = _step_line(k)
    return [p.copy() for p in _step_lines[k]]


def _step_line(k):
    target = L.STEP_U[k]
    pts = []
    v = -12.0
    while v <= 12.0:
        lo, hi = -12.0, 12.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if terrace_u(*L.xy(v, mid)) < target:
                lo = mid
            else:
                hi = mid
        x, y = L.xy(v, lo)
        if radial_t(x, y) < 0.975:
            pts.append(Vector((x, y, 0.0)))
        v += 0.04
    return pts


def wall_gaps():
    """Where later stages cross a wall: the stairs of the main path and the
    rill cascade. Returned as polylines with a half-width."""
    return [(polyline_vu(L.MAIN_PATH), L.PATH_HALF_WIDTH + 0.08),
            (polyline_vu(L.RILL), L.RILL_HALF_WIDTH + 0.32)]


def _in_gap(p, gaps):
    return any(pl.nearest(p.x, p.y)[0] < w for pl, w in gaps)


def build_walls(col):
    """Dry-stone retaining walls: rounded blocks in offset courses along each
    terrace step, mossy on top, with a gap where the stairs and the cascade
    will cross."""
    geo = Geo()
    r = rng(70)
    gaps = wall_gaps()
    for k in range(2):
        pts = step_line(k)
        # resample by arc length
        cum = [0.0]
        for i in range(1, len(pts)):
            cum.append(cum[-1] + (pts[i] - pts[i - 1]).length)
        total = cum[-1]

        def at(s):
            s = clamp(s, 0.0, total)
            for i in range(1, len(pts)):
                if cum[i] >= s:
                    t = (s - cum[i - 1]) / max(1e-6, cum[i] - cum[i - 1])
                    return pts[i - 1].lerp(pts[i], t), (pts[i] - pts[i - 1]).normalized()
            return pts[-1], (pts[-1] - pts[-2]).normalized()

        for course in range(3):
            s = r.uniform(0.0, 0.3) + (0.3 if course % 2 else 0.0)
            while s < total:
                length = r.uniform(0.5, 0.78)
                p, t = at(s + length / 2)
                s += length + 0.02
                down = Vector((t.y, -t.x, 0.0))  # toward the lower terrace
                if terrace_u(p.x + down.x, p.y + down.y) > terrace_u(p.x, p.y):
                    down = -down
                if _in_gap(p, gaps):
                    continue
                zt = height_at(p.x - down.x * 0.6, p.y - down.y * 0.6)
                zb = height_at(p.x + down.x * 0.7, p.y + down.y * 0.7)
                hgt = (zt - zb + 0.2) / 3.0
                z = zb - 0.1 + hgt * (course + 0.5)
                face = p + down * (0.12 - course * 0.05)
                c = face - down * L.WALL_THICK / 2
                yaw = math.atan2(t.y, t.x) + r.uniform(-0.05, 0.05)
                base = r.choice(WALL)
                top_course = course == 2

                def col_fn(v, cc, z=z, hgt=hgt, top_course=top_course):
                    q = clamp((v.co.z - (z - hgt / 2)) / hgt)
                    cc = scale_color(cc, 0.82 + 0.26 * q)
                    if top_course:
                        m = smoothstep(0.55, 1.0, q) * (0.5 + 0.5 * fbm(v.co.x * 3, v.co.y * 3, 0, 2, 71.0))
                        cc = mix_color(cc, MOSS, clamp(m))
                    return cc

                geo.box((c.x, c.y, z), (length * 0.96, L.WALL_THICK * r.uniform(0.9, 1.05),
                                        hgt * r.uniform(0.9, 1.0)), base, rot=(0, 0, yaw),
                        bevel=min(0.09, hgt * 0.3), bevel_segs=2, color_fn=col_fn)
    return geo.to_object("Garden_Walls", col, [M.rock("SWG_WallStone")], sharp_angle=40)


# ------------------------------------------------------------------ underside


def cliff_shape(a, rb_i):
    ca, sa = math.cos(a), math.sin(a)
    ztop = height_at(ca * rb_i, sa * rb_i) - 0.42
    wall = 1.8 + 0.6 * fbm(ca * 2.2, sa * 2.2, 0.0, 2, seed=61.0)
    depth = wall + 10.0 + 2.0 * fbm(ca * 1.3, sa * 1.3, 0.0, 3, seed=62.0)
    depth += 1.1 * max(0.0, fbm(ca * 2.6, sa * 2.6, 0.0, 2, seed=63.0))
    return ztop, wall, depth


COLUMN_W = 7


def build_cliff(col):
    """Rock underside: stacked stone columns tapering to a rounded point, with
    moss draping from the grass lip (same construction as the Island's, on
    the Garden's own rounder footprint and warmer stone)."""
    geo = Geo()
    bm, cl = geo.bm, geo.col
    rows = 120
    rb = [boundary_radius(TAU * i / N_ANG) for i in range(N_ANG)]
    grid, bottoms, shapes = [], [], []
    for i in range(N_ANG):
        a = TAU * i / N_ANG
        ca, sa = math.cos(a), math.sin(a)
        ztop, wall, depth = cliff_shape(a, rb[i])
        shapes.append((ztop, wall, depth))
        col_list = []
        for j in range(rows + 1):
            q = j / rows
            d = q * depth
            z = ztop - d
            if d <= wall:
                w = d / wall
                prof = 1.0 - 0.05 * w + 0.025 * math.sin(w * math.pi)
                amp = 1.0
            else:
                p = (d - wall) / (depth - wall)
                prof = 0.95 * (1.0 - p ** 1.25) ** 0.8
                amp = 1.0 - 0.5 * p
            prof = max(prof, 0.025)
            ci = i // COLUMN_W
            band_h = 0.65 + 0.35 * _h(ci, 12)
            b = math.floor((d + _h(ci, 13) * band_h) / band_h)
            block = 0.14 + 0.28 * _h(ci, 11) + 0.22 * _h(ci, 110 + b)
            facet = 0.07 * ((i % COLUMN_W) / COLUMN_W - 0.5) * (1 if _h(ci, 14) > 0.5 else -1)
            carve = amp * (block + facet) * min(1.0, prof * 5)
            rr = max(rb[i] * prof - carve * smoothstep(0.0, 0.5, d), 0.05)
            col_list.append(bm.verts.new((ca * rr, sa * rr, z)))
        grid.append(col_list)
        bottoms.append(col_list[-1].co.z)
    tip = bm.verts.new((0.0, 0.0, min(bottoms) - 0.2))
    for i in range(N_ANG):
        i2 = (i + 1) % N_ANG
        for j in range(rows):
            bm.faces.new((grid[i][j], grid[i2][j], grid[i2][j + 1], grid[i][j + 1]))
        bm.faces.new((grid[i][rows], grid[i2][rows], tip))
    bm.normal_update()
    for i in range(N_ANG):
        a = TAU * i / N_ANG
        ca, sa = math.cos(a), math.sin(a)
        ztop, wall, depth = shapes[i]
        drip = 0.55 + 1.7 * smoothstep(0.05, 0.6, fbm(ca * 9, sa * 9, 0.0, 2, 66.0))
        for v in grid[i]:
            below = ztop - v.co.z
            q = clamp((below - wall * 0.6) / (depth - wall * 0.6))
            c = rock_color(v.co.z, a, q)
            m = smoothstep(drip, drip * 0.35, below)
            m *= 0.75 + 0.25 * fbm(ca * 20, sa * 20, v.co.z * 2, 2, 67.0)
            c = mix_color(c, MOSS, clamp(m))
            tone = 0.9 + 0.2 * _h(i // COLUMN_W, 17)
            v[cl] = scale_color(c, tone * (1.0 + 0.22 * max(0.0, v.normal.z)))
    tip[cl] = ROCK_DEEP
    grid_co = [[v.co.copy() for v in column] for column in grid]
    ob = geo.to_object("Garden_Underside", col, [M.rock("SWG_Cliff")], sharp_angle=38)
    _underside_rocks(col, grid_co, rows, shapes)
    return ob


def _underside_rocks(col, grid, rows, shapes):
    geo = Geo()
    r = rng(2026)
    n_ang = len(grid)
    for k in range(70):
        i = r.randrange(n_ang)
        a = TAU * i / n_ang
        ztop, wall, depth = shapes[i]
        j = int(rows * r.uniform(0.12, 0.7) ** 0.85)
        v = grid[i][j]
        below = ztop - v.z
        horiz = Vector((v.x, v.y, 0.0))
        rad = horiz.length
        if rad < 1.5:
            continue
        out = horiz / rad
        size = r.uniform(0.9, 1.5) * (0.5 + 0.5 * clamp(rad / 9.0))
        q = clamp((below - wall * 0.6) / (depth - wall * 0.6))
        base = scale_color(rock_color(v.z, a + r.uniform(-0.2, 0.2), q), r.uniform(0.92, 1.06))
        light = mix_color(base, ROCK_LIGHT, 0.45)
        if below < 1.5:
            light = mix_color(light, MOSS, 0.5)
        inset = 0.95 if below < 1.8 else 0.7
        stone_stack(geo, v - out * size * inset + Vector((0, 0, size * 0.25)), out, size,
                    r.randint(1, 3), base, 7000 + k, light=light)
    return geo.to_object("Garden_Underside_Rocks", col, [M.rock("SWG_Cliff")], sharp_angle=30)


# ------------------------------------------------------------------ rocks, tufts, fringe

ROCK_GREY = srgb("#C2B8A8")
ROCK_WARM = srgb("#D5BD98")


def add_rock(geo, pos, size, seed, moss=0.6, squash=0.62, sink=0.35):
    r = rng(seed)
    base = mix_color(ROCK_GREY, ROCK_WARM, r.random())
    p = Vector(pos)

    def col_fn(v, c):
        n = (v.co - p).normalized()
        mz = smoothstep(0.35, 0.8, n.z) * moss
        mz *= smoothstep(-0.3, 0.2, fbm(v.co.x * 3, v.co.y * 3, v.co.z * 3, 2, seed))
        return scale_color(mix_color(c, MOSS, mz), 0.82 + 0.2 * clamp(n.z * 0.5 + 0.5))

    geo.ico(p + Vector((0, 0, size * squash * (1 - sink))), size, base, subdiv=2,
            scale=(1.0, r.uniform(0.75, 1.0), squash), rot=(0, 0, r.uniform(0, TAU)),
            displace=0.3, freq=1.1, seed=seed * 0.37, color_fn=col_fn)


def build_rocks(col):
    geo = Geo()
    r = rng(550)
    placed = []
    tries = 0
    while len(placed) < 18 and tries < 5000:
        tries += 1
        x, y = r.uniform(-10.5, 10.5), r.uniform(-10.5, 10.5)
        t = radial_t(x, y)
        if t > 0.94 or t < 0.8 or reserved(x, y, 0.2) or steep(x, y, 0.4, 0.15):
            continue
        if any(math.hypot(x - a, y - b) < 1.6 for a, b, _ in placed):
            continue
        size = r.uniform(0.22, 0.42)
        placed.append((x, y, size))
        add_rock(geo, (x, y, height_at(x, y)), size, 560 + len(placed))
        if r.random() < 0.6:
            a = r.uniform(0, TAU)
            x2, y2 = x + math.cos(a) * size * 1.3, y + math.sin(a) * size * 1.3
            add_rock(geo, (x2, y2, height_at(x2, y2)), size * 0.5, 660 + len(placed))
    return geo.to_object("Rocks_Base", col, [M.rock("SWG_Rock")], sharp_angle=34)


def build_tufts(col, count=240, seed=3000, name="Grass_Tufts_Base"):
    geo = Geo()
    r = rng(seed)
    n = tries = 0
    while n < count and tries < 20000:
        tries += 1
        x, y = r.uniform(-10.5, 10.5), r.uniform(-10.5, 10.5)
        if radial_t(x, y) > 0.97 or reserved(x, y, -0.2) or steep(x, y, 0.3, 0.12):
            continue
        if fbm(x * 0.5, y * 0.5, 0, 2, 69.0) < -0.05 and radial_t(x, y) < 0.85:
            continue
        add_tuft(geo, (x, y, height_at(x, y)), seed + n)
        n += 1
    return geo.to_object(name, col, [M.foliage()])


def build_fringe(col):
    """Tufts along the rim and along the wall tops; moss tongues over the lip."""
    tufts, moss = Geo(), Geo()
    r = rng(3500)
    n = 260
    for i in range(n):
        a = TAU * (i + r.uniform(-0.3, 0.3)) / n
        rb = boundary_radius(a)
        x, y = math.cos(a) * rb * 0.985, math.sin(a) * rb * 0.985
        if reserved(x, y, -0.3):
            continue
        if r.random() < 0.35:
            add_tuft(tufts, (x, y, height_at(x, y)), 3600 + i, height=r.uniform(0.25, 0.4))
        if r.random() < 0.16:
            ex, ey = math.cos(a) * (rb + 0.1), math.sin(a) * (rb + 0.1)
            z = height_at(math.cos(a) * rb, math.sin(a) * rb)
            length = r.uniform(0.3, 0.65)
            col_m = mix_color(GRASS_LIP, MOSS, r.random())
            moss.ico((ex - math.cos(a) * 0.06, ey - math.sin(a) * 0.06, z - 0.2 - length * 0.45),
                     0.2, col_m, subdiv=2, scale=(0.45, 1.6, length / 0.4), rot=(0, 0, a),
                     displace=0.25, seed=i,
                     color_fn=lambda v, c, z=z, length=length: scale_color(
                         c, 0.75 + 0.35 * clamp((v.co.z - (z - 0.2 - length)) / length)))
    gaps = wall_gaps()
    for k in range(2):
        for i, p in enumerate(step_line(k)[::9]):
            if _in_gap(p, gaps) or r.random() < 0.45:
                continue
            q = p - downhill(p.x, p.y) * r.uniform(0.5, 0.75)  # just behind the wall top
            add_tuft(tufts, (q.x, q.y, height_at(q.x, q.y)), 3900 + k * 500 + i,
                     height=r.uniform(0.26, 0.4))
    tufts.to_object("Grass_Fringe", col, [M.foliage()])
    moss.to_object("Moss_Overhang", col, [M.foliage()])


# ------------------------------------------------------------------ clouds


def build_clouds(col):
    """Three soft clouds, each its own object (ambient drift later). The first
    sits where the stage 6 waterfall will fall into it."""
    from . import water  # noqa: PLC0415  (water builds on the terrain module)
    fb = Vector(water.fall_bottom())
    specs = [(fb + Vector((0.2, -0.3, 0.9)), 1.35, 351)]
    specs += [(rig.screen_to_world(sx, sy, depth), size, seed)
              for (sx, sy, depth), size, seed in L.CLOUDS]
    out = []
    for k, (center, size, seed) in enumerate(specs):
        elements = cloud_elements(center, size, seed)
        ob = metaball_object(f"Cloud_{k + 1}", col, elements,
                             [M.soft_cloud("SW_Cloud", emission=8.0, opacity=0.95, edge=0.4)],
                             cloud_color_fn([(Vector(center), size)]), resolution=0.1)
        ob.visible_shadow = False
        out.append(ob)
    return out


def build(col):
    build_top(col)
    build_walls(col)
    build_fringe(col)
    build_cliff(col)
    build_rocks(col)
    build_tufts(col)
    build_clouds(col)
