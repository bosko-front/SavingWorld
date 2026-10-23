import { Link } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { currentCapabilities, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { hasOpenGoalSlot } from '@/core/access';
import type { CurrencyMetadata } from '@/core/money';
import { sceneFeedback } from '@/core/progression';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { formatCivilDate } from '@/shared/i18n/locale';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { ProgressBar, progressTextTone } from '@/shared/ui/progress-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { selectGoal } from '../application/goal-selection';

import { goalAmounts } from './goal-amounts';
import { LIFECYCLE_COPY } from './goal-copy';
import { useGoalAction } from './use-goal-action';

// Home (Phase 06 basics, Phase 07 ledger actions, Phase 07.5 visual direction A "Calm hero"): the
// selected open goal's saved amount as the largest text, a milestone progress bar with the percent
// and remaining amount in words, one primary action (Add savings) and the other actions grouped in
// rows instead of a stack of buttons. Settings is in the navigation bar. Phase 08 adds the scene on
// AdaptiveGoalLayout, the next milestone and the deadline estimates to this composition. Free shows
// at most one open goal; with more open goals (Pro) a simple list chooses which one Home shows. The
// choice is stored, and after a restart a missing or closed choice falls back to the oldest open goal.
export function HomeScreen() {
  const state = useAppDataStore((store) => store.state);

  if (state.status === 'failed') {
    return (
      <Screen>
        <Notice tone="error" title="Couldn’t load your goals" message="Nothing was changed. Try again." />
        <Button label="Try again" onPress={() => void refreshAppData()} />
      </Screen>
    );
  }
  if (state.status !== 'ready') {
    return null;
  }
  const { currency, goals } = state.data;
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
  const closedCount = goals.goals.length - open.length;
  const selected = open.find((summary) => summary.goal.id === goals.selectedGoalId) ?? null;
  const canCreate = hasOpenGoalSlot(currentCapabilities(), open.length);

  if (!selected) {
    return (
      <Screen testID="home" centered>
        <EmptyHome closedCount={closedCount} />
      </Screen>
    );
  }

  return (
    <Screen testID="home">
      <SelectedGoal summary={selected} currency={currency.currency.currency} />
      {open.length > 1 ? <GoalSwitcher open={open} selectedId={selected.goal.id} /> : null}
      {canCreate ? (
        <ListGroup>
          <Link href="/goal-form" asChild>
            <ListRow title="New goal" icon="milestone" chevron testID="home-new-goal" />
          </Link>
        </ListGroup>
      ) : (
        <AppText role="footnote" tone="secondary" testID="home-slot-notice">
          Free includes one open goal, active or paused. Archive this goal to start another one; it keeps all its records.
        </AppText>
      )}
    </Screen>
  );
}

function EmptyHome({ closedCount }: { closedCount: number }) {
  return (
    <EmptyState
      icon="milestone"
      title={closedCount > 0 ? 'Start a new goal' : 'Start your first goal'}
      message="Name something you are saving for and set a target. Each amount you record grows a small world.">
      <View style={styles.emptyActions}>
        <Link href="/goal-form" asChild>
          <Button label="Create a goal" testID="home-new-goal" />
        </Link>
        {closedCount > 0 ? (
          <AppText role="footnote" tone="secondary" style={styles.centered} testID="home-closed-hint">
            {`Your ${closedCount === 1 ? 'closed goal is' : `${closedCount} closed goals are`} in Collection, where you can reopen ${closedCount === 1 ? 'it' : 'one'}.`}
          </AppText>
        ) : null}
      </View>
    </EmptyState>
  );
}

function SelectedGoal({ summary, currency }: { summary: GoalSummary; currency: CurrencyMetadata }) {
  const { goal } = summary;
  const amounts = goalAmounts(summary, currency);
  const { overall } = sceneFeedback(summary.balanceMinor, goal.targetMinor);
  const { pending, run } = useGoalAction();
  const paused = goal.status === 'paused';
  const busy = pending?.goalId === goal.id;
  const entries = summary.entryCount === 1 ? '1 entry' : `${summary.entryCount} entries`;

  const confirmArchive = () => {
    Alert.alert(
      `Archive “${goal.title}”?`,
      'It moves to Collection with all of its records and stops taking your open-goal slot. You can reopen it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => void run('archive', goal) },
      ],
    );
  };

  return (
    <>
      <View style={styles.summary} testID="home-goal">
        <View style={styles.titleRow}>
          <AppText role="title" accessibilityRole="header" style={styles.title} testID="home-goal-title">
            {goal.title}
          </AppText>
          {paused ? <StatusBadge label="Paused" tone="info" icon="pause" testID="home-paused" /> : null}
        </View>
        <View style={styles.amount} accessible accessibilityLabel={`Saved ${amounts.saved} of ${amounts.target}`}>
          <AmountText formatted={amounts.saved} size="display" testID="home-saved" />
          <AppText tone="secondary">{`saved of ${amounts.target}`}</AppText>
        </View>
        <View style={styles.progress}>
          <ProgressBar fraction={overall} percent={amounts.percent} />
          <View style={styles.progressText} testID="home-progress">
            <AppText role="label" tone={progressTextTone(amounts.percent)}>{`${amounts.percent}%`}</AppText>
            <AppText role="footnote" tone="secondary">
              {amounts.funded ? 'Target reached' : `${amounts.remaining} to go`}
            </AppText>
          </View>
        </View>
        <AppText role="footnote" tone="secondary" testID="home-deadline">
          {goal.deadlineDate ? `Deadline ${formatCivilDate(goal.deadlineDate)}` : 'No deadline'}
        </AppText>
        {paused ? (
          <AppText role="footnote" tone="secondary">
            You can still edit this goal and record savings. It stays paused until you resume it.
          </AppText>
        ) : null}
      </View>
      <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
        <Button label="Add savings" icon="deposit" disabled={busy} testID="home-add-savings" />
      </Link>
      <ListGroup>
        <Link href={{ pathname: '/history', params: { goalId: goal.id } }} asChild>
          <ListRow
            title="History"
            icon="history"
            iconColor="blue"
            value={summary.entryCount === 0 ? undefined : entries}
            chevron
            disabled={busy}
            testID="home-history"
          />
        </Link>
        <Link href={{ pathname: '/goal-form', params: { goalId: goal.id } }} asChild>
          <ListRow title="Edit goal" icon="edit" iconColor="neutral" chevron disabled={busy} testID="home-edit" />
        </Link>
      </ListGroup>
      <ListGroup>
        <ListRow
          title={LIFECYCLE_COPY[paused ? 'resume' : 'pause'].label}
          icon={paused ? 'resume' : 'pause'}
          iconColor="honey"
          loading={busy && (pending?.action === 'pause' || pending?.action === 'resume')}
          disabled={busy && pending?.action === 'archive'}
          onPress={() => void run(paused ? 'resume' : 'pause', goal)}
          testID="home-pause-resume"
        />
        <ListRow
          title={`${LIFECYCLE_COPY.archive.label}…`}
          icon="archive"
          iconColor="neutral"
          detail="Moves it to Collection with all its records."
          loading={busy && pending?.action === 'archive'}
          disabled={busy && pending?.action !== 'archive'}
          onPress={confirmArchive}
          accessibilityLabel={LIFECYCLE_COPY.archive.label}
          testID="home-archive"
        />
      </ListGroup>
    </>
  );
}

// Pro only in practice: Free never has more than one open goal.
function GoalSwitcher({ open, selectedId }: { open: GoalSummary[]; selectedId: string }) {
  const choose = async (goalId: string) => {
    await selectGoal(goalCommandDeps(), goalId);
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
