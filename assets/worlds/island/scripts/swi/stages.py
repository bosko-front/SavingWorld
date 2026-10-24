"""Stage collections. One collection per Island state from docs/ASSET_SPEC.md:
stage n shows SW_00 ... SW_nn, minus anything a later stage replaces
(the stage 8 larger house replaces the stage 4 small house)."""

import bpy

from .common import get_collection

RIG = "SW_Rig"
STAGES = [
    (0, "SW_00_Base_EmptyIsland", "Empty island"),
    (1, "SW_01_FirstTree", "First tree"),
    (2, "SW_02_Path", "Path"),
    (3, "SW_03_FlowersBushes", "Flowers and bushes"),
    (4, "SW_04_SmallHouse", "Small house"),
    (5, "SW_05_Bridge", "Bridge"),
    (6, "SW_06_Pond", "Pond"),
    (7, "SW_07_MoreTrees", "Additional trees"),
    (8, "SW_08_LargerHouseDetails", "Larger house and details"),
    (9, "SW_09_FinalDecorations", "Final decorations"),
    (10, "SW_10_CompletedIsland", "Completed island"),
]
REPLACES = {8: ["SW_04_SmallHouse"]}


def create_collections():
    root = bpy.context.scene.collection
    cols = {"rig": get_collection(RIG, root)}
    for n, name, label in STAGES:
        c = get_collection(name, root)
        c["sw_stage"] = n
        c["sw_label"] = label
        c["sw_threshold_percent"] = n * 10
        if n in REPLACES:
            c["sw_replaces"] = ",".join(REPLACES[n])
        cols[n] = c
    return cols


def visible_collections(stage):
    names = {name for n, name, _ in STAGES if n <= stage}
    for n, replaced in REPLACES.items():
        if n <= stage:
            names -= set(replaced)
    return names


def set_stage(stage):
    shown = visible_collections(stage)
    layer = bpy.context.view_layer.layer_collection
    for n, name, _ in STAGES:
        lc = layer.children.get(name)
        if lc is None:
            continue
        on = name in shown
        lc.exclude = False
        lc.collection.hide_render = not on
        lc.collection.hide_viewport = not on
    return shown
