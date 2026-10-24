"""Base island (stage 0): terraced grass top, rounded grass lip, rock underside,
stream with cascades, waterfall, base rocks, grass tufts and clouds.

height_at(x, y) is the one terrain height function every other module uses to
sit objects on the ground, so later stages never move the terrain.
"""

import math

from . import layout as L
from . import materials as M
from . import rig
from .common import (TAU, Geo, Vector, clamp, fbm, flow_uv, lerp, metaball_object, mix_color,
                     rng, scale_color, smoothstep, srgb)

SQ2 = math.sqrt(2.0)

# ------------------------------------------------------------------ footprint


def boundary_radius(theta):
    c, s = abs(math.cos(theta)), abs(math.sin(theta))
    n = L.ISLAND_SQUARENESS
    r = L.ISLAND_RADIUS / (c ** n + s ** n) ** (1.0 / n)
    wob = 0.07 * fbm(math.cos(theta) * 1.1, math.sin(theta) * 1.1, 0.0, 3, seed=1.0)
    wob += 0.025 * fbm(math.cos(theta) * 4.0, math.sin(theta) * 4.0, 0.0, 2, seed=2.0)
    return r * (1.0 + wob)


def radial_t(x, y):
    r = math.hypot(x, y)
    return r / boundary_radius(math.atan2(y, x))


# ------------------------------------------------------------------ heights


def terrace_u(x, y):
    """Depth coordinate for the terraces; the v**2 term bends each step into an
    arc so the back terrace reads as a rounded plateau, not a straight band."""
    u = (y - x) / SQ2
    v = (x + y) / SQ2
    return u - L.STEP_CURVE * v * v + 1.2 * fbm(x * 0.12, y * 0.12, 0.0, 3, seed=3.0)


def base_height(x, y):
    u = terrace_u(x, y)
    z0, z1, z2 = L.LEVEL_Z
    a, b = L.STEP_U
    k = L.STEP_SOFTNESS
    z = z0 + (z1 - z0) * smoothstep(a - k, a + k, u) + (z2 - z1) * smoothstep(b - k, b + k, u)
    z += 0.07 * fbm(x * 0.45, y * 0.45, 0.0, 3, seed=4.0)
    # rocky roughness only on the terrace steps
    step = math.exp(-((u - a) / 0.45) ** 2) + math.exp(-((u - b) / 0.45) ** 2)
    z += step * 0.09 * fbm(x * 1.7, y * 1.7, 0.0, 2, seed=5.0)
    # rounded edge
    z -= 0.16 * smoothstep(0.9, 1.0, radial_t(x, y))
    return z


class Polyline:
    def __init__(self, pts):
        self.pts = [Vector((p[0], p[1], 0.0)) for p in pts]
        self.cum = [0.0]
        for i in range(1, len(self.pts)):
            self.cum.append(self.cum[-1] + (self.pts[i] - self.pts[i - 1]).length)
        self.length = self.cum[-1]

    def nearest(self, x, y):
        """-> (distance, arc length, signed side)"""
        p = Vector((x, y, 0.0))
        best = (1e9, 0.0, 1.0)
        for i in range(len(self.pts) - 1):
            a, b = self.pts[i], self.pts[i + 1]
            ab = b - a
            t = clamp((p - a).dot(ab) / ab.length_squared)
            q = a + ab * t
            d = (p - q).length
            if d < best[0]:
                side = 1.0 if ab.x * (p.y - a.y) - ab.y * (p.x - a.x) > 0 else -1.0
                best = (d, self.cum[i] + t * ab.length, side)
        return best

    def point(self, s):
        s = clamp(s, 0.0, self.length)
        for i in range(len(self.pts) - 1):
            if s <= self.cum[i + 1] or i == len(self.pts) - 2:
                seg = self.cum[i + 1] - self.cum[i]
                t = (s - self.cum[i]) / seg if seg else 0.0
                a, b = self.pts[i], self.pts[i + 1]
                return a.lerp(b, t), (b - a).normalized()

    def smooth_point(self, s, h=0.35):
        """Point and tangent averaged over a window, for rounded ribbons."""
        acc, tan = Vector(), Vector()
        n = 5
        for k in range(n):
            p, t = self.point(s + (k / (n - 1) - 0.5) * 2 * h)
            acc += p
            tan += t
        return acc / n, tan.normalized()


STREAM = Polyline(L.STREAM)
_bed_cache = []


def _build_bed():
    """Monotonic stream bed height sampled every 0.05 units."""
    if _bed_cache:
        return
    s, low = 0.0, 1e9
    while s <= STREAM.length + 0.05:
        p, _ = STREAM.point(s)
        low = min(low, base_height(p.x, p.y))
        _bed_cache.append(low - L.STREAM_DEPTH)
        s += 0.05


def bed_height(s):
    _build_bed()
    i = clamp(s / 0.05, 0, len(_bed_cache) - 1.001)
    i0 = int(i)
    return lerp(_bed_cache[i0], _bed_cache[i0 + 1], i - i0)


def stream_half_width(s):
    w = L.STREAM_HALF_WIDTH * (0.55 + 0.45 * smoothstep(0.0, 1.6, s))
    return w * (1.0 + 0.12 * fbm(s * 0.6, 0.0, 0.0, 2, seed=6.0))


def height_at(x, y):
    z = base_height(x, y)
    d, s, _ = STREAM.nearest(x, y)
    w = stream_half_width(s)
    if d < w + L.STREAM_BANK:
        bed = bed_height(s) + 0.1 * (d / w) ** 2
        f = smoothstep(w * 0.85, w + L.STREAM_BANK, d)
        z = min(z, lerp(bed, z, f))
    return z


def water_height(s):
    return bed_height(s) + L.STREAM_DEPTH - 0.06


def exit_arclength():
    s = 0.0
    while s < STREAM.length:
        p, _ = STREAM.point(s)
        if radial_t(p.x, p.y) >= 1.0:
            return s
        s += 0.02
    return STREAM.length


# ------------------------------------------------------------------ palette

GRASS_DARK = srgb("#4F8F32")
GRASS = srgb("#70B83A")
GRASS_SUN = srgb("#B2D64A")
GRASS_LIP = srgb("#467F2C")
SAND = srgb("#D8C08E")
ROCK_A = srgb("#CFAE86")
ROCK_B = srgb("#9F7C5E")
ROCK_LIGHT = srgb("#E3CBA4")
ROCK_DEEP = srgb("#6E5248")
MOSS = srgb("#5F9636")


def grass_color(x, y):
    n1 = fbm(x * 0.15, y * 0.15, 0.0, 3, seed=7.0)
    n2 = fbm(x * 0.9, y * 0.9, 0.0, 2, seed=8.0)
    c = mix_color(GRASS_DARK, GRASS, smoothstep(-0.35, 0.25, n1))
    c = mix_color(c, GRASS_SUN, 0.35 * smoothstep(0.0, 0.5, n2))
    return c


def rock_color(z, theta, depth_q=0.0):
    ca, sa = math.cos(theta), math.sin(theta)
    column = fbm(ca * 6.0, sa * 6.0, z * 0.05, 3, 9.0)
    band = z * 0.8 + 0.5 * fbm(ca * 2.0, sa * 2.0, z * 0.2, 2, 9.5)
    f = band - math.floor(band)
    c = mix_color(ROCK_A, ROCK_B, smoothstep(-0.3, 0.35, column))
    c = mix_color(c, ROCK_LIGHT, 0.25 * smoothstep(0.75, 0.95, f))
    return mix_color(c, ROCK_DEEP, clamp(depth_q) ** 0.9 * 0.7)


# ------------------------------------------------------------------ builders

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
    # rounded grass lip that rolls over the cliff top
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
            nz = v.normal.z
            c = grass_color(x, y)
            d, s, _ = STREAM.nearest(x, y)
            w = stream_half_width(s)
            if d < w + L.STREAM_BANK * 0.9:
                c = mix_color(SAND, c, smoothstep(w * 0.8, w + L.STREAM_BANK * 0.9, d))
            slope = smoothstep(0.88, 0.62, nz)
            if slope > 0 and not lip:
                rc = rock_color(z, math.atan2(y, x))
                streak = smoothstep(0.2, 0.55, fbm(x * 2.4, y * 2.4, 0.0, 2, 21.0))
                rc = mix_color(rc, MOSS, 0.55 * streak)
                c = mix_color(c, rc, slope * smoothstep(-0.4, 0.1, fbm(x * 1.3, y * 1.3, z, 2, 10.0)) * 0.9 + slope * 0.1)
            if lip:
                c = mix_color(c, GRASS_LIP, 0.35 + 0.15 * (k - N_RING))
            v[cl] = c
    return geo.to_object("Island_Top", col, [M.terrain()])


COLUMN_W = 7  # cliff vertices per stone column


def _h(a, b):
    """Deterministic hash in [0, 1) for integer pairs."""
    x = (a * 73856093) ^ (b * 19349663) ^ 0x5BD1E995
    x = (x ^ (x >> 13)) * 1274126177 & 0xFFFFFFFF
    return (x ^ (x >> 16)) / 4294967296.0


def cliff_shape(i, a, rb_i):
    """Per-angle cliff parameters: (top z, wall depth, total depth)."""
    ca, sa = math.cos(a), math.sin(a)
    ztop = height_at(ca * rb_i, sa * rb_i) - 0.42
    wall = 1.9 + 0.6 * fbm(ca * 2.2, sa * 2.2, 0.0, 2, seed=20.0)
    depth = wall + 10.5 + 2.2 * fbm(ca * 1.3, sa * 1.3, 0.0, 3, seed=11.0)
    depth += 1.2 * max(0.0, fbm(ca * 2.6, sa * 2.6, 0.0, 2, seed=12.0))
    return ztop, wall, depth


def build_cliff(col):
    geo = Geo()
    bm, cl = geo.bm, geo.col
    rows = 120
    rb = [boundary_radius(TAU * i / N_ANG) for i in range(N_ANG)]
    grid, bottoms, shapes = [], [], []
    for i in range(N_ANG):
        a = TAU * i / N_ANG
        ca, sa = math.cos(a), math.sin(a)
        ztop, wall, depth = cliff_shape(i, a, rb[i])
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
                prof = 0.95 * (1.0 - p ** 1.1) ** 0.85
                amp = 1.0 - 0.5 * p
            prof = max(prof, 0.025)
            # stone columns cut into stacked blocks; the carve only goes inward,
            # so the grass lip always overhangs the rock
            ci = i // COLUMN_W
            band_h = 0.7 + 0.35 * _h(ci, 2)
            b = math.floor((d + _h(ci, 3) * band_h) / band_h)
            block = 0.16 + 0.3 * _h(ci, 1) + 0.24 * _h(ci, 100 + b)
            facet = 0.07 * ((i % COLUMN_W) / COLUMN_W - 0.5) * (1 if _h(ci, 4) > 0.5 else -1)
            carve = amp * (block + facet) * min(1.0, prof * 5)
            r = rb[i] * prof - carve * smoothstep(0.0, 0.5, d)
            r = max(r, 0.05)
            col_list.append(bm.verts.new((ca * r, sa * r, z)))
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
        drip = 0.45 + 1.5 * smoothstep(0.1, 0.6, fbm(ca * 9, sa * 9, 0.0, 2, 16.0))
        for j, v in enumerate(grid[i]):
            below = ztop - v.co.z
            q = clamp((below - wall * 0.6) / (depth - wall * 0.6))
            c = rock_color(v.co.z, a, q)
            m = smoothstep(drip, drip * 0.35, below)
            m *= 0.75 + 0.25 * fbm(ca * 20, sa * 20, v.co.z * 2, 2, 17.0)
            c = mix_color(c, MOSS, clamp(m))
            ci = i // COLUMN_W
            tone = 0.9 + 0.2 * _h(ci, 7)
            c = scale_color(c, tone * (1.0 + 0.22 * max(0.0, v.normal.z)))
            v[cl] = c
    tip[cl] = ROCK_DEEP
    grid_co = [[v.co.copy() for v in column] for column in grid]
    ob = geo.to_object("Island_Underside", col, [M.rock("SW_Cliff")], sharp_angle=38)
    build_underside_rocks(col, grid_co, rows, shapes)
    return ob


def rock_prism(geo, center, radius, height, color, seed, taper=0.7, tilt=0.0, point=False,
               light=None):
    """Angular stone block: an irregular 5-7 sided prism with a slanted top."""
    r = rng(seed)
    n = r.randint(5, 7)
    c = Vector(center)
    rot = r.uniform(0, TAU)
    slant = Vector((r.uniform(-1, 1), r.uniform(-1, 1), 0)) * tilt
    top, bot = [], []
    for k in range(n):
        a = rot + TAU * (k + r.uniform(-0.25, 0.25)) / n
        rr = radius * r.uniform(0.75, 1.05)
        off = Vector((math.cos(a) * rr, math.sin(a) * rr, 0))
        zt = height / 2 + off.dot(slant) + r.uniform(-0.06, 0.06) * radius
        top.append(c + off + Vector((0, 0, zt)))
        bot.append(c + off * taper + Vector((0, 0, -height / 2)))
    coords = top + bot
    hi = light or scale_color(color, 1.18)
    colors = [hi] * n + [scale_color(color, 0.78)] * n
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    for k in range(n):
        k2 = (k + 1) % n
        faces.append((k, n + k, n + k2, k2))
    if point:
        tip = c + Vector((r.uniform(-0.1, 0.1), r.uniform(-0.1, 0.1), -height / 2 - radius * 1.6))
        coords.append(tip)
        colors.append(scale_color(color, 0.62))
        faces[1] = None
        faces = [f for f in faces if f]
        for k in range(n):
            faces.append((n + k, 2 * n, n + (k + 1) % n))
    geo.raw(coords, faces, colors)


def stone_stack(geo, top_center, out, radius, layers, color, seed, light=None):
    """Large layered stone formation: flat slabs stepping inward and down."""
    r = rng(seed)
    c = Vector(top_center)
    rad = radius
    for k in range(layers):
        h = radius * r.uniform(0.55, 0.8)
        col = scale_color(color, 1.0 - 0.08 * k)
        lt = light if k == 0 and light else mix_color(col, ROCK_LIGHT, 0.35)
        rock_prism(geo, c - Vector((0, 0, h / 2)), rad, h, col, seed * 7 + k, taper=0.86,
                   tilt=0.08, light=lt)
        c = c - Vector((0, 0, h * 0.92)) - out * rad * r.uniform(0.15, 0.3)
        rad *= r.uniform(0.62, 0.75)


def build_underside_rocks(col, grid, rows, shapes):
    """Large, layered stone formations embedded in the underside, so it reads
    as stacked rock shelves rather than a cone or a row of teeth."""
    geo = Geo()
    r = rng(2024)
    n_ang = len(grid)
    for k in range(75):
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
        size = r.uniform(0.95, 1.6) * (0.5 + 0.5 * clamp(rad / 9.0))
        q = clamp((below - wall * 0.6) / (depth - wall * 0.6))
        base = scale_color(rock_color(v.z, a + r.uniform(-0.2, 0.2), q), r.uniform(0.92, 1.06))
        light = mix_color(base, ROCK_LIGHT, 0.45)
        if below < 1.5:
            light = mix_color(light, MOSS, 0.5)
        inset = 0.95 if below < 1.8 else 0.7
        stone_stack(geo, v - out * size * inset + Vector((0, 0, size * 0.25)), out, size,
                    r.randint(1, 3), base, 5000 + k, light=light)
    return geo.to_object("Island_Underside_Rocks", col, [M.rock("SW_Cliff")], sharp_angle=30)


def _stream_ribbon_points(s0, s1, step=0.08):
    out = []
    s = s0
    while s <= s1 + 1e-6:
        out.append(s)
        s += step
    return out


def build_stream(col):
    s_exit = exit_arclength()
    geo = Geo()
    bm, cl = geo.bm, geo.col
    across = 9
    deep, light = srgb("#00A8C2"), srgb("#62EBD7")
    rows, uvs = [], []
    ss = _stream_ribbon_points(0.0, s_exit + 0.25)
    for s in ss:
        p, t = STREAM.smooth_point(s)
        nrm = Vector((-t.y, t.x, 0.0))
        w = stream_half_width(s) * 1.02
        z = water_height(s)
        row = []
        for k in range(across):
            v = k / (across - 1)
            off = (v - 0.5) * 2.0
            q = p + nrm * off * w
            zz = z + 0.015 * (1 - off * off)
            vert = bm.verts.new((q.x, q.y, zz))
            edge = abs(off)
            c = mix_color(deep, light, smoothstep(0.1, 0.95, edge))
            c = mix_color(c, srgb("#E8FAFF"), 0.6 * smoothstep(0.8, 1.0, edge))
            vert[cl] = c
            uvs.append((v, s * 0.5))
            row.append(vert)
        rows.append(row)
    for j in range(len(rows) - 1):
        for k in range(across - 1):
            bm.faces.new((rows[j][k], rows[j][k + 1], rows[j + 1][k + 1], rows[j + 1][k]))
    ob = geo.to_object("Stream_Water", col, [M.water()], uv_fn=flow_uv(uvs))
    build_stream_foam(col, s_exit)
    return ob, s_exit


def cascade_bottoms(s_exit):
    """Arc lengths where the stream lands after tumbling down a terrace step."""
    out, falling = [], False
    s = 0.0
    while s < s_exit:
        drop = water_height(s) - water_height(s + 0.3)
        if drop > 0.25 and not falling:
            falling = True
        elif drop <= 0.05 and falling:
            out.append(s + 0.15)
            falling = False
        s += 0.05
    return out


def foam_patch(elements, center, tangent, width, seed, length=0.9, puff=0.16):
    r = rng(seed)
    nrm = Vector((-tangent.y, tangent.x, 0.0))
    for i in range(int(8 + width * 6)):
        q = center + tangent * r.uniform(-0.2, length) + nrm * r.uniform(-width, width)
        rad = puff * r.uniform(0.7, 1.3)
        elements.append((q, rad, (1.2, 1.2, 0.45)))


def build_stream_foam(col, s_exit):
    elements = []
    for k, sb in enumerate(cascade_bottoms(s_exit)):
        p, t = STREAM.smooth_point(sb)
        foam_patch(elements, Vector((p.x, p.y, water_height(sb) + 0.03)), t,
                   stream_half_width(sb) * 0.85, 40 + k)
    p, t = STREAM.smooth_point(s_exit - 0.15)
    foam_patch(elements, Vector((p.x, p.y, water_height(s_exit) + 0.03)), t,
               stream_half_width(s_exit) * 0.8, 49, length=0.35, puff=0.13)
    if not elements:
        return None

    def color(co):
        return (0.96, 0.99, 1.0, 1.0)

    return metaball_object("Stream_Foam", col, elements,
                           [M.soft_cloud("SW_Foam", emission=6.0, opacity=0.9, edge=0.35)],
                           color, resolution=0.05)


def build_waterfall(col, s_exit):
    p, t = STREAM.smooth_point(s_exit, 0.2)
    out_dir = Vector((t.x, t.y, 0.0)).normalized()
    side = Vector((-out_dir.y, out_dir.x, 0.0))
    z0 = water_height(s_exit)
    w0 = stream_half_width(s_exit)
    geo = Geo()
    bm, cl = geo.bm, geo.col
    rows_n, across = 64, 11
    fall = 7.6
    rows, uvs = [], []
    for j in range(rows_n + 1):
        f = j / rows_n
        if f < 0.12:
            a = f / 0.12
            off = 0.1 + 0.6 * a
            z = z0 - 0.55 * a * a
        else:
            g = (f - 0.12) / 0.88
            off = 0.7 + 0.35 * g
            z = z0 - 0.55 - fall * g
        width = w0 * (0.95 + 0.45 * f)
        row = []
        for k in range(across):
            v = k / (across - 1)
            o = (v - 0.5) * 2.0
            bow = 0.16 * (1 - o * o)
            q = p + out_dir * (off + bow) + side * o * width
            vert = bm.verts.new((q.x, q.y, z))
            streak = fbm(o * 3.5, f * 1.2, 0.0, 3, seed=18.0)
            c = mix_color(srgb("#55DCDB"), srgb("#F2FEFF"), smoothstep(-0.15, 0.25, streak))
            c = mix_color(srgb("#12BDCB"), c, smoothstep(0.0, 0.12, f) * 0.6 + 0.4)
            alpha = (1.0 - smoothstep(0.5, 0.86, f)) * (1.0 - 0.6 * smoothstep(0.75, 1.0, abs(o)))
            vert[cl] = (c[0], c[1], c[2], alpha)
            uvs.append((v, f * 4.5))
            row.append(vert)
        rows.append(row)
    for j in range(rows_n):
        for k in range(across - 1):
            bm.faces.new((rows[j][k], rows[j][k + 1], rows[j + 1][k + 1], rows[j + 1][k]))
    ob = geo.to_object("Waterfall", col, [M.waterfall()], uv_fn=flow_uv(uvs))
    bottom = p + out_dir * 1.05 + Vector((0, 0, z0 - 0.55 - fall * 0.72))
    return ob, bottom


CLOUD_TOP = srgb("#FFFDF8")
CLOUD_BOTTOM = srgb("#8E9AC4")
CLOUD_SUN = srgb("#FFF4DE")


def cloud_elements(center, size, seed, count=6, flat=0.75):
    """Blob layout for one stylized cloud: a flat-bottomed base with a few
    rounded bumps on top."""
    r = rng(seed)
    c = Vector(center)
    out = [(c, size * 1.2, (1.6, 1.0, 0.32))]
    for i in range(count):
        a = r.uniform(0, TAU)
        d = r.uniform(0.15, 0.85) * size
        p = c + Vector((math.cos(a) * d, math.sin(a) * d * 0.6, size * r.uniform(0.3, 0.55)))
        rad = size * r.uniform(0.6, 0.9) * (1.0 - 0.4 * d / size)
        out.append((p, rad, (1.0, 1.0, flat + 0.2)))
    return out


def cloud_color_fn(centers):
    def fn(co):
        best = min(centers, key=lambda cs: (co - cs[0]).length)
        c, size = best
        d = (co - c) / size
        # painted form: lavender shade underneath, white top, warm sun side
        k = smoothstep(-0.35, 0.5, d.z + 0.25 * (-0.84 * d.x - 0.54 * d.y))
        col = mix_color(CLOUD_BOTTOM, CLOUD_TOP, k)
        return mix_color(col, CLOUD_SUN, 0.5 * smoothstep(0.3, 0.9, -0.84 * d.x - 0.54 * d.y + d.z))
    return fn


def build_clouds(col, fall_bottom):
    """Soft, merged clouds that frame the island but stay secondary."""
    fb = Vector(fall_bottom)
    specs = [(fb + Vector((0.2, -0.3, 0.9)), 1.35, 301)]
    specs += [(rig.screen_to_world(sx, sy, depth), size, seed)
              for (sx, sy, depth), size, seed in L.CLOUDS]
    elements, centers = [], []
    for center, size, seed in specs:
        elements += cloud_elements(center, size, seed)
        centers.append((Vector(center), size))
    ob = metaball_object("Clouds_Base", col, elements,
                         [M.soft_cloud("SW_Cloud", emission=8.0, opacity=0.95, edge=0.4)],
                         cloud_color_fn(centers), resolution=0.1)
    ob.visible_shadow = False
    return ob


# ------------------------------------------------------------------ rocks & tufts

ROCK_GREY = srgb("#BDB2A2")
ROCK_WARM = srgb("#D0B793")


def add_rock(geo, pos, size, seed, moss=0.6, squash=0.62, sink=0.35):
    r = rng(seed)
    base = mix_color(ROCK_GREY, ROCK_WARM, r.random())
    p = Vector(pos)

    def col_fn(v, c):
        n = (v.co - p).normalized()
        mz = smoothstep(0.35, 0.8, n.z) * moss
        mz *= smoothstep(-0.3, 0.2, fbm(v.co.x * 3, v.co.y * 3, v.co.z * 3, 2, seed))
        cc = mix_color(c, MOSS, mz)
        return scale_color(cc, 0.82 + 0.2 * clamp(n.z * 0.5 + 0.5))

    geo.ico(p + Vector((0, 0, size * squash * (1 - sink))), size, base, subdiv=2,
            scale=(1.0, r.uniform(0.75, 1.0), squash), rot=(0, 0, r.uniform(0, TAU)),
            displace=0.3, freq=1.1, seed=seed * 0.37, color_fn=col_fn)


def reserved(x, y, margin=0.0):
    """True where later stages need the ground clear."""
    paths = getattr(reserved, "_paths", None)
    if paths is None:
        paths = [Polyline(L.MAIN_PATH), Polyline(L.BRANCH_PATH_WEST + L.BRANCH_PATH_EAST)]
        reserved._paths = paths
    for pl in paths:
        if pl.nearest(x, y)[0] < L.PATH_HALF_WIDTH + 0.45 + margin:
            return True
    d, s, _ = STREAM.nearest(x, y)
    if d < stream_half_width(s) + L.STREAM_BANK + 0.2 + margin:
        return True
    pts = [(L.HOUSE_POS, 2.3), (L.POND_CENTER, L.POND_RADIUS + 0.9), (L.GARDEN_CENTER, 2.4),
           (L.FIRST_TREE["pos"], 1.0), (L.BRIDGE_CENTER, 1.9)]
    pts += [(t[1], 0.9) for t in L.MORE_TREES]
    for (px, py), rad in pts:
        if math.hypot(x - px, y - py) < rad + margin:
            return True
    return False


def build_base_rocks(col):
    geo = Geo()
    r = rng(500)
    placed = []
    # boulders on terrace steps and near the rim
    tries = 0
    while len(placed) < 26 and tries < 4000:
        tries += 1
        x, y = r.uniform(-10, 10), r.uniform(-10, 10)
        t = radial_t(x, y)
        if t > 0.95:
            continue
        u = terrace_u(x, y)
        on_step = min(abs(u - L.STEP_U[0]), abs(u - L.STEP_U[1])) < 0.45
        near_rim = t > 0.86
        if not (on_step or near_rim) or reserved(x, y, 0.1):
            continue
        if any(math.hypot(x - a, y - b) < 1.2 for a, b, _ in placed):
            continue
        size = r.uniform(0.28, 0.55) if on_step else r.uniform(0.22, 0.42)
        placed.append((x, y, size))
        add_rock(geo, (x, y, height_at(x, y)), size, 600 + len(placed))
        if r.random() < 0.6:
            a = r.uniform(0, TAU)
            x2, y2 = x + math.cos(a) * size * 1.3, y + math.sin(a) * size * 1.3
            add_rock(geo, (x2, y2, height_at(x2, y2)), size * 0.5, 700 + len(placed))
    # stones along the stream banks
    s = 1.0
    while s < exit_arclength() - 0.4:
        p, t = STREAM.point(s)
        nrm = Vector((-t.y, t.x, 0))
        for sign in (-1, 1):
            if r.random() < 0.55:
                q = p + nrm * sign * (stream_half_width(s) + r.uniform(0.0, 0.25))
                add_rock(geo, (q.x, q.y, height_at(q.x, q.y)), r.uniform(0.12, 0.26),
                         800 + int(s * 10) + sign, moss=0.4, sink=0.45)
        s += r.uniform(0.7, 1.3)
    # spring source boulders
    sp = Vector((L.STREAM[0][0], L.STREAM[0][1], 0))
    for i, (dx, dy, sz) in enumerate([(-0.55, 0.35, 0.55), (0.35, 0.6, 0.45), (-0.1, 0.85, 0.38),
                                      (0.7, 0.05, 0.3)]):
        x, y = sp.x + dx, sp.y + dy
        add_rock(geo, (x, y, height_at(x, y)), sz, 900 + i)
    return geo.to_object("Rocks_Base", col, [M.rock()], sharp_angle=34)


def add_tuft(geo, pos, seed, height=0.28, color=None):
    r = rng(seed)
    p = Vector(pos)
    base_c = color or mix_color(GRASS_DARK, GRASS_SUN, r.uniform(0.2, 0.7))
    blades = r.randint(6, 9)
    for i in range(blades):
        a = TAU * i / blades + r.uniform(-0.3, 0.3)
        lean = r.uniform(0.25, 0.55)
        h = height * r.uniform(0.6, 1.1)
        b0 = p + Vector((math.cos(a) * 0.04, math.sin(a) * 0.04, -0.02))
        tip = b0 + Vector((math.cos(a) * lean * h, math.sin(a) * lean * h, h))
        mid = b0.lerp(tip, 0.5) + Vector((0, 0, 0.03))

        def col_fn(v, c, b0=b0, h=h):
            k = clamp((v.co.z - b0.z) / h)
            return mix_color(scale_color(c, 0.6), scale_color(c, 1.25), k)

        geo.tube([b0, mid, tip], [0.035, 0.025, 0.004], base_c, segs=4, cap_start=False,
                 cap_end=False, color_fn=col_fn)


def build_tufts(col, count=150, seed=1000, name="Grass_Tufts_Base"):
    geo = Geo()
    r = rng(seed)
    n = 0
    tries = 0
    while n < count and tries < 20000:
        tries += 1
        x, y = r.uniform(-10, 10), r.uniform(-10, 10)
        t = radial_t(x, y)
        if t > 0.97 or reserved(x, y, -0.3):
            continue
        u = terrace_u(x, y)
        if min(abs(u - L.STEP_U[0]), abs(u - L.STEP_U[1])) < 0.35:
            continue
        if fbm(x * 0.5, y * 0.5, 0, 2, 19.0) < -0.05 and t < 0.85:
            continue
        add_tuft(geo, (x, y, height_at(x, y)), seed + n)
        n += 1
    return geo.to_object(name, col, [M.foliage()])


def build_fringe(col):
    """Grass-to-rock transitions: tufts along the island rim and the top of
    each terrace step, and moss tongues hanging over the grass lip."""
    tufts, moss = Geo(), Geo()
    r = rng(1500)
    n = 260
    for i in range(n):
        a = TAU * (i + r.uniform(-0.3, 0.3)) / n
        rb = boundary_radius(a)
        x, y = math.cos(a) * rb * 0.985, math.sin(a) * rb * 0.985
        d, s_, _ = STREAM.nearest(x, y)
        if d < stream_half_width(s_) + 0.5:
            continue
        if r.random() < 0.35:
            add_tuft(tufts, (x, y, height_at(x, y)), 1600 + i, height=r.uniform(0.25, 0.4))
        if r.random() < 0.13:
            ex, ey = math.cos(a) * (rb + 0.1), math.sin(a) * (rb + 0.1)
            z = height_at(math.cos(a) * rb, math.sin(a) * rb)
            length = r.uniform(0.3, 0.6)
            col_m = mix_color(GRASS_LIP, MOSS, r.random())
            moss.ico((ex - math.cos(a) * 0.06, ey - math.sin(a) * 0.06, z - 0.2 - length * 0.45),
                     0.2, col_m, subdiv=2, scale=(0.45, 1.6, length / 0.4), rot=(0, 0, a),
                     displace=0.25, seed=i,
                     color_fn=lambda v, c, z=z, length=length: scale_color(
                         c, 0.75 + 0.35 * clamp((v.co.z - (z - 0.2 - length)) / length)))
    tries = 0
    placed = 0
    while placed < 60 and tries < 30000:
        tries += 1
        x, y = r.uniform(-10, 10), r.uniform(-10, 10)
        if radial_t(x, y) > 0.95 or reserved(x, y, -0.6):
            continue
        u = terrace_u(x, y)
        on_top = any(0.12 < u - e < 0.42 for e in L.STEP_U)
        if not on_top:
            continue
        add_tuft(tufts, (x, y, height_at(x, y)), 1900 + placed, height=r.uniform(0.28, 0.42))
        placed += 1
    tufts.to_object("Grass_Fringe", col, [M.foliage()])
    moss.to_object("Moss_Overhang", col, [M.foliage()])


def build(col):
    build_top(col)
    build_fringe(col)
    build_cliff(col)
    _, s_exit = build_stream(col)
    _, fall_bottom = build_waterfall(col, s_exit)
    build_clouds(col, fall_bottom)
    build_base_rocks(col)
    build_tufts(col)
