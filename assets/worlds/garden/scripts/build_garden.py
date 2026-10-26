"""Rebuild the Garden scene from scratch and save source/garden.blend.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/garden/scripts/build_garden.py

SW_ONLY_STAGES=0,6 builds only those stages (fast iteration).
"""

import importlib
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

import swg  # noqa: E402,F401  (puts the Island's shared swi package on the path)
from swi import common, rig  # noqa: E402

MODULES = ["layout", "terrain", "water", "plants", "structures", "stages", "style"]


def main():
    t0 = time.time()
    for name in MODULES:  # fresh code when re-run inside an open Blender
        mod = sys.modules.get("swg." + name)
        if mod:
            importlib.reload(mod)
    from swg import plants, stages, structures, style, terrain, water

    common.clear_scene()
    scene = bpy.context.scene
    scene.name = "SavingWorlds_Garden"
    cols = stages.create_collections()
    rig.build(cols["rig"])  # the Island's frozen camera, lights and render settings

    builders = [
        (0, [terrain.build]),
        (1, [plants.build_seedlings]),
        (2, [plants.build_flower_bed]),
        (3, [plants.build_more_flowers]),
        (4, [plants.build_blossom_tree]),
        (5, [structures.build_path, plants.build_path_border]),
        (6, [water.build, structures.build_bridge, plants.build_water_planting]),
        (7, [structures.build_bench_decor]),
        (8, [structures.build_greenhouse_garden, plants.build_greenhouse_flowers]),
        (9, [structures.build_pergola, plants.build_final_trees, plants.build_wall_ivy]),
        (10, [structures.build_completion]),
        ("ambient", [structures.build_butterflies]),
    ]
    only = os.environ.get("SW_ONLY_STAGES")
    allowed = {s if s == "ambient" else int(s) for s in only.split(",")} if only else None
    for n, fns in builders:
        if allowed is not None and n not in allowed:
            continue
        t = time.time()
        for fn in fns:
            fn(cols[n])
        print(f"stage {n!s:>7} built in {time.time() - t:5.1f}s ({len(cols[n].objects)} objects)")

    style.mark_no_outline(bpy.data.objects)
    stages.set_stage(10, ambient=True)
    out = os.environ.get("SW_OUT") or os.path.join(os.path.dirname(HERE), "source", "garden.blend")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print(f"saved {out} in {time.time() - t0:.1f}s")


main()
