"""Single source of truth for the Island layout (world units, Z up).

The camera looks from the +X/-Y side: screen-right is +X+Y, the front corner
of the island (bottom of the image) is +X-Y and the back corner is -X+Y.
Changing anything in TERRAIN or STREAM changes the base terrain for every
stage, so treat those values as frozen once milestone renders exist.
"""

import math

# ------------------------------------------------------------------ terrain
ISLAND_RADIUS = 10.0          # half-size of the rounded square footprint
ISLAND_SQUARENESS = 3.4       # superellipse exponent (2 = circle)
LEVEL_Z = (0.4, 1.35, 2.35)   # front, middle and back (house) terrace heights
STEP_U = (-2.0, 3.6)          # terrace edges along u = (y - x) / sqrt(2)
STEP_SOFTNESS = 0.15
STEP_CURVE = 0.035          # how much the terrace steps bend into arcs

# Stream: spring on the back terrace, cascades down both steps, leaves the
# island over the front-left face as the waterfall.
STREAM = [(-2.6, 7.2), (-1.4, 5.6), (-0.6, 4.1), (-0.1, 2.6), (-0.4, 1.0), (-0.3, -0.6),
          (0.4, -2.1), (0.9, -3.6), (1.1, -5.4), (1.15, -7.4), (1.2, -9.3), (1.25, -11.5)]
STREAM_HALF_WIDTH = 0.62
STREAM_BANK = 0.42
STREAM_DEPTH = 0.26

# ------------------------------------------------------------------ stage 1
FIRST_TREE = dict(pos=(-7.0, 6.5), height=4.6, canopy=2.05, seed=11)

# ------------------------------------------------------------------ stage 2
# Main path: front edge -> stairs -> middle terrace -> stairs -> house door.
MAIN_PATH = [(-2.3, -9.4), (-2.6, -7.6), (-3.1, -5.6), (-3.3, -3.6), (-3.0, -1.6),
             (-3.1, 0.4), (-3.5, 2.2), (-3.2, 3.4), (-3.2, 4.4)]
PATH_HALF_WIDTH = 0.55

# ------------------------------------------------------------------ stage 4 / 8
HOUSE_POS = (-4.9, 4.4)
HOUSE_ROT_Z = math.radians(90.0)   # front door faces +X (screen lower right)

# ------------------------------------------------------------------ stage 5
BRIDGE_CENTER = (1.0, -4.5)
BRIDGE_LENGTH = 3.3
BRANCH_PATH_WEST = [(-2.95, -6.3), (-1.85, -5.5), (-0.75, -4.75)]
BRANCH_PATH_EAST = [(2.7, -4.25), (2.8, -2.6), (3.4, -0.6), (4.4, 1.6)]

# ------------------------------------------------------------------ stage 6
POND_CENTER = (5.6, -4.4)
POND_RADIUS = 2.15

# ------------------------------------------------------------------ stage 7
MORE_TREES = [
    ("pine", (-7.7, 1.2), 3.6, 1.15, 21),
    ("pine", (-6.4, -3.6), 3.1, 1.0, 22),
    ("pine", (2.4, 7.9), 3.8, 1.2, 23),
    ("pine", (6.6, -7.4), 2.9, 0.95, 24),
    ("broad", (7.0, 5.9), 3.6, 1.65, 25),
    ("broad", (-2.4, 8.3), 3.2, 1.45, 26),
    ("broad", (8.3, -1.2), 3.0, 1.35, 27),
    ("pine", (-8.4, -1.6), 2.6, 0.85, 28),
]

# ------------------------------------------------------------------ stage 10
GARDEN_CENTER = (5.4, 3.6)
DOCK_START = (6.75, -2.35)
FLOATING_ISLETS = [((-12.6, -4.2, -1.2), 1.0, 41), ((8.6, 11.2, 0.2), 0.8, 42),
                   ((12.3, 0.4, -3.5), 0.9, 43)]

# ------------------------------------------------------------------ environment (stage 0)
# Clouds by screen position (camera-right, camera-up, toward-camera) so they
# frame the island regardless of world placement.
CLOUDS = [((-11.0, -5.0, -3.0), 1.8, 302), ((10.0, -9.8, -1.0), 1.7, 303)]
