"""Render the inputs the layer export needs for ambient motion (Phase 10.5, D90).

/Applications/Blender.app/Contents/MacOS/Blender -b assets/worlds/island/source/island.blend \
    -P assets/worlds/island/scripts/render_ambient.py -- [samples] [flow-only]

`flow-only` renders just island_flow_stage00.png (seconds; the other files take
about a minute on the M4 and only change when the scene does).

Writes renders/ambient/:

- island_stage00_noclouds.png  stage 0 at full quality (same rig, samples and
                               storybook pass as the milestone renders) with
                               the clouds invisible to the camera. The clouds
                               cast no shadows and still light their
                               surroundings, so only the pixels they covered
                               change: the export takes those (the waterfall
                               behind the low cloud, empty sky elsewhere) to
                               fill the base where a cloud drifts away.
- island_mask_stage00.png      flat ID mask of stage 0: red 255 = stream water
                               and foam, red 128 = waterfall, green 255 = clouds.
- island_mask_stage07.png      flat ID mask of stage 7: blue = tree number x 16
                               (1 = the first tree, 2..9 = layout.MORE_TREES in
                               order); everything else black.
- island_flow_stage00.png      16-bit flow coordinates of the visible water at
                               stage 0, clouds hidden: red = U (across the water,
                               0 and 1 are the banks), green = V / FLOW_V_MAX
                               (along the flow, increasing downstream), blue =
                               1 for the stream, 0.5 for the waterfall. The
                               export draws its flowing streaks in these
                               coordinates, so they follow every bend and fall.

Masks only select pixels: every object is a flat emission color (opaque, so
nearer objects hide farther ones exactly as in the render), point-sampled with
no pixel filter, raw color, no Freestyle and no compositor pass. They are not
art and never ship in the app.
"""

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from swi import layout as L  # noqa: E402
from swi import rig, stages  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FLOW_ONLY = "flow-only" in argv
numbers = [a for a in argv if a.isdigit()]
samples = int(numbers[0]) if numbers else 256
OUT = os.path.join(os.path.dirname(HERE), "renders", "ambient")
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene

STREAM = ("Stream_Water", "Stream_Foam")
WATERFALL = ("Waterfall",)
CLOUDS = ("Clouds_Base",)
TREE_PREFIXES = ("FirstTree_", "MoreTrees_Trunks", "MoreTrees_Leaves", "MoreTrees_Needles")
TREES = [L.FIRST_TREE["pos"]] + [pos for _, pos, _, _, _ in L.MORE_TREES]
FLOW_V_MAX = 12.0  # larger than any Flow V (stream: half its length, waterfall: 4.5)


def render(path):
    scene.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"rendered {os.path.basename(path)} in {time.time() - t:.0f}s")


# ------------------------------------------------------------------ stage 0 without clouds

if not FLOW_ONLY:
    stages.set_stage(0)
    rig.configure_render(scene, samples=samples, percentage=100)
    for name in CLOUDS:
        bpy.data.objects[name].visible_camera = False
    render(os.path.join(OUT, "island_stage00_noclouds.png"))
    for name in CLOUDS:
        bpy.data.objects[name].visible_camera = True


# ------------------------------------------------------------------ flat ID masks

def flat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    if isinstance(color, str):
        attr = nt.nodes.new("ShaderNodeAttribute")
        attr.attribute_name = color
        nt.links.new(attr.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (*color, 1.0)
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def tree_ids(ob):
    """Per-vertex color attribute SW_ID: blue = (number of the nearest tree) x 16."""
    me = ob.data
    attr = me.color_attributes.get("SW_ID") or me.color_attributes.new("SW_ID", "FLOAT_COLOR",
                                                                         "POINT")
    first = ob.name.startswith("FirstTree_")
    for i, v in enumerate(me.vertices):
        if first:
            k = 1
        else:
            w = ob.matrix_world @ v.co
            k = 2 + min(range(len(TREES) - 1),
                        key=lambda j: (Vector(TREES[j + 1]) - Vector((w.x, w.y))).length)
        attr.data[i].color = (0.0, 0.0, k * 16 / 255, 1.0)


def mask_materials():
    black = flat("SW_Mask_Black", (0.0, 0.0, 0.0))
    by_name = {}
    for names, color in ((STREAM, (1.0, 0.0, 0.0)), (WATERFALL, (128 / 255, 0.0, 0.0)),
                         (CLOUDS, (0.0, 1.0, 0.0))):
        m = flat("SW_Mask_" + names[0], color)
        for n in names:
            by_name[n] = m
    trees = flat("SW_Mask_Trees", "SW_ID")
    for ob in scene.objects:
        if ob.type != "MESH":
            continue
        if ob.name.startswith(TREE_PREFIXES):
            tree_ids(ob)
            mat = trees
        else:
            mat = by_name.get(ob.name, black)
        ob.data.materials.clear()
        ob.data.materials.append(mat)


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


mask_materials()
configure_mask()
for stage in () if FLOW_ONLY else (0, 7):
    stages.set_stage(stage)
    render(os.path.join(OUT, f"island_mask_stage{stage:02d}.png"))

# flow coordinates of the water, with the clouds out of the way (a drifting cloud
# shows the water behind it)
for name, kind in (("Stream_Water", 1.0), ("Waterfall", 0.5)):
    me = bpy.data.objects[name].data
    me.materials.clear()
    me.materials.append(flow("SW_Flow_" + name, kind))
for name in CLOUDS:
    bpy.data.objects[name].visible_camera = False
stages.set_stage(0)
scene.render.image_settings.color_depth = "16"
render(os.path.join(OUT, "island_flow_stage00.png"))
