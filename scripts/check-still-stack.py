"""Still-stack check (Phase 17): the app's resting world against the approved renders.

The app decides which layers a stage draws at rest (visibleLayers minus the layers that are invisible at
rest) in TypeScript; tests/unit/garden-manifest.test.ts writes that stack for every stage when
STILL_STACK_OUT is set. This script composes those layers from the 2048 export at their canvas
positions, exactly as the app stacks them, and compares each stage with its approved render
(premultiplied RGBA, 0-255 per channel, the export's own rebuild measure). Run with Blender's Python,
which ships numpy:

    STILL_STACK_OUT=/tmp/garden-stack.json npx jest tests/unit/garden-manifest.test.ts -t "writes the still stack"
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scripts/check-still-stack.py -- \
        /tmp/garden-stack.json assets/worlds/garden/export/2048 assets/worlds/garden/renders/milestones garden

Exits with status 1 when a stage's mean error exceeds 1/255 (the export's rebuild is <= 0.53/255; the
largest single pixels are the known back-rim Freestyle line, D76/D120).
"""

import json
import os
import sys

import bpy
import numpy as np

MEAN_LIMIT = 1.0


def load(path):
    img = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)[::-1].copy()


def premul(img):
    out = img.copy()
    out[..., :3] *= out[..., 3:4]
    return out


def over(dst_pre, layer_straight, x0, y0):
    h, w = layer_straight.shape[:2]
    a = layer_straight[..., 3:4]
    region = dst_pre[y0:y0 + h, x0:x0 + w]
    region[..., :3] = layer_straight[..., :3] * a + region[..., :3] * (1 - a)
    region[..., 3:4] = a + region[..., 3:4] * (1 - a)


def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    stack_path, export_dir, renders_dir, theme = args
    stack = json.load(open(stack_path))
    failed = False
    for entry in stack["stages"]:
        stage = entry["stage"]
        render = load(os.path.join(renders_dir, f"{theme}_stage{stage:02d}_preview.png"))
        comp = np.zeros_like(render)
        for layer in entry["layers"]:
            img = load(os.path.join(export_dir, layer["file"]))
            assert img.shape[0] == layer["height"] and img.shape[1] == layer["width"], layer["id"]
            over(comp, img, layer["x"], layer["y"])
        d = np.abs(comp - premul(render)).max(axis=2) * 255
        mean, p999, top = float(d.mean()), float(np.percentile(d, 99.9)), float(d.max())
        ok = mean <= MEAN_LIMIT
        failed |= not ok
        print(f"stage {stage:2d}: {len(entry['layers']):2d} layers, mean {mean:.3f}/255, 99.9% {p999:.1f}, max {top:.0f} {'PASS' if ok else 'FAIL'}")
    print("still stack:", "FAIL" if failed else "PASS")
    sys.exit(1 if failed else 0)


main()
