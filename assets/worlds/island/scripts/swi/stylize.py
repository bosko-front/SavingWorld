"""Storybook rendering pass, applied in the compositor after Cycles.

1. Light bands: the direct diffuse light (sun, fill, bounce) is stepped into
   three soft levels (shadow, half light, full light) and then rebuilt with
   the indirect light and every other pass, so color stays painted while the
   light reads in clear shapes.
2. Outlines: thin warm-brown Freestyle silhouettes, drawn on a separate pass
   and laid over the image at reduced opacity. Meshes whose faces carry the
   Freestyle face mark (water, clouds, grass, flowers, path sand) get none.
3. Painterly filter: an anisotropic Kuwahara filter flattens fine shading
   into brush-like strokes. Transparent pixels are inpainted first so the
   filter never pulls dark background into the island's edge.

Everything is driven by the constants below; STYLE_ENABLED = False renders
the plain Cycles image for comparison.
"""

import os

import bpy

STYLE_ENABLED = os.environ.get("SW_STYLE", "1") != "0"

# light bands, in units of the sun strength
BAND_LEVELS = [(0.0, 0.14), (0.24, 0.14), (0.27, 0.46), (0.5, 0.46), (0.54, 0.7)]
BAND_AMOUNT = 0.7          # 0 = smooth light, 1 = fully stepped
# outlines
LINE_COLOR = (0.24, 0.15, 0.09)
LINE_THICKNESS = 1.8       # pixels at 100%
LINE_OPACITY = 0.6
# painterly filter
KUWAHARA_SIZE = 5          # pixels at 100%
KUWAHARA_SHARPNESS = 0.55
INPAINT_SIZE = 14

NO_OUTLINE = ("Stream_Water", "Stream_Foam", "Waterfall", "Pond_Water", "Pond_Bank", "Clouds",
              "Grass_", "Moss_", "Flowers", "Flower_Leaves", "Decor_Flowers", "Decor_FlowerLeaves",
              "Complete_Flowers", "Complete_FlowerLeaves", "_Sand", "Decor_LanternGlow",
              "Blossoms")


def mark_no_outline(objects):
    """Freestyle face mark on every face of meshes that should have no lines."""
    for ob in objects:
        if ob.type != "MESH" or not any(k in ob.name for k in NO_OUTLINE):
            continue
        me = ob.data
        attr = me.attributes.get("freestyle_face") or me.attributes.new(
            "freestyle_face", "BOOLEAN", "FACE")
        attr.data.foreach_set("value", [True] * len(me.polygons))


def _passes(view_layer):
    for name in ("diffuse_direct", "diffuse_indirect", "diffuse_color", "glossy_direct",
                 "glossy_indirect", "glossy_color", "transmission_direct",
                 "transmission_indirect", "transmission_color", "emit"):
        setattr(view_layer, "use_pass_" + name, True)
    view_layer.cycles.denoising_store_passes = True


def _freestyle(scene, view_layer, scale):
    r = scene.render
    r.use_freestyle = True
    r.line_thickness_mode = "ABSOLUTE"
    r.line_thickness = 1.0
    fs = view_layer.freestyle_settings
    fs.mode = "EDITOR"
    fs.as_render_pass = True
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new("SW_Outline")
    ls.select_by_visibility = True
    ls.visibility = "VISIBLE"
    ls.select_by_edge_types = True
    ls.select_silhouette = True
    ls.select_border = False
    ls.select_crease = False
    ls.select_external_contour = True
    ls.select_by_face_marks = True
    ls.face_mark_negation = "EXCLUSIVE"
    ls.face_mark_condition = "ONE"
    st = ls.linestyle
    st.color = LINE_COLOR
    st.alpha = 1.0
    st.thickness = LINE_THICKNESS * scale
    st.thickness_position = "CENTER"
    st.caps = "ROUND"
    st.chaining = "PLAIN"


class _G:
    """Tiny helper around a compositor node group."""

    def __init__(self, ng):
        self.ng = ng
        self.nodes = ng.nodes
        self.links = ng.links

    def node(self, kind, **inputs):
        n = self.nodes.new(kind)
        for k, v in inputs.items():
            self.inp(n, k, v)
        return n

    def inp(self, n, key, v):
        sock = n.inputs[key] if isinstance(key, int) else n.inputs.get(key)
        if hasattr(v, "is_output") or hasattr(v, "links"):
            self.links.new(v, sock)
        else:
            sock.default_value = v

    def mix(self, a, b, blend, fac=1.0):
        n = self.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"
        n.blend_type = blend
        n.clamp_result = False
        self.links.new(a, n.inputs[6])
        self.links.new(b, n.inputs[7])
        if isinstance(fac, float):
            n.inputs[0].default_value = fac
        else:
            self.links.new(fac, n.inputs[0])
        return n.outputs[2]

    def math(self, op, a, b):
        n = self.nodes.new("ShaderNodeMath")
        n.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                self.links.new(v, n.inputs[i])
        return n.outputs[0]


def _light(g, rl, name, albedo, normal):
    """Denoised light pass (the raw passes are noisy; Combined alone is denoised)."""
    d = g.node("CompositorNodeDenoise")
    g.links.new(rl.outputs[name], d.inputs["Image"])
    g.links.new(albedo, d.inputs["Albedo"])
    g.links.new(normal, d.inputs["Normal"])
    return d.outputs["Image"]


def setup(scene, sun_strength, percentage=100):
    vl = scene.view_layers[0]
    if not STYLE_ENABLED:
        scene.render.use_freestyle = False
        scene.compositing_node_group = None
        return
    scale = percentage / 100.0
    _passes(vl)
    _freestyle(scene, vl, scale)

    ng = bpy.data.node_groups.get("SW_Stylize")
    if ng:
        bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new("SW_Stylize", "CompositorNodeTree")
    ng.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    g = _G(ng)
    rl = g.node("CompositorNodeRLayers")
    rl.scene = scene
    albedo, normal = rl.outputs["Denoising Albedo"], rl.outputs["Denoising Normal"]

    # 1. stepped direct light, hue kept
    ddir = _light(g, rl, "Diffuse Direct", albedo, normal)
    hsv = g.node("CompositorNodeSeparateColor")
    hsv.mode = "HSV"
    g.links.new(ddir, hsv.inputs["Image"])
    norm = g.math("DIVIDE", hsv.outputs["Blue"], sun_strength)
    ramp = g.node("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "EASE"
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = BAND_LEVELS[0][0], (BAND_LEVELS[0][1],) * 3 + (1.0,)
    els[1].position, els[1].color = BAND_LEVELS[-1][0], (BAND_LEVELS[-1][1],) * 3 + (1.0,)
    for pos, val in BAND_LEVELS[1:-1]:
        e = els.new(pos)
        e.color = (val, val, val, 1.0)
    g.links.new(norm, ramp.inputs["Factor"])
    sep = g.node("CompositorNodeSeparateColor")
    g.links.new(ramp.outputs["Color"], sep.inputs["Image"])
    stepped = g.math("MULTIPLY", sep.outputs["Red"], sun_strength)
    # keep the brightest sun-facing light above the top band
    over = g.math("MAXIMUM", g.math("SUBTRACT", hsv.outputs["Blue"], sun_strength * 0.7), 0.0)
    stepped = g.math("ADD", stepped, g.math("MULTIPLY", over, 0.6))
    mixv = g.node("ShaderNodeMix")
    mixv.data_type = "FLOAT"
    mixv.inputs[0].default_value = BAND_AMOUNT
    g.links.new(hsv.outputs["Blue"], mixv.inputs[2])
    g.links.new(stepped, mixv.inputs[3])
    comb = g.node("CompositorNodeCombineColor")
    comb.mode = "HSV"
    g.links.new(hsv.outputs["Red"], comb.inputs["Red"])
    g.links.new(hsv.outputs["Green"], comb.inputs["Green"])
    g.links.new(mixv.outputs[0], comb.inputs["Blue"])

    # 2. rebuild the image from all passes
    def lit(direct, indirect, color):
        light = g.mix(direct, indirect, "ADD")
        return g.mix(light, color, "MULTIPLY")

    diffuse = lit(comb.outputs["Image"], _light(g, rl, "Diffuse Indirect", albedo, normal),
                  rl.outputs["Diffuse Color"])
    glossy = lit(_light(g, rl, "Glossy Direct", albedo, normal),
                 _light(g, rl, "Glossy Indirect", albedo, normal), rl.outputs["Glossy Color"])
    trans = lit(rl.outputs["Transmission Direct"], rl.outputs["Transmission Indirect"],
                rl.outputs["Transmission Color"])
    rgb = g.mix(g.mix(g.mix(diffuse, glossy, "ADD"), trans, "ADD"), rl.outputs["Emission"], "ADD")

    # 3. painterly filter on straight color with the background inpainted
    rgba = g.node("CompositorNodeSetAlpha")
    rgba.inputs["Type"].default_value = "Replace Alpha"
    g.links.new(rgb, rgba.inputs["Image"])
    g.links.new(rl.outputs["Alpha"], rgba.inputs["Alpha"])
    straight = g.node("CompositorNodePremulKey")
    straight.inputs["Type"].default_value = "To Straight"
    g.links.new(rgba.outputs["Image"], straight.inputs["Image"])
    fill = g.node("CompositorNodeInpaint")
    fill.inputs["Size"].default_value = max(2, int(INPAINT_SIZE * scale))
    g.links.new(straight.outputs["Image"], fill.inputs["Image"])
    kuw = g.node("CompositorNodeKuwahara")
    kuw.inputs["Type"].default_value = "Anisotropic"
    kuw.inputs["Size"].default_value = max(1, round(KUWAHARA_SIZE * scale))
    kuw.inputs["Sharpness"].default_value = KUWAHARA_SHARPNESS
    g.links.new(fill.outputs["Image"], kuw.inputs["Image"])
    cut = g.node("CompositorNodeSetAlpha")
    cut.inputs["Type"].default_value = "Replace Alpha"
    g.links.new(kuw.outputs["Image"], cut.inputs["Image"])
    g.links.new(rl.outputs["Alpha"], cut.inputs["Alpha"])
    premul = g.node("CompositorNodePremulKey")
    premul.inputs["Type"].default_value = "To Premultiplied"
    g.links.new(cut.outputs["Image"], premul.inputs["Image"])

    # 4. soft outlines on top
    soft = g.node("CompositorNodeBlur")
    soft.inputs["Size"].default_value = (1.0 * scale, 1.0 * scale)
    g.links.new(rl.outputs["Freestyle"], soft.inputs["Image"])
    over_node = g.node("CompositorNodeAlphaOver")
    over_node.inputs["Factor"].default_value = LINE_OPACITY
    g.links.new(premul.outputs["Image"], over_node.inputs["Background"])
    g.links.new(soft.outputs["Image"], over_node.inputs["Foreground"])

    out = g.node("NodeGroupOutput")
    g.links.new(over_node.outputs["Image"], out.inputs[0])
    scene.compositing_node_group = ng
