"""Compare Garden milestone renders and build a contact sheet.

/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    -P assets/worlds/garden/scripts/milestone_report.py -- [stage ...]

Uses the renders in renders/milestones/ (or SW_MILESTONES; default stages: every one present).
For each consecutive pair, at iPhone 17 Pro size, it prints the share of
pixels that changed visibly (more than 10/255 in any channel) and the box of
the change; a stage that changes less than MIN_CHANGE fails. It also checks
that all full-size renders share one resolution and that the rock underside
band (below the lip, left of the waterfall, outside the vines) is unchanged
between stages that add nothing there, which shows the light, camera and
terrain stayed the same. Writes renders/milestones/garden_milestones.png
(the stages at SE size in rows of four).
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
import numpy as np  # noqa: E402

import swg  # noqa: E402,F401
from swi import preview, rig  # noqa: E402

# SW_MILESTONES=<dir> compares candidate renders elsewhere (e.g. a review set) instead
DIR = os.environ.get("SW_MILESTONES") or os.path.join(os.path.dirname(HERE), "renders", "milestones")
MIN_CHANGE = 0.004
THRESHOLD = 10 / 255.0
# rock underside band at 17 Pro size (x0, y0, x1, y1 from the top left): below
# the lip and right of the waterfall; stage 10 adds vines there, so it is
# compared only between stages below 10
UNDERSIDE = (560, 640, 760, 720)


def load(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return (w, h), px.reshape(h, w, 4)[::-1, :, :3]  # top row first


def path(stage, suffix=""):
    """A stage render; the backdrop and phone-size copies are not committed,
    so they are rebuilt from the transparent master when missing."""
    p = os.path.join(DIR, f"garden_stage{stage:02d}_preview{suffix}.png")
    if suffix and not os.path.exists(p):
        master = path(stage)
        preview.export_phone_sizes(preview.compose_on_backdrop(
            master, master.replace(".png", "_backdrop.png"), rig.BACKDROP))
    return p


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
wanted = [int(a) for a in argv] or [s for s in range(11) if os.path.exists(path(s))]
ok = True
sizes = {load(path(s))[0] for s in wanted}
print("stages:", wanted, "full-size resolutions:", sizes)
if len(sizes) != 1:
    ok = False
prev = None
for s in wanted:
    _, img = load(path(s, "_backdrop_iphone17pro_3x"))
    if prev is not None:
        ps, pimg = prev
        changed = np.abs(img - pimg).max(axis=2) > THRESHOLD
        share = float(changed.mean())
        ys, xs = np.nonzero(changed)
        box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
        flag = "ok" if share >= MIN_CHANGE else "TOO SMALL"
        ok &= share >= MIN_CHANGE
        print(f"stage {s:2d} vs {ps:2d}: {share * 100:5.2f}% of pixels changed, box {box} {flag}")
        if s < 10:
            x0, y0, x1, y1 = UNDERSIDE
            d = np.abs(img[y0:y1, x0:x1] - pimg[y0:y1, x0:x1]) * 255.0
            same = float(d.max()) <= 3.0
            ok &= same
            print(f"  underside band unchanged: mean {d.mean():.3f}/255, max {d.max():.1f}/255 "
                  f"{'ok' if same else 'CHANGED'}")
    prev = (s, img)

# contact sheet: rows of four (like the Island's), stage order left to right, top to bottom
rows = []
for r in range(0, len(wanted), 4):
    paths = [path(s, "_backdrop_iphoneSE_2x") for s in wanted[r:r + 4]]
    rows.append(preview.side_by_side(paths, os.path.join(DIR, f"_row{r}.png"), gap=16,
                                     backdrop_hex=rig.BACKDROP))
imgs = [load(p)[1] for p in rows]
width = max(i.shape[1] for i in imgs)
bg = np.array(preview._hex(rig.BACKDROP), dtype=np.float32)
canvas = np.concatenate([np.concatenate([i, np.ones((i.shape[0], width - i.shape[1], 3), np.float32) * bg],
                                        axis=1) for i in imgs], axis=0)[::-1]  # Blender is bottom-up
out = bpy.data.images.new("garden_sheet", canvas.shape[1], canvas.shape[0], alpha=False)
out.pixels.foreach_set(np.concatenate([canvas, np.ones(canvas.shape[:2] + (1,), np.float32)], axis=2).ravel())
out.filepath_raw = os.path.join(DIR, "garden_milestones.png")
out.file_format = "PNG"
out.save()
for p in rows:
    os.remove(p)
print("sheet:", out.filepath_raw)
print("RESULT", "PASS" if ok else "FAIL")
