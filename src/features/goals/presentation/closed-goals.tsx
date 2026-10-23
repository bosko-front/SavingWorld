import { StyleSheet, View } from 'react-native';

import { useAppDataStore } from '@/bootstrap/app-data';
import type { CurrencyMetadata } from '@/core/money';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';

import { goalAmounts } from './goal-amounts';
import { LIFECYCLE_COPY } from './goal-copy';
import { useGoalAction } from './use-goal-action';

// Completed and archived goals, read-only, each with Reopen (v1.2 section 6: Collection shows
// closed goals and Reopen is the only way back to editing). Phase 11 adds souvenirs and the
// finished-world view; this list is the Phase 06 entry point for Reopen. Reopen checks the open
// goal slot first and never finishes a goal again by itself, even at 100% or more.
export function ClosedGoals() {
  const state = useAppDataStore((store) => store.state);
  const { pending, failure, run } = useGoalAction();
  if (state.status !== 'ready' || state.data.currency.currency.status !== 'set') {
    return null;
  }
  const currency = state.data.currency.currency.currency;
  const closed = state.data.goals.goals.filter(({ goal }) => goal.status === 'completed' || goal.status === 'archived');

  return (
    <View style={styles.list} testID="closed-goals">
      <AppText role="headline" accessibilityRole="header">
        Closed goals
      </AppText>
      {closed.length === 0 ? (
        <AppText tone="secondary">Goals you archive or finish appear here with all of their records.</AppText>
      ) : (
        closed.map((summary) => (
          <ClosedGoalCard
            key={summary.goal.id}
            summary={summary}
            currency={currency}
            busy={pending?.goalId === summary.goal.id}
            disabled={pending !== null}
            error={failure?.goalId === summary.goal.id ? failure.message : null}
            onReopen={() => void run('reopen', summary.goal)}
          />
        ))
      )}
    </View>
  );
}

type ClosedGoalCardProps = {
  summary: GoalSummary;
  currency: CurrencyMetadata;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onReopen: () => void;
};

function ClosedGoalCard({ summary, currency, busy, disabled, error, onReopen }: ClosedGoalCardProps) {
  const { goal } = summary;
  const amounts = goalAmounts(summary, currency);
  const archived = goal.status === 'archived';
  return (
    <Card testID={`closed-goal-${goal.id}`}>
      <View style={styles.statusRow}>
        <Icon name={archived ? 'archive' : 'finish'} role="label" tone="secondary" />
        <AppText role="label" tone="secondary">
          {archived ? 'Archived' : 'Completed'}
        </AppText>
      </View>
      <AppText role="headline">{goal.title}</AppText>
      <AppText>{`${amounts.saved} saved of ${amounts.target} (${amounts.percent}%)`}</AppText>
      <AppText role="footnote" tone="secondary">
        Read-only. Reopen it to edit or record savings again.
      </AppText>
      {error ? <Notice tone="error" title="Not reopened" message={error} testID="closed-goal-error" /> : null}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
