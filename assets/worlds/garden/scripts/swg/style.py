"""Outline marks for the storybook pass (swi.stylize): meshes whose names
contain one of these keys get the Freestyle face mark and therefore no
lines (water, foam, clouds, grass, flowers, glass, glows...)."""

NO_OUTLINE = ("Water", "Waterfall", "Foam", "Cloud", "Grass_", "Moss_", "Flowers", "Blooms",
              "Petals", "Roses", "Sand", "Glow", "Glass", "Sprouts", "Vines_", "Lily", "Koi",
              "Butterfly", "Leaves", "Teaset")


def mark_no_outline(objects):
    for ob in objects:
        if ob.type != "MESH" or not any(k in ob.name for k in NO_OUTLINE):
            continue
        me = ob.data
        attr = me.attributes.get("freestyle_face") or me.attributes.new(
            "freestyle_face", "BOOLEAN", "FACE")
        attr.data.foreach_set("value", [True] * len(me.polygons))
