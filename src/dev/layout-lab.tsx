import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdaptiveGoalLayout, fitAspect, resolveArrangementMode, useMeasuredSize } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextField } from '@/shared/ui/text-field';

import { useMountCount } from './mount-count';

// Development/test-only lab for AdaptiveGoalLayout (docs/ADAPTIVE_LAYOUT.md). It proves region
// sizing, scene aspect ratio, side safe areas and short-window behavior with sample content only:
// no goals, amounts or ledger exist. All state that must survive arrangement changes (selected
// sample goal, draft text, press count) is owned here, above the layout.

const SCENE_ASPECT_RATIO = 4 / 3;
const SAMPLE_GOALS = ['Island', 'Garden', 'Lighthouse'] as const;
type SampleGoal = (typeof SAMPLE_GOALS)[number];

export function LayoutLab({ focusDraft = false }: { focusDraft?: boolean }) {
  const [goal, setGoal] = useState<SampleGoal>('Island');
  const [draft, setDraft] = useState('');
  const [pretendSaves, setPretendSaves] = useState(0);
  const [forceFallback, setForceFallback] = useState(false);
  const labMounts = useMountCount('layout-lab');

  return (
    <AdaptiveGoalLayout
      testID="layout-lab"
      arrangement={forceFallback ? 'fallback' : 'automatic'}
      sceneAspectRatio={SCENE_ASPECT_RATIO}
      scene={<SampleScene goal={goal} />}
      controls={
        <SampleControls
          goal={goal}
          onSelectGoal={setGoal}
          draft={draft}
          onChangeDraft={setDraft}
          pretendSaves={pretendSaves}
          onPretendSave={() => setPretendSaves((count) => count + 1)}
          forceFallback={forceFallback}
          onToggleFallback={() => setForceFallback((value) => !value)}
          labMounts={labMounts}
          focusDraft={focusDraft}
        />
      }
    />
  );
}

function SampleScene({ goal }: { goal: SampleGoal }) {
  const [region, onRegionLayout] = useMeasuredSize();
  const scene = fitAspect(region, SCENE_ASPECT_RATIO);
  const mounts = useMountCount('layout-lab-scene');
  useEffect(() => {
    // Development evidence for docs/evidence/PHASE_03.md: one line per scene re-layout.
    console.log(`[layout-lab] scene region=${size(region)} scene=${size(fitAspect(region, SCENE_ASPECT_RATIO))} mounts=${mounts} goal=${goal}`);
  }, [region, mounts, goal]);
  return (
    // The soft background is decorative and fills the whole region; the scene box keeps 4:3 and
    // fits inside the measured region.
    <View style={styles.sceneRegion} onLayout={onRegionLayout} testID="sample-scene-region">
      <View
        style={[styles.scene, { width: scene.width, height: scene.height }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Sample world for the ${goal} goal`}
        testID="sample-scene">
        <View style={styles.sun} />
        <View style={styles.hill} />
        <View style={styles.sceneCaption}>
          <AppText role="headline">{`${goal} sample world`}</AppText>
          <AppText role="caption" tone="secondary" testID="sample-scene-size">
            {`Region ${size(region)} · scene ${size(scene)} (4:3) · mounted ${mounts}×`}
          </AppText>
        </View>
      </View>
    </View>
  );
}

type SampleControlsProps = {
  goal: SampleGoal;
  onSelectGoal: (goal: SampleGoal) => void;
  draft: string;
  onChangeDraft: (text: string) => void;
  pretendSaves: number;
  onPretendSave: () => void;
  forceFallback: boolean;
  onToggleFallback: () => void;
  labMounts: number;
  focusDraft: boolean;
};

function SampleControls({
  goal,
  onSelectGoal,
  draft,
  onChangeDraft,
  pretendSaves,
  onPretendSave,
  forceFallback,
  onToggleFallback,
  labMounts,
  focusDraft,
}: SampleControlsProps) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [column, onColumnLayout] = useMeasuredSize();
  const mounts = useMountCount('layout-lab-controls');
  const draftRef = useRef<TextInputInstance>(null);
  useEffect(() => {
    if (focusDraft) {
      draftRef.current?.focus();
    }
  }, [focusDraft]);
  const mode = resolveArrangementMode(forceFallback ? 'fallback' : 'automatic');
  useEffect(() => {
    // Development evidence: one line per window, safe-area or controls-column change. The draft is
    // reported by length only.
    console.log(
      `[layout-lab] mode=${mode} window=${size(window)} font=${window.fontScale.toFixed(2)} ` +
        `insets=${r(insets.top)}/${r(insets.right)}/${r(insets.bottom)}/${r(insets.left)} controls=${size(column)} ` +
        `mounts=${labMounts}/${mounts} draftChars=${draft.length} saves=${pretendSaves} goal=${goal}`,
    );
    // Log geometry changes only; draft/goal values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, window.width, window.height, window.fontScale, insets, column, labMounts, mounts]);

  return (
    <View style={styles.controls} onLayout={onColumnLayout}>
      <AppText role="title" accessibilityRole="header">
        Layout lab
      </AppText>
      <AppText tone="secondary">
        Development only. Resize, fold, rotate or use split view while typing. The draft, selected sample goal and route
        must stay; Pretend saves must not change by itself.
      </AppText>

      <Card>
        <AppText role="label">Sample goal</AppText>
        {SAMPLE_GOALS.map((option) => (
          <Button
            key={option}
            label={option === goal ? `${option} (selected)` : option}
            variant={option === goal ? 'primary' : 'secondary'}
            onPress={() => onSelectGoal(option)}
          />
        ))}
      </Card>

      <TextField
        label="Sample draft"
        value={draft}
        onChangeText={onChangeDraft}
        placeholder="Type, then change the window"
        hint="Kept above the layout; never parsed or stored."
        inputRef={draftRef}
        testID="layout-lab-draft"
      />
      <Button label="Pretend save" onPress={onPretendSave} />
      <AppText testID="layout-lab-saves">{`Pretend saves: ${pretendSaves}. Nothing is stored.`}</AppText>

      <Link href="/sample-form" asChild>
        <Button label="Open sample form sheet" variant="secondary" />
      </Link>
      <Link href="/details" asChild>
        <Button label="Push a detail screen" variant="secondary" />
      </Link>

      <Card variant="soft">
        <AppText role="label">Measurements (ephemeral)</AppText>
        <Measurement label="Arrangement" value={mode === 'native' ? 'Native ArrangementView' : 'Fallback composition'} />
        <Measurement label="Window" value={`${size(window)} pt, text ×${window.fontScale.toFixed(2)}`} />
        <Measurement
          label="Window safe area (top right bottom left)"
          value={`${r(insets.top)} ${r(insets.right)} ${r(insets.bottom)} ${r(insets.left)}`}
        />
        <Measurement label="Controls column" value={`${size(column)} pt`} />
        <Measurement label="Mounts (lab / controls)" value={`${labMounts} / ${mounts}`} />
      </Card>

      <Button
        label={forceFallback ? 'Use automatic arrangement' : 'Force fallback composition'}
        variant="plain"
        accessibilityHint="Switching rebuilds both regions; use it only to compare the two compositions."
        onPress={onToggleFallback}
      />
    </View>
  );
}

function Measurement({ label, value }: { label: string; value: string }) {
  return (
    <View accessible style={styles.measurement}>
      <AppText role="footnote" tone="secondary">
        {label}
      </AppText>
      <AppText role="callout">{value}</AppText>
    </View>
  );
}

function size({ width, height }: { width: number; height: number }) {
  return `${r(width)}×${r(height)}`;
}

function r(value: number) {
  return Math.round(value).toString();
}

const SUN_SIZE = spacing.xxl * 1.5;

const styles = StyleSheet.create({
  sceneRegion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  scene: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderControl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
  },
  sun: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: SUN_SIZE,
    height: SUN_SIZE,
    borderRadius: SUN_SIZE / 2,
    backgroundColor: colors.accentDecorative,
  },
  hill: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    bottom: '-35%',
    height: '70%',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSoft,
  },
  sceneCaption: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  controls: {
    gap: spacing.md,
  },
  measurement: {
    gap: spacing.xs / 2,
  },
});
