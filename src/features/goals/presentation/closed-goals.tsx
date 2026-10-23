import { StyleSheet, View } from 'react-native';

import { useAppDataStore } from '@/bootstrap/app-data';
import type { CurrencyMetadata } from '@/core/money';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { goalAmounts } from './goal-amounts';
import { DELETE_COPY, LIFECYCLE_COPY } from './goal-copy';
import { useDeleteGoal } from './use-delete-goal';
import { useGoalAction } from './use-goal-action';

// Completed goals, read-only, each with Reopen and Delete (v1.2 section 6 as changed by owner
// decision D74: Archive is gone; Collection shows finished goals and Reopen is the only way back to
// editing). Phase 11 adds souvenirs and the finished-world view. Reopen checks the goal limit and
// never finishes a goal again by itself; Delete removes the goal, its history and its finished
// world after the "Delete completed goal?" confirmation.
export function ClosedGoals() {
  const state = useAppDataStore((store) => store.state);
  const { pending, run } = useGoalAction();
  const { deleting, confirmDelete } = useDeleteGoal();
  if (state.status !== 'ready' || state.data.currency.currency.status !== 'set') {
    return null;
  }
  const currency = state.data.currency.currency.currency;
  const closed = state.data.goals.goals.filter(({ goal }) => goal.status === 'completed');

  if (closed.length === 0) {
    return (
      <EmptyState
        icon="souvenir"
        iconColor="honey"
        title="Nothing here yet"
        message="Goals you finish move here with all of their records, and each finished world is kept here as a souvenir."
        testID="closed-goals"
      />
    );
  }

  return (
    <View style={styles.list} testID="closed-goals">
      <SectionHeader title="Finished goals" caption="Read-only. Reopen a goal to edit it or record savings again." />
      {closed.map((summary) => (
          <ClosedGoalCard
            key={summary.goal.id}
            summary={summary}
            currency={currency}
            busy={pending?.goalId === summary.goal.id}
            deleting={deleting === summary.goal.id}
            disabled={pending !== null || deleting !== null}
            onReopen={() => void run('reopen', summary.goal)}
            onDelete={() => confirmDelete(summary.goal)}
          />
        ))}
    </View>
  );
}

type ClosedGoalCardProps = {
  summary: GoalSummary;
  currency: CurrencyMetadata;
  busy: boolean;
  deleting: boolean;
  disabled: boolean;
  onReopen: () => void;
  onDelete: () => void;
};

function ClosedGoalCard({ summary, currency, busy, deleting, disabled, onReopen, onDelete }: ClosedGoalCardProps) {
  const { goal } = summary;
  const amounts = goalAmounts(summary, currency);
  return (
    <Card testID={`closed-goal-${goal.id}`}>
      <StatusBadge label="Completed" icon="finish" tone="success" />
      <AppText role="headline">{goal.title}</AppText>
      <AppText>{`${amounts.saved} saved of ${amounts.target} (${amounts.percent}%)`}</AppText>
      <Button
        label={LIFECYCLE_COPY.reopen.label}
        variant="secondary"
        icon="reopen"
        loading={busy}
        disabled={disabled && !busy}
        onPress={onReopen}
        accessibilityHint={`Makes ${goal.title} an open goal again.`}
        testID={`reopen-${goal.id}`}
      />
      <Button
        label={`${DELETE_COPY.label}…`}
        variant="destructive"
        icon="delete"
        loading={deleting}
        disabled={(disabled || busy) && !deleting}
        onPress={onDelete}
        testID={`delete-${goal.id}`}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
