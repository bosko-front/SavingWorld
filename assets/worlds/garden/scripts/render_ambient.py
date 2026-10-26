"""Render the inputs the Garden layer export needs for ambient motion.

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/garden/source/garden.blend \
    -P assets/worlds/garden/scripts/render_ambient.py -- [samples] [masks-only]

Same method as the Island's render_ambient.py (D90-D93). Writes renders/ambient/:

- garden_stage00_noclouds.png  stage 0 at full quality with the two drifting clouds
                               (Cloud_2, Cloud_3) invisible to the camera. Cloud_1
                               stays: from 60% the waterfall falls into it, so it is
                               part of the base and never drifts.
- garden_stage06_nokoi.png     stage 6 at full quality with the koi invisible, so the
                               pond is complete under a swimming koi.
- garden_butterflies.png       only the ambient-only butterflies (SWG_Ambient), same rig
                               and storybook pass, transparent elsewhere.
- garden_mask_stage00.png      flat ID mask of stage 0: green 255 = drifting clouds.
- garden_mask_stage06.png      flat ID mask of stage 6: green = koi number x 64.
- garden_mask_stage09.png      flat ID mask of stage 9: blue = tree number x 16 (1 = the
                               blossom tree, 2..13 = layout.FINAL_TREES in order), red =
                               light number x 32 (1..4 = path lanterns, 5 = pergola
                               lantern, 6 = greenhouse lights).
- garden_flow_stage06.png      16-bit flow coordinates of the visible water at stage 6:
                               red = U, green = V / FLOW_V_MAX, blue = kind (1 = rill and
                               stream, 0.5 = waterfall and fountain curtain, 0.25 = pond and
                               fountain basins, where U runs from the centre to the rim).

Masks only select pixels (flat emission, point-sampled, raw color, no Freestyle and no
compositor); they never ship.
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

import swg  # noqa: E402,F401
from swg import layout as L  # noqa: E402
from swg import stages  # noqa: E402
from swi import rig  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MASKS_ONLY = "masks-only" in argv
numbers = [a for a in argv if a.isdigit()]
samples = int(numbers[0]) if numbers else 256
OUT = os.path.join(os.path.dirname(HERE), "renders", "ambient")
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene

DRIFTING_CLOUDS = ("Cloud_2", "Cloud_3")
KOI = ("Koi_1", "Koi_2")
TREES = ["Blossom"] + [f"Final{i + 1}" for i in range(len(L.FINAL_TREES))]
LIGHTS = ["Lantern_Glow_1", "Lantern_Glow_2", "Lantern_Glow_3", "Lantern_Glow_4",
          "Lantern_Glow_Pergola", "Greenhouse_LightGlow"]
FLOW = {"Water_Rill": 1.0, "Water_Stream": 1.0, "Waterfall": 0.5, "Water_FountainCurtain": 0.5,
        "Water_Pond": 0.25, "Water_Fountain": 0.25}
FLOW_V_MAX = 12.0


def render(path):
    scene.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"rendered {os.path.basename(path)} in {time.time() - t:.0f}s")


def hidden_render(stage, names, path, ambient=False):
    stages.set_stage(stage, ambient=ambient)
    rig.configure_render(scene, samples=samples, percentage=100)
    for n in names:
        bpy.data.objects[n].visible_camera = False
    render(path)
    for n in names:
        bpy.data.objects[n].visible_camera = True


if not MASKS_ONLY:
    hidden_render(0, DRIFTING_CLOUDS, os.path.join(OUT, "garden_stage00_noclouds.png"))
    hidden_render(6, KOI, os.path.join(OUT, "garden_stage06_nokoi.png"))
    # butterflies alone: every stage collection hidden, only SWG_Ambient shown
    stages.set_stage(-1, ambient=True)
    rig.configure_render(scene, samples=samples, percentage=100)
    render(os.path.join(OUT, "garden_butterflies.png"))


def flat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    em.inputs["Color"].default_value = (*color, 1.0)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def mask_color(name):
    if name in DRIFTING_CLOUDS:
        return (0.0, 1.0, 0.0)
    if name in KOI:
        return (0.0, (KOI.index(name) + 1) * 64 / 255, 0.0)
    for k, tree in enumerate(TREES, 1):
        if name in (f"Tree_{tree}_Trunk", f"Tree_{tree}_Canopy"):
            return (0.0, 0.0, k * 16 / 255)
    if name in LIGHTS:
        return ((LIGHTS.index(name) + 1) * 32 / 255, 0.0, 0.0)
    return (0.0, 0.0, 0.0)


def configure_mask():
    scene.render.use_compositing = False
    scene.render.use_freestyle = False
    scene.render.filter_size = 0.01
    scene.render.dither_intensity = 0.0
    scene.cycles.samples = 1
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = "Raw"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def flow(name, kind):
    """Emission of the Flow UV: (U, V / FLOW_V_MAX, kind)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "Flow"
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    scale = nt.nodes.new("ShaderNodeMath")
    scale.operation = "DIVIDE"
    scale.inputs[1].default_value = FLOW_V_MAX
    comb = nt.nodes.new("ShaderNodeCombineColor")
    nt.links.new(uv.outputs["UV"], sep.inputs[0])
    nt.links.new(sep.outputs["X"], comb.inputs[0])
    nt.links.new(sep.outputs["Y"], scale.inputs[0])
    nt.links.new(scale.outputs[0], comb.inputs[1])
    comb.inputs[2].default_value = kind
    nt.links.new(comb.outputs[0], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


cache = {}
for ob in scene.objects:
    if ob.type != "MESH":
        continue
    color = mask_color(ob.name)
    if color not in cache:
        cache[color] = flat(f"SWG_Mask_{len(cache)}", color)
    ob.data.materials.clear()
    ob.data.materials.append(cache[color])
configure_mask()
# the greenhouse lights shine through the glass in the art, so the mask sees through it
bpy.data.objects["Greenhouse_Glass"].visible_camera = False
for stage in (0, 6, 9):
    stages.set_stage(stage)
    render(os.path.join(OUT, f"garden_mask_stage{stage:02d}.png"))

# flow coordinates of the water at stage 6; everything else stays black and opaque,
# so lily pads, koi, foam and the bridge hide the water behind them
for name, kind in FLOW.items():
    me = bpy.data.objects[name].data
    me.materials.clear()
    me.materials.append(flow("SWG_Flow_" + name, kind))
stages.set_stage(6)
scene.render.image_settings.color_depth = "16"
render(os.path.join(OUT, "garden_flow_stage06.png"))
