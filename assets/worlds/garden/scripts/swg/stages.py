"""Stage collections. One collection per Garden state: stage n shows SWG_00
... SWG_nn. Nothing is replaced (ASSET_SPEC: Garden items coexist).

The order below is the RECOMMENDED sequence awaiting the owner's decision
against MVP plan v1.2 (see the Garden README, "Milestone sequence"). Only
the collection names and builders change if the owner picks another order;
the 100% scene is the same.

SWG_Ambient holds ambient-only elements (butterflies). They are not part of
any milestone and are shown only when asked for (set_stage(ambient=True)).
"""

import bpy

from swi.common import get_collection

RIG = "SWG_Rig"
AMBIENT = "SWG_Ambient"
STAGES = [
    (0, "SWG_00_Base_EmptyGarden", "Empty garden"),
    (1, "SWG_01_FirstSeedlings", "First seedlings"),
    (2, "SWG_02_SmallFlowerBed", "Small flower bed"),
    (3, "SWG_03_MoreFlowers", "More flowers"),
    (4, "SWG_04_DecorativeTree", "Decorative tree"),
    (5, "SWG_05_GardenPathway", "Garden pathway"),
    (6, "SWG_06_FountainPondStream", "Small fountain, pond and stream"),
    (7, "SWG_07_BenchDecorations", "Bench and decorations"),
    (8, "SWG_08_Greenhouse", "Greenhouse and vegetable beds"),
    (9, "SWG_09_PergolaFinalPlants", "Final plants and ornaments"),
    (10, "SWG_10_CompletedGarden", "Completed garden"),
]
REPLACES = {}


def create_collections():
    root = bpy.context.scene.collection
    cols = {"rig": get_collection(RIG, root), "ambient": get_collection(AMBIENT, root)}
    for n, name, label in STAGES:
        c = get_collection(name, root)
        c["sw_stage"] = n
        c["sw_label"] = label
        c["sw_threshold_percent"] = n * 10
        cols[n] = c
    return cols


def visible_collections(stage):
    names = {name for n, name, _ in STAGES if n <= stage}
    for n, replaced in REPLACES.items():
        if n <= stage:
            names -= set(replaced)
    return names


def set_stage(stage, ambient=False):
    shown = visible_collections(stage)
    layer = bpy.context.view_layer.layer_collection
    for name in [s[1] for s in STAGES] + [AMBIENT]:
        lc = layer.children.get(name)
        if lc is None:
            continue
        on = name in shown or (name == AMBIENT and ambient)
        lc.exclude = False
        lc.collection.hide_render = not on
        lc.collection.hide_viewport = not on
    return shown
