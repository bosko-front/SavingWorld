"""Shader library. Most objects carry their painted color in the 'Col' point
attribute (set by the generators); the shaders add soft ambient occlusion
(which also darkens where objects meet the ground), top-light tinting, gentle
hue variation and fine noise so the result reads as hand-painted.

Water meshes carry a 'Flow' UV map: U runs across the water (0 and 1 are the
banks, or the rim for the pond) and V runs along the flow."""

import bpy

_cache = {}


def _sock(sockets, ident):
    for s in sockets:
        if s.identifier == ident or s.name == ident:
            return s
    raise KeyError(ident)


def _new(name):
    if name in _cache:
        return _cache[name], None, None
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:  # always on in newer Blender
        pass
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (900, 0)
    _cache[name] = m
    return m, nt, out


def _link(nt, src, dst):
    if isinstance(src, (int, float, tuple)):
        dst.default_value = src
    else:
        nt.links.new(src, dst)


def _mix_rgb(nt, a, b, fac, blend="MIX"):
    n = nt.nodes.new("ShaderNodeMix")
    n.data_type = "RGBA"
    n.blend_type = blend
    _link(nt, fac, _sock(n.inputs, "Factor_Float"))
    _link(nt, a, _sock(n.inputs, "A_Color"))
    _link(nt, b, _sock(n.inputs, "B_Color"))
    return _sock(n.outputs, "Result_Color")


def _math(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    _link(nt, a, n.inputs[0])
    if b is not None:
        _link(nt, b, n.inputs[1])
    return n.outputs[0]


def _map(nt, value, a, b, c=0.0, d=1.0, smooth=False):
    n = nt.nodes.new("ShaderNodeMapRange")
    if smooth:
        n.interpolation_type = "SMOOTHSTEP"
    _link(nt, value, n.inputs["Value"])
    n.inputs["From Min"].default_value = a
    n.inputs["From Max"].default_value = b
    n.inputs["To Min"].default_value = c
    n.inputs["To Max"].default_value = d
    return n.outputs["Result"]


def _noise(nt, scale, detail=3.0, vector=None, roughness=0.5):
    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = scale
    tex.inputs["Detail"].default_value = detail
    tex.inputs["Roughness"].default_value = roughness
    if vector is not None:
        nt.links.new(vector, tex.inputs["Vector"])
    return tex.outputs["Fac"]


def _scale_rgb(nt, color, k):
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    for i in range(3):
        _link(nt, k, comb.inputs[i])
    mul = nt.nodes.new("ShaderNodeVectorMath")
    mul.operation = "MULTIPLY"
    nt.links.new(color, mul.inputs[0])
    nt.links.new(comb.outputs[0], mul.inputs[1])
    return mul.outputs[0]


def _voronoi(nt, scale, vector=None, feature="F1", randomness=1.0):
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.feature = feature
    v.inputs["Scale"].default_value = scale
    v.inputs["Randomness"].default_value = randomness
    if vector is not None:
        nt.links.new(vector, v.inputs["Vector"])
    return v


def _coords(nt, space="Object", stretch=None):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vec = tc.outputs[space]
    if stretch:
        m = nt.nodes.new("ShaderNodeVectorMath")
        m.operation = "MULTIPLY"
        nt.links.new(vec, m.inputs[0])
        m.inputs[1].default_value = stretch
        vec = m.outputs[0]
    return vec


def _pattern(nt, kind):
    """Painterly surface detail as a brightness multiplier around 1.0."""
    if kind == "grass":
        # broad brush dabs (each Voronoi cell its own value) + fine light strokes
        world = _coords(nt, "Object")
        dabs = _voronoi(nt, 2.2, world)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(dabs.outputs["Color"], sep.inputs[0])
        k = _map(nt, sep.outputs[0], 0.0, 1.0, 0.94, 1.07)
        strokes = _noise(nt, 1.0, 2.0, _coords(nt, "Object", (11.0, 11.0, 2.0)), 0.55)
        k = _math(nt, "MULTIPLY", k, _map(nt, strokes, 0.42, 0.62, 0.93, 1.06, smooth=True))
        return k
    if kind == "rock":
        # strata lines, a few cracks, lighter worn edges
        world = _coords(nt, "Object")
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.bands_direction = "Z"
        wave.inputs["Scale"].default_value = 1.4
        wave.inputs["Distortion"].default_value = 5.0
        wave.inputs["Detail"].default_value = 2.0
        nt.links.new(world, wave.inputs["Vector"])
        k = _map(nt, wave.outputs["Fac"], 0.0, 0.25, 0.86, 1.0, smooth=True)
        cr = _voronoi(nt, 0.55, world, feature="DISTANCE_TO_EDGE")
        k = _math(nt, "MULTIPLY", k, _map(nt, cr.outputs["Distance"], 0.0, 0.04, 0.82, 1.0, smooth=True))
        return k
    if kind == "wood":
        obj = _coords(nt, "Object", (1.0, 7.0, 7.0))
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.bands_direction = "X"
        wave.inputs["Scale"].default_value = 1.3
        wave.inputs["Distortion"].default_value = 7.0
        wave.inputs["Detail"].default_value = 2.5
        nt.links.new(obj, wave.inputs["Vector"])
        return _map(nt, wave.outputs["Fac"], 0.0, 0.6, 0.86, 1.04)
    if kind == "tile":
        spots = _noise(nt, 9.0, 3.0, _coords(nt, "Object"))
        return _map(nt, spots, 0.55, 0.7, 1.0, 0.88, smooth=True)
    return 1.0


def _painted_base(nt, ao_strength=0.55, ao_distance=0.6, top_light=0.18, grain=0.06,
                  grain_scale=9.0, tints=(), pattern=None, contact=0.42, edge_wear=0.0):
    """attribute color, hue tints, painterly pattern, two-scale AO, top light,
    edge wear and fine grain -> color."""
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    color = attr.outputs["Color"]
    for tint_color, scale, amount in tints:
        f = _map(nt, _noise(nt, scale, 2.0), 0.42, 0.68, 0.0, amount, smooth=True)
        color = _mix_rgb(nt, color, tint_color, f)

    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs[0])
    top = _map(nt, sep.outputs["Z"], -1.0, 1.0, 1.0 - top_light, 1.0 + top_light)
    g = _map(nt, _noise(nt, grain_scale), 0.3, 0.7, 1.0 - grain, 1.0 + grain)

    # broad soft occlusion plus a tight contact term where objects meet;
    # both lifted so open surfaces keep full brightness
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = ao_distance
    ao.samples = 16
    aof = _map(nt, ao.outputs["AO"], 0.0, 0.85, 1.0 - ao_strength, 1.02, smooth=True)
    ao2 = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao2.inputs["Distance"].default_value = 0.3
    ao2.samples = 16
    aoc = _map(nt, ao2.outputs["AO"], 0.0, 0.9, 1.0 - contact, 1.0, smooth=True)

    k = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", top, g), _math(nt, "MULTIPLY", aof, aoc))
    pat = _pattern(nt, pattern)
    if not isinstance(pat, float):
        k = _math(nt, "MULTIPLY", k, pat)
    if edge_wear > 0:
        wear = _map(nt, geo.outputs["Pointiness"], 0.5, 0.58, 1.0, 1.0 + edge_wear, smooth=True)
        k = _math(nt, "MULTIPLY", k, wear)
    return _scale_rgb(nt, color, k), attr


def painted(name="SW_Painted", roughness=0.85, ao_strength=0.55, ao_distance=0.6,
            top_light=0.18, grain=0.06, grain_scale=9.0, specular=0.3, bump=0.0,
            bump_scale=6.0, alpha=False, tints=(), pattern=None, contact=0.42, edge_wear=0.0):
    m, nt, out = _new(name)
    if nt is None:
        return m
    color, attr = _painted_base(nt, ao_strength=ao_strength, ao_distance=ao_distance,
                                top_light=top_light, grain=grain, grain_scale=grain_scale,
                                tints=tints, pattern=pattern, contact=contact,
                                edge_wear=edge_wear)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(color, bsdf.inputs["Base Color"])
    if alpha:
        nt.links.new(attr.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular
    if bump > 0:
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        nt.links.new(_noise(nt, bump_scale, 4.0), b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return m


def foliage(name="SW_Foliage", rim=0.45, leafy=True):
    """Painted leaves: leaf-cluster cells, deep AO inside the crown, a warm
    rim where the crown edge faces the sun, translucent back light."""
    m, nt, out = _new(name)
    if nt is None:
        return m
    color, _ = _painted_base(nt, ao_strength=0.55, ao_distance=1.0, top_light=0.28, grain=0.06,
                             grain_scale=12.0, contact=0.3,
                             tints=[((0.58, 0.64, 0.12, 1.0), 1.4, 0.16)])
    if leafy:
        cells = _voronoi(nt, 7.0, _coords(nt, "Object"), feature="SMOOTH_F1")
        k = _map(nt, cells.outputs["Distance"], 0.0, 0.6, 1.08, 0.88, smooth=True)
        color = _scale_rgb(nt, color, k)
    # warm rim light on the sun-facing silhouette
    from mathutils import Vector  # noqa: PLC0415  (Blender-only module)
    from .rig import SUN_DIR
    to_sun = (-SUN_DIR).normalized()
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    nt.links.new(geo.outputs["Normal"], dot.inputs[0])
    dot.inputs[1].default_value = Vector(to_sun)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    edge = _map(nt, lw.outputs["Facing"], 0.45, 0.95, 0.0, 1.0, smooth=True)
    sunward = _map(nt, dot.outputs["Value"], 0.0, 0.7, 0.0, 1.0, smooth=True)
    rim_f = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", edge, sunward), rim)
    color = _mix_rgb(nt, color, (1.0, 0.86, 0.42, 1.0), rim_f)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(color, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Specular IOR Level"].default_value = 0.3
    bsdf.inputs["Sheen Weight"].default_value = 0.2
    bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.95, 0.7, 1.0)
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    nt.links.new(color, tr.inputs["Color"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.15
    nt.links.new(bsdf.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def terrain(name="SW_Terrain"):
    """Grass and ground: painterly dabs and strokes, broad warm and cool
    patches, contact AO from everything standing on it."""
    return painted(name, roughness=0.92, ao_strength=0.4, ao_distance=1.2, top_light=0.08,
                   grain=0.05, grain_scale=6.0, specular=0.2, bump=0.1, bump_scale=8.0,
                   pattern="grass", contact=0.55,
                   tints=[((0.55, 0.64, 0.1, 1.0), 0.35, 0.24),
                          ((0.06, 0.2, 0.07, 1.0), 1.6, 0.12)])


def rock(name="SW_Rock"):
    return painted(name, roughness=0.82, ao_strength=0.55, ao_distance=0.9, top_light=0.26,
                   grain=0.08, grain_scale=5.0, specular=0.22, bump=0.2, bump_scale=4.5,
                   pattern="rock", contact=0.42, edge_wear=0.22,
                   tints=[((0.42, 0.33, 0.27, 1.0), 0.8, 0.16)])


def wood(name="SW_Wood"):
    return painted(name, roughness=0.7, ao_strength=0.45, ao_distance=0.5, top_light=0.15,
                   grain=0.05, grain_scale=22.0, specular=0.3, pattern="wood", contact=0.42,
                   edge_wear=0.15)


def roof_tile(name="SW_RoofTile"):
    return painted(name, roughness=0.65, ao_strength=0.5, ao_distance=0.4, top_light=0.18,
                   grain=0.06, grain_scale=14.0, specular=0.35, pattern="tile", contact=0.45,
                   edge_wear=0.25)


def water(name="SW_Water", streaks=1.0, glints=1.0):
    """Stylized water: painted depth colors, flow streaks along the Flow UV,
    broken foam at the banks and on cascades, small sun glints."""
    m, nt, out = _new(name)
    if nt is None:
        return m
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "Flow"
    sep_uv = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uv.outputs["UV"], sep_uv.inputs[0])
    edge = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", sep_uv.outputs["X"], 2.0), 1.0))

    stretch = nt.nodes.new("ShaderNodeVectorMath")
    stretch.operation = "MULTIPLY"
    nt.links.new(uv.outputs["UV"], stretch.inputs[0])
    stretch.inputs[1].default_value = (7.0, 0.9, 1.0)
    streak = _map(nt, _noise(nt, 1.0, 4.0, stretch.outputs[0], 0.6), 0.5, 0.72, 0.0,
                  0.38 * streaks, smooth=True)
    col = _mix_rgb(nt, attr.outputs["Color"], (0.52, 0.92, 0.92, 1.0), streak)

    # broken foam line along the banks
    fine = nt.nodes.new("ShaderNodeVectorMath")
    fine.operation = "MULTIPLY"
    nt.links.new(uv.outputs["UV"], fine.inputs[0])
    fine.inputs[1].default_value = (24.0, 5.0, 1.0)
    ragged = _math(nt, "ADD", edge, _map(nt, _noise(nt, 1.0, 3.0, fine.outputs[0]), 0.3, 0.7, -0.14, 0.14))
    foam_edge = _map(nt, ragged, 0.8, 0.94, 0.0, 1.0, smooth=True)

    # foam where the water tumbles down a step
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs[0])
    tumble = _map(nt, sep.outputs["Z"], 0.95, 0.72, 0.0, 1.0, smooth=True)
    tumble = _math(nt, "MULTIPLY", tumble, _map(nt, _noise(nt, 1.0, 3.0, stretch.outputs[0]), 0.35, 0.6, 0.55, 1.0), clamp=True)
    foam = _math(nt, "MAXIMUM", foam_edge, tumble)
    white = (0.95, 0.99, 1.0, 1.0)
    col = _mix_rgb(nt, col, white, foam)

    # sparse painted glints
    pos = nt.nodes.new("ShaderNodeTexCoord")
    glint = _map(nt, _noise(nt, 2.6, 2.0, pos.outputs["Object"]), 0.7, 0.76, 0.0, 0.8 * glints, smooth=True)
    glint = _math(nt, "MULTIPLY", glint, _math(nt, "SUBTRACT", 1.0, foam), clamp=True)
    col = _mix_rgb(nt, col, (1.0, 1.0, 0.95, 1.0), glint)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(col, bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.1
    bsdf.inputs["Specular IOR Level"].default_value = 0.55
    bsdf.inputs["Coat Weight"].default_value = 0.5
    bsdf.inputs["Coat Roughness"].default_value = 0.04
    nt.links.new(col, bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 0.16
    ripple = nt.nodes.new("ShaderNodeTexWave")
    ripple.wave_type = "BANDS"
    ripple.bands_direction = "Y"
    ripple.inputs["Scale"].default_value = 2.0
    ripple.inputs["Distortion"].default_value = 8.0
    ripple.inputs["Detail"].default_value = 2.0
    nt.links.new(stretch.outputs[0], ripple.inputs["Vector"])
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.06
    nt.links.new(ripple.outputs["Fac"], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return m


def waterfall(name="SW_Waterfall"):
    """Falling water: vertical streaks along the Flow UV, soft side edges and
    an alpha fade into the mist (vertex alpha)."""
    m, nt, out = _new(name)
    if nt is None:
        return m
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "Flow"
    stretch = nt.nodes.new("ShaderNodeVectorMath")
    stretch.operation = "MULTIPLY"
    nt.links.new(uv.outputs["UV"], stretch.inputs[0])
    stretch.inputs[1].default_value = (16.0, 0.7, 1.0)
    streak = _map(nt, _noise(nt, 1.0, 4.0, stretch.outputs[0], 0.55), 0.38, 0.66, 0.0, 1.0, smooth=True)
    col = _mix_rgb(nt, attr.outputs["Color"], (0.97, 1.0, 1.0, 1.0), _math(nt, "MULTIPLY", streak, 0.7))
    sep_uv = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(uv.outputs["UV"], sep_uv.inputs[0])
    edge = _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", _math(nt, "MULTIPLY", sep_uv.outputs["X"], 2.0), 1.0))
    side = _map(nt, edge, 1.0, 0.7, 0.0, 1.0, smooth=True)
    a = _math(nt, "MULTIPLY", attr.outputs["Alpha"], side)
    a = _math(nt, "MULTIPLY", a, _map(nt, streak, 0.0, 1.0, 0.8, 1.0))
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(col, bsdf.inputs["Base Color"])
    nt.links.new(col, bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 0.4
    bsdf.inputs["Roughness"].default_value = 0.2
    nt.links.new(a, bsdf.inputs["Alpha"])
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    return m


def emissive(name, color, strength):
    m, nt, out = _new(name)
    if nt is None:
        return m
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = color
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def glass_glow(name="SW_WindowGlow"):
    """Warm lit window pane: emissive core with a cooler painted edge."""
    m, nt, out = _new(name)
    if nt is None:
        return m
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(attr.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = 2.6
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def soft_cloud(name="SW_Cloud", emission=1.05, opacity=0.92, edge=0.55):
    """Soft stylized cloud: self-lit painted white-to-lavender gradient (vertex
    color) whose silhouette fades out. Emission only, so the storybook light
    bands in the compositor never cut it into hard shapes."""
    m, nt, out = _new(name)
    if nt is None:
        return m
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = edge
    soft = _map(nt, lw.outputs["Facing"], 0.5, 0.98, 1.0, 0.0, smooth=True)
    a = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", soft, attr.outputs["Alpha"]), opacity)
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(attr.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = emission
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(a, mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m
