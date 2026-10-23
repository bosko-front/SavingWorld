import { Link, Stack } from 'expo-router';
import { ActionSheetIOS, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatMoney, getCurrency, type CurrencyMetadata } from '@/core/money';
import { nextThresholdMinor, progressPercent, remainingMinor, sceneFeedback, stageFor } from '@/core/progression';
import { deviceLocale } from '@/shared/i18n/locale';
import { AdaptiveGoalLayout } from '@/shared/layout';
import { colors, layout, radii, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { HeaderIconButton } from '@/shared/ui/header-button';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { StatusBadge } from '@/shared/ui/status-badge';
import { showToast } from '@/shared/ui/toast';

import { PLACEHOLDER_SCENE_ASPECT, PlaceholderScene } from './placeholder-scene';

// Development/test-only Home direction mocks (Phase 07.5, DECISIONS D49). Three compositions of the
// same fixed sample goal on AdaptiveGoalLayout, so the owner can compare them on real devices before
// Phase 08 builds Home. Nothing here reads or writes the database; every action is inert and says
// so in a toast. The scene is a crude placeholder, never final art.

export type DirectionOption = 'a' | 'b' | 'c';
export type DirectionSample = 'progress' | 'paused';

const SAMPLE = {
  title: 'Summer trip',
  targetMinor: 150_000,
  balanceMinor: 33_000,
  entryCount: 2,
  deadline: 'Jun 30, 2027',
  // Fixed text for the mock; Phase 08 computes the pace with deadlineEstimate().
  weeklyPace: 'about €33 a week',
  // Island stage names from ASSET_SPEC; the real names come from the theme manifest (Phase 09).
  stageNames: ['Empty island', 'First tree', 'Path', 'Flowers and bushes', 'Small house', 'Bridge', 'Pond', 'More trees', 'Larger house', 'Final decorations', 'Complete island'],
} as const;

const OPTION_NAMES: Record<DirectionOption, string> = {
  a: 'A · Calm hero',
  b: 'B · Progress ring',
  c: 'C · Ledger first',
};

type Numbers = {
  currency: CurrencyMetadata;
  saved: string;
  target: string;
  remaining: string;
  percent: number;
  fraction: number;
  stage: number;
  nextName: string;
  nextPercent: number;
  toNext: string;
};

function sampleNumbers(): Numbers {
  const currency = getCurrency('EUR');
  if (!currency) {
    throw new Error('EUR missing from the currency registry');
  }
  const locale = deviceLocale();
  const { balanceMinor, targetMinor } = SAMPLE;
  const stage = stageFor(balanceMinor, targetMinor);
  const next = nextThresholdMinor(balanceMinor, targetMinor) ?? targetMinor;
  return {
    currency,
    saved: formatMoney(balanceMinor, currency, { locale }),
    target: formatMoney(targetMinor, currency, { locale }),
    remaining: formatMoney(remainingMinor(balanceMinor, targetMinor), currency, { locale }),
    percent: progressPercent(balanceMinor, targetMinor),
    fraction: sceneFeedback(balanceMinor, targetMinor).overall,
    stage,
    nextName: SAMPLE.stageNames[Math.min(10, stage + 1)] ?? '',
    nextPercent: Math.min(100, (stage + 1) * 10),
    toNext: formatMoney(next - balanceMinor, currency, { locale }),
  };
}

export function HomeDirections({ option, sample }: { option: DirectionOption; sample: DirectionSample }) {
  const numbers = sampleNumbers();
  const paused = sample === 'paused';
  const controls =
    option === 'a' ? <OptionA numbers={numbers} paused={paused} /> : option === 'b' ? <OptionB numbers={numbers} paused={paused} /> : <OptionC numbers={numbers} paused={paused} />;
  return (
    <>
      <Stack.Screen options={{ title: OPTION_NAMES[option], headerRight: () => <SettingsHeaderButton /> }} />
      <AdaptiveGoalLayout
        testID="home-directions"
        sceneAspectRatio={PLACEHOLDER_SCENE_ASPECT}
        scene={<PlaceholderScene stage={numbers.stage} />}
        controls={
          <View style={styles.controls}>
            {controls}
            <DirectionSwitcher option={option} sample={sample} />
          </View>
        }
      />
    </>
  );
}

function mockOnly() {
  showToast({ tone: 'info', title: 'Mock only: nothing was changed' });
}

function goalOptions(paused: boolean) {
  ActionSheetIOS.showActionSheetWithOptions(
    { title: SAMPLE.title, options: [paused ? 'Resume goal' : 'Pause goal', 'Archive goal…', 'Cancel'], cancelButtonIndex: 2 },
    (index) => {
      if (index !== 2) {
        mockOnly();
      }
    },
  );
}

// Settings moves from a button at the bottom of Home to the navigation bar (proposed for all options).
function SettingsHeaderButton() {
  return (
    <Link href="/settings" asChild>
      <HeaderIconButton icon="settings" accessibilityLabel="Settings" />
    </Link>
  );
}

function TitleRow({ paused }: { paused: boolean }) {
  return (
    <View style={styles.titleRow}>
      <AppText role="title" accessibilityRole="header" style={styles.flexShrink}>
        {SAMPLE.title}
      </AppText>
      {paused ? <StatusBadge label="Paused" tone="info" icon="pause" /> : null}
    </View>
  );
}

function NextMilestone({ numbers }: { numbers: Numbers }) {
  return (
    <View style={styles.milestone} accessible accessibilityLabel={`Next: ${numbers.nextName} at ${numbers.nextPercent}%, ${numbers.toNext} more`}>
      <Icon name="milestone" role="headline" tone="accent" />
      <View style={styles.flexShrink}>
        <AppText role="label">{`Next: ${numbers.nextName}`}</AppText>
        <AppText role="footnote" tone="secondary">{`${numbers.toNext} more to reach ${numbers.nextPercent}%`}</AppText>
      </View>
    </View>
  );
}

// A: scene as hero, a large saved amount, a milestone bar, one primary action and the rest grouped.
function OptionA({ numbers, paused }: { numbers: Numbers; paused: boolean }) {
  return (
    <>
      <TitleRow paused={paused} />
      <View style={styles.amountBlock} accessible accessibilityLabel={`Saved ${numbers.saved} of ${numbers.target}`}>
        <AmountText formatted={numbers.saved} size="display" />
        <AppText tone="secondary">{`saved of ${numbers.target}`}</AppText>
      </View>
      <View style={styles.progressBlock}>
        <ProgressBar fraction={numbers.fraction} percent={numbers.percent} />
        <View style={styles.spread}>
          <AppText role="label" tone="accent">{`${numbers.percent}%`}</AppText>
          <AppText role="footnote" tone="secondary">{`${numbers.remaining} to go`}</AppText>
        </View>
      </View>
      <NextMilestone numbers={numbers} />
      <AppText role="footnote" tone="secondary">{`Deadline ${SAMPLE.deadline} · ${SAMPLE.weeklyPace}`}</AppText>
      <Button label="Add savings" icon="deposit" onPress={mockOnly} />
      <ListGroup>
        <ListRow title="History" icon="history" value={`${SAMPLE.entryCount} entries`} chevron onPress={mockOnly} />
        <ListRow title="Edit goal" icon="edit" chevron onPress={mockOnly} />
        <ListRow title="Pause or archive" icon="more" chevron onPress={() => goalOptions(paused)} />
      </ListGroup>
    </>
  );
}

// B: a summary card with a progress ring next to the amount, milestone dots and compact tiles.
function OptionB({ numbers, paused }: { numbers: Numbers; paused: boolean }) {
  return (
    <>
      <Card>
        <TitleRow paused={paused} />
        <View style={styles.ringRow}>
          <ProgressRing fraction={numbers.fraction} percent={numbers.percent} />
          <View style={styles.flexShrink} accessible accessibilityLabel={`Saved ${numbers.saved} of ${numbers.target}, ${numbers.remaining} to go`}>
            <AmountText formatted={numbers.saved} size="large" />
            <AppText tone="secondary">{`of ${numbers.target}`}</AppText>
            <AppText role="footnote" tone="secondary">{`${numbers.remaining} to go`}</AppText>
          </View>
        </View>
        <MilestoneDots stage={numbers.stage} />
        <NextMilestone numbers={numbers} />
      </Card>
      <Button label="Add savings" icon="deposit" onPress={mockOnly} />
      <View style={styles.tiles}>
        <Tile icon="history" label="History" onPress={mockOnly} />
        <Tile icon="edit" label="Edit" onPress={mockOnly} />
        <Tile icon="more" label="More" onPress={() => goalOptions(paused)} />
      </View>
      <AppText role="footnote" tone="secondary">{`Deadline ${SAMPLE.deadline} · ${SAMPLE.weeklyPace}`}</AppText>
    </>
  );
}

// C: numbers first in three stat tiles, a ten-step bar, and the two ledger actions side by side.
function OptionC({ numbers, paused }: { numbers: Numbers; paused: boolean }) {
  return (
    <>
      <TitleRow paused={paused} />
      <View style={styles.tiles}>
        <Stat label="Saved" value={numbers.saved} />
        <Stat label="To go" value={numbers.remaining} />
        <Stat label="Progress" value={`${numbers.percent}%`} />
      </View>
      <StepBar stage={numbers.stage} />
      <AppText role="footnote" tone="secondary">{`Stage ${numbers.stage} of 10 · next: ${numbers.nextName} at ${numbers.nextPercent}% (${numbers.toNext} more)`}</AppText>
      <View style={styles.buttonRow}>
        <View style={styles.flexOne}>
          <Button label="Add savings" icon="deposit" onPress={mockOnly} />
        </View>
        <View style={styles.flexOne}>
          <Button label="History" icon="history" variant="secondary" onPress={mockOnly} />
        </View>
      </View>
      <View style={styles.inlineActions}>
        <Button label="Edit goal" variant="plain" onPress={mockOnly} />
        <Button label={paused ? 'Resume' : 'Pause'} variant="plain" onPress={mockOnly} />
        <Button label="Archive" variant="plain" onPress={mockOnly} />
      </View>
    </>
  );
}

function ProgressRing({ fraction, percent }: { fraction: number; percent: number }) {
  const size = 88;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progress"
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.progressTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.min(1, fraction))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringLabel}>
        <AppText role="headline" tone="accent">{`${percent}%`}</AppText>
      </View>
    </View>
  );
}

function MilestoneDots({ stage }: { stage: number }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={`Stage ${stage} of 10 unlocked`}>
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} style={[styles.dot, index < stage ? styles.dotReached : null]} />
      ))}
    </View>
  );
}

function StepBar({ stage }: { stage: number }) {
  return (
    <View style={styles.steps} accessible accessibilityLabel={`Stage ${stage} of 10 unlocked`}>
      {Array.from({ length: 10 }, (_, index) => (
        <View key={index} style={[styles.step, index < stage ? styles.stepReached : null]} />
      ))}
    </View>
  );
}

function Tile({ icon, label, onPress }: { icon: 'history' | 'edit' | 'more'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <Icon name={icon} role="title" tone="action" />
      <AppText role="label" tone="action">
        {label}
      </AppText>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText role="footnote" tone="secondary">
        {label}
      </AppText>
      <AppText role="headline" style={styles.tabular}>
        {value}
      </AppText>
    </View>
  );
}

function DirectionSwitcher({ option, sample }: { option: DirectionOption; sample: DirectionSample }) {
  return (
    <View style={styles.switcher}>
      <AppText role="footnote" tone="secondary">
        Development only · Home direction mock with fixed sample values
      </AppText>
      <View style={styles.inlineActions}>
        {(['a', 'b', 'c'] as const).map((value) => (
          <Link key={value} href={{ pathname: '/dev-home', params: { option: value, sample } }} replace asChild>
            <Button label={value === option ? `${value.toUpperCase()} (shown)` : `Show ${value.toUpperCase()}`} variant="plain" />
          </Link>
        ))}
        <Link href={{ pathname: '/dev-home', params: { option, sample: sample === 'paused' ? 'progress' : 'paused' } }} replace asChild>
          <Button label={sample === 'paused' ? 'Show active' : 'Show paused'} variant="plain" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexShrink: {
    flexShrink: 1,
  },
  flexOne: {
    flexGrow: 1,
    flexBasis: 140,
  },
  amountBlock: {
    gap: spacing.xs / 2,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  spread: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSurface,
  },
  ringRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    flex: 1,
    height: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.progressTrack,
  },
  dotReached: {
    backgroundColor: colors.accent,
  },
  steps: {
    flexDirection: 'row',
    gap: 3,
  },
  step: {
    flex: 1,
    height: spacing.md,
    borderRadius: radii.sm / 2,
    backgroundColor: colors.progressTrack,
  },
  stepReached: {
    backgroundColor: colors.accent,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 90,
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  tilePressed: {
    backgroundColor: colors.surfaceSoft,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 96,
    gap: spacing.xs / 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
  },
  switcher: {
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
});
