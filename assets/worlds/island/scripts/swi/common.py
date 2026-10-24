"""Shared helpers for the Saving Worlds Island generator.

Everything here is deterministic: noise comes from mathutils.noise at fixed
offsets and every random choice goes through a seeded random.Random.
"""

import math
import random

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector, noise

TAU = math.tau


# ---------------------------------------------------------------- math utils

def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3.0 - 2.0 * t)


def noise3(x, y, z=0.0):
    """Perlin noise in roughly [-1, 1]."""
    return noise.noise(Vector((x, y, z)))


def fbm(x, y, z=0.0, octaves=4, seed=0.0, lacunarity=2.0, gain=0.5):
    amp, freq, total, norm = 1.0, 1.0, 0.0, 0.0
    for i in range(octaves):
        total += amp * noise3(x * freq + seed * 17.31 + i * 3.7,
                              y * freq + seed * 5.17 - i * 1.9,
                              z * freq + seed * 2.13 + i * 7.3)
        norm += amp
        amp *= gain
        freq *= lacunarity
    return total / norm


def rng(seed):
    return random.Random(seed)


# ---------------------------------------------------------------- colors

def srgb(hex_or_tuple, alpha=1.0):
    """sRGB hex (or 0-1 tuple) -> linear RGBA tuple for color attributes."""
    if isinstance(hex_or_tuple, str):
        h = hex_or_tuple.lstrip("#")
        c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    else:
        c = list(hex_or_tuple[:3])

    def to_lin(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    return (to_lin(c[0]), to_lin(c[1]), to_lin(c[2]), alpha)


def mix_color(a, b, t):
    return tuple(lerp(a[i], b[i], t) for i in range(4))


def scale_color(c, k):
    return (c[0] * k, c[1] * k, c[2] * k, c[3])


def jitter_color(c, r, amount=0.08):
    k = 1.0 + r.uniform(-amount, amount)
    return (c[0] * k, c[1] * k * (1 + r.uniform(-0.03, 0.03)), c[2] * k, c[3])


# ---------------------------------------------------------------- collections

def get_collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
    parent = parent or bpy.context.scene.collection
    if col.name not in parent.children:
        parent.children.link(col)
    return col


def clear_scene():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.curves,
                 bpy.data.cameras, bpy.data.lights, bpy.data.images,
                 bpy.data.node_groups, bpy.data.textures):
        for block in list(coll):
            coll.remove(block)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for w in list(bpy.data.worlds):
        bpy.data.worlds.remove(w)


# ---------------------------------------------------------------- geometry

class Geo:
    """Accumulates bmesh primitives with per-vertex color and material slot."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.verts.layers.float_color.new("Col")

    # -- low level -------------------------------------------------------
    def _finish(self, verts, color, mat, color_fn=None):
        for v in verts:
            v[self.col] = color_fn(v, color) if color_fn else color
        faces = set()
        for v in verts:
            faces.update(v.link_faces)
        for f in faces:
            f.material_index = mat
        return verts

    def raw(self, coords, faces, colors=None, mat=0, color=(1, 1, 1, 1)):
        vs = [self.bm.verts.new(c) for c in coords]
        for i, v in enumerate(vs):
            v[self.col] = colors[i] if colors else color
        for f in faces:
            try:
                face = self.bm.faces.new([vs[i] for i in f])
                face.material_index = mat
            except ValueError:
                pass
        return vs

    # -- primitives ------------------------------------------------------
    def ico(self, center, radius, color, subdiv=2, scale=(1, 1, 1), rot=(0, 0, 0),
            displace=0.0, freq=1.5, seed=0.0, mat=0, color_fn=None, flat_bottom=None):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=1.0)
        verts = res["verts"]
        m_rot = Euler(rot).to_matrix()
        c = Vector(center)
        for v in verts:
            n = v.co.normalized()
            d = 1.0 + displace * fbm(n.x * freq, n.y * freq, n.z * freq, 3, seed)
            p = Vector((n.x * scale[0], n.y * scale[1], n.z * scale[2])) * radius * d
            if flat_bottom is not None and p.z < -flat_bottom * radius * scale[2]:
                p.z = -flat_bottom * radius * scale[2]
            v.co = m_rot @ p + c
        return self._finish(verts, color, mat, color_fn)

    def tube(self, points, radii, color, segs=8, mat=0, cap_start=True, cap_end=True,
             color_fn=None, radial_fn=None):
        """Tube along a polyline. radial_fn(i, angle) -> radius multiplier."""
        pts = [Vector(p) for p in points]
        rings = []
        prev_n = None
        for i, p in enumerate(pts):
            if i == 0:
                t = (pts[1] - pts[0]).normalized()
            elif i == len(pts) - 1:
                t = (pts[-1] - pts[-2]).normalized()
            else:
                t = (pts[i + 1] - pts[i - 1]).normalized()
            if prev_n is None:
                ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
                n = t.cross(ref).normalized()
            else:
                n = (prev_n - t * prev_n.dot(t)).normalized()
            prev_n = n
            b = t.cross(n)
            ring = []
            for k in range(segs):
                a = TAU * k / segs
                r = radii[i] * (radial_fn(i, a) if radial_fn else 1.0)
                ring.append(self.bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r))
            rings.append(ring)
        verts = [v for ring in rings for v in ring]
        for i in range(len(rings) - 1):
            for k in range(segs):
                k2 = (k + 1) % segs
                self.bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
        if cap_start:
            c = self.bm.verts.new(pts[0] - (pts[1] - pts[0]).normalized() * radii[0] * 0.15)
            verts.append(c)
            for k in range(segs):
                self.bm.faces.new((rings[0][(k + 1) % segs], rings[0][k], c))
        if cap_end:
            c = self.bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * radii[-1] * 0.3)
            verts.append(c)
            for k in range(segs):
                self.bm.faces.new((rings[-1][k], rings[-1][(k + 1) % segs], c))
        return self._finish(verts, color, mat, color_fn)

    def box(self, center, size, color, rot=(0, 0, 0), bevel=0.0, bevel_segs=2, mat=0,
            color_fn=None):
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = res["verts"]
        sx, sy, sz = size
        for v in verts:
            v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
        if bevel > 0:
            edges = list({e for v in verts for e in v.link_edges})
            out = bmesh.ops.bevel(self.bm, geom=verts + edges, offset=bevel,
                                  offset_type="OFFSET", segments=bevel_segs, profile=0.5,
                                  affect="EDGES", clamp_overlap=True)
            verts = list({v for v in verts if v.is_valid} | set(out["verts"]))
        m = Euler(rot).to_matrix()
        c = Vector(center)
        for v in verts:
            v.co = m @ v.co + c
        return self._finish(verts, color, mat, color_fn)

    def prism(self, center, radii, height, color, rot_z=0.0, mat=0, bevel=0.0, color_fn=None):
        """Irregular flat polygon prism (flagstones, stepping stones, planks)."""
        n = len(radii)
        c = Vector(center)
        top, bot = [], []
        for k, r in enumerate(radii):
            a = TAU * k / n + rot_z
            off = Vector((math.cos(a) * r, math.sin(a) * r, 0))
            top.append(self.bm.verts.new(c + off + Vector((0, 0, height * 0.5))))
            bot.append(self.bm.verts.new(c + off * 0.97 - Vector((0, 0, height * 0.5))))
        self.bm.faces.new(top)
        self.bm.faces.new(list(reversed(bot)))
        for k in range(n):
            k2 = (k + 1) % n
            self.bm.faces.new((bot[k], bot[k2], top[k2], top[k]))
        verts = top + bot
        if bevel > 0:
            edges = list({e for v in top for e in v.link_edges})
            out = bmesh.ops.bevel(self.bm, geom=top + edges, offset=bevel, offset_type="OFFSET",
                                  segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
            verts = list({v for v in verts if v.is_valid} | set(out["verts"]))
        return self._finish(verts, color, mat, color_fn)

    def cone(self, base, tip, r0, r1, color, segs=8, mat=0, color_fn=None):
        return self.tube([base, tip], [r0, max(r1, 0.0005)], color, segs=segs, mat=mat,
                         color_fn=color_fn)

    # -- output ------------------------------------------------------------
    def to_object(self, name, collection, materials, smooth=True, sharp_angle=None,
                  uv_fn=None):
        me = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        self.bm.to_mesh(me)
        self.bm.free()
        for m in materials:
            me.materials.append(m)
        if smooth:
            me.shade_smooth()
            if sharp_angle is not None:
                me.set_sharp_from_angle(angle=math.radians(sharp_angle))
        else:
            me.shade_flat()
        if uv_fn:
            uv_fn(me)
        ob = bpy.data.objects.new(name, me)
        collection.objects.link(ob)
        return ob


def metaball_object(name, collection, elements, materials, color_fn, resolution=0.12,
                    threshold=0.6, displace_fn=None):
    """Merge soft blobs into one smooth mesh (via a temporary metaball), so
    tree crowns, clouds and foam have no visible sphere intersections.

    elements: [(center, radius, (sx, sy, sz))]; color_fn(co) -> RGBA."""
    mb = bpy.data.metaballs.new(name + "_mb")
    mb.resolution = resolution
    mb.render_resolution = resolution
    mb.threshold = threshold
    origin = Vector(elements[0][0])
    tmp = bpy.data.objects.new(name + "_mb", mb)
    tmp.location = origin
    collection.objects.link(tmp)
    for center, radius, size in elements:
        e = mb.elements.new()
        e.type = "ELLIPSOID"
        e.co = Vector(center) - origin
        e.radius = radius
        e.size_x, e.size_y, e.size_z = size
        e.stiffness = 2.0
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.metaballs.remove(mb)
    if displace_fn:
        for v in me.vertices:
            v.co += v.normal * displace_fn(v.co + origin, v.normal)
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    cols = []
    for v in me.vertices:
        cols.extend(color_fn(v.co + origin))
    attr.data.foreach_set("color", cols)
    me.materials.clear()
    for m in materials:
        me.materials.append(m)
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    ob.location = origin
    collection.objects.link(ob)
    return ob


def flow_uv(uvs):
    """uv_fn for Geo.to_object: per-vertex (u, v) list in creation order."""
    def apply(me):
        layer = me.uv_layers.new(name="Flow")
        data = []
        for loop in me.loops:
            data.extend(uvs[loop.vertex_index])
        layer.data.foreach_set("uv", data)
    return apply


def linked_copy(src, name, collection, location, rotation=(0, 0, 0), scale=1.0):
    ob = bpy.data.objects.new(name, src.data)
    ob.location = location
    ob.rotation_euler = rotation
    ob.scale = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    collection.objects.link(ob)
    return ob


def local_to_world(origin, rot_z, p):
    """Rotate a local (x, y, z) offset about Z and add the origin."""
    c, s = math.cos(rot_z), math.sin(rot_z)
    return Vector((origin[0] + p[0] * c - p[1] * s, origin[1] + p[0] * s + p[1] * c,
                   origin[2] + p[2]))


__all__ = [n for n in dir() if not n.startswith("_")] + ["Matrix", "Vector", "Euler"]
