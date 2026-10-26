"""Single source of truth for the Garden layout.

Positions are written in screen-plan coordinates (v, u): v runs to the right
of the image, u runs into the picture (front edge negative, back edge
positive). xy(v, u) turns them into world X/Y for the Island's frozen camera,
which looks from the +X/-Y corner. Heights come from terrain.height_at.

TERRAIN values change the base terrain of every stage: treat them as frozen
once milestone renders exist.
"""

import math

SQ2 = math.sqrt(2.0)


def xy(v, u):
    return ((v - u) / SQ2, (v + u) / SQ2)


def vu(x, y):
    return ((x + y) / SQ2, (y - x) / SQ2)


# ------------------------------------------------------------------ terrain
RADIUS = 10.5               # rounder than the Island's squarish footprint
SQUARENESS = 2.5
LEVEL_Z = (0.35, 1.3, 2.3)  # front (pond), middle and back (greenhouse) terraces
STEP_U = (-2.1, 3.5)        # terrace edges in u, bent back at the sides by STEP_CURVE
STEP_SOFTNESS = 0.16
STEP_CURVE = 0.03
WALL_THICK = 0.55           # dry-stone retaining wall depth on each terrace step

# ------------------------------------------------------------------ paths (stage 5)
MAIN_PATH = [(-1.2, -10.7), (-1.7, -8.6), (-2.3, -6.6), (-2.4, -4.6), (-2.1, -2.8),
             (-1.8, -1.0), (-1.4, 1.0), (-1.05, 2.8), (-1.35, 4.4), (-2.0, 5.4)]
PATH_HALF_WIDTH = 0.72

# ------------------------------------------------------------------ water (stage 6)
FOUNTAIN = (3.9, 6.15)
FOUNTAIN_RADIUS = 0.85
RILL = [(3.9, 5.25), (4.0, 4.5), (4.08, 3.6), (3.85, 2.2), (3.45, 0.6), (3.05, -0.8),
        (2.75, -1.8), (2.6, -2.55)]
RILL_HALF_WIDTH = 0.3
POND = (2.3, -4.35)
POND_RADIUS = 1.95
STREAM = [(0.75, -4.75), (-0.6, -5.3), (-2.3, -5.75), (-4.0, -6.15), (-5.6, -6.75),
          (-6.9, -7.4), (-8.0, -8.1)]
STREAM_HALF_WIDTH = 0.42

# ------------------------------------------------------------------ milestone placements
# 10% and 20% enlarged after the Step 4 review so each step reads on a phone
SEEDLINGS = dict(center=(-4.75, 0.65), size=(3.0, 1.9))        # stage 1
FLOWER_BED = dict(center=(0.85, 0.9), size=(2.6, 1.15))        # stage 2
BLOSSOM_TREE = dict(pos=(6.3, 5.5), height=4.4, canopy=2.0, seed=33)  # stage 4
BRIDGE_LENGTH = 2.7                                            # stage 6, where path meets stream
BENCH_POND = dict(pos=(4.75, -5.55), yaw_toward=POND)          # stage 7
LANTERNS = [(-3.35, -3.3), (0.0, -1.3), (-2.6, 3.9), (-1.05, -7.15)]
BIRDBATH = (5.55, -2.95)
POTS = [(-2.3, 2.9), (0.15, 3.2)]
# Buildings and beds sit square to world X/Y (45 degrees on screen) like the Island
# house, so two faces show; the greenhouse door faces -Y (screen lower left).
GREENHOUSE = dict(center=(-0.45, 7.05), length=3.9, width=2.9, eave=1.75, ridge=2.95)  # stage 8
VEG_BEDS = dict(center=(-5.4, 6.2), count=3, gap=1.2, length=2.2)
PICKET_FENCE = [(-0.14, 4.67), (2.12, 6.93)]  # along world Y, right of the greenhouse
PERGOLA = dict(center=(6.85, 0.9), length=3.1, width=1.75, height=2.4)  # stage 9
FINAL_TREES = [
    ("broad", (-3.5, 9.25), 3.5, 1.65, 61),
    ("broad", (2.7, 9.45), 3.2, 1.5, 62),
    ("pine", (-8.1, 4.5), 3.7, 1.1, 63),
    ("pine", (-8.9, 1.6), 3.0, 0.95, 64),
    ("broad", (8.8, 3.6), 3.0, 1.4, 65),
    ("pine", (8.4, -2.6), 2.8, 0.9, 66),
    ("broad", (6.0, -7.9), 2.5, 1.15, 67),
    ("broad", (-7.7, -5.2), 2.6, 1.2, 68),
    ("pine", (5.7, 8.9), 3.2, 1.0, 69),
    ("broad", (-6.4, 8.9), 2.8, 1.3, 70),
    ("pine", (7.3, 6.5), 2.6, 0.85, 71),
    ("broad", (-9.3, -1.6), 2.2, 1.05, 72),
]
NOOK = dict(center=(-5.9, -3.7))                               # stage 10
FLOATING_ISLETS = [((-13.4, -1.4, -1.0), 1.0, 141), ((12.9, -2.6, -3.2), 0.85, 142),
                   ((12.2, 6.0, 0.8), 0.75, 143)]  # (v, u, z), size, seed

# ------------------------------------------------------------------ environment (stage 0)
# Clouds by screen position (camera-right, camera-up, toward-camera), like the Island.
CLOUDS = [((-11.6, -3.6, -3.0), 1.75, 352), ((10.4, -9.4, -1.0), 1.6, 353)]
