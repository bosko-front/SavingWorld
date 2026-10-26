"""Quick low-sample render of the Garden for iteration.

blender -b source/garden.blend -P scripts/draft_render.py -- OUT.png [percent] [samples] [stage] [ambient]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import swg  # noqa: E402,F401
from swg import stages  # noqa: E402
from swi import preview, rig  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = os.path.abspath(argv[0])
pct = int(argv[1]) if len(argv) > 1 else 40
samples = int(argv[2]) if len(argv) > 2 else 48
stage = int(argv[3]) if len(argv) > 3 else 10
ambient = (argv[4] == "1") if len(argv) > 4 else True

scene = bpy.context.scene
stages.set_stage(stage, ambient=ambient)
rig.configure_render(scene, samples=samples, percentage=pct)
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
preview.compose_on_backdrop(out, out.replace(".png", "_bg.png"), rig.BACKDROP)
print("WROTE", out)
