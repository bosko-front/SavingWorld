"""Render a Saving Worlds app icon concept from the approved Island scene.

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/island/source/island.blend \
    -P assets/branding/scripts/render_icon.py -- <concept> [samples] [out_dir] [percentage]

The Island source (D76) is opened read-only: this script only shows one stage, aims its own square
orthographic camera (same 57/0/45 degree view and lights as every milestone render) and renders with
the approved storybook pass (swi.rig.configure_render). It never saves the .blend, so the frozen
milestone rig is untouched.

Writes into <out_dir> (default assets/branding/renders/concepts):
  <concept>_art.png      transparent render of the island alone (square)
  <concept>_light.png    1024x1024 opaque icon on the day sky
  <concept>_dark.png     1024x1024 opaque icon on the night sky
  <concept>_tinted.png   1024x1024 opaque grayscale icon on black (iOS tints it)
or, for a "mark_only" concept:
  <concept>_mark.png     transparent launch-screen mark (the kept objects, cropped to their bounds)
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets", "worlds", "island", "scripts"))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
from mathutils import Euler, Vector  # noqa: E402

from swi import rig, stages  # noqa: E402
import icon_compose  # noqa: E402

# Each concept: stage shown, objects hidden, orthographic scale (the square's side in scene units)
# and the frame centre as an offset from the milestone camera's centre, in camera units
# (x right, y up). The milestone frame is 35.2 units wide (rig.CAM_ORTHO_SCALE).
CONCEPTS = {
    # A: the finished Island, floating on its sky (stage 10).
    "finished_island": {
        "stage": 10,
        "hide": ("Complete_Islets_Plants", "Complete_Islets_Rock", "Complete_Islets_Top"),
        "ortho": 31.0,
        "centre": (-0.9, 0.9),
    },
    # B: a close crop of the cottage, the big tree and the stream (stage 10).
    "cottage_closeup": {
        "stage": 10,
        "hide": (),
        "ortho": 12.0,
        "centre": (-0.8, 7.0),
    },
    # C: the island with its first tree, the start of every world (stage 1).
    "first_tree": {
        "stage": 1,
        "hide": (),
        "ortho": 30.0,
        "centre": (-0.9, 1.2),
    },
    # Launch mark for B: only the cottage and the big tree, cut out (no ground, no sky).
    "cottage_mark": {
        "stage": 10,
        "only": ("LargeHouse", "FirstTree_Leaves", "FirstTree_Trunks"),
        "ortho": 12.0,
        "centre": (-0.8, 7.0),
        "mark_only": True,
    },
}


def aim_camera(scene, ortho, centre):
    cam = scene.camera
    rot = Euler(rig.CAM_ROT)
    m = rot.to_matrix()
    view = m @ Vector((0, 0, -1))
    target = rig.CAM_TARGET + (m @ Vector((1, 0, 0))) * centre[0] + (m @ Vector((0, 1, 0))) * centre[1]
    cam.rotation_euler = rot
    cam.location = target - view * rig.CAM_DISTANCE
    cam.data.ortho_scale = ortho
    cam.data.shift_x = cam.data.shift_y = 0.0


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    name = argv[0] if argv else "finished_island"
    samples = int(argv[1]) if len(argv) > 1 else 256
    out_rel = argv[2] if len(argv) > 2 else os.path.join("assets", "branding", "renders", "concepts")
    percentage = int(argv[3]) if len(argv) > 3 else 100
    concept = CONCEPTS[name]

    scene = bpy.context.scene
    stages.set_stage(concept["stage"])
    for obj_name in concept.get("hide", ()):
        bpy.data.objects[obj_name].hide_render = True
    if "only" in concept:
        for obj in scene.objects:
            if obj.type == "MESH" and obj.name not in concept["only"]:
                obj.hide_render = True
    rig.configure_render(scene, samples=samples, percentage=percentage)
    scene.render.resolution_x = scene.render.resolution_y = 2048
    aim_camera(scene, concept["ortho"], concept["centre"])

    out_dir = out_rel if os.path.isabs(out_rel) else os.path.join(ROOT, out_rel)
    os.makedirs(out_dir, exist_ok=True)
    art = os.path.join(out_dir, f"{name}_art.png")
    scene.render.filepath = art
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"rendered {name} at {percentage}% {samples} spp in {time.time() - t:.0f}s -> {art}")
    if concept.get("mark_only"):
        paths = [icon_compose.save_mark(art, out_dir, name)]
    else:
        paths = icon_compose.compose_all(art, out_dir, name)
    for path in paths:
        print("wrote", path)


main()
