"""Quick low-sample render of the currently open scene for iteration.

blender -b source/island.blend -P scripts/draft_render.py -- OUT.png [percent] [samples] [stage]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

from swi import preview, rig, stages  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = os.path.abspath(argv[0])
pct = int(argv[1]) if len(argv) > 1 else 40
samples = int(argv[2]) if len(argv) > 2 else 48
stage = int(argv[3]) if len(argv) > 3 else 10

scene = bpy.context.scene
stages.set_stage(stage)
rig.configure_render(scene, samples=samples, percentage=pct)
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
preview.compose_on_backdrop(out, out.replace(".png", "_bg.png"), rig.BACKDROP)
print("WROTE", out)
