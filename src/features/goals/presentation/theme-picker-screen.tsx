import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { accessView, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { canChangeGoalTheme, canUseTheme } from '@/core/access';
import { stageFor, type ThemeId } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import { isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import { ThemeCards } from '@/features/worlds/presentation/theme-cards';
import { THEME_PICKER_COPY } from '@/features/worlds/presentation/theme-copy';
import { FormScreen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { haptics } from '@/shared/ui/haptics';
import { Notice } from '@/shared/ui/notice';
import { showToast } from '@/shared/ui/toast';

import { changeGoalTheme } from '../application/goal-commands';

import { themeChangeMessage } from './goal-copy';

// Choose the world an open goal grows (Phase 17; v1.2 section 4, R20; owner decisions D75, D97,
// D122). Both worlds are picture cards at the goal's current stage, so the person sees their own
// progress in either world. Choosing the other world saves it at once through Change Theme (selection
// haptic on the pick, the shared toast once saved) and returns to where they came from; Home then
// crosses over to the new world. Without Pro the Garden card is locked and opens the Pro paywall; a
// purchase makes it choosable right here. A Garden goal without Pro is explained kindly and may be
// grown as an Island after a native confirmation (the one change Free allows, D75). Nothing changes
// the theme automatically, and the command checks everything again.
export function ThemePickerScreen({ goalId }: { goalId: string | null }) {
  const router = useRouter();
  const data = useAppDataStore((store) => (store.state.status === 'ready' ? store.state.data : null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  if (!data) {
    return null;
  }
  const summary = goalId === null ? null : (data.goals.goals.find((candidate) => candidate.goal.id === goalId) ?? null);
  const goal = summary?.goal ?? null;
  const access = accessView(data);
  if (!summary || !goal || !isOpenStatus(goal.status) || access.use(goal) === 'read_only') {
    return (
      <FormScreen testID="theme-picker">
        <Stack.Screen options={{ title: THEME_PICKER_COPY.screenTitle }} />
        <Notice
          tone="info"
          title={goal ? 'This world can’t be changed now' : 'Goal not found'}
          message={
            !goal
              ? 'Close this screen and try again.'
              : isOpenStatus(goal.status)
                ? 'Without Pro this goal is read-only. Its world is kept just as it is.'
                : 'Closed goals keep their world. Reopen the goal from Collection to change it.'
          }
          testID="theme-picker-unavailable"
        />
      </FormScreen>
    );
  }
  const { capabilities } = access;
  const locked = !canUseTheme(capabilities, goal.themeId);

  const change = async (current: GoalRecord, themeId: ThemeId) => {
    if (running.current) {
      return;
    }
    running.current = true;
    setSaving(true);
    setError(null);
    const result = await changeGoalTheme(goalCommandDeps(), {
      operationId: randomUuid(),
      goalId: current.id,
      expectedRevision: current.revision,
      themeId,
    });
    await refreshAppData();
    running.current = false;
    setSaving(false);
    if (!result.ok) {
      setError(themeChangeMessage(result.error));
      return;
    }
    router.back();
    // The pick already played the selection haptic: one action, one haptic (DECISIONS D129).
    showToast({ tone: 'success', title: THEME_PICKER_COPY.changed(themeId) });
  };

  const choose = (themeId: ThemeId) => {
    haptics.selection();
    if (capabilities.switchOpenGoalTheme) {
      void change(goal, themeId);
      return;
    }
    // Without Pro: the person's own move of a Garden they can no longer grow to the Island, confirmed.
    Alert.alert(THEME_PICKER_COPY.confirmTitle, THEME_PICKER_COPY.confirmMessage, [
      { text: THEME_PICKER_COPY.cancel, style: 'cancel' },
      { text: THEME_PICKER_COPY.confirmButton, onPress: () => void change(goal, themeId) },
    ]);
  };

  return (
    <FormScreen testID="theme-picker">
      <Stack.Screen options={{ title: THEME_PICKER_COPY.screenTitle }} />
      <View style={styles.context}>
        <AppText role="label" numberOfLines={2}>
          {goal.title}
        </AppText>
        <AppText role="footnote" tone="secondary">
          {THEME_PICKER_COPY.intro}
        </AppText>
      </View>
      {locked ? <Notice tone="info" title={THEME_PICKER_COPY.lockedTitle} message={THEME_PICKER_COPY.lockedMessage} testID="theme-picker-locked" /> : null}
      {error ? <Notice tone="error" title="World not changed" message={error} testID="theme-picker-error" /> : null}
      <ThemeCards
        selected={goal.themeId}
        stage={stageFor(summary.balanceMinor, goal.targetMinor)}
        state={(themeId) => (themeId === goal.themeId ? (locked ? 'locked' : 'selectable') : canChangeGoalTheme(capabilities, goal.themeId, themeId) ? 'selectable' : 'locked')}
        onSelect={choose}
        onLocked={() => router.push('/paywall')}
        busy={saving}
        pictureHeight={150}
      />
      <Button label="Done" variant="plain" centered onPress={() => router.back()} disabled={saving} testID="theme-picker-done" />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  context: {
    gap: spacing.xs,
  },
});
