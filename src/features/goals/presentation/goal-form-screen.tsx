import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { accessView, appClock, goalCommandDeps, refreshAppData, useAppDataStore } from '@/bootstrap/app-data';
import { today, type CivilDate } from '@/core/calendar';
import { formatAmountInput, parseAmount, type CurrencyMetadata } from '@/core/money';
import type { ThemeId } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import { isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import { PaywallScreen } from '@/features/billing/presentation/paywall-screen';
import { READ_ONLY_COPY } from '@/features/billing/presentation/billing-copy';
import { deviceSeparators } from '@/shared/i18n/locale';
import { FormScreen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { haptics } from '@/shared/ui/haptics';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { showToast } from '@/shared/ui/toast';

import { createGoal, editGoal } from '../application/goal-commands';
import { selectGoal } from '../application/goal-selection';

import { DeadlineField } from './deadline-field';
import { amountMessage, goalCommandMessage, type GoalFormField } from './goal-copy';

// Create/Edit Goal (v1.2 sections 2 and 6): name, positive target, optional deadline and the
// available world. The currency is read-only information from the global setting, never a field.
// The draft and its operation ID live here, above FormScreen, so a resize, rotation or sheet detent
// change re-lays out the form without resetting it, and a retry reuses the same operation ID. A
// failed save keeps every field as typed and explains the problem inline; only a committed save
// closes the sheet and shows a confirmation toast.
//
// Create without a free goal slot (Free already has its one goal, D74) shows the "Build another world"
// paywall entry in this same sheet instead of a form that would be refused, for every way in (Home's
// menu, its empty state, a deep link). Once Pro is bought the committed snapshot gains the slot and
// this sheet turns into Create Goal, with one line saying Pro is unlocked (Phase 16). Edit of a goal
// that is read-only after a lost entitlement explains that instead of showing the form.

const THEME_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

type FieldErrors = Partial<Record<GoalFormField, string>>;

export function GoalFormScreen({ goalId }: { goalId: string | null }) {
  const router = useRouter();
  const data = useAppDataStore((store) => (store.state.status === 'ready' ? store.state.data : null));
  // The paywall entry was shown in this sheet, so a form that appears afterwards follows a purchase.
  const [offeredPro, setOfferedPro] = useState(false);
  const currency = data?.currency.currency.status === 'set' ? data.currency.currency.currency : null;
  const goal = goalId === null ? null : (data?.goals.goals.find((summary) => summary.goal.id === goalId)?.goal ?? null);

  if (!data) {
    return null;
  }
  if (!currency) {
    return (
      <FormScreen>
        <Notice tone="error" title="No currency yet" message="Choose a currency in Settings before creating a goal." />
      </FormScreen>
    );
  }
  const access = accessView(data);
  if (goalId === null && !access.canCreate) {
    if (!offeredPro) {
      setOfferedPro(true);
    }
    return <PaywallScreen entry="another_world" onClose={() => router.back()} />;
  }
  if (goal && isOpenStatus(goal.status) && access.use(goal) !== 'usable') {
    return (
      <FormScreen>
        <Stack.Screen options={{ title: 'Edit goal' }} />
        <Notice
          tone="info"
          title={READ_ONLY_COPY.badge}
          message={access.use(goal) === 'theme_locked' ? READ_ONLY_COPY.gardenSentence : READ_ONLY_COPY.sentence}
          testID="goal-form-read-only"
        />
      </FormScreen>
    );
  }
  if (goalId !== null && (!goal || !isOpenStatus(goal.status))) {
    return (
      <FormScreen>
        <Stack.Screen options={{ title: 'Edit goal' }} />
        <Notice
          tone="info"
          title={goal ? 'This goal is closed' : 'Goal not found'}
          message={goal ? 'Closed goals are read-only. Reopen it from Collection to make changes.' : 'Close this form and try again.'}
        />
      </FormScreen>
    );
  }
  return <GoalForm currency={currency} goal={goal} unlocked={offeredPro && goal === null} />;
}

type GoalFormProps = {
  currency: CurrencyMetadata;
  goal: GoalRecord | null;
  // Pro was just bought from the "Build another world" entry in this sheet.
  unlocked: boolean;
};

function GoalForm({ currency, goal, unlocked }: GoalFormProps) {
  const router = useRouter();
  const separators = deviceSeparators();
  const [todayDate] = useState<CivilDate>(() => today(appClock()));
  const [operationId] = useState(randomUuid);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [targetText, setTargetText] = useState(() =>
    goal ? formatAmountInput(goal.targetMinor, currency.exponent, separators) : '',
  );
  const [deadline, setDeadline] = useState<CivilDate | null>(goal?.deadlineDate ?? null);
  const themeId: ThemeId = goal?.themeId ?? 'island';
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<TextInputInstance>(null);
  const targetRef = useRef<TextInputInstance>(null);

  const editing = goal !== null;

  const showErrors = (next: FieldErrors, general: string | null) => {
    setErrors(next);
    setFormError(general);
    if (next.title) {
      titleRef.current?.focus();
    } else if (next.target) {
      targetRef.current?.focus();
    }
  };

  const save = async () => {
    const target = parseAmount(targetText, currency.exponent, separators);
    if (!target.ok) {
      showErrors({ target: amountMessage(target.error, currency, separators) }, null);
      return;
    }
    setSaving(true);
    const fields = { title, targetMinor: target.value, deadlineDate: deadline, themeId };
    const deps = goalCommandDeps();
    const result = goal
      ? await editGoal(deps, { operationId, goalId: goal.id, expectedRevision: goal.revision, ...fields })
      : await createGoal(deps, { operationId, ...fields });
    if (!result.ok) {
      setSaving(false);
      const message = goalCommandMessage(result.error);
      if (result.error.code === 'goal_limit') {
        // A rule refused the save: one warning with the inline explanation (DESIGN_SYSTEM "Haptics").
        haptics.warning();
      }
      showErrors(message.field ? { [message.field]: message.message } : {}, message.field ? null : message.message);
      return;
    }
    if (!editing) {
      // Home shows the new goal. A failed preference write only means Home falls back to another
      // open goal; the goal itself is saved.
      await selectGoal(deps, result.value.goalId);
    }
    await refreshAppData();
    router.back();
    showToast({ tone: 'success', title: editing ? 'Goal saved' : 'Goal created' });
    haptics.success();
  };

  return (
    <FormScreen testID="goal-form">
      <Stack.Screen options={{ title: editing ? 'Edit goal' : 'New goal' }} />
      {unlocked ? <Notice tone="success" title="Pro is unlocked" message="Name your next goal and its world starts growing." testID="goal-form-unlocked" /> : null}
      {formError ? <Notice tone="error" title="Not saved" message={formError} testID="goal-form-error" /> : null}
      <TextField
        label="Goal name"
        placeholder="For example “Summer trip”"
        value={title}
        onChangeText={setTitle}
        error={errors.title}
        autoCapitalize="sentences"
        returnKeyType="next"
        onSubmitEditing={() => targetRef.current?.focus()}
        inputRef={titleRef}
        testID="goal-title"
      />
      <TextField
        variant="amount"
        label="Target"
        accessibilityLabel={`Target amount (${currency.code})`}
        suffix={currency.code}
        placeholder="0"
        value={targetText}
        onChangeText={setTargetText}
        error={errors.target}
        hint={`Every goal uses ${currency.code} – ${currency.name}, set in Settings.`}
        keyboardType={currency.exponent === 0 ? 'number-pad' : 'decimal-pad'}
        inputRef={targetRef}
        testID="goal-target"
      />
      <View style={styles.group}>
        <ListGroup>
          <DeadlineField
            value={deadline}
            onChange={setDeadline}
            today={todayDate}
            savedDeadline={goal?.deadlineDate ?? null}
            error={errors.deadline}
          />
          <ListRow title="World" icon="milestone" iconColor="green" value={THEME_NAMES[themeId]} testID="goal-theme" />
        </ListGroup>
        {errors.theme ? (
          <AppText role="footnote" tone="error">
            {errors.theme}
          </AppText>
        ) : null}
      </View>
      <Button label={editing ? 'Save changes' : 'Create goal'} onPress={() => void save()} loading={saving} testID="goal-save" />
      <Button label="Cancel" variant="plain" centered onPress={() => router.back()} disabled={saving} testID="goal-cancel" />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
});
