import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { accessView, appClock, currentCapabilities, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { getAppDatabase } from '@/bootstrap/database-readiness';
import { withinGoalLimit } from '@/core/access';
import { formatMoney } from '@/core/money';
import type { GoalRecord, GoalStatus } from '@/data/repositories/goal-repository';
import { KEEP_GOAL_COPY } from '@/features/billing/presentation/billing-copy';
import { deviceLocale } from '@/shared/i18n/locale';
import { FormScreen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { haptics } from '@/shared/ui/haptics';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { showToast } from '@/shared/ui/toast';

import { chooseKeptGoal } from '../application/goal-access';

const STATUS_WORDS: Record<GoalStatus, string> = { active: 'Active', paused: 'Paused', completed: 'Finished' };

// The person's own choice of the one goal they keep using after Pro was lost with several goals
// (Phase 16, owner decision D74). Every goal is listed with its status and saved amount; choosing one
// asks a native confirmation that says the others stay read-only, then stores the choice. Nothing is
// deleted or changed: the other goals keep their entries, souvenirs and worlds, read-only until Pro
// returns or the person deletes them.
export function KeepGoalScreen() {
  const router = useRouter();
  const data = useAppDataStore((store) => (store.state.status === 'ready' ? store.state.data : null));
  const [saving, setSaving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const running = useRef(false);
  if (!data || data.currency.currency.status !== 'set') {
    return null;
  }
  const currency = data.currency.currency.currency;
  const locale = deviceLocale();
  const access = accessView(data);
  // The choice only matters while there are more goals than the capabilities allow.
  const kept = withinGoalLimit(access.capabilities, data.goals.goals.length)
    ? null
    : (data.goals.goals.find((summary) => summary.goal.id === access.keptGoalId)?.goal ?? null);

  const keep = async (goal: GoalRecord) => {
    if (running.current) {
      return;
    }
    running.current = true;
    setSaving(goal.id);
    setFailed(false);
    const result = await chooseKeptGoal({ db: getAppDatabase(), clock: appClock(), capabilities: currentCapabilities() }, goal.id);
    await refreshAppData();
    running.current = false;
    setSaving(null);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    router.back();
    showToast({ tone: 'success', title: KEEP_GOAL_COPY.done(goal.title) });
    haptics.success();
  };

  const confirm = (goal: GoalRecord) => {
    Alert.alert(KEEP_GOAL_COPY.confirmTitle(goal.title), KEEP_GOAL_COPY.confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      { text: KEEP_GOAL_COPY.confirmButton, onPress: () => void keep(goal) },
    ]);
  };

  return (
    <FormScreen testID="keep-goal">
      <Stack.Screen options={{ title: KEEP_GOAL_COPY.screenTitle }} />
      {!access.needsKeptChoice ? (
        <Notice
          tone="info"
          title={kept ? KEEP_GOAL_COPY.chosenTitle : KEEP_GOAL_COPY.notNeededTitle}
          message={kept ? KEEP_GOAL_COPY.chosenMessage(kept.title) : KEEP_GOAL_COPY.notNeededMessage}
          testID="keep-goal-settled"
        />
      ) : (
        <View style={styles.block}>
          <AppText tone="secondary">{KEEP_GOAL_COPY.intro}</AppText>
          {failed ? <Notice tone="error" title="Not saved" message={KEEP_GOAL_COPY.failed} testID="keep-goal-error" /> : null}
          <ListGroup testID="keep-goal-list">
            {data.goals.goals.map(({ goal, balanceMinor }) => {
              const saved = `${formatMoney(balanceMinor, currency, { locale })} of ${formatMoney(goal.targetMinor, currency, { locale })} saved`;
              return (
                <ListRow
                  key={goal.id}
                  icon="milestone"
                  title={goal.title}
                  detail={`${STATUS_WORDS[goal.status]} · ${saved}`}
                  chevron
                  loading={saving === goal.id}
                  disabled={saving !== null}
                  onPress={() => confirm(goal)}
                  accessibilityLabel={`${goal.title}, ${STATUS_WORDS[goal.status]}, ${saved}`}
                  accessibilityHint="Keeps this goal in use"
                  testID={`keep-goal-${goal.id}`}
                />
              );
            })}
          </ListGroup>
        </View>
      )}
      <Button label="Close" variant="plain" centered onPress={() => router.back()} disabled={saving !== null} testID="keep-goal-close" />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
});
