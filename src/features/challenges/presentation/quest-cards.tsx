import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Stage, ThemeId } from '@/core/progression';
import type { ChallengeRuleId } from '@/data/repositories/challenge-attempt-repository';
import { MilestonePreviewTile } from '@/features/worlds/presentation/milestone-preview-tile';
import { milestonePreview } from '@/features/worlds/themes/milestone-previews';
import { milestonePreviewLabel } from '@/features/worlds/world-copy';
import { WORLD_MOTION } from '@/features/worlds/world-transition';
import { borders, colors, elevation, motion, radii, spacing } from '@/shared/theme';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconTile, tileColors } from '@/shared/ui/icon-tile';
import { useReduceMotion } from '@/shared/ui/motion-preferences';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { StatusBadge } from '@/shared/ui/status-badge';

import type { AttemptView, ChallengeOffer } from '../domain/challenge-rules';

import {
  completedQuestCopy,
  currentQuestCopy,
  offerCopy,
  offerLabel,
  ofTarget,
  QUEST_CARD_COPY,
  QUEST_TAGLINES,
  QUEST_TILES,
  QUEST_TITLES,
  startQuestLabel,
  unavailableCopy,
  unavailableQuestLabel,
  type QuestFormatters,
  type QuestWorld,
} from './challenge-copy';

// Quest cards for the Challenges tab (Phase 13, owner design direction D97; owner polish D105): a
// few warm, rounded cards, one per fixed quest, never a checklist. Each quest has its own identity
// (glyph, pastel color, tagline). The three states look different on purpose:
// - available: a white card to choose; the chosen one gets a green outline, a check, its frozen
//   target and the Start button inside it;
// - can't start now: a quiet soft card with one kind line why;
// - current (in progress): a card with the quest's tinted band, an "In progress" badge, the target
//   as a large amount and the shared ProgressBar. It never has a Start button.

// The quest's pastel tint, shared with its tile (tests/unit/contrast.test.ts checks text on it).
export function questTint(ruleId: ChallengeRuleId): string {
  return tileColors[QUEST_TILES[ruleId].color].background;
}

type QuestCopyProps = { world: QuestWorld; format: QuestFormatters };

type QuestIdentityProps = {
  ruleId: ChallengeRuleId;
  trailing?: ReactNode;
  // Next milestone: the goal's theme and the stage the quest unlocks, shown as a small picture of
  // that stage's main object in place of the generic tile (D136).
  preview?: { themeId: ThemeId; stage: Stage; spoken: boolean } | null;
};

// The quest's tile, name and tagline, the head of every card.
function QuestIdentity({ ruleId, trailing, preview }: QuestIdentityProps) {
  const tile = QUEST_TILES[ruleId];
  return (
    <View style={styles.identity}>
      {preview ? (
        <MilestonePreviewTile themeId={preview.themeId} stage={preview.stage} accessible={preview.spoken} testID={`quest-preview-${ruleId}`} />
      ) : (
        <IconTile name={tile.icon} color={tile.color} role="headline" />
      )}
      <View style={styles.identityText}>
        <AppText role="label">{QUEST_TITLES[ruleId]}</AppText>
        <AppText role="footnote" tone="secondary">
          {QUEST_TAGLINES[ruleId]}
        </AppText>
      </View>
      {trailing}
    </View>
  );
}

type OfferCardProps = QuestCopyProps & {
  offer: ChallengeOffer;
  selected: boolean;
  onSelect: (ruleId: ChallengeRuleId) => void;
  // The chosen card carries the screen's one primary action.
  onStart: (ruleId: ChallengeRuleId) => void;
  starting: boolean;
};

export function OfferCard({ offer, selected, onSelect, onStart, starting, world, format }: OfferCardProps) {
  const { availability, ruleId } = offer;
  if (!availability.available) {
    const reason = unavailableCopy(availability.reason, ruleId, world);
    return (
      <View
        style={[styles.card, styles.restingCard]}
        accessible
        accessibilityLabel={unavailableQuestLabel(QUEST_TITLES[ruleId], reason)}
        testID={`quest-offer-${ruleId}`}>
        <View style={styles.identity}>
          <IconTile name={QUEST_TILES[ruleId].icon} color="neutral" />
          <View style={styles.identityText}>
            <AppText role="label" tone="secondary">
              {QUEST_TITLES[ruleId]}
            </AppText>
            <AppText role="footnote" tone="secondary" testID={`quest-offer-${ruleId}-reason`}>
              {reason}
            </AppText>
          </View>
        </View>
      </View>
    );
  }
  const copy = offerCopy(availability.preview, world, format);
  const previewStage = availability.preview.ruleId === 'next_milestone' ? availability.preview.milestoneStage : null;
  // The radio is one VoiceOver element, so the picture's description joins its label.
  const previewObject = previewStage === null ? null : (milestonePreview(world.themeId, previewStage)?.object ?? null);
  return (
    <View style={[styles.card, selected && styles.selectedCard]} testID={`quest-offer-${ruleId}`}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={offerLabel(copy, previewObject === null ? null : milestonePreviewLabel(previewObject))}
        onPress={() => onSelect(ruleId)}
        style={({ pressed }) => [styles.choice, pressed && !selected && styles.pressed]}
        testID={`quest-offer-${ruleId}-choice`}>
        <QuestIdentity
          ruleId={ruleId}
          preview={previewStage === null ? null : { themeId: world.themeId, stage: previewStage, spoken: false }}
          trailing={selected ? <Icon name="success" role="title" tone="action" filled /> : <View style={styles.radio} />}
        />
        <AppText role="headline">{copy.headline}</AppText>
        {selected ? (
          <AppText role="footnote" tone="secondary" testID={`quest-offer-${ruleId}-detail`}>
            {copy.detail}
          </AppText>
        ) : null}
      </Pressable>
      {selected ? (
        <View style={styles.cardAction}>
          <Button label={startQuestLabel(QUEST_TITLES[ruleId])} onPress={() => onStart(ruleId)} loading={starting} testID="challenges-start" />
        </View>
      ) : null}
    </View>
  );
}

// The one unfinished quest: its tinted identity band with "In progress", then what it asks, the
// counted amount large against its frozen target, the shared ProgressBar and when it ends.
export function CurrentQuestCard({ attempt, world, format }: QuestCopyProps & { attempt: AttemptView }) {
  const copy = currentQuestCopy(attempt, world, format);
  const { progress } = copy;
  return (
    <View style={[styles.card, styles.currentCard]} testID="quest-current">
      <View style={[styles.band, { backgroundColor: questTint(attempt.ruleId) }]}>
        <QuestIdentity
          ruleId={attempt.ruleId}
          preview={attempt.ruleId === 'next_milestone' && attempt.milestoneStage !== null ? { themeId: world.themeId, stage: attempt.milestoneStage, spoken: true } : null}
          trailing={<StatusBadge label={QUEST_CARD_COPY.inProgress} tone="info" icon="resume" testID="quest-current-badge" />} />
      </View>
      <View style={styles.currentBody}>
        <AppText role="title" accessibilityRole="header" testID="quest-current-headline">
          {copy.headline}
        </AppText>
        {progress.kind === 'amount' ? (
          <View style={styles.progress}>
            <View style={styles.amounts} accessible accessibilityLabel={progress.label} testID="quest-current-progress">
              <AppText role="title" style={styles.tabular}>
                {progress.saved}
              </AppText>
              <AppText tone="secondary">{ofTarget(progress.target)}</AppText>
            </View>
            <ProgressBar
              fraction={progress.fraction}
              percent={progress.percent}
              milestones={1}
              accessibilityLabel={QUEST_CARD_COPY.progressLabel}
              // A saved entry glides the fill to its new position with Home's timing (D106): a short
              // pause while the entry sheet closes, then the count duration. Another quest, or
              // Reduce Motion, jumps.
              delayMs={WORLD_MOTION.startDelayMs}
              durationMs={WORLD_MOTION.countMs}
              resetKey={attempt.id}
              testID="quest-current-bar"
            />
            <AppText role="footnote" tone="secondary" testID="quest-current-period">
              {`${progress.toGo} · ${copy.period}`}
            </AppText>
          </View>
        ) : (
          <View style={styles.progress}>
            <AppText tone="secondary" testID="quest-current-progress">
              {progress.status}
            </AppText>
            <AppText role="footnote" tone="secondary" testID="quest-current-period">
              {copy.period}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

// Where the sparkles glow over a completed quest's card, as fractions of the card.
const COMPLETED_SPARKLES: readonly SparkleSpot[] = [
  { x: 0.82, y: 0.12, delayMs: 0 },
  { x: 0.64, y: 0.5, delayMs: 160 },
  { x: 0.9, y: 0.66, delayMs: 320 },
];

const POP_FROM = 0.94;

// A quest the person just completed, celebrated once in place (D97 "celebrate in place, once"): the
// card settles in with a short pop and a one-shot honey sparkle (≤ 1 s overall, transforms and
// opacity only). Under Reduce Motion it is the final card at once. No points, streak or new money.
export function CompletedQuestCard({ attempt, world, format }: QuestCopyProps & { attempt: AttemptView }) {
  const copy = completedQuestCopy(attempt, world, format);
  const reduced = useReduceMotion();
  const pop = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) {
      pop.value = withTiming(1, { duration: motion.slow * 1.5, easing: Easing.out(Easing.back(1.6)) });
    }
    // Plays once, when the card first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: POP_FROM + (1 - POP_FROM) * pop.value }],
  }));

  return (
    <Animated.View
      style={[styles.card, styles.completedCard, popStyle]}
      accessible
      accessibilityLabel={`${copy.title} ${copy.message}`}
      testID="quest-completed">
      <View style={styles.identity}>
        <IconTile name="success" color="green" role="headline" />
        <View style={styles.identityText}>
          <AppText role="headline" accessibilityRole="header">
            {copy.title}
          </AppText>
          <AppText role="footnote" tone="secondary" testID="quest-completed-message">
            {copy.message}
          </AppText>
        </View>
      </View>
      <AmbientSparkles spots={COMPLETED_SPARKLES} once large testID="quest-completed-sparkles" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
    ...elevation.card,
  },
  // A quest that can't start now rests flat on the soft surface: calm, readable, not tappable.
  restingCard: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.surfaceSoft,
    shadowOpacity: 0,
  },
  // The chosen quest: a 2 pt action-green outline and a check, so the choice never rests on color.
  selectedCard: {
    borderWidth: borders.emphasis,
    borderColor: colors.actionPrimary,
  },
  choice: {
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  cardAction: {
    marginTop: spacing.xs,
  },
  // The empty radio ring of a quest not chosen; decorative (the radio role carries the state).
  radio: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: borders.emphasis,
    borderColor: colors.borderControl,
  },
  currentCard: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  band: {
    padding: spacing.md,
  },
  currentBody: {
    gap: spacing.md,
    padding: spacing.md,
  },
  // The celebration keeps the thin gold frame of finished worlds (D98).
  completedCard: {
    borderWidth: borders.control,
    borderColor: colors.accentDecorative,
    backgroundColor: colors.accentSurface,
  },
  pressed: {
    opacity: 0.85,
  },
  identity: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityText: {
    flex: 1,
    minWidth: 120,
    gap: spacing.xs / 2,
  },
  progress: {
    gap: spacing.sm,
  },
  amounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
