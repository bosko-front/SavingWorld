import { Link } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { currentCapabilities, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { hasGoalSlot } from '@/core/access';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { WORLD_SCENE_ASPECT, WorldScene } from '@/features/worlds/world-scene';
import { AdaptiveGoalLayout, Screen } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FloatingActionButton } from '@/shared/ui/floating-action-button';
import { haptics } from '@/shared/ui/haptics';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { ProgressBar, progressTextTone } from '@/shared/ui/progress-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { selectGoal } from '../application/goal-selection';

import { DeadlineCard } from './deadline-card';
import { GoalMenu } from './goal-menu';
import { useDeleteGoal } from './use-delete-goal';
import { homeDashboard, type HomeDashboard, type NextMilestone } from './home-dashboard';
import { useGoalAction } from './use-goal-action';

// Home (Phase 06 basics, Phase 07 ledger actions, Phase 07.5 visual direction A "Calm hero", Phase 08
// dashboard): the world first, then progress. The controls show the goal title with its options
// menu (⋯: History, Edit, Pause/Resume, New goal, Delete), the saved amount as the largest text,
// the target, a milestone progress bar with the floored percent and the remaining (or overfunded)
// amount, the next milestone and the deadline card. The one primary action is the floating
// "+ Add savings" button (D72, D73). Every number comes from the committed snapshot (balance
// recomputed from the ledger) and the civil date it was read on; a commit or a new date re-reads
// it. Settings is in the navigation bar. Free shows at most one open goal; with more open goals (Pro) a simple list chooses
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
        <EmptyHome completedCount={completedCount} canCreate={canCreate} />
      </Screen>
    );
  }

  return (
    <SelectedGoalHome
      summary={selected}
      dashboard={homeDashboard(selected, currency.currency.currency, today)}
      open={open}
      canCreate={canCreate}
    />
  );
}

type SelectedGoalHomeProps = { summary: GoalSummary; dashboard: HomeDashboard; open: GoalSummary[]; canCreate: boolean };

// The selected goal on AdaptiveGoalLayout: the world, then the numbers and the deadline card; goal
// administration is in the ⋯ menu and Add savings is the floating button (owner direction D73).
function SelectedGoalHome({ summary, dashboard, open, canCreate }: SelectedGoalHomeProps) {
  const { goal } = summary;
  const action = useGoalAction();
  const { deleting, confirmDelete } = useDeleteGoal();
  const busy = action.pending?.goalId === goal.id || deleting === goal.id;
  return (
    <AdaptiveGoalLayout
      testID="home"
      sceneAspectRatio={WORLD_SCENE_ASPECT}
      scene={<WorldScene themeId={goal.themeId} stage={dashboard.stage} />}
      floatingAction={
        <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
          <FloatingActionButton icon="add" label="Add savings" disabled={busy} testID="home-add-savings" />
        </Link>
      }
      controls={
        <View style={styles.controls}>
          <GoalNumbers summary={summary} dashboard={dashboard} menu={<GoalMenu summary={summary} canCreate={canCreate} busy={busy} run={action.run} onDelete={() => confirmDelete(goal)} />} />
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

// No open goal. A finished goal (Phase 11) still counts toward Free's one goal (D74), so Free is told
// where it is and what the two ways forward are instead of being sent to a form that would refuse.
function EmptyHome({ completedCount, canCreate }: { completedCount: number; canCreate: boolean }) {
  return (
    <EmptyState
      icon="milestone"
      title={completedCount > 0 ? 'Start a new goal' : 'Start your first goal'}
      message="Name something you are saving for and set a target. Each amount you record grows a small world.">
      <View style={styles.emptyActions}>
        {canCreate ? (
          <Link href="/goal-form" asChild>
            <Button label="Create a goal" testID="home-new-goal" />
          </Link>
        ) : null}
        {completedCount > 0 ? (
          <AppText role="footnote" tone="secondary" style={styles.centered} testID="home-closed-hint">
            {canCreate
              ? `Your finished ${completedCount === 1 ? 'goal is' : 'goals are'} in Collection.`
              : 'Your finished goal is in Collection. Unlock Pro to build another world, or delete it there to start over.'}
          </AppText>
        ) : null}
      </View>
    </EmptyState>
  );
}

// Title and status, saved amount and target, progress, next milestone and the deadline card.
function GoalNumbers({ summary, dashboard, menu }: { summary: GoalSummary; dashboard: HomeDashboard; menu: ReactElement }) {
  const { goal } = summary;
  const { amounts, deadline } = dashboard;
  const paused = goal.status === 'paused';
  const progressDetail = amounts.over ? `${amounts.over} over target` : `${amounts.remaining} to go`;
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
        <AmountText formatted={amounts.saved} size="display" testID="home-saved" />
        <AppText tone="secondary" testID="home-target">{`saved of ${amounts.target}`}</AppText>
      </View>
      <View style={styles.progress}>
        <ProgressBar fraction={dashboard.fraction} percent={amounts.percent} />
        <View
          style={styles.progressText}
          accessible
          accessibilityLabel={`${amounts.percent}%, ${progressDetail}`}
          testID="home-progress">
          <AppText role="label" tone={progressTextTone(amounts.percent)}>{`${amounts.percent}%`}</AppText>
          <AppText role="footnote" tone="secondary" testID="home-remaining">
            {progressDetail}
          </AppText>
        </View>
      </View>
      <MilestoneCallout next={dashboard.next} />
      <DeadlineCard copy={deadline} goalId={goal.id} />
    </View>
  );
}

// The next of the ten unlocks and the amount still needed for it, on the warm accent surface. Stage
// names come from the theme manifest in Phase 09; until then the callout names the percentage.
function MilestoneCallout({ next }: { next: NextMilestone }) {
  const title = next.kind === 'next' ? `Next milestone: ${next.percent}%` : 'All 10 milestones unlocked';
  const detail = next.kind === 'next' ? `${next.toNext} more to reach ${next.percent}%` : 'Your world is complete.';
  return (
    <View style={styles.milestone} accessible accessibilityLabel={`${title}. ${detail}`} testID="home-next-milestone">
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
  emptyActions: {
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
});
