import type { SceneAsset } from '../manifest';

// Island art (Free theme): the owner-approved layered export from the Blender workspace
// assets/worlds/island/ (DECISIONS D76), copied unchanged to assets/themes/island/. One app
// resolution, the 1536×1152 export (0.75 of the 2048×1536 master canvas the manifest's coordinates
// use). Every file is listed as a static require so Metro bundles it; a stage number never builds a
// path. Fix art in the Blender scripts and re-export; never edit these PNGs.
//
// tests/unit/world-manifest.test.ts checks this map against the files on disk and the manifest.

export const islandManifestJson: unknown = require('../../../../assets/themes/island/island_manifest.json');

export const ISLAND_ASSETS: Readonly<Record<string, SceneAsset>> = {
  'island_base.png': require('../../../../assets/themes/island/1536/island_base.png'),
  'island_s01_p1.png': require('../../../../assets/themes/island/1536/island_s01_p1.png'),
  'island_s01_p2.png': require('../../../../assets/themes/island/1536/island_s01_p2.png'),
  'island_s02_p1.png': require('../../../../assets/themes/island/1536/island_s02_p1.png'),
  'island_s03_p1.png': require('../../../../assets/themes/island/1536/island_s03_p1.png'),
  'island_s03_p2.png': require('../../../../assets/themes/island/1536/island_s03_p2.png'),
  'island_s03_p3.png': require('../../../../assets/themes/island/1536/island_s03_p3.png'),
  'island_s03_p4.png': require('../../../../assets/themes/island/1536/island_s03_p4.png'),
  'island_s03_p5.png': require('../../../../assets/themes/island/1536/island_s03_p5.png'),
  'island_s03_p6.png': require('../../../../assets/themes/island/1536/island_s03_p6.png'),
  'island_s03_p7.png': require('../../../../assets/themes/island/1536/island_s03_p7.png'),
  'island_s03_p8.png': require('../../../../assets/themes/island/1536/island_s03_p8.png'),
  'island_s04_p1.png': require('../../../../assets/themes/island/1536/island_s04_p1.png'),
  'island_s04_p2.png': require('../../../../assets/themes/island/1536/island_s04_p2.png'),
  'island_s05_p1.png': require('../../../../assets/themes/island/1536/island_s05_p1.png'),
  'island_s06_p1.png': require('../../../../assets/themes/island/1536/island_s06_p1.png'),
  'island_s07_p1.png': require('../../../../assets/themes/island/1536/island_s07_p1.png'),
  'island_s07_p2.png': require('../../../../assets/themes/island/1536/island_s07_p2.png'),
  'island_s07_p3.png': require('../../../../assets/themes/island/1536/island_s07_p3.png'),
  'island_s08_p1.png': require('../../../../assets/themes/island/1536/island_s08_p1.png'),
  'island_s08_p2.png': require('../../../../assets/themes/island/1536/island_s08_p2.png'),
  'island_s08_p3.png': require('../../../../assets/themes/island/1536/island_s08_p3.png'),
  'island_s08_p4.png': require('../../../../assets/themes/island/1536/island_s08_p4.png'),
  'island_s09_p1.png': require('../../../../assets/themes/island/1536/island_s09_p1.png'),
  'island_s09_p2.png': require('../../../../assets/themes/island/1536/island_s09_p2.png'),
  'island_s09_p3.png': require('../../../../assets/themes/island/1536/island_s09_p3.png'),
  'island_s10_p1.png': require('../../../../assets/themes/island/1536/island_s10_p1.png'),
  'island_s10_p2.png': require('../../../../assets/themes/island/1536/island_s10_p2.png'),
  'island_s10_p3.png': require('../../../../assets/themes/island/1536/island_s10_p3.png'),
  'island_s10_p4.png': require('../../../../assets/themes/island/1536/island_s10_p4.png'),
  'island_s10_p5.png': require('../../../../assets/themes/island/1536/island_s10_p5.png'),
  'island_s10_p6.png': require('../../../../assets/themes/island/1536/island_s10_p6.png'),
  'island_s10_p7.png': require('../../../../assets/themes/island/1536/island_s10_p7.png'),
};
