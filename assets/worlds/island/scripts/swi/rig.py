"""Fixed camera, lighting, world and render settings.

These values are frozen: every milestone render must use exactly this rig so
layers line up. Change them only together with re-rendering all stages.
"""

import math

import bpy
from mathutils import Euler, Vector

# Orthographic dimetric view from the +X/-Y side.
CAM_ROT = (math.radians(57.0), 0.0, math.radians(45.0))
CAM_TARGET = Vector((0.84, 0.36, -0.48))
CAM_DISTANCE = 80.0
CAM_ORTHO_SCALE = 35.2
RES = (2048, 1536)  # 4:3, matches WORLD_SCENE_ASPECT in the app

# Warm, fairly low late-morning sun from the screen's upper left: long enough
# shadows to model the terraces, trees and house, crisp contact shadows.
SUN_DIR = Vector((0.66, 0.42, -0.6))  # travel direction
SUN_COLOR = (1.0, 0.77, 0.5)
SUN_STRENGTH = 5.5
SUN_ANGLE = math.radians(2.5)

# Cool sky keeps shadows blue-ish and readable; a warm bounce lifts the underside.
SKY_TOP = (0.58, 0.74, 1.0)
SKY_HORIZON = (1.0, 0.88, 0.74)
SKY_STRENGTH = 0.6
FILL_STRENGTH = 0.3
BOUNCE_STRENGTH = 0.9

BACKDROP = "#FBF3E4"  # preview backdrop only; renders are transparent


def screen_to_world(sx, sy, toward_camera=0.0):
    """World point that projects to (sx, sy) camera units from the world origin."""
    m = Euler(CAM_ROT).to_matrix()
    return (m @ Vector((1, 0, 0))) * sx + (m @ Vector((0, 1, 0))) * sy + \
        (m @ Vector((0, 0, 1))) * toward_camera


def build(col):
    scene = bpy.context.scene

    cam_data = bpy.data.cameras.new("SW_Camera")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CAM_ORTHO_SCALE
    cam_data.clip_start = 1.0
    cam_data.clip_end = 300.0
    cam = bpy.data.objects.new("SW_Camera", cam_data)
    rot = Euler(CAM_ROT)
    cam.rotation_euler = rot
    view = rot.to_matrix() @ Vector((0, 0, -1))
    cam.location = CAM_TARGET - view * CAM_DISTANCE
    col.objects.link(cam)
    scene.camera = cam

    sun_data = bpy.data.lights.new("SW_Sun", "SUN")
    sun_data.energy = SUN_STRENGTH
    sun_data.color = SUN_COLOR
    sun_data.angle = SUN_ANGLE
    sun = bpy.data.objects.new("SW_Sun", sun_data)
    sun.rotation_euler = SUN_DIR.normalized().to_track_quat("-Z", "Y").to_euler()
    col.objects.link(sun)

    # cool soft fill from the camera side so shadows stay readable, not black
    fill_data = bpy.data.lights.new("SW_Fill", "SUN")
    fill_data.energy = FILL_STRENGTH
    fill_data.color = (0.78, 0.86, 1.0)
    fill_data.angle = math.radians(30.0)
    fill = bpy.data.objects.new("SW_Fill", fill_data)
    fill.rotation_euler = Vector((-0.7, 0.55, -0.45)).normalized().to_track_quat("-Z", "Y").to_euler()
    col.objects.link(fill)

    # warm bounce from below the camera side: the rock underside is lit like
    # the reference instead of falling into flat shadow (casts no shadows)
    bounce_data = bpy.data.lights.new("SW_Bounce", "SUN")
    bounce_data.energy = BOUNCE_STRENGTH
    bounce_data.color = (1.0, 0.78, 0.6)
    bounce_data.angle = math.radians(40.0)
    bounce_data.use_shadow = False
    bounce = bpy.data.objects.new("SW_Bounce", bounce_data)
    bounce.rotation_euler = Vector((-0.45, 0.55, 0.7)).normalized().to_track_quat("-Z", "Y").to_euler()
    col.objects.link(bounce)

    world = bpy.data.worlds.new("SW_World")
    scene.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = SKY_STRENGTH
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*SKY_HORIZON, 1.0)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (*SKY_TOP, 1.0)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs[0], out.inputs["Surface"])

    configure_render(scene)
    return cam


def configure_render(scene, samples=256, percentage=100):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "METAL"
    except Exception as exc:  # falls back to CPU
        print("GPU setup failed:", exc)
        scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.01
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 8
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 2
    scene.cycles.transmission_bounces = 4
    scene.cycles.transparent_max_bounces = 16
    scene.cycles.caustics_reflective = False
    scene.cycles.caustics_refractive = False
    scene.cycles.blur_glossy = 1.0
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = percentage
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
    scene.view_settings.exposure = 0.38
    from . import stylize  # noqa: PLC0415  (avoids an import cycle with materials)
    stylize.setup(scene, SUN_STRENGTH, percentage)
    scene.view_settings.gamma = 1.0
