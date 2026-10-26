import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MILESTONE_COUNT, THEME_IDS, type Stage, type ThemeId } from '@/core/progression';
import { AMBIENT_RELEASE_SWITCHES, setAmbientSwitches, useAmbientSwitches, type AmbientSwitches } from '@/features/worlds/ambient';
import { sceneDescription, unlockAt, visibleLayers } from '@/features/worlds/manifest';
import { themeManifest } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect, type SceneBackdrop } from '@/features/worlds/world-scene';
import type { SceneReveal } from '@/features/worlds/world-transition';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { useAmbientMotion } from '@/shared/ui/motion-preferences';
import { Notice } from '@/shared/ui/notice';
import { SectionHeader } from '@/shared/ui/section-header';

// Development/test-only scene inspection (Phase 09): step through the eleven Island states, compare
// the scene backdrops for the Home review and see all states as a contact sheet. It renders the
// real WorldScene with the bundled manifest, so what it shows is what Home shows. Reached from
// Settings → Development only → World inspector (`/dev-world`), guarded and absent from release
// bundles. Deep links: `?stage=0..10`, `?backdrop=sky|cream|none`, `?view=sheet`.
//
// Phase 10.5 (D90): the single view plays the Living Island's ambient motion under the same gate as
// Home, and "Ambient" switches it off entirely or per effect for review and the Phase 21 on/off
// measurement. The switches apply app-wide (Home too) until the next launch.
//
// Phase 17: `?theme=garden` (or the Island/Garden buttons) inspects the Garden the same way, with its
// own effects (koi, glows, butterflies, petals) among the switches. Switching the theme in the single
// view plays Home's theme crossfade ("Animated"), or swaps at once ("Instant").

// The export's PNGs are 0.75 of the canvas boxes; RGBA decoding is 4 bytes per pixel.
const FILE_SCALE = 0.75;

const BACKDROPS: SceneBackdrop[] = ['sky', 'cream', 'none'];

const EFFECTS: { key: keyof Omit<AmbientSwitches, 'enabled'>; label: string; garden?: true }[] = [
  { key: 'clouds', label: 'Clouds' },
  { key: 'water', label: 'Water' },
  { key: 'trees', label: 'Trees' },
  { key: 'koi', label: 'Koi', garden: true },
  { key: 'glows', label: 'Glows', garden: true },
  { key: 'butterflies', label: 'Butterflies', garden: true },
  { key: 'petals', label: 'Petals', garden: true },
];

const THEME_LABELS: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

const ALL_STAGES = Array.from({ length: MILESTONE_COUNT + 1 }, (_, stage) => stage as Stage);

type WorldInspectorProps = { themeId: ThemeId; stage: Stage; backdrop: SceneBackdrop; view: 'single' | 'sheet' };

export function WorldInspector(props: WorldInspectorProps) {
  const [stage, setStage] = useState<Stage>(props.stage);
  const [backdrop, setBackdrop] = useState<SceneBackdrop>(props.backdrop);
  const [view, setView] = useState(props.view);
  const [themeId, setThemeId] = useState<ThemeId>(props.themeId);
  // Phase 10: each step plays the transition Home would (+ as an unlock, − as a quiet change).
  const [animate, setAnimate] = useState(true);
  const [reveal, setReveal] = useState<SceneReveal | null>(null);
  const ambientMotion = useAmbientMotion();
  const switches = useAmbientSwitches();
  const step = (next: Stage) => {
    setReveal(animate ? { revision: Date.now(), mode: next > stage ? 'unlock' : 'quiet' } : null);
    setStage(next);
  };
  const result = themeManifest(themeId);
  if (!result.ok) {
    return (
      <Screen>
        <Notice tone="error" title={`${THEME_LABELS[themeId]} manifest is invalid`} message={result.problems.join('\n')} />
      </Screen>
    );
  }
  const { manifest } = result;
  const layers = visibleLayers(manifest, stage);
  const fileBytes = layers.reduce((sum, layer) => sum + layer.width * FILE_SCALE * layer.height * FILE_SCALE * 4, 0);

  return (
    <Screen testID="dev-world">
      <View style={styles.row}>
        {THEME_IDS.map((option) => (
          <Button
            key={option}
            label={THEME_LABELS[option]}
            variant={themeId === option ? 'primary' : 'secondary'}
            onPress={() => {
              setReveal(null);
              setThemeId(option);
            }}
            testID={`dev-world-theme-${option}`}
          />
        ))}
      </View>
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
          <View style={[styles.scene, { aspectRatio: worldArtAspect(themeId) }]}>
            <WorldScene themeId={themeId} stage={stage} backdrop={backdrop} reveal={reveal} ambient={ambientMotion} crossfadeTheme={animate} />
          </View>
          <View style={styles.row}>
            <Button
              label={switches.enabled ? 'Ambient on' : 'Ambient off'}
              variant={switches.enabled ? 'primary' : 'secondary'}
              onPress={() => setAmbientSwitches({ ...switches, enabled: !switches.enabled })}
              testID="dev-world-ambient"
            />
            {EFFECTS.filter((effect) => themeId === 'garden' || !effect.garden).map(({ key, label }) => (
              <Button
                key={key}
                label={label}
                variant={switches.enabled && switches[key] ? 'primary' : 'secondary'}
                disabled={!switches.enabled}
                onPress={() => setAmbientSwitches({ ...switches, [key]: !switches[key] })}
                testID={`dev-world-ambient-${key}`}
              />
            ))}
            <Button label="Reset" variant="plain" onPress={() => setAmbientSwitches(AMBIENT_RELEASE_SWITCHES)} testID="dev-world-ambient-reset" />
          </View>
          <AppText role="footnote" tone="secondary" testID="dev-world-ambient-state">
            {ambientMotion ? 'Ambient gate open (visible, active, no Reduce Motion)' : 'Ambient gate closed: the world is still'}
          </AppText>
          <View style={styles.row}>
            <Button label="−" variant="secondary" disabled={stage === 0} onPress={() => step((stage - 1) as Stage)} />
            <Button label="+" variant="secondary" disabled={stage === MILESTONE_COUNT} onPress={() => step((stage + 1) as Stage)} />
            <Button label={animate ? 'Animated' : 'Instant'} variant="secondary" onPress={() => setAnimate(!animate)} testID="dev-world-animate" />
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
                <View style={[styles.cellScene, { aspectRatio: worldArtAspect(themeId) }]}>
                  <WorldScene themeId={themeId} stage={sheetStage} backdrop={backdrop} />
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
  },
});
