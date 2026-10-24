"""Render the high-quality preview of one stage (default: completed island).

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/island/source/island.blend \
    -P assets/worlds/island/scripts/render_preview.py -- [stage] [samples] [out_dir]

Writes <out_dir, default renders/preview>/island_stageNN_preview.png (transparent, 2048x1536 at
100%), *_backdrop.png (same image over the preview backdrop color) and
downscaled phone-size copies of the backdrop image (swi.preview.PHONE_SIZES).
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

from swi import preview, rig, stages  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
stage = int(argv[0]) if argv else 10
samples = int(argv[1]) if len(argv) > 1 else 256  # 512 showed no visible gain at phone size
out_rel = argv[2] if len(argv) > 2 else os.path.join("renders", "preview")

scene = bpy.context.scene
shown = stages.set_stage(stage)
rig.configure_render(scene, samples=samples, percentage=100)
out_dir = out_rel if os.path.isabs(out_rel) else os.path.join(os.path.dirname(HERE), out_rel)
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, f"island_stage{stage:02d}_preview.png")
scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
backdrop = preview.compose_on_backdrop(out, out.replace(".png", "_backdrop.png"), rig.BACKDROP)
phones = preview.export_phone_sizes(backdrop)
print(f"stage {stage} ({', '.join(sorted(shown))})")
print(f"rendered {scene.render.resolution_x}x{scene.render.resolution_y} "
      f"{samples} spp in {time.time() - t:.0f}s -> {out}")
for p in phones:
    print("phone size:", p)
