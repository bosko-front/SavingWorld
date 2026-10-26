"""Report how the visible geometry sits in the fixed camera frame.

blender -b source/garden.blend -P scripts/check_framing.py -- [stage]

Prints the frame-space extents (0..1 is inside the image) and the ortho scale
and target shift that would fit the content with a margin. Use it to confirm
every stage stays inside the frozen camera; it never changes the scene.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402

import swg  # noqa: E402,F401
from swg import stages  # noqa: E402
from swi import rig  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
stage = int(argv[0]) if argv else 10
stages.set_stage(stage, ambient=True)
scene = bpy.context.scene
cam = scene.camera
depsgraph = bpy.context.evaluated_depsgraph_get()

lo = [1e9, 1e9]
hi = [-1e9, -1e9]
worst = {}
for ob in scene.objects:
    if ob.type != "MESH" or not ob.visible_get():
        continue
    me = ob.evaluated_get(depsgraph).to_mesh()
    mw = ob.matrix_world
    step = max(1, len(me.vertices) // 4000)
    for v in list(me.vertices)[::step]:
        p = world_to_camera_view(scene, cam, mw @ v.co)
        lo[0], lo[1] = min(lo[0], p.x), min(lo[1], p.y)
        hi[0], hi[1] = max(hi[0], p.x), max(hi[1], p.y)
        out = max(-p.x, -p.y, p.x - 1, p.y - 1)
        if out > worst.get(ob.name, -1e9):
            worst[ob.name] = out
    ob.evaluated_get(depsgraph).to_mesh_clear()

print(f"stage {stage}: frame x {lo[0]:.3f}..{hi[0]:.3f}  y {lo[1]:.3f}..{hi[1]:.3f}")
outside = {k: v for k, v in worst.items() if v > 0}
print("objects outside frame:", outside or "none")
w = (hi[0] - lo[0]) * rig.CAM_ORTHO_SCALE
h = (hi[1] - lo[1]) * rig.CAM_ORTHO_SCALE * rig.RES[1] / rig.RES[0]
aspect = rig.RES[0] / rig.RES[1]
fit = max(w, h * aspect)
print(f"content {w:.2f} x {h:.2f} units; ortho scale for 6% margin: {fit * 1.06:.2f}")
cx = ((lo[0] + hi[0]) / 2 - 0.5) * rig.CAM_ORTHO_SCALE
cy = ((lo[1] + hi[1]) / 2 - 0.5) * rig.CAM_ORTHO_SCALE / aspect
print(f"content center offset in camera units: right {cx:.2f}, up {cy:.2f}")
m = cam.matrix_world.to_3x3()
new_target = rig.CAM_TARGET + (m @ Vector((1, 0, 0))) * cx + (m @ Vector((0, 1, 0))) * cy
print(f"suggested CAM_TARGET = Vector(({new_target.x:.2f}, {new_target.y:.2f}, {new_target.z:.2f}))")
