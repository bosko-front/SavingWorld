import { Link } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { currentCapabilities, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { hasGoalSlot } from '@/core/access';
import { MILESTONE_COUNT, progressPercent, sceneFeedback } from '@/core/progression';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { themeManifestAt } from '@/features/worlds/registry';
import { UnlockBanner } from '@/features/worlds/unlock-banner';
import { useWorldMotion, type WorldMotion } from '@/features/worlds/use-world-motion';
import { worldNoun } from '@/features/worlds/world-copy';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { WORLD_MOTION } from '@/features/worlds/world-transition';
import { AdaptiveGoalLayout, Screen } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { useCountUp } from '@/shared/ui/count-up';
import { useAmbientMotion } from '@/shared/ui/motion-preferences';
import { EmptyState } from '@/shared/ui/empty-state';
import { haptics } from '@/shared/ui/haptics';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { ProgressBar, progressTextTone } from '@/shared/ui/progress-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { selectGoal } from '../application/goal-selection';

import { ANOTHER_WORLD } from './goal-copy';
import { SavingsPlanCards } from './savings-plan-cards';
import { GoalMenu } from './goal-menu';
import { useDeleteGoal } from './use-delete-goal';
import { homeDashboard, type HomeDashboard, type NextMilestone } from './home-dashboard';
import { useGoalAction } from './use-goal-action';

// Home (Phase 06 basics, Phase 07 ledger actions, Phase 07.5 visual direction A "Calm hero", Phase 08
// dashboard): the world first, then progress. The controls show the goal title with its options
// menu (⋯: History, Edit, Pause/Resume, Finish at B ≥ T, New goal, Delete), the saved amount as the largest text,
// the target, a milestone progress bar with the floored percent and the remaining (or overfunded)
// amount, Add savings (the one primary action, a full-width button under the progress since owner
// decision D81; D72/D73 had it floating), the milestone card and the savings plan when a deadline is set (D84). Every number
// comes from the committed snapshot (balance recomputed from the ledger) and the civil date it was
// read on; a commit or a new date re-reads it. Settings is in the navigation bar. Free shows at most one open goal; with more open goals (Pro) a simple list chooses
// which one Home shows. The choice is stored, and after a restart a missing or closed choice falls
// back to the oldest open goal.
export function HomeScreen() {
  const state = useAppDataStore((store) => store.state);

  if (state.status === 'failed') {
    return <LoadFailed />;
  }
  if (state.status !== 'ready') {
    return null;
  }
  const { currency, goals, today } = state.data;
  if (currency.currency.status !== 'set') {
    return (
      <Screen>
        <Notice
          tone="error"
          title="Your currency can’t be read"
          message="The saved currency doesn’t match this version of the app. Nothing was changed. Update Saving Worlds to continue."
        />
      </Screen>
    );
  }

  const open = goals.goals.filter((summary) => isOpenStatus(summary.goal.status));
  const completedCount = goals.goals.length - open.length;
  const selected = open.find((summary) => summary.goal.id === goals.selectedGoalId) ?? null;
  const canCreate = hasGoalSlot(currentCapabilities(), goals.goals.length);

  if (!selected) {
    return (
      <Screen testID="home" centered>
        <EmptyHome
          completedCount={completedCount}
          canCreate={canCreate}
          // Free's one goal is finished (D98, V04): its finished world, newest souvenir of a completed goal.
          finishedWorld={
            canCreate
              ? null
              : (goals.souvenirs.find((souvenir) =>
                  goals.goals.some(({ goal }) => goal.id === souvenir.goalId && goal.status === 'completed'),
                ) ?? null)
          }
        />
      </Screen>
    );
  }

  return (
    <SelectedGoalHome
      summary={selected}
      dashboard={homeDashboard(selected, currency.currency.currency, today)}
      open={open}
      canCreate={canCreate}
      souvenir={goals.souvenirs.some((souvenir) => souvenir.goalId === selected.goal.id)}
    />
  );
}

type SelectedGoalHomeProps = {
  summary: GoalSummary;
  dashboard: HomeDashboard;
  open: GoalSummary[];
  canCreate: boolean;
  // The goal holds its permanent souvenir (Phase 11): the first time this turns true after a commit,
  // the world's moment is the souvenir moment.
  souvenir: boolean;
};

// The selected goal on AdaptiveGoalLayout: the world, then the numbers, the milestone and the
// savings plan; goal administration is in the ⋯ menu and Add savings sits under the progress (D73,
// D81). After a committed change the world motion (Phase 10) moves the amount, the bar and the
// scene from what was shown to the committed values, with the unlock moment when a deposit crosses
// a threshold; everything else on Home shows the committed values at once.
function SelectedGoalHome({ summary, dashboard, open, canCreate, souvenir }: SelectedGoalHomeProps) {
  const { goal } = summary;
  const revision = useAppDataStore((store) => store.version);
  const motion = useWorldMotion({
    goalId: goal.id,
    themeId: goal.themeId,
    balanceMinor: summary.balanceMinor,
    targetMinor: goal.targetMinor,
    souvenir,
    revision,
  });
  // Living Island (Phase 10.5, D90): clouds, water sparkle and trees move only while Home is focused,
  // the app is active and Reduce Motion is off.
  const ambientMotion = useAmbientMotion();
  const action = useGoalAction();
  const { deleting, confirmDelete } = useDeleteGoal();
  const busy = action.pending?.goalId === goal.id || deleting === goal.id;
  return (
    <AdaptiveGoalLayout
      testID="home"
      sceneAspectRatio={worldArtAspect(goal.themeId)}
      // The sky fills the top of the screen edge to edge down to the goal title; the Island stays
      // clear of the bars and the side gutters (owner decision D80).
      sceneBleed
      sceneBleedColor={colors.sceneSkyTop}
      // No text field on Home: the entry sheet's keyboard must not scroll the world away under the
      // sheet, or the unlock moment would play off screen.
      keyboard="none"
      scene={
        <WorldScene
          themeId={goal.themeId}
          stage={motion.stage}
          upcomingStage={motion.upcomingStage}
          reveal={motion.reveal}
          ambient={ambientMotion}
          fill>
          {motion.banner ? <UnlockBanner banner={motion.banner} onDismiss={motion.dismissBanner} /> : null}
        </WorldScene>
      }
      controls={
        <View style={styles.controls}>
          <GoalNumbers summary={summary} dashboard={dashboard} motion={motion} busy={busy} menu={<GoalMenu summary={summary} funded={dashboard.amounts.funded} canCreate={canCreate} busy={busy} run={action.run} onDelete={() => confirmDelete(goal)} />} />
          {open.length > 1 ? <GoalSwitcher open={open} selectedId={goal.id} /> : null}
        </View>
      }
    />
  );
}

// A read that failed after the app opened: nothing is shown as current, nothing was changed, and
// one tap reads again. The navigator stays, so the person keeps their place.
function LoadFailed() {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    await refreshAppData();
    setRetrying(false);
  };
  return (
    <Screen testID="home-load-failed">
      <Notice tone="error" title="Couldn’t load your goals" message="Nothing was changed. Try again." />
      <Button label="Try again" loading={retrying} onPress={() => void retry()} testID="home-retry" />
    </Screen>
  );
}

// No open goal. A finished goal still counts toward Free's one goal (D74), so Free is told
// where it is and what the two ways forward are instead of being sent to a form that would refuse.
// The picture is the empty Island (stage 0, D76 base layer), floating gently with a soft sparkle while
// Home is visible (D69, Phase 10). It keeps that float and no ambient motion of its own (Phase 10.5):
// one gentle movement for a small picture is enough. While Free's one goal is finished (D98, V04) the
// picture is that finished world (its souvenir's theme and version) and the title says so.
type EmptyHomeProps = { completedCount: number; canCreate: boolean; finishedWorld: CollectibleRecord | null };

function EmptyHome({ completedCount, canCreate, finishedWorld }: EmptyHomeProps) {
  const finished = !canCreate && completedCount > 0;
  const title = finished ? 'Your world is finished' : completedCount > 0 ? 'Start a new goal' : 'Start your first goal';
  const message = finished
    ? `You reached your goal. Your finished ${worldNoun(finishedWorld?.themeId ?? 'island')} is kept in Collection.`
    : 'Name something you are saving for and set a target. Each amount you record grows a small world.';
  return (
    <EmptyState
      icon="milestone"
      illustration={
        <View style={[styles.emptyWorld, finishedWorld ? { aspectRatio: worldArtAspect(finishedWorld.themeId, themeManifestAt(finishedWorld.themeId, finishedWorld.themeVersion)) } : null]} testID="home-empty-world">
          {finishedWorld ? (
            <WorldScene
              themeId={finishedWorld.themeId}
              stage={MILESTONE_COUNT}
              manifest={themeManifestAt(finishedWorld.themeId, finishedWorld.themeVersion)}
              backdrop="none"
              decorative
            />
          ) : (
            <WorldScene themeId="island" stage={0} backdrop="none" decorative />
          )}
          <AmbientSparkles spots={EMPTY_ISLAND_SPARKLES} testID="home-empty-sparkles" />
        </View>
      }
      title={title}
      testID="home-empty"
      message={message}>
      <View style={styles.emptyActions}>
        {canCreate ? (
          <Link href="/goal-form" asChild>
            <Button label="Create a goal" testID="home-new-goal" />
          </Link>
        ) : (
          // Free's one goal is finished: the "Build another world" entry (Phase 16's paywall; an
          // alert until then) instead of a form that would refuse.
          <Button
            label={ANOTHER_WORLD.title}
            icon="pro"
            onPress={() => Alert.alert(ANOTHER_WORLD.title, ANOTHER_WORLD.finishedMessage)}
            testID="home-another-world"
          />
        )}
        {completedCount > 0 ? (
          <AppText role="footnote" tone="secondary" style={styles.centered} testID="home-closed-hint">
            {canCreate
              ? `Your finished ${completedCount === 1 ? 'goal is' : 'goals are'} in Collection.`
              : 'Unlock Pro to build another world, or delete your finished goal in Collection to start over.'}
          </AppText>
        ) : null}
      </View>
    </EmptyState>
  );
}

// Where the empty Island sparkles, as fractions of its picture (over the meadow and the shore).
const EMPTY_ISLAND_SPARKLES: readonly SparkleSpot[] = [
  { x: 0.3, y: 0.32, delayMs: 0 },
  { x: 0.66, y: 0.26, delayMs: 950 },
  { x: 0.52, y: 0.58, delayMs: 1900 },
];

type GoalNumbersProps = { summary: GoalSummary; dashboard: HomeDashboard; motion: WorldMotion; busy: boolean; menu: ReactElement };

// Title and status, saved amount and target, progress, Add savings, the milestone card and, when the
// goal has a deadline, the savings plan cards (D84). The saved amount, the percent and the bar show
// the world motion's values (counting up after a deposit); their VoiceOver labels always say the
// committed values.
function GoalNumbers({ summary, dashboard, motion, busy, menu }: GoalNumbersProps) {
  const { goal } = summary;
  const { amounts } = dashboard;
  const paused = goal.status === 'paused';
  const progressDetail = amounts.over ? `${amounts.over} over target` : `${amounts.remaining} to go`;
  const count = { enabled: motion.countUp, durationMs: WORLD_MOTION.countMs, resetKey: goal.id };
  const savedMinor = useCountUp(motion.balanceMinor, count);
  const shownPercent = progressPercent(motion.balanceMinor, motion.targetMinor);
  const percent = useCountUp(shownPercent, count);
  return (
    <View style={styles.summary} testID="home-goal">
      <View style={styles.titleRow}>
        <AppText role="title" accessibilityRole="header" style={styles.title} testID="home-goal-title">
          {goal.title}
        </AppText>
        {paused ? <StatusBadge label="Paused" tone="info" icon="pause" testID="home-paused" /> : null}
        {amounts.funded ? <StatusBadge label="Target reached" tone="success" icon="success" testID="home-funded" /> : null}
        <View style={styles.menu}>{menu}</View>
      </View>
      <View style={styles.amount} accessible accessibilityLabel={`Saved ${amounts.saved} of ${amounts.target}`} testID="home-amount">
        <AmountText formatted={dashboard.format(savedMinor)} size="display" testID="home-saved" />
        <AppText tone="secondary" testID="home-target">{`saved of ${amounts.target}`}</AppText>
      </View>
      <View style={styles.progress}>
        <ProgressBar
          fraction={sceneFeedback(motion.balanceMinor, motion.targetMinor).overall}
          percent={shownPercent}
          durationMs={WORLD_MOTION.countMs}
          resetKey={goal.id}
          testID="home-progress-bar"
        />
        <View
          style={styles.progressText}
          accessible
          accessibilityLabel={`${amounts.percent}%, ${progressDetail}`}
          testID="home-progress">
          <AppText role="label" tone={progressTextTone(percent)} testID="home-percent">{`${percent}%`}</AppText>
          <AppText role="footnote" tone="secondary" testID="home-remaining">
            {progressDetail}
          </AppText>
        </View>
      </View>
      {/* The one primary action, in the flow right under the progress it changes (owner decision
          D81: it no longer floats). */}
      <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
        <Button label="Add savings" icon="add" disabled={busy} testID="home-add-savings" />
      </Link>
      <MilestoneCallout next={dashboard.next} />
      <SavingsPlanCards copy={dashboard.planCopy} />
    </View>
  );
}

// The next of the ten unlocks and the amount still needed for it, on the warm accent surface. The
// name comes from the theme manifest; a theme without art falls back to the percentage. At 100% or
// more the same card says the world is complete, in the theme's words (D83).
function MilestoneCallout({ next }: { next: NextMilestone }) {
  const title = next.kind === 'complete' ? next.title : next.name ? `Next: ${next.name}` : `Next milestone: ${next.percent}%`;
  const detail = next.kind === 'complete' ? next.detail : `${next.toNext} more to reach ${next.percent}%`;
  return (
    <View style={styles.milestone} accessible accessibilityLabel={`${/[.!?]$/.test(title) ? title : `${title}.`} ${detail}`} testID="home-next-milestone">
      <Icon name="milestone" role="headline" tone="accent" filled />
      <View style={styles.title}>
        <AppText role="label">{title}</AppText>
        <AppText role="footnote" tone="secondary" testID="home-next-detail">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

// Pro only in practice: Free never has more than one open goal. A custom selection control, so a
// changed selection plays the selection haptic once (DESIGN_SYSTEM "Haptics").
function GoalSwitcher({ open, selectedId }: { open: GoalSummary[]; selectedId: string }) {
  const choose = async (goalId: string) => {
    const result = await selectGoal(goalCommandDeps(), goalId);
    if (result.ok) {
      haptics.selection();
    }
    await refreshAppData();
  };
  return (
    <View style={styles.switcher} testID="home-switcher">
      <SectionHeader title="Open goals" />
      <ListGroup>
        {open.map(({ goal }) =>
          goal.id === selectedId ? (
            <ListRow key={goal.id} title={goal.title} value="Shown" accessibilityLabel={`${goal.title}, shown on Home`} />
          ) : (
            <ListRow key={goal.id} title={goal.title} chevron onPress={() => void choose(goal.id)} accessibilityLabel={`Show ${goal.title}`} />
          ),
        )}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.md,
  },
  summary: {
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
  },
  // The ⋯ menu sits at the trailing end of the title row.
  menu: {
    marginLeft: 'auto',
  },
  amount: {
    gap: spacing.xs / 2,
  },
  progress: {
    gap: spacing.sm,
  },
  progressText: {
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
  switcher: {
    gap: spacing.sm,
  },
  // The empty island floats on the screen background; wide enough to read as a world, small enough
  // that the title, message and button stay in view on the SE.
  emptyWorld: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: worldArtAspect('island'),
  },
  emptyActions: {
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
});
