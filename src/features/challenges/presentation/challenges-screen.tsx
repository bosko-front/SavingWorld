import { Link, useIsFocused } from 'expo-router';
import { useEffect, useReducer, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, Alert, I18nManager, Pressable, StyleSheet, View, type HostInstance } from 'react-native';

import { accessView, appClock, challengeCommandDeps, refreshAppData, useAccessView, useAppDataStore, useCommittedRead } from '@/bootstrap/app-data';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { MILESTONE_COUNT, stageFor } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import type { ChallengeRuleId } from '@/data/repositories/challenge-attempt-repository';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { READ_ONLY_COPY } from '@/features/billing/presentation/billing-copy';
import { stageName, themeManifestAt } from '@/features/worlds/registry';
import { worldCompleteCopy, worldNoun } from '@/features/worlds/world-copy';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { deviceLocale, formatCivilDate } from '@/shared/i18n/locale';
import { Screen } from '@/shared/layout';
import { borders, colors, layout, radii, spacing } from '@/shared/theme';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { useAccessibilityFocusOnChange } from '@/shared/ui/accessibility-focus';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { haptics } from '@/shared/ui/haptics';
import { Icon } from '@/shared/ui/icon';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListCell, ListGroup } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { StatusBadge } from '@/shared/ui/status-badge';
import { showToast } from '@/shared/ui/toast';

import { skipChallenge, startChallenge, type ChallengeCommandError } from '../application/challenge-commands';
import { readChallengeBoard } from '../application/challenge-queries';
import type { AttemptView, ChallengeBoard } from '../domain/challenge-rules';

import {
  ACTION_FAILED,
  CHALLENGES_SCREEN_COPY,
  challengeActionMessage,
  chooseCaption,
  completedQuestCopy,
  goalRowLabel,
  goalSavedCopy,
  historyRowCopy,
  pastQuestsLabel,
  QUEST_RULES,
  QUEST_TILES,
  type ChallengeAction,
  type QuestFormatters,
  type QuestWorld,
} from './challenge-copy';
import { takeCompletedQuest, useCompletedQuestStore } from './completed-quest';
import { CompletedQuestCard, CurrentQuestCard, OfferCard } from './quest-cards';

// Challenges tab (v1.2 sections 3, 6 and 7; Phase 13; owner design direction D97, owner polish
// D105): the three fixed quests for the goal Home shows, as a few quest cards, not a task list.
// Everything comes from the Phase 12 board (`readChallengeBoard`, settled for now): the current
// quest with its counted progress, the three quests with why each can or can't start and what
// starting would fix, and the past quests. This screen recomputes no rule.
//
// - One primary action: Start inside the chosen quest's card, or Add savings while a quest runs.
//   Add savings opens the shared entry form (the same command, operation ID and retry as Home); the
//   quest counts the saved entry by itself, with no separate confirmation.
// - Skip ends the current quest as Skipped after a confirmation; its history stays. No pause,
//   editing, custom quest, reminder or paywall: Free and Pro have the same three.
// - Short lines on the cards; the full rules are behind the info button (D105).
// - A quest completed by a commit is celebrated once in its card (`completed-quest.ts`), with the
//   success haptic when it was saved from here. Start and Skip play no haptic; choosing a quest plays
//   the selection haptic.
// - When the goal has reached its target and nothing can start, the finished world is the hero.
// - A paused goal keeps its quests and can still record savings; Pause/Resume stay on Home.
export function ChallengesScreen() {
  const state = useAppDataStore((store) => store.state);
  if (state.status === 'failed') {
    return <LoadFailed />;
  }
  if (state.status !== 'ready' || state.data.currency.currency.status !== 'set') {
    return null;
  }
  const { goals } = state.data;
  const currency = state.data.currency.currency.currency;
  const selected = goals.goals.find((summary) => summary.goal.id === goals.selectedGoalId && isOpenStatus(summary.goal.status));
  if (!selected) {
    return (
      <Screen centered testID="challenges">
        <NoOpenGoal goals={goals.goals} souvenirs={goals.souvenirs} canCreate={accessView(state.data).canCreate} />
      </Screen>
    );
  }
  return <GoalQuests key={selected.goal.id} summary={selected} currency={currency} />;
}

function LoadFailed() {
  return (
    <Screen testID="challenges-load-failed">
      <Notice tone="error" title={CHALLENGES_SCREEN_COPY.loadFailedTitle} message={COMMON_COPY.nothingChangedTryAgain} />
      <Button label={COMMON_COPY.tryAgain} onPress={() => void refreshAppData()} testID="challenges-retry" />
    </Screen>
  );
}

type NoOpenGoalProps = { goals: GoalSummary[]; souvenirs: CollectibleRecord[]; canCreate: boolean };

// No goal is growing (D97 "empty states are invitations"): with no goal yet the empty Island invites
// the first one; when the only goals are finished their finished world is shown with the one way
// forward (a new goal, or Reopen in Collection while Free's one goal is finished).
function NoOpenGoal({ goals, souvenirs, canCreate }: NoOpenGoalProps) {
  if (goals.length === 0) {
    return (
      <EmptyState
        icon="challenges"
        illustration={
          <View style={[styles.emptyWorld, { aspectRatio: worldArtAspect('island') }]} testID="challenges-empty-world">
            <WorldScene themeId="island" stage={0} backdrop="none" decorative />
          </View>
        }
        title={CHALLENGES_SCREEN_COPY.emptyTitle}
        message={CHALLENGES_SCREEN_COPY.emptyMessage}
        testID="challenges-empty">
        <Link href="/goal-form" asChild>
          <Button label={COMMON_COPY.createGoal} testID="challenges-new-goal" />
        </Link>
      </EmptyState>
    );
  }
  const finished = souvenirs.find((souvenir) => goals.some(({ goal }) => goal.id === souvenir.goalId && goal.status === 'completed')) ?? null;
  const manifest = finished ? themeManifestAt(finished.themeId, finished.themeVersion) : undefined;
  return (
    <EmptyState
      icon="souvenir"
      iconColor="honey"
      illustration={
        <View style={[styles.emptyWorld, { aspectRatio: worldArtAspect(finished?.themeId ?? 'island', manifest) }]} testID="challenges-empty-world">
          <WorldScene themeId={finished?.themeId ?? 'island'} stage={finished ? MILESTONE_COUNT : 0} manifest={manifest} backdrop="none" decorative />
        </View>
      }
      title={CHALLENGES_SCREEN_COPY.finishedTitle}
      message={
        canCreate
          ? CHALLENGES_SCREEN_COPY.finishedMessageCreate
          : CHALLENGES_SCREEN_COPY.finishedMessageReopen
      }
      testID="challenges-closed">
      {canCreate ? (
        <Link href="/goal-form" asChild>
          <Button label={COMMON_COPY.createGoal} testID="challenges-new-goal" />
        </Link>
      ) : (
        <Link href="/collection" asChild>
          <Button label={CHALLENGES_SCREEN_COPY.openCollection} testID="challenges-open-collection" />
        </Link>
      )}
    </EmptyState>
  );
}

type GoalQuestsProps = { summary: GoalSummary; currency: CurrencyMetadata };

function GoalQuests({ summary, currency }: GoalQuestsProps) {
  const { goal } = summary;
  const board = useCommittedRead(`challenges:${goal.id}`, (db) => readChallengeBoard(db, goal.id, appClock()));
  const locale = deviceLocale();
  const format: QuestFormatters = {
    amount: (minor) => formatMoney(minor, currency, { locale }),
    date: (date) => formatCivilDate(date, locale),
  };
  const world: QuestWorld = { themeId: goal.themeId, noun: worldNoun(goal.themeId), stageName: (stage) => stageName(goal.themeId, stage) };
  const celebrating = useCelebration(goal.id, board.status === 'ready' ? board.value : null, world, format);
  // After a lost Pro entitlement a goal not kept in use starts no quest and adds no savings (Phase 16);
  // its past quests stay. The quests themselves are identical in Free and Pro.
  const use = useAccessView()?.use(goal) ?? 'usable';

  if (board.status === 'loading') {
    return null;
  }
  if (board.status === 'failed') {
    return <LoadFailed />;
  }
  if (!board.value) {
    return (
      <Screen testID="challenges">
        <Notice tone="info" title={CHALLENGES_SCREEN_COPY.goalNotFoundTitle} message={CHALLENGES_SCREEN_COPY.goalNotFoundMessage} />
      </Screen>
    );
  }
  // Nothing can start and nothing runs: with no current quest Next milestone is only unavailable at
  // B ≥ T, so the world has reached its target.
  const complete = !board.value.current && board.value.offers.every((offer) => !offer.availability.available);
  return (
    <Screen testID="challenges">
      {complete ? <CompleteWorld summary={summary} /> : <GoalHeader summary={summary} format={format} />}
      {goal.status === 'paused' ? (
        <Notice tone="info" title={CHALLENGES_SCREEN_COPY.pausedTitle} message={CHALLENGES_SCREEN_COPY.pausedMessage} testID="challenges-paused" />
      ) : null}
      {use !== 'usable' ? (
        <Notice
          tone="info"
          title={READ_ONLY_COPY.badge}
          message={use === 'theme_locked' ? READ_ONLY_COPY.gardenSentence : READ_ONLY_COPY.sentence}
          testID="challenges-read-only"
        />
      ) : null}
      {celebrating ? <CompletedQuestCard attempt={celebrating} world={world} format={format} /> : null}
      {complete || use !== 'usable' ? null : <QuestBoard board={board.value} summary={summary} world={world} format={format} />}
      <PastQuests history={board.value.history} world={world} format={format} />
    </Screen>
  );
}

// The goal the quests belong to: its world as it is now, its name and saved amount.
function GoalHeader({ summary, format }: { summary: GoalSummary; format: QuestFormatters }) {
  const { goal } = summary;
  const saved = goalSavedCopy(format.amount(summary.balanceMinor), format.amount(goal.targetMinor));
  return (
    <View style={styles.goalRow} accessible accessibilityLabel={goalRowLabel(goal.title, saved)} testID="challenges-goal">
      <View style={[styles.goalWorld, { aspectRatio: worldArtAspect(goal.themeId) }]}>
        <WorldScene themeId={goal.themeId} stage={stageFor(summary.balanceMinor, goal.targetMinor)} decorative />
      </View>
      <View style={styles.goalText}>
        <AppText role="headline">{goal.title}</AppText>
        <AppText role="footnote" tone="secondary">
          {saved}
        </AppText>
      </View>
    </View>
  );
}

// Where the sparkles glow over the finished world, as fractions of its picture.
const COMPLETE_SPARKLES: readonly SparkleSpot[] = [
  { x: 0.28, y: 0.3, delayMs: 0 },
  { x: 0.7, y: 0.22, delayMs: 220 },
  { x: 0.55, y: 0.56, delayMs: 440 },
];

// The goal has reached its target and every quest is done (D105): the finished world is the hero,
// in its sky, with a one-shot sparkle once it is drawn (still under Reduce Motion), the world's own
// "complete" words and the one next step.
function CompleteWorld({ summary }: { summary: GoalSummary }) {
  const { goal } = summary;
  const [shown, setShown] = useState(false);
  const copy = worldCompleteCopy(goal.themeId);
  return (
    <View style={styles.completeCard} testID="challenges-rest">
      <View style={[styles.completeWorld, { aspectRatio: worldArtAspect(goal.themeId) }]}>
        <WorldScene themeId={goal.themeId} stage={stageFor(summary.balanceMinor, goal.targetMinor)} decorative onShown={() => setShown(true)} />
        {shown ? <AmbientSparkles spots={COMPLETE_SPARKLES} once large testID="challenges-rest-sparkles" /> : null}
      </View>
      <View style={styles.completeText}>
        <AppText role="title" accessibilityRole="header" style={styles.centered}>
          {copy.title}
        </AppText>
        <AppText tone="secondary" style={styles.centered}>
          {CHALLENGES_SCREEN_COPY.completeDetail}
        </AppText>
      </View>
      <Link href="/" asChild>
        <Button label={CHALLENGES_SCREEN_COPY.goHome} testID="challenges-go-home" />
      </Link>
    </View>
  );
}

// The completed quest to celebrate on this screen, once: the commit that completed it noted it
// (`completedAttemptId`), and it shows in its card when this screen is on screen with the re-read
// board. The success haptic plays only when it was saved from here (one haptic per action); the
// celebration is announced once. It is dropped when the screen loses focus, so it never replays.
function useCelebration(goalId: string, board: ChallengeBoard | null, world: QuestWorld, format: QuestFormatters): AttemptView | null {
  const focused = useIsFocused();
  const pending = useCompletedQuestStore((store) => store.pending);
  const [celebrating, show] = useReducer((_current: AttemptView | null, next: AttemptView | null) => next, null);

  useEffect(() => {
    if (!focused) {
      show(null);
      return;
    }
    const completed = board?.history.find((attempt) => attempt.id === pending?.attemptId);
    if (pending?.goalId !== goalId || !completed) {
      // Not this goal's, or the board has not been read since the commit.
      return;
    }
    const quest = takeCompletedQuest(goalId);
    if (!quest || completed.result !== 'completed') {
      return;
    }
    show(completed);
    if (quest.onChallenges) {
      haptics.success();
    }
    const copy = completedQuestCopy(completed, world, format);
    AccessibilityInfo.announceForAccessibilityWithOptions(`${copy.title} ${copy.message}`, { queue: true });
    // `world` and `format` are rebuilt on every render; the board and the signal decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, board, pending, goalId]);

  return celebrating;
}

// A section heading with the info button that opens the full quest rules (D105).
function QuestHeading({ title, caption, titleRef }: { title: string; caption: string; titleRef?: Ref<HostInstance> }) {
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingText}>
        <AppText role="headline" accessibilityRole="header" ref={titleRef}>
          {title}
        </AppText>
        <AppText role="footnote" tone="secondary">
          {caption}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={QUEST_RULES.title}
        onPress={() => Alert.alert(QUEST_RULES.title, QUEST_RULES.message)}
        hitSlop={spacing.md}
        style={styles.infoButton}
        testID="challenges-rules">
        <Icon name="info" role="headline" tone="action" />
      </Pressable>
    </View>
  );
}

type QuestBoardProps = { board: ChallengeBoard; summary: GoalSummary; world: QuestWorld; format: QuestFormatters };

// The current quest with Add savings and Skip, or the three quests to choose from, the chosen one
// carrying Start.
function QuestBoard({ board, summary, world, format }: QuestBoardProps) {
  const { goal } = summary;
  const [chosen, setChosen] = useState<ChallengeRuleId | null>(null);
  const [pending, setPending] = useState<ChallengeAction | null>(null);
  const inFlight = useRef(false);
  // One operation ID per quest to start or skip, reused by a retry after a failure, so a write that
  // did commit is replayed rather than repeated.
  const operations = useRef(new Map<string, string>());
  const operationId = (key: string) => {
    let id = operations.current.get(key);
    if (!id) {
      id = randomUuid();
      operations.current.set(key, id);
    }
    return id;
  };

  const available = board.offers.filter((offer) => offer.availability.available).map((offer) => offer.ruleId);
  const selected = chosen !== null && available.includes(chosen) ? chosen : (available[0] ?? null);

  const run = async (action: ChallengeAction, key: string, ruleId: ChallengeRuleId, write: (id: string) => ReturnType<typeof startChallenge>) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(action);
    const result = await write(operationId(key));
    // Read again either way: a refusal means the screen was out of date.
    await refreshAppData();
    inFlight.current = false;
    setPending(null);
    if (!result.ok) {
      showFailure(action, result.error, ruleId, world);
      return;
    }
    operations.current.delete(key);
    setChosen(null);
    // Calm in-place confirmation, announced to VoiceOver; no haptic for Start or Skip.
    showToast({ tone: 'info', title: action === 'start' ? CHALLENGES_SCREEN_COPY.started : CHALLENGES_SCREEN_COPY.skipped });
  };

  const start = (ruleId: ChallengeRuleId) =>
    void run('start', `start:${ruleId}`, ruleId, (id) => startChallenge(challengeCommandDeps(), { operationId: id, goalId: goal.id, ruleId }));

  const confirmSkip = (attempt: AttemptView) => {
    if (inFlight.current) {
      return;
    }
    Alert.alert(CHALLENGES_SCREEN_COPY.skipTitle, CHALLENGES_SCREEN_COPY.skipMessage, [
      { text: COMMON_COPY.cancel, style: 'cancel' },
      {
        text: CHALLENGES_SCREEN_COPY.skip,
        onPress: () =>
          void run('skip', `skip:${attempt.id}`, attempt.ruleId, (id) => skipChallenge(challengeCommandDeps(), { operationId: id, attemptId: attempt.id })),
      },
    ]);
  };

  // After Start (or Skip, or a quest that ends) the cards are replaced, so VoiceOver moves to the
  // new section's heading instead of staying on a removed card (Phase 19).
  const headingRef = useAccessibilityFocusOnChange(board.current?.id ?? null);

  const choose = (ruleId: ChallengeRuleId) => {
    if (ruleId !== selected) {
      haptics.selection();
    }
    setChosen(ruleId);
  };

  if (board.current) {
    const current = board.current;
    return (
      <View style={styles.section}>
        <QuestHeading title={CHALLENGES_SCREEN_COPY.currentTitle} caption={CHALLENGES_SCREEN_COPY.currentCaption} titleRef={headingRef} />
        <CurrentQuestCard attempt={current} world={world} format={format} />
        <Link href={{ pathname: '/entry-form', params: { goalId: goal.id, from: 'challenges' } }} asChild>
          <Button label={COMMON_COPY.addSavings} icon="add" disabled={pending !== null} testID="challenges-add-savings" />
        </Link>
        <Button
          label={CHALLENGES_SCREEN_COPY.skipQuest}
          variant="plain"
          centered
          onPress={() => confirmSkip(current)}
          loading={pending === 'skip'}
          disabled={pending !== null && pending !== 'skip'}
          testID="challenges-skip"
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <QuestHeading title={CHALLENGES_SCREEN_COPY.chooseTitle} caption={chooseCaption(world.noun)} titleRef={headingRef} />
      <View style={styles.offers} accessibilityRole="radiogroup" testID="quest-offers">
        {board.offers.map((offer) => (
          <OfferCard
            key={offer.ruleId}
            offer={offer}
            selected={offer.ruleId === selected}
            onSelect={choose}
            onStart={start}
            starting={pending === 'start'}
            world={world}
            format={format}
          />
        ))}
      </View>
    </View>
  );
}

function showFailure(action: ChallengeAction, error: ChallengeCommandError, ruleId: ChallengeRuleId, world: QuestWorld) {
  showToast({ tone: 'error', title: ACTION_FAILED[action], message: challengeActionMessage(action, error, ruleId, world) });
}

// Completed, ended and skipped quests, most recently ended first, behind a collapsible heading
// (D105, closed at first) with the count, so the screen stays about the quest at hand while the
// whole history is one tap away. Rows are calm grouped rows with a status word: Completed in green,
// the others neutral (never red, never "failed").
function PastQuests({ history, world, format }: { history: AttemptView[]; world: QuestWorld; format: QuestFormatters }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="quest-history">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={pastQuestsLabel(history.length)}
        accessibilityHint={open ? CHALLENGES_SCREEN_COPY.pastQuestsHideHint : CHALLENGES_SCREEN_COPY.pastQuestsShowHint}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.historyToggle, pressed && styles.pressed]}
        testID="quest-history-toggle">
        <AppText role="headline" style={styles.headingText}>
          {CHALLENGES_SCREEN_COPY.pastQuests}
        </AppText>
        <AppText tone="secondary">{String(history.length)}</AppText>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron" role="footnote" tone="secondary" weight="semibold" />
        </View>
      </Pressable>
      {open ? (
        <ListGroup>
          {history.map((attempt) => {
            const copy = historyRowCopy(attempt, world, format);
            const tile = QUEST_TILES[attempt.ruleId];
            return (
              <ListCell key={attempt.id} testID={`quest-history-${attempt.id}`}>
                <View style={styles.historyRow} accessible accessibilityLabel={copy.label}>
                  <IconTile name={tile.icon} color={tile.color} />
                  <View style={styles.historyText}>
                    <AppText>{copy.title}</AppText>
                    <AppText role="footnote" tone="secondary">
                      {copy.detail}
                    </AppText>
                  </View>
                  <StatusBadge label={copy.result.label} tone={copy.result.tone} icon={copy.result.icon} testID={`quest-history-${attempt.id}-result`} />
                </View>
              </ListCell>
            );
          })}
        </ListGroup>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  goalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  // A small, still picture of the goal's world as it is now; the quests below are what grow it.
  goalWorld: {
    width: 96,
  },
  goalText: {
    flex: 1,
    minWidth: 160,
    gap: spacing.xs / 2,
  },
  section: {
    gap: spacing.md,
  },
  offers: {
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  headingText: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  infoButton: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.accentSurface,
    borderWidth: borders.control,
    borderColor: colors.accentDecorative,
  },
  completeWorld: {
    width: '100%',
  },
  completeText: {
    gap: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingTop: spacing.sm,
  },
  // SF Symbols mirror chevron.right in right-to-left layouts, so it turns the other way there.
  chevronOpen: {
    transform: [{ rotate: I18nManager.isRTL ? '-90deg' : '90deg' }],
  },

  pressed: {
    opacity: 0.7,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyText: {
    flex: 1,
    minWidth: 140,
    gap: spacing.xs / 2,
  },
  emptyWorld: {
    width: '100%',
    maxWidth: 340,
  },
});
