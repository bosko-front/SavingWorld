import { Link } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { currentCapabilities, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { hasOpenGoalSlot } from '@/core/access';
import type { CurrencyMetadata } from '@/core/money';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { formatCivilDate } from '@/shared/i18n/locale';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';

import { selectGoal } from '../application/goal-selection';

import { goalAmounts } from './goal-amounts';
import { LIFECYCLE_COPY } from './goal-copy';
import { useGoalAction } from './use-goal-action';

// Basic Home (Phase 06): the selected open goal's saved amount, target, remaining and percentage,
// with Edit, Pause/Resume and Archive. Phase 08 replaces the presentation with the dashboard on
// AdaptiveGoalLayout. Phase 07 added Add savings and History (the shared entry form and the
// goal's current entries). Free shows at most one open goal; with more
// open goals (Pro) a simple list chooses which one Home shows. The choice is stored, and after a
// restart a missing or closed choice falls back to the oldest open goal.
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

  return (
    <Screen testID="home">
      {selected ? (
        <SelectedGoal summary={selected} currency={currency.currency.currency} />
      ) : (
        <EmptyHome closedCount={closedCount} />
      )}
      {open.length > 1 ? <GoalSwitcher open={open} selectedId={selected?.goal.id ?? null} /> : null}
      {canCreate ? (
        <Link href="/goal-form" asChild>
          <Button label={selected ? 'New goal' : 'Create a goal'} variant={selected ? 'secondary' : 'primary'} testID="home-new-goal" />
        </Link>
      ) : (
        <Notice
          tone="info"
          title="One open goal in Free"
          message="Free includes one open goal, active or paused. Archive this goal to start another one; it keeps all its records."
          testID="home-slot-notice"
        />
      )}
      <Link href="/settings" asChild>
        <Button label="Settings" variant="plain" icon="settings" />
      </Link>
      {__DEV__ ? (
        <View style={styles.devLinks}>
          <Link href="/details" asChild>
            <Button label="Open details" variant="plain" />
          </Link>
          <Link href="/sample-form" asChild>
            <Button label="Open sample form (development only)" variant="plain" />
          </Link>
        </View>
      ) : null}
    </Screen>
  );
}

function EmptyHome({ closedCount }: { closedCount: number }) {
  return (
    <>
      <AppText role="title" accessibilityRole="header">
        {closedCount > 0 ? 'Start a new goal' : 'Start your first goal'}
      </AppText>
      <AppText tone="secondary">
        Name something you are saving for and set a target. Each amount you record grows a small world.
      </AppText>
      {closedCount > 0 ? (
        <AppText tone="secondary" testID="home-closed-hint">
          {`Your ${closedCount === 1 ? 'closed goal is' : `${closedCount} closed goals are`} in Collection, where you can reopen ${closedCount === 1 ? 'it' : 'one'}.`}
        </AppText>
      ) : null}
    </>
  );
}

function SelectedGoal({ summary, currency }: { summary: GoalSummary; currency: CurrencyMetadata }) {
  const { goal } = summary;
  const amounts = goalAmounts(summary, currency);
  const { pending, failure, run } = useGoalAction();
  const paused = goal.status === 'paused';
  const busy = pending?.goalId === goal.id;

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
      <Card testID="home-goal">
        {paused ? (
          <View style={styles.statusRow}>
            <Icon name="pause" role="label" tone="info" />
            <AppText role="label" tone="info" testID="home-paused">
              Paused
            </AppText>
          </View>
        ) : null}
        <AppText role="title" accessibilityRole="header" testID="home-goal-title">
          {goal.title}
        </AppText>
        <View accessible accessibilityLabel={`Saved ${amounts.saved} of ${amounts.target}`}>
          <AmountText formatted={amounts.saved} size="large" testID="home-saved" />
          <AppText tone="secondary">{`saved of ${amounts.target}`}</AppText>
        </View>
        <AppText testID="home-progress">
          {amounts.funded ? `${amounts.percent}% · Target reached` : `${amounts.percent}% · ${amounts.remaining} to go`}
        </AppText>
        <AppText role="footnote" tone="secondary" testID="home-deadline">
          {goal.deadlineDate ? `Deadline ${formatCivilDate(goal.deadlineDate)}` : 'No deadline'}
        </AppText>
        {paused ? (
          <AppText role="footnote" tone="secondary">
            You can still edit this goal and record savings. It stays paused until you resume it.
          </AppText>
        ) : null}
      </Card>
      {failure?.goalId === goal.id ? <Notice tone="error" title="Not changed" message={failure.message} testID="home-action-error" /> : null}
      <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
        <Button label="Add savings" icon="deposit" disabled={busy} testID="home-add-savings" />
      </Link>
      <Link href={{ pathname: '/history', params: { goalId: goal.id } }} asChild>
        <Button
          label={summary.entryCount === 0 ? 'History' : `History (${summary.entryCount})`}
          variant="secondary"
          icon="history"
          disabled={busy}
          testID="home-history"
        />
      </Link>
      <Link href={{ pathname: '/goal-form', params: { goalId: goal.id } }} asChild>
        <Button label="Edit goal" variant="secondary" disabled={busy} testID="home-edit" />
      </Link>
      <Button
        label={LIFECYCLE_COPY[paused ? 'resume' : 'pause'].label}
        variant="secondary"
        icon={paused ? 'resume' : 'pause'}
        loading={busy && (pending?.action === 'pause' || pending?.action === 'resume')}
        disabled={busy}
        onPress={() => void run(paused ? 'resume' : 'pause', goal)}
        testID="home-pause-resume"
      />
      <Button
        label={LIFECYCLE_COPY.archive.label}
        variant="secondary"
        icon="archive"
        loading={busy && pending?.action === 'archive'}
        disabled={busy}
        onPress={confirmArchive}
        testID="home-archive"
      />
    </>
  );
}

// Pro only in practice: Free never has more than one open goal.
function GoalSwitcher({ open, selectedId }: { open: GoalSummary[]; selectedId: string | null }) {
  const choose = async (goalId: string) => {
    await selectGoal(goalCommandDeps(), goalId);
    await refreshAppData();
  };
  return (
    <Card variant="soft" testID="home-switcher">
      <AppText role="headline" accessibilityRole="header">
        Open goals
      </AppText>
      {open.map(({ goal }) =>
        goal.id === selectedId ? (
          <AppText key={goal.id} accessibilityLabel={`${goal.title}, shown on Home`}>
            {`${goal.title} (shown)`}
          </AppText>
        ) : (
          <Button key={goal.id} label={`Show ${goal.title}`} variant="plain" onPress={() => void choose(goal.id)} />
        ),
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  devLinks: {
    gap: spacing.xs,
  },
});
