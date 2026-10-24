"""Rebuild the Island scene from scratch and save source/island.blend.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/island/scripts/build_island.py
"""

import importlib
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

import swi  # noqa: E402,F401
from swi import common, stages, stylize  # noqa: E402

MODULES = ["layout", "common", "materials", "terrain", "nature", "structures", "props", "rig",
           "stages", "stylize"]


def main():
    t0 = time.time()
    for name in MODULES:  # fresh code when re-run inside an open Blender
        mod = sys.modules.get("swi." + name)
        if mod:
            importlib.reload(mod)
    from swi import nature, props, rig, structures, terrain

    common.clear_scene()
    scene = bpy.context.scene
    scene.name = "SavingWorlds_Island"
    cols = stages.create_collections()
    rig.build(cols["rig"])

    builders = [
        (0, [terrain.build]),
        (1, [nature.build_first_tree]),
        (2, [props.build_path]),
        (3, [nature.build_flowers_bushes]),
        (4, [structures.build_small_house]),
        (5, [structures.build_bridge, props.build_branch_path_west]),
        (6, [props.build_pond, props.build_branch_path_east, nature.build_pond_flowers]),
        (7, [nature.build_more_trees]),
        (8, [structures.build_large_house]),
        (9, [props.build_final_decorations]),
        (10, [props.build_completion]),
    ]
    only = os.environ.get("SW_ONLY_STAGES")
    allowed = {int(s) for s in only.split(",")} if only else None
    for n, fns in builders:
        if allowed is not None and n not in allowed:
            continue
        t = time.time()
        for fn in fns:
            fn(cols[n])
        print(f"stage {n:2d} built in {time.time() - t:5.1f}s "
              f"({len(cols[n].objects)} objects)")

    stylize.mark_no_outline(bpy.data.objects)
    stages.set_stage(10)
    out = os.path.join(os.path.dirname(HERE), "source", "island.blend")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backups
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print(f"saved {out} in {time.time() - t0:.1f}s")


main()
