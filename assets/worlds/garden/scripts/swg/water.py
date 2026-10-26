"""Garden water (one milestone): a small stone fountain on the greenhouse
terrace feeds a stone-lined rill that tumbles down both retaining walls into
a lily pond; the pond's outflow runs under the bridge and leaves the garden
over the front-left lip as a waterfall.

Every water surface is its own mesh with the Island's 'Flow' UV convention
(U across, V along the flow), so the export can make flow layers for the
ambient shimmer exactly as for the Island (D93). Koi are separate objects.
"""

import math

from swi import materials as M
from swi.common import (TAU, Geo, Vector, clamp, fbm, flow_uv, lerp, metaball_object, mix_color,
                        rng, scale_color, smoothstep, srgb)
from swi.terrain import foam_patch

from . import layout as L
from . import terrain as T

DEEP = srgb("#05A6C0")
LIGHT = srgb("#6BEBD8")
EDGE = srgb("#E8FAFF")
STONE = [srgb("#C9BEAD"), srgb("#B9AD9A"), srgb("#D6CCBA")]

# ------------------------------------------------------------------ fountain


def fountain_center():
    x, y = L.xy(*L.FOUNTAIN)
    return Vector((x, y, T.height_at(x, y)))


BASIN_WATER = 0.36  # above the fountain's ground


def fountain_level():
    return fountain_center().z + BASIN_WATER


def _lathe(geo, center, profile, color_fn, segs=40):
    """Surface of revolution from (radius, z) pairs."""
    c = Vector(center)
    coords, colors, faces = [], [], []
    for j, (rr, z) in enumerate(profile):
        for i in range(segs):
            a = TAU * i / segs
            p = c + Vector((math.cos(a) * rr, math.sin(a) * rr, z))
            coords.append(p)
            colors.append(color_fn(j, a, p))
    for j in range(len(profile) - 1):
        for i in range(segs):
            i2 = (i + 1) % segs
            faces.append((j * segs + i, j * segs + i2, (j + 1) * segs + i2, (j + 1) * segs + i))
    geo.raw(coords, faces, colors)


def _disk(geo, center, radius, z, inner, outer, segs=40, rings=4, uvs=None, scale=1.0):
    c = Vector(center)
    coords, colors, faces = [(c.x, c.y, z)], [inner], []
    if uvs is not None:
        uvs.append((0.5, 0.0))
    for j in range(1, rings + 1):
        f = j / rings
        for i in range(segs):
            a = TAU * i / segs
            coords.append((c.x + math.cos(a) * radius * f, c.y + math.sin(a) * radius * f, z))
            colors.append(mix_color(inner, outer, smoothstep(0.3, 1.0, f)))
            if uvs is not None:
                uvs.append((0.5 + 0.5 * f, a * radius * scale))
    for i in range(segs):
        faces.append((0, 1 + i, 1 + (i + 1) % segs))
    for j in range(rings - 1):
        for i in range(segs):
            a0, a1 = 1 + j * segs, 1 + (j + 1) * segs
            i2 = (i + 1) % segs
            faces.append((a0 + i, a1 + i, a1 + i2, a0 + i2))
    geo.raw(coords, faces, colors)


def build_fountain(col):
    c = fountain_center()
    stone, water, fall = Geo(), Geo(), Geo()
    s0, s1 = srgb("#D9CFBE"), srgb("#B5A893")

    def stone_fn(j, a, p):
        k = 0.85 + 0.25 * clamp((p.z - c.z) / 1.2)
        k *= 1.0 + 0.06 * fbm(p.x * 4, p.y * 4, p.z * 4, 2, 81.0)
        return scale_color(mix_color(s1, s0, 0.6), k)

    R = L.FOUNTAIN_RADIUS
    # outer basin: plinth, wall and a rolled rim
    _lathe(stone, c, [(0.0, 0.12), (R * 0.72, 0.12), (R * 0.72, BASIN_WATER + 0.02),
                      (R * 0.8, 0.46), (R * 0.98, 0.47), (R * 1.04, 0.38), (R * 0.98, 0.1),
                      (R * 1.06, 0.04), (R * 1.08, -0.15)], stone_fn)
    # pedestal and upper bowl
    _lathe(stone, c, [(0.0, 0.3), (0.2, 0.3), (0.14, 0.55), (0.12, 0.8), (0.18, 0.9),
                      (0.42, 0.98), (0.46, 1.05), (0.36, 1.06), (0.3, 1.0), (0.0, 1.0)], stone_fn)
    # finial
    stone.ico(c + Vector((0, 0, 1.12)), 0.08, s0, subdiv=2, scale=(1, 1, 1.3))
    uv1, uv2 = [], []
    _disk(water, c, R * 0.74, c.z + BASIN_WATER, DEEP, LIGHT, uvs=uv1, scale=0.6)
    _disk(water, c, 0.33, c.z + 1.035, DEEP, LIGHT, segs=24, rings=2, uvs=uv1, scale=0.6)
    water.to_object("Water_Fountain", col, [M.water("SWG_FountainWater", streaks=0.3, glints=0.8)],
                    uv_fn=flow_uv(uv1))
    # thin water curtain from the upper bowl into the basin
    segs, rows = 36, 8
    coords, colors, faces = [], [], []
    for j in range(rows + 1):
        f = j / rows
        rr = 0.44 + 0.14 * f * f
        z = c.z + 1.05 - (1.05 - BASIN_WATER) * f
        for i in range(segs):
            a = TAU * i / segs
            coords.append((c.x + math.cos(a) * rr, c.y + math.sin(a) * rr, z))
            streak = fbm(math.cos(a) * 3, math.sin(a) * 3, f, 2, 82.0)
            col_ = mix_color(LIGHT, EDGE, smoothstep(-0.2, 0.3, streak))
            colors.append((col_[0], col_[1], col_[2], 0.85 * (1 - 0.5 * f)))
            uv2.append((i / segs, f * 2.0))
    for j in range(rows):
        for i in range(segs):
            i2 = (i + 1) % segs
            faces.append((j * segs + i, j * segs + i2, (j + 1) * segs + i2, (j + 1) * segs + i))
    fall.raw(coords, faces, colors)
    fall.to_object("Water_FountainCurtain", col, [M.waterfall("SWG_FountainCurtain")],
                   uv_fn=flow_uv(uv2))
    stone.to_object("Fountain_Stone", col, [M.rock("SWG_FountainStone")], sharp_angle=50)
    # foam where the curtain lands
    el = []
    for i in range(14):
        a = TAU * i / 14
        el.append((c + Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, BASIN_WATER + 0.03)), 0.11,
                   (1.2, 1.2, 0.45)))
    metaball_object("Water_FountainFoam", col, el,
                    [M.soft_cloud("SW_Foam", emission=6.0, opacity=0.9, edge=0.35)],
                    lambda co: (0.96, 0.99, 1.0, 1.0), resolution=0.04)


# ------------------------------------------------------------------ channels


class Channel:
    """A water course along a polyline: monotonic water height that follows
    the terrain down (cascades where the terrain steps), clamped below the
    start level."""

    def __init__(self, pts_vu, start_level, half_width, lift=0.09, end_level=None, prepend=None):
        pts = [L.xy(v, u) for v, u in pts_vu]
        if prepend:
            pts = [prepend] + pts
        self.pl = T.Polyline(pts)
        self.half_width = half_width
        self._z = []
        s, low = 0.0, start_level
        while s <= self.pl.length + 0.05:
            p, _ = self.pl.point(s)
            low = min(low, T.height_at(p.x, p.y) + lift)
            if end_level is not None:
                low = max(low, end_level)
            self._z.append(low)
            s += 0.05

    def level(self, s):
        i = clamp(s / 0.05, 0, len(self._z) - 1.001)
        i0 = int(i)
        return lerp(self._z[i0], self._z[i0 + 1], i - i0)

    def width(self, s, seed):
        return self.half_width * (1.0 + 0.1 * fbm(s * 0.7, 0.0, 0.0, 2, seed))

    def drops(self, s_end=None):
        """Arc-length intervals where the water falls (cascades)."""
        out, start = [], None
        s, end = 0.0, s_end or self.pl.length
        while s < end:
            fall = self.level(s) - self.level(s + 0.1)
            if fall > 0.04 and start is None:
                start = s
            elif fall <= 0.01 and start is not None:
                out.append((start, s + 0.05))
                start = None
            s += 0.05
        return out


def ribbon(geo, ch, s0, s1, seed, step=0.07, across=9, deep=DEEP, light=LIGHT, uvs=None):
    bm, cl = geo.bm, geo.col
    rows = []
    s = s0
    while s <= s1 + 1e-6:
        p, t = ch.pl.smooth_point(s, 0.3)
        nrm = Vector((-t.y, t.x, 0.0))
        w = ch.width(s, seed) * 1.02
        z = ch.level(s)
        row = []
        for k in range(across):
            v = k / (across - 1)
            off = (v - 0.5) * 2.0
            q = p + nrm * off * w
            vert = bm.verts.new((q.x, q.y, z + 0.012 * (1 - off * off)))
            edge = abs(off)
            c = mix_color(deep, light, smoothstep(0.1, 0.95, edge))
            vert[cl] = mix_color(c, EDGE, 0.55 * smoothstep(0.8, 1.0, edge))
            if uvs is not None:
                uvs.append((v, s * 0.5))
            row.append(vert)
        rows.append(row)
        s += step
    for j in range(len(rows) - 1):
        for k in range(across - 1):
            bm.faces.new((rows[j][k], rows[j][k + 1], rows[j + 1][k + 1], rows[j + 1][k]))


def banks(geo, ch, s0, s1, seed, reach=1.65, step=0.1):
    """Grass-and-sand strips from the water edge down to the lawn, so the
    raised channel sits in the garden instead of on it."""
    bm, cl = geo.bm, geo.col
    sand = srgb("#D8C49A")
    for side in (-1, 1):
        rows = []
        s = s0
        while s <= s1 + 1e-6:
            p, t = ch.pl.smooth_point(s, 0.3)
            nrm = Vector((-t.y, t.x, 0.0)) * side
            w = ch.width(s, seed)
            z = ch.level(s)
            row = []
            for f, dz in ((0.92, -0.03), (1.08, 0.05), (1.3, None), (reach, None)):
                q = p + nrm * w * f
                ground = T.height_at(q.x, q.y)
                zz = max(z + dz, ground + 0.01) if dz is not None else ground + 0.012
                vert = bm.verts.new((q.x, q.y, zz))
                g = T.grass_color(q.x, q.y)
                vert[cl] = mix_color(sand, g, smoothstep(1.02, 1.35, f))
                row.append(vert)
            rows.append(row if side > 0 else list(reversed(row)))
            s += step
        for j in range(len(rows) - 1):
            for k in range(3):
                bm.faces.new((rows[j][k], rows[j][k + 1], rows[j + 1][k + 1], rows[j + 1][k]))


def edge_stones(geo, ch, s0, s1, seed, density=0.55, size=(0.11, 0.22), cascade_boost=True):
    r = rng(seed)
    drops = ch.drops(s1)
    s = s0 + 0.2
    while s < s1 - 0.1:
        p, t = ch.pl.point(s)
        nrm = Vector((-t.y, t.x, 0))
        falling = any(a - 0.3 <= s <= b + 0.3 for a, b in drops)
        for sign in (-1, 1):
            if r.random() < (0.95 if falling and cascade_boost else density):
                q = p + nrm * sign * (ch.width(s, seed) + r.uniform(0.02, 0.18))
                z = T.height_at(q.x, q.y)  # bank stones sit on the ground, also beside a cascade
                sz = r.uniform(*size) * (1.5 if falling else 1.0)
                T.add_rock(geo, (q.x, q.y, z), sz, seed * 13 + int(s * 20) * 2 + sign, moss=0.5,
                           sink=0.4)
        s += r.uniform(0.28, 0.45) if not falling else 0.18
    # stepped stones under each cascade so the water visibly tumbles
    for a, b in drops:
        n = max(2, int((b - a) / 0.25))
        for i in range(n):
            sc = a + (i + 0.5) * (b - a) / n
            p, t = ch.pl.point(sc)
            z = ch.level(sc) - 0.12
            for o in (-0.55, 0.0, 0.55):
                q = p + Vector((-t.y, t.x, 0)) * o * ch.width(sc, seed)
                T.add_rock(geo, (q.x, q.y, min(z, T.height_at(q.x, q.y)) - 0.05), r.uniform(0.15, 0.22), seed * 31 + i * 3 + int(o * 10),
                           moss=0.3, squash=0.5, sink=0.55)


def foam_at(ch, seed, extra=()):
    el = []
    for k, (a, b) in enumerate(ch.drops()):
        p, t = ch.pl.smooth_point(b, 0.2)
        foam_patch(el, Vector((p.x, p.y, ch.level(b) + 0.03)), t, ch.half_width * 0.85, seed + k,
                   length=0.5, puff=0.12)
    for center, t, w, sd in extra:
        foam_patch(el, center, t, w, sd, length=0.45, puff=0.12)
    return el


# ------------------------------------------------------------------ pond


def pond_center():
    x, y = L.xy(*L.POND)
    return Vector((x, y, 0.0))


def pond_radius(a):
    return L.POND_RADIUS * (1.0 + 0.1 * fbm(math.cos(a) * 1.3, math.sin(a) * 1.3, 0.0, 2, 83.0))


def pond_level():
    c = pond_center()
    zs = []
    for i in range(48):
        a = TAU * i / 48
        for f in (0.0, 0.5, 1.0):
            r = pond_radius(a) * f
            zs.append(T.height_at(c.x + math.cos(a) * r, c.y + math.sin(a) * r))
    return max(zs) + 0.04


def rill():
    c = fountain_center()
    return Channel(L.RILL, fountain_level() - 0.06, L.RILL_HALF_WIDTH, lift=0.1,
                   end_level=pond_level(), prepend=(c.x, c.y))


def stream():
    return Channel(L.STREAM, pond_level(), L.STREAM_HALF_WIDTH, lift=0.07)


def stream_exit(ch):
    s = 0.0
    while s < ch.pl.length:
        p, _ = ch.pl.point(s)
        if T.radial_t(p.x, p.y) >= 1.0:
            return s
        s += 0.02
    return ch.pl.length


def build_pond(col):
    c = pond_center()
    wl = pond_level()
    seg, rings = 72, 10
    water = Geo()
    coords, colors, faces, uvs = [(c.x, c.y, wl)], [DEEP], [], [(0.5, 0.0)]
    for j in range(1, rings + 1):
        f = j / rings
        for i in range(seg):
            a = TAU * i / seg
            r = pond_radius(a) * f
            coords.append((c.x + math.cos(a) * r, c.y + math.sin(a) * r, wl))
            uvs.append((0.5 + 0.5 * f, a * L.POND_RADIUS * 0.6))
            cc = mix_color(srgb("#0397B6"), LIGHT, smoothstep(0.35, 1.0, f))
            colors.append(mix_color(cc, EDGE, 0.5 * smoothstep(0.9, 1.0, f)))
    for i in range(seg):
        faces.append((0, 1 + i, 1 + (i + 1) % seg))
    for j in range(rings - 1):
        for i in range(seg):
            a0, a1 = 1 + j * seg, 1 + (j + 1) * seg
            i2 = (i + 1) % seg
            faces.append((a0 + i, a1 + i, a1 + i2, a0 + i2))
    water.raw(coords, faces, colors)
    water.to_object("Water_Pond", col, [M.water("SWG_PondWater", streaks=0.3, glints=0.75)],
                    uv_fn=flow_uv(uvs))

    bank = Geo()
    sand = srgb("#D8C49A")
    prof = [(0.96, -0.03), (1.04, 0.07), (1.12, 0.09), (1.26, None), (1.4, None)]
    coords, colors, faces = [], [], []
    for f, dz in prof:
        for i in range(seg):
            a = TAU * i / seg
            r = pond_radius(a) * f
            x, y = c.x + math.cos(a) * r, c.y + math.sin(a) * r
            z = wl + dz if dz is not None else T.height_at(x, y) + (0.0 if f > 1.3 else 0.04)
            coords.append((x, y, max(z, T.height_at(x, y) + 0.005)))
            colors.append(mix_color(sand, T.grass_color(x, y), smoothstep(1.02, 1.24, f)))
    for j in range(len(prof) - 1):
        for i in range(seg):
            i2 = (i + 1) % seg
            faces.append((j * seg + i, (j + 1) * seg + i, (j + 1) * seg + i2, j * seg + i2))
    bank.raw(coords, faces, colors)
    bank.to_object("Pond_Bank_Sand", col, [M.terrain("SWG_Bank")])

    rocks = Geo()
    r = rng(840)
    for i in range(30):
        a = TAU * i / 30 + r.uniform(-0.06, 0.06)
        rr = pond_radius(a) * r.uniform(1.0, 1.08)
        x, y = c.x + math.cos(a) * rr, c.y + math.sin(a) * rr
        T.add_rock(rocks, (x, y, wl + 0.02), r.uniform(0.12, 0.24), 850 + i, moss=0.45, sink=0.5)
    rocks.to_object("Pond_Rocks", col, [M.rock("SWG_Rock")], sharp_angle=34)

    # lily pads with pink water lilies, and reeds on the back bank
    pads, lilies = Geo(), Geo()
    for i in range(9):
        a, d = r.uniform(0, TAU), r.uniform(0.25, 0.78)
        x = c.x + math.cos(a) * d * L.POND_RADIUS
        y = c.y + math.sin(a) * d * L.POND_RADIUS
        rad = r.uniform(0.17, 0.27)
        radii = [rad * (0.35 if k == 0 else 1.0) for k in range(14)]
        pads.prism((x, y, wl + 0.012), radii, 0.02, mix_color(srgb("#4E9A38"), srgb("#8CC650"), r.random()),
                   rot_z=r.uniform(0, TAU))
        if i % 2 == 0:
            p = Vector((x, y, wl + 0.07))
            pink = srgb("#F7A8C8") if i % 4 == 0 else srgb("#FFF1F5")
            for ring, (n, rr, tilt) in enumerate(((8, 0.085, -0.9), (6, 0.05, -0.4))):
                for k in range(n):
                    aa = TAU * (k + 0.5 * ring) / n
                    lilies.ico(p + Vector((math.cos(aa) * rr, math.sin(aa) * rr, 0.02 + ring * 0.03)),
                               0.075 - ring * 0.015, pink, subdiv=1, scale=(1, 0.55, 0.45),
                               rot=(0, tilt, aa))
            lilies.ico(p + Vector((0, 0, 0.06)), 0.035, srgb("#F7D45A"), subdiv=1)
    for k, deg in enumerate((70, 112, 150)):
        a = math.radians(deg)
        rr = pond_radius(a)
        x, y = c.x + math.cos(a) * rr, c.y + math.sin(a) * rr
        T.add_tuft(pads, (x, y, wl), 870 + k, height=0.7, color=srgb("#5C9A3A"))
        for j in range(3):
            b0 = Vector((x + r.uniform(-0.15, 0.15), y + r.uniform(-0.15, 0.15), wl))
            tip = b0 + Vector((r.uniform(-0.06, 0.06), r.uniform(-0.06, 0.06), r.uniform(0.7, 0.9)))
            pads.tube([b0, tip], [0.022, 0.012], srgb("#4F8A34"), segs=5, cap_start=False)
            pads.tube([tip - Vector((0, 0, 0.22)), tip - Vector((0, 0, 0.04))], [0.05, 0.05],
                      srgb("#7A4A2A"), segs=8)
    pads.to_object("Pond_Plants", col, [M.foliage()])
    lilies.to_object("Pond_LilyFlowers", col, [M.painted("SWG_Petals", roughness=0.7)])

    for k, (a, d, yaw) in enumerate(((2.2, 0.45, 1.2), (4.3, 0.55, -2.4))):
        koi = Geo()
        p = Vector((c.x + math.cos(a) * d * L.POND_RADIUS, c.y + math.sin(a) * d * L.POND_RADIUS,
                    wl + 0.006))
        fwd = Vector((math.cos(yaw), math.sin(yaw), 0))
        body = [p + fwd * (0.16 - 0.08 * i) for i in range(5)]
        koi.tube(body, [0.03, 0.055, 0.06, 0.045, 0.02], srgb("#F28A3A"), segs=8,
                 color_fn=lambda v, cc, p=p, k=k: mix_color(cc, srgb("#FFF4E8"),
                                                            0.7 * smoothstep(0.3, 0.6, fbm(v.co.x * 14, v.co.y * 14, 0, 1, 90.0 + k))))
        tail = p - fwd * 0.2
        side = Vector((-fwd.y, fwd.x, 0))
        koi.raw([tail + fwd * 0.04, tail - fwd * 0.08 + side * 0.06, tail - fwd * 0.08 - side * 0.06],
                [(0, 1, 2)], [srgb("#F4A060")] * 3)
        koi.to_object(f"Koi_{k + 1}", col, [M.painted("SWG_Koi", roughness=0.5, ao_strength=0.2)])


# ------------------------------------------------------------------ waterfall over the lip


def _fall_frame():
    ch = stream()
    s_exit = stream_exit(ch)
    p, t = ch.pl.smooth_point(s_exit, 0.2)
    out_dir = Vector((t.x, t.y, 0.0)).normalized()
    return ch, s_exit, p, out_dir


FALL = 7.4


def fall_bottom():
    ch, s_exit, p, out_dir = _fall_frame()
    z0 = ch.level(s_exit)
    b = p + out_dir * 1.05 + Vector((0, 0, z0 - 0.55 - FALL * 0.72))
    return (b.x, b.y, b.z)


def build_waterfall(col, ch, s_exit):
    _, _, p, out_dir = _fall_frame()
    side = Vector((-out_dir.y, out_dir.x, 0.0))
    z0 = ch.level(s_exit)
    w0 = ch.width(s_exit, 7)
    geo = Geo()
    bm, cl = geo.bm, geo.col
    rows_n, across = 64, 11
    rows, uvs = [], []
    for j in range(rows_n + 1):
        f = j / rows_n
        if f < 0.12:
            a = f / 0.12
            off, z = 0.1 + 0.6 * a, z0 - 0.55 * a * a
        else:
            g = (f - 0.12) / 0.88
            off, z = 0.7 + 0.35 * g, z0 - 0.55 - FALL * g
        width = w0 * (0.95 + 0.45 * f)
        row = []
        for k in range(across):
            v = k / (across - 1)
            o = (v - 0.5) * 2.0
            q = p + out_dir * (off + 0.16 * (1 - o * o)) + side * o * width
            vert = bm.verts.new((q.x, q.y, z))
            streak = fbm(o * 3.5, f * 1.2, 0.0, 3, seed=88.0)
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
    return geo.to_object("Waterfall", col, [M.waterfall("SWG_Waterfall")], uv_fn=flow_uv(uvs))


# ------------------------------------------------------------------ stage builder


def build(col):
    build_fountain(col)
    rc = rill()
    sc = stream()
    s_exit = stream_exit(sc)
    w1, w2, b1, st = Geo(), Geo(), Geo(), Geo()
    uv_r, uv_s = [], []
    ribbon(w1, rc, 0.6, rc.pl.length, 5, uvs=uv_r)
    w1.to_object("Water_Rill", col, [M.water("SWG_RillWater", streaks=1.0, glints=0.8)],
                 uv_fn=flow_uv(uv_r))
    ribbon(w2, sc, 0.0, s_exit + 0.25, 7, uvs=uv_s)
    w2.to_object("Water_Stream", col, [M.water("SWG_StreamWater", streaks=1.0, glints=0.8)],
                 uv_fn=flow_uv(uv_s))
    banks(b1, rc, 0.95, rc.pl.length - 0.25, 5, reach=1.5)
    banks(b1, sc, 0.35, s_exit - 0.1, 7)
    b1.to_object("Water_Bank_Sand", col, [M.terrain("SWG_Bank")])
    edge_stones(st, rc, 0.8, rc.pl.length - 0.2, 91)
    edge_stones(st, sc, 0.5, s_exit - 0.3, 93, density=0.4)
    st.to_object("Water_EdgeStones", col, [M.rock("SWG_Rock")], sharp_angle=34)
    build_pond(col)
    build_waterfall(col, sc, s_exit)
    p_end, t_end = rc.pl.smooth_point(rc.pl.length - 0.05, 0.2)
    p_exit, t_exit = sc.pl.smooth_point(s_exit - 0.12, 0.2)
    el = foam_at(rc, 95, extra=[(Vector((p_end.x, p_end.y, pond_level() + 0.03)), t_end, 0.3, 97),
                                (Vector((p_exit.x, p_exit.y, sc.level(s_exit) + 0.03)), t_exit, 0.35, 98)])
    metaball_object("Water_Foam", col, el,
                    [M.soft_cloud("SW_Foam", emission=6.0, opacity=0.9, edge=0.35)],
                    lambda co: (0.96, 0.99, 1.0, 1.0), resolution=0.05)
