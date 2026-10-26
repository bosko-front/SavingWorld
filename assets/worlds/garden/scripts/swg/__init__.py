"""Saving Worlds Garden generator.

The Garden shares the Island's frozen rig (camera, lights, world, render
settings), its storybook compositor pass, its shader library and its generic
geometry helpers, so both worlds sit in the same projection and light. Those
modules live in assets/worlds/island/scripts/swi and are imported read-only;
nothing here changes them.
"""

import os
import sys

ISLAND_SCRIPTS = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "island", "scripts"))
if ISLAND_SCRIPTS not in sys.path:
    sys.path.insert(0, ISLAND_SCRIPTS)
