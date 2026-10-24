"""Compare consecutive milestone renders and build the contact sheet.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/island/scripts/milestone_report.py

For each stage n (1-10) against stage n-1, at iPhone 17 Pro size, it prints
the share of pixels that changed visibly (more than 10/255 in any channel)
and the bounding box of the change, and checks that every render has the same
resolution. A stage that changes less than MIN_CHANGE of the image fails.
Writes renders/milestones/island_milestones_all.png (4 x 3 grid, stage order
left to right, top to bottom).
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

from swi import preview, rig  # noqa: E402

DIR = os.path.join(os.path.dirname(HERE), "renders", "milestones")
MIN_CHANGE = 0.004  # 0.4% of the image
THRESHOLD = 10 / 255.0


def load(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return (w, h), px.reshape(h, w, 4)[..., :3]


def name(stage, suffix="_backdrop_iphone17pro_3x"):
    """Review copy of a stage; built from the committed transparent master
    when missing (the backdrop and phone-size copies are not committed)."""
    path = os.path.join(DIR, f"island_stage{stage:02d}_preview{suffix}.png")
    if not os.path.exists(path):
        master = os.path.join(DIR, f"island_stage{stage:02d}_preview.png")
        backdrop = preview.compose_on_backdrop(master, master.replace(".png", "_backdrop.png"),
                                               rig.BACKDROP)
        preview.export_phone_sizes(backdrop)
    return path


ok = True
sizes = {load(os.path.join(DIR, f"island_stage{s:02d}_preview.png"))[0] for s in range(11)}
print("full-size resolutions:", sizes)
if len(sizes) != 1:
    ok = False
prev = None
for s in range(11):
    size, img = load(name(s))
    if prev is not None:
        changed = np.abs(img - prev).max(axis=2) > THRESHOLD
        share = float(changed.mean())
        ys, xs = np.nonzero(changed)
        box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
        flag = "ok" if share >= MIN_CHANGE else "TOO SMALL"
        if share < MIN_CHANGE:
            ok = False
        # rows are bottom-up in Blender pixel buffers; report y from the top
        if box:
            h = img.shape[0]
            box = (box[0], h - 1 - box[3], box[2], h - 1 - box[1])
        print(f"stage {s:2d} vs {s - 1:2d}: {share * 100:5.2f}% of pixels changed, box {box} {flag}")
    prev = img

rows = []
order = list(range(11))
for r in range(3):
    paths = [name(s, "_backdrop_iphoneSE_2x") for s in order[r * 4:r * 4 + 4]]
    rows.append(preview.side_by_side(paths, os.path.join(DIR, f"_row{r}.png"), gap=16))
# stack the rows vertically
imgs = [load(p)[1] for p in rows]
width = max(i.shape[1] for i in imgs)
bg = np.array(preview._hex("#FBF3E4"), dtype=np.float32)
canvas = []
for i in reversed(imgs):  # Blender buffers are bottom-up
    pad = np.ones((i.shape[0], width - i.shape[1], 3), dtype=np.float32) * bg
    canvas.append(np.concatenate([i, pad], axis=1))
sheet = np.concatenate(canvas, axis=0)
out = bpy.data.images.new("sw_all", sheet.shape[1], sheet.shape[0], alpha=False)
out.pixels.foreach_set(np.concatenate([sheet, np.ones(sheet.shape[:2] + (1,), np.float32)],
                                      axis=2).ravel())
out.filepath_raw = os.path.join(DIR, "island_milestones_all.png")
out.file_format = "PNG"
out.save()
for p in rows:
    os.remove(p)
print("sheet:", out.filepath_raw)
print("RESULT", "PASS" if ok else "FAIL")
