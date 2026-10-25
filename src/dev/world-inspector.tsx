import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MILESTONE_COUNT, type Stage } from '@/core/progression';
import { sceneDescription, unlockAt, visibleLayers } from '@/features/worlds/manifest';
import { themeManifest } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect, type SceneBackdrop } from '@/features/worlds/world-scene';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { SectionHeader } from '@/shared/ui/section-header';

// Development/test-only scene inspection (Phase 09): step through the eleven Island states, compare
// the scene backdrops for the Home review and see all states as a contact sheet. It renders the
// real WorldScene with the bundled manifest, so what it shows is what Home shows. Reached from
// Settings → Development only → World inspector (`/dev-world`), guarded and absent from release
// bundles. Deep links: `?stage=0..10`, `?backdrop=sky|cream|none`, `?view=sheet`.

// The export's PNGs are 0.75 of the canvas boxes; RGBA decoding is 4 bytes per pixel.
const FILE_SCALE = 0.75;

const BACKDROPS: SceneBackdrop[] = ['sky', 'cream', 'none'];

const ALL_STAGES = Array.from({ length: MILESTONE_COUNT + 1 }, (_, stage) => stage as Stage);

type WorldInspectorProps = { stage: Stage; backdrop: SceneBackdrop; view: 'single' | 'sheet' };

export function WorldInspector(props: WorldInspectorProps) {
  const [stage, setStage] = useState<Stage>(props.stage);
  const [backdrop, setBackdrop] = useState<SceneBackdrop>(props.backdrop);
  const [view, setView] = useState(props.view);
  const result = themeManifest('island');
  if (!result.ok) {
    return (
      <Screen>
        <Notice tone="error" title="Island manifest is invalid" message={result.problems.join('\n')} />
      </Screen>
    );
  }
  const { manifest } = result;
  const layers = visibleLayers(manifest, stage);
  const fileBytes = layers.reduce((sum, layer) => sum + layer.width * FILE_SCALE * layer.height * FILE_SCALE * 4, 0);

  return (
    <Screen testID="dev-world">
      <View style={styles.row}>
        <Button label="Single" variant={view === 'single' ? 'primary' : 'secondary'} onPress={() => setView('single')} />
        <Button label="Contact sheet" variant={view === 'sheet' ? 'primary' : 'secondary'} onPress={() => setView('sheet')} />
      </View>
      <View style={styles.row}>
        {BACKDROPS.map((option) => (
          <Button key={option} label={option} variant={backdrop === option ? 'primary' : 'secondary'} onPress={() => setBackdrop(option)} />
        ))}
      </View>
      {view === 'single' ? (
        <>
          <View style={styles.scene}>
            <WorldScene themeId="island" stage={stage} backdrop={backdrop} />
          </View>
          <View style={styles.row}>
            <Button label="−" variant="secondary" disabled={stage === 0} onPress={() => setStage((stage - 1) as Stage)} />
            <Button label="+" variant="secondary" disabled={stage === MILESTONE_COUNT} onPress={() => setStage((stage + 1) as Stage)} />
          </View>
          <AppText role="headline">{`Stage ${stage}: ${unlockAt(manifest, stage)?.name ?? manifest.base.name}`}</AppText>
          <AppText tone="secondary">{sceneDescription(manifest, stage)}</AppText>
          <AppText role="footnote" tone="secondary" testID="dev-world-stats">
            {`${layers.length} layers · files decode to ${(fileBytes / 1024 / 1024).toFixed(1)} MiB at 1536 (before downscaling)`}
          </AppText>
          <AppText role="footnote" tone="secondary">{layers.map((layer) => layer.id).join(', ')}</AppText>
        </>
      ) : (
        <>
          <SectionHeader title="All eleven states" />
          <View style={styles.sheet}>
            {ALL_STAGES.map((sheetStage) => (
              <View key={sheetStage} style={styles.cell}>
                <View style={styles.cellScene}>
                  <WorldScene themeId="island" stage={sheetStage} backdrop={backdrop} />
                </View>
                <AppText role="caption" tone="secondary">
                  {`${sheetStage * 10}% · ${unlockAt(manifest, sheetStage)?.name ?? manifest.base.name}`}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scene: {
    width: '100%',
    aspectRatio: worldArtAspect('island'),
  },
  sheet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '48%',
    gap: spacing.xs,
  },
  cellScene: {
    width: '100%',
    aspectRatio: worldArtAspect('island'),
  },
});
