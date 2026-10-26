"""Check Garden milestone consistency (same checks as the Island's script).

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/garden/source/garden.blend \
    -P assets/worlds/garden/scripts/verify_stages.py -- [stage ...]

For every requested stage (default 0..10) it reports:
- the visible collections, and that each stage only adds to the previous one
  (the Garden replaces nothing, D115);
- a fingerprint of the camera, lights, render settings and base terrain
  (lawn, underside, walls), which must be identical for every stage, and
  equal to the Island's rig part;
- objects whose lowest part floats above the ground beneath it, which would
  show as a gap in the render.
Exit code 1 if any check fails.
"""

import hashlib
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import swg  # noqa: E402,F401
from swg import stages  # noqa: E402
from swg import terrain as T  # noqa: E402
from swg import water as W  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
wanted = [int(a) for a in argv] or list(range(11))

# objects that float by design or rest on another object rather than the
# lawn: canopies on trunks, flowers and leaves on stems, beds and pots, plants
# inside the greenhouse, roses on the pergola, vines on the walls and cliff,
# lantern glass, fountain parts above its basin, butterflies, islets, clouds
FLOAT_OK = ("_Canopy", "Cloud_", "Waterfall", "Water_Foam", "Water_FountainFoam",
            "Water_FountainCurtain", "Glow", "Moss_Overhang", "Garden_Underside", "Flowers",
            "Blooms", "Leaves", "Roses", "Pergola_Canopy", "Vines_", "Greenhouse_Plants",
            "Greenhouse_Flowers", "Greenhouse_Glass", "Greenhouse_Frame", "Complete_Islets",
            "Butterfly", "Koi", "VegBeds_Plants", "VegBeds_Vegetables", "Seedlings_Sprouts",
            "Decor_Plants", "Nook_Teaset", "Pond_LilyFlowers", "Pond_Plants", "Fountain_Stone",
            "Water_Fountain", "Water_Birdbath", "Seedlings_WateringCan", "Lily",
            "FlowerBed_Soil", "VegBeds_Soil")  # soil sits inside the raised frames
GAP_LIMIT = 0.12


def fingerprint(scene, names):
    h = hashlib.sha256()
    for name in ("SW_Camera", "SW_Sun", "SW_Fill", "SW_Bounce"):
        ob = bpy.data.objects[name]
        h.update(repr([round(v, 5) for row in ob.matrix_world for v in row]).encode())
        d = ob.data
        h.update(repr([getattr(d, k, None) for k in ("ortho_scale", "energy", "angle")]).encode())
        if hasattr(d, "color"):
            h.update(repr([round(c, 5) for c in d.color]).encode())
    h.update(repr((scene.render.resolution_x, scene.render.resolution_y,
                   scene.view_settings.view_transform, scene.view_settings.look,
                   round(scene.view_settings.exposure, 4))).encode())
    for name in names:
        me = bpy.data.objects[name].data
        co = [0.0] * (len(me.vertices) * 3)
        me.vertices.foreach_get("co", co)
        h.update(repr((len(co), round(sum(co), 3))).encode())
    return h.hexdigest()[:16]


_pond = None


def ground_under(x, y):
    """Lawn height, or the water surface where a point stands in the pond or
    in a channel (stones and reeds sit in the water)."""
    global _pond
    if _pond is None:
        _pond = (W.pond_center(), W.pond_level(), W.rill(), W.stream())
    c, wl, rill, stream = _pond
    z = T.height_at(x, y)
    dx, dy = x - c.x, y - c.y
    if math.hypot(dx, dy) < W.pond_radius(math.atan2(dy, dx)) * 1.3:
        z = max(z, wl - 0.35)
    for ch in (rill, stream):
        d, s, _ = ch.pl.nearest(x, y)
        if d < ch.half_width * 2.2:
            z = max(z, ch.level(s) - 0.4)
    return z


def _groups(me, mw):
    """Vertex islands merged when their bounding boxes touch (see the Island
    script), each reduced to its lowest point."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    seen = [False] * len(bm.verts)
    boxes = []
    for v in bm.verts:
        if seen[v.index]:
            continue
        stack, pts = [v], []
        seen[v.index] = True
        while stack:
            cur = stack.pop()
            pts.append(mw @ cur.co)
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if not seen[o.index]:
                    seen[o.index] = True
                    stack.append(o)
        lo = [min(p[i] for p in pts) for i in range(3)]
        hi = [max(p[i] for p in pts) for i in range(3)]
        boxes.append([lo, hi, min(pts, key=lambda p: p.z)])
    bm.free()
    parent = list(range(len(boxes)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    cell = {}
    for i, (lo, hi, _) in enumerate(boxes):
        for gx in range(int(lo[0] // 1), int(hi[0] // 1) + 1):
            for gy in range(int(lo[1] // 1), int(hi[1] // 1) + 1):
                cell.setdefault((gx, gy), []).append(i)
    pad = 0.04
    for members in cell.values():
        for ai in range(len(members)):
            i = members[ai]
            for j in members[ai + 1:]:
                a, b = boxes[i], boxes[j]
                if all(a[0][k] - pad <= b[1][k] and b[0][k] - pad <= a[1][k] for k in range(3)):
                    parent[find(i)] = find(j)
    groups = {}
    for i, box in enumerate(boxes):
        r = find(i)
        if r not in groups or box[2].z < groups[r].z:
            groups[r] = box[2]
    return list(groups.values())


def floating(objects):
    out = []
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in objects:
        if ob.type != "MESH" or any(k in ob.name for k in FLOAT_OK):
            continue
        me = ob.evaluated_get(dg).to_mesh()
        lows = _groups(me, ob.matrix_world)
        ob.evaluated_get(dg).to_mesh_clear()
        bad = []
        for p in lows:
            if T.radial_t(p.x, p.y) > 0.99:
                continue
            gap = p.z - ground_under(p.x, p.y)
            if gap > GAP_LIMIT:
                bad.append((round(gap, 2), round(p.x, 1), round(p.y, 1)))
        if bad:
            bad.sort(reverse=True)
            out.append((ob.name, len(bad), bad[:3]))
    return out


scene = bpy.context.scene
ok = True
prev = None
prints = set()
base = ("Garden_Top", "Garden_Underside", "Garden_Walls")
for st in wanted:
    shown = stages.set_stage(st)
    bpy.context.view_layer.update()
    fp = fingerprint(scene, base)
    prints.add(fp)
    added = sorted(set(shown) - set(prev or []))
    removed = sorted(set(prev or []) - set(shown))
    print(f"stage {st:2d}: rig+terrain {fp}  shows {len(shown)} collections; "
          f"added {added or '-'}; removed {removed or '-'}")
    if removed:
        print("  FAIL unexpected removal")
        ok = False
    objs = [o for c in bpy.data.collections if c.name in shown for o in c.objects]
    fl = floating(objs)
    print(f"  floating objects: {fl or 'none'}")
    if fl:
        ok = False
    prev = shown
print("rig fingerprint (camera, lights, render settings only):", fingerprint(scene, ()))
if len(prints) != 1:
    print("FAIL camera/lights/terrain differ between stages")
    ok = False
print("RESULT", "PASS" if ok else "FAIL")
stages.set_stage(10)
sys.exit(0 if ok else 1)
