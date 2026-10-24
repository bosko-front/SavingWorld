"""Check milestone consistency before rendering stages.

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/island/source/island.blend \
    -P assets/worlds/island/scripts/verify_stages.py -- [stage ...]

For every requested stage (default 0..10) it reports:
- the visible collections, and whether each stage only adds to the previous
  one (apart from the declared replacement of the small house);
- a fingerprint of the camera, lights, world and base terrain, which must be
  identical for every stage;
- objects whose lowest part floats above the ground (or water surface)
  beneath it, which would show as a gap in the render.
Exit code 1 if any check fails.
"""

import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

from swi import layout as L  # noqa: E402
from swi import stages  # noqa: E402
from swi import terrain as T  # noqa: E402
from swi.props import pond_level, pond_radius  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
wanted = [int(a) for a in argv] or list(range(11))

# objects that float by design, or rest on another object rather than the
# terrain: crowns and needles on trunks, flower heads on their stems (in the
# *Leaves objects), vegetables in the raised beds, the awning on its posts
FLOAT_OK = ("Complete_Islets", "Clouds", "Waterfall", "Stream_Foam", "Decor_Lantern",
            "Complete_Awning", "Moss_Overhang", "Island_Underside", "FirstTree_Leaves",
            "MoreTrees_Leaves", "_Needles", "Flowers", "Blossoms", "Complete_Garden")
GAP_LIMIT = 0.12


def fingerprint(scene):
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
    for name in ("Island_Top", "Island_Underside", "Stream_Water"):
        me = bpy.data.objects[name].data
        co = [0.0] * (len(me.vertices) * 3)
        me.vertices.foreach_get("co", co)
        h.update(repr((len(co), round(sum(co), 3))).encode())
    return h.hexdigest()[:16]


def ground_under(x, y):
    """Terrain height, or the pond surface when the point is over the pond."""
    z = T.height_at(x, y)
    import math
    dx, dy = x - L.POND_CENTER[0], y - L.POND_CENTER[1]
    if math.hypot(dx, dy) < pond_radius(math.atan2(dy, dx)) * 1.3:
        z = max(z, pond_level() - 0.35)
    return z


def _groups(me, mw):
    """Vertex islands merged when their bounding boxes touch, so a house or a
    fence counts as one piece and a stray barrel or stone as its own."""
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
        low = min(pts, key=lambda p: p.z)
        boxes.append([lo, hi, low])
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
for st in wanted:
    shown = stages.set_stage(st)
    bpy.context.view_layer.update()
    fp = fingerprint(scene)
    prints.add(fp)
    order = sorted(shown)
    added = sorted(set(shown) - set(prev or []))
    removed = sorted(set(prev or []) - set(shown))
    print(f"stage {st:2d}: rig+terrain {fp}  shows {len(order)} collections; "
          f"added {added or '-'}; removed {removed or '-'}")
    if prev is not None and removed and not (st >= 8 and removed == ["SW_04_SmallHouse"]):
        print("  FAIL unexpected removal")
        ok = False
    objs = [o for c in bpy.data.collections if c.name in shown for o in c.objects]
    fl = floating(objs)
    print(f"  floating objects: {fl or 'none'}")
    if fl:
        ok = False
    prev = shown
if len(prints) != 1:
    print("FAIL camera/lights/terrain differ between stages")
    ok = False
print("RESULT", "PASS" if ok else "FAIL")
stages.set_stage(10)
sys.exit(0 if ok else 1)
