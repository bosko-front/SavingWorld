import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View, type TextInputInstance } from 'react-native';

import { appClock, ledgerCommandDeps, refreshAppData, useAccessView, useAppDataStore, useCommittedRead, type AccessView } from '@/bootstrap/app-data';
import { today, type CivilDate } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata, type EntryKind } from '@/core/money';
import { randomUuid } from '@/data/ids';
import { isOpenStatus, type GoalRecord } from '@/data/repositories/goal-repository';
import { READ_ONLY_COPY } from '@/features/billing/presentation/billing-copy';
import type { LedgerEntryRecord } from '@/data/repositories/ledger-repository';
import { noteCompletedQuest } from '@/features/challenges/presentation/completed-quest';
import { unlocksStage } from '@/features/worlds/world-transition';
import { amountMessage } from '@/shared/i18n/amount-messages';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { deviceLocale, deviceSeparators, formatCivilDate } from '@/shared/i18n/locale';
import { FormScreen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { haptics } from '@/shared/ui/haptics';
import { ListCell, ListGroup } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { showToast } from '@/shared/ui/toast';

import { correctEntry, createEntry, deleteEntry, type LedgerCommandError } from '../application/ledger-commands';
import { readEntryContext } from '../application/ledger-queries';

import { EntryDateField } from './entry-date-field';
import { draftFromEntry, draftValues, newEntryDraft, type EntryDraft } from './entry-draft';
import { EntryKindPicker } from './entry-kind-picker';
import { committedToastTitle, ENTRY_FORM_COPY, KIND_LABEL, ledgerCommandMessage, type EntryFormField, type LedgerAction } from './ledger-copy';

// The one Add/Edit Entry form (v1.2 sections 2 and 3), shared by Home's Add savings, History's
// corrections and the Challenges tab's Add savings (Phase 13). A deposit or withdrawal, a positive amount, a local date
// (today by default, never later) and an optional note. Rules:
// - The draft, the expected revision and the operation IDs live in this component, above
//   FormScreen, so a resize, rotation, fold or sheet change keeps them; a retry after a failure
//   reuses the same operation ID, so a write that did commit is replayed rather than repeated.
// - One submit at a time: a second tap while a write runs is ignored.
// - Success is shown only after COMMIT: the sheet closes, the committed data is re-read, then one
//   toast and one success haptic. A rule rejection or a failed write keeps every field as typed and
//   explains the problem inline; a rule rejection also plays one warning haptic, a failed write none.
// - Completed goals are read-only until Reopen; paused goals stay editable and
//   stay paused.
// - A commit that completes the goal's current quest (`completedAttemptId`, Phase 12) is noted for
//   the Challenges tab, which celebrates it once in its card. Opened from Challenges, that card
//   plays the action's success haptic instead of this form.

// Where the form was opened: Challenges celebrates a completed quest on screen right after the
// sheet closes; anywhere else the celebration waits for the next visit to Challenges.
export type EntryFormOrigin = 'home' | 'challenges';

type EntryFormProps =
  | { mode: 'create'; goalId: string; origin?: EntryFormOrigin }
  | { mode: 'edit'; entryId: string };

export function EntryFormScreen(props: EntryFormProps) {
  return props.mode === 'create' ? <CreateEntry goalId={props.goalId} origin={props.origin ?? 'home'} /> : <EditEntry entryId={props.entryId} />;
}

function useCurrency(): CurrencyMetadata | null | undefined {
  return useAppDataStore((store) => {
    if (store.state.status !== 'ready') {
      return undefined;
    }
    const { currency } = store.state.data.currency;
    return currency.status === 'set' ? currency.currency : null;
  });
}

function CreateEntry({ goalId, origin }: { goalId: string; origin: EntryFormOrigin }) {
  const currency = useCurrency();
  const access = useAccessView();
  const summary = useAppDataStore((store) =>
    store.state.status === 'ready' ? (store.state.data.goals.goals.find((item) => item.goal.id === goalId) ?? null) : undefined,
  );
  if (currency === undefined || summary === undefined) {
    return null;
  }
  const blocked = unavailable(currency, summary?.goal ?? null, access, COMMON_COPY.addSavings);
  if (blocked || !currency || !summary) {
    return blocked;
  }
  return <EntryForm currency={currency} goal={summary.goal} balanceMinor={summary.balanceMinor} entry={null} origin={origin} />;
}

function EditEntry({ entryId }: { entryId: string }) {
  const currency = useCurrency();
  const access = useAccessView();
  const context = useCommittedRead(`entry:${entryId}`, (db) => readEntryContext(db, entryId));
  if (currency === undefined || context.status === 'loading') {
    return null;
  }
  if (context.status === 'failed') {
    return (
      <FormScreen>
        <Stack.Screen options={{ title: ENTRY_FORM_COPY.editTitle }} />
        <Notice tone="error" title={ENTRY_FORM_COPY.loadFailedTitle} message={ENTRY_FORM_COPY.loadFailedMessage} />
      </FormScreen>
    );
  }
  const found = context.value;
  if (!found) {
    return (
      <FormScreen>
        <Stack.Screen options={{ title: ENTRY_FORM_COPY.editTitle }} />
        <Notice tone="info" title={ENTRY_FORM_COPY.notFoundTitle} message={ENTRY_FORM_COPY.notFoundMessage} />
      </FormScreen>
    );
  }
  const blocked = unavailable(currency, found.goal, access, ENTRY_FORM_COPY.editTitle);
  if (blocked || !currency) {
    return blocked;
  }
  return <EntryForm currency={currency} goal={found.goal} balanceMinor={found.balanceMinor} entry={found.entry} origin="home" />;
}

// The states in which the form can't be used, each explained instead of a disabled form. A goal that
// is read-only after a lost Pro entitlement (Phase 16) says so calmly, also for a deep link.
function unavailable(currency: CurrencyMetadata | null, goal: GoalRecord | null, access: AccessView | null, title: string) {
  let notice: { title: string; message: string } | null = null;
  if (!currency) {
    notice = { title: ENTRY_FORM_COPY.noCurrencyTitle, message: ENTRY_FORM_COPY.noCurrencyMessage };
  } else if (!goal) {
    notice = { title: ENTRY_FORM_COPY.goalNotFoundTitle, message: ENTRY_FORM_COPY.goalNotFoundMessage };
  } else if (!isOpenStatus(goal.status)) {
    notice = {
      title: ENTRY_FORM_COPY.closedTitle,
      message: ENTRY_FORM_COPY.closedMessage,
    };
  } else if (access && access.use(goal) !== 'usable') {
    notice = {
      title: READ_ONLY_COPY.badge,
      message: access.use(goal) === 'theme_locked' ? READ_ONLY_COPY.gardenSentence : READ_ONLY_COPY.sentence,
    };
  }
  if (!notice) {
    return null;
  }
  return (
    <FormScreen testID="entry-form-unavailable">
      <Stack.Screen options={{ title }} />
      <Notice tone="info" title={notice.title} message={notice.message} />
    </FormScreen>
  );
}

type FieldErrors = Partial<Record<EntryFormField, string>>;

type FormProps = {
  currency: CurrencyMetadata;
  goal: GoalRecord;
  balanceMinor: number;
  // The entry being corrected, or null for a new one.
  entry: LedgerEntryRecord | null;
  origin: EntryFormOrigin;
};

function EntryForm({ currency, goal, balanceMinor, entry, origin }: FormProps) {
  const router = useRouter();
  const separators = deviceSeparators();
  const [todayDate] = useState<CivilDate>(() => today(appClock()));
  // Captured when the form opens: a later change to this entry makes the save stale, never silently
  // overwritten.
  const [original] = useState(entry);
  const [saveOperationId] = useState(randomUuid);
  const [deleteOperationId] = useState(randomUuid);
  const [draft, setDraft] = useState<EntryDraft>(() =>
    original ? draftFromEntry(original, currency.exponent, separators) : newEntryDraft(todayDate),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [pending, setPending] = useState<'save' | 'delete' | null>(null);
  const inFlight = useRef(false);
  const amountRef = useRef<TextInputInstance>(null);
  const noteRef = useRef<TextInputInstance>(null);

  const editing = original !== null;
  const update = (patch: Partial<EntryDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const showFailure = (action: LedgerAction, error: LedgerCommandError) => {
    const message = ledgerCommandMessage(action, error, { currency, balanceMinor, locale: deviceLocale() });
    setErrors(message.field ? { [message.field]: message.message } : {});
    setFormError(message.field ? null : { title: action === 'delete' ? ENTRY_FORM_COPY.notDeleted : COMMON_COPY.notSaved, message: message.message });
    if (message.field === 'amount') {
      amountRef.current?.focus();
    } else if (message.field === 'note') {
      noteRef.current?.focus();
    }
    if (message.ruleRejection) {
      haptics.warning();
    }
  };

  // `afterMinor` is the goal's balance after this commit. When it unlocks a stage, Home's unlock
  // moment plays the one haptic of this action (`milestone`, Phase 10) as the new object appears.
  // When it completes a quest saved from Challenges, that quest's card plays it (Phase 13).
  const committed = async (action: LedgerAction, kind: EntryKind, afterMinor: number, completedAttemptId: string | null) => {
    const questOnScreen = completedAttemptId !== null && origin === 'challenges';
    if (completedAttemptId !== null) {
      noteCompletedQuest({ attemptId: completedAttemptId, goalId: goal.id, onChallenges: questOnScreen });
    }
    router.back();
    await refreshAppData();
    showToast({ tone: 'success', title: committedToastTitle(action, kind) });
    if (!questOnScreen && !unlocksStage(balanceMinor, afterMinor, goal.targetMinor)) {
      haptics.success();
    }
  };

  const save = async () => {
    if (inFlight.current) {
      return;
    }
    const values = draftValues(draft, currency.exponent, separators);
    if (!values.ok) {
      setErrors({ amount: amountMessage(values.error, currency, separators, 'entry') });
      setFormError(null);
      amountRef.current?.focus();
      return;
    }
    inFlight.current = true;
    setPending('save');
    const deps = ledgerCommandDeps();
    const result = original
      ? await correctEntry(deps, { operationId: saveOperationId, entryId: original.id, expectedRevision: original.revision, ...values.value })
      : await createEntry(deps, { operationId: saveOperationId, goalId: goal.id, ...values.value });
    if (!result.ok) {
      inFlight.current = false;
      setPending(null);
      showFailure(original ? 'correct' : 'create', result.error);
      return;
    }
    const signedMinor = values.value.kind === 'withdrawal' ? -values.value.amountMinor : values.value.amountMinor;
    await committed(
      original ? 'correct' : 'create',
      values.value.kind,
      balanceMinor - (original?.signedAmountMinor ?? 0) + signedMinor,
      result.value.completedAttemptId,
    );
  };

  const remove = async () => {
    if (!original || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending('delete');
    const result = await deleteEntry(ledgerCommandDeps(), {
      operationId: deleteOperationId,
      entryId: original.id,
      expectedRevision: original.revision,
      confirmed: true,
    });
    if (!result.ok) {
      inFlight.current = false;
      setPending(null);
      showFailure('delete', result.error);
      return;
    }
    await committed(
      'delete',
      original.signedAmountMinor < 0 ? 'withdrawal' : 'deposit',
      balanceMinor - original.signedAmountMinor,
      result.value.completedAttemptId,
    );
  };

  // Deleting needs a native confirmation first; there is no Undo, because no entry history is kept.
  const confirmDelete = () => {
    if (!original || inFlight.current) {
      return;
    }
    const kind: EntryKind = original.signedAmountMinor < 0 ? 'withdrawal' : 'deposit';
    const amount = formatMoney(Math.abs(original.signedAmountMinor), currency, { locale: deviceLocale() });
    Alert.alert(
      ENTRY_FORM_COPY.deleteTitle,
      ENTRY_FORM_COPY.deleteMessage(KIND_LABEL[kind], amount, formatCivilDate(original.entryDate)),
      [
        { text: COMMON_COPY.cancel, style: 'cancel' },
        { text: ENTRY_FORM_COPY.deleteButton, style: 'destructive', onPress: () => void remove() },
      ],
    );
  };

  const busy = pending !== null;
  const saveLabel = editing ? ENTRY_FORM_COPY.saveChanges : draft.kind === 'deposit' ? ENTRY_FORM_COPY.saveDeposit : ENTRY_FORM_COPY.saveWithdrawal;

  return (
    <FormScreen testID="entry-form">
      <Stack.Screen options={{ title: editing ? ENTRY_FORM_COPY.editTitle : COMMON_COPY.addSavings }} />
      <View style={styles.context} testID="entry-goal">
        <AppText role="headline">{goal.title}</AppText>
        <AppText tone="secondary" testID="entry-goal-balance">{ENTRY_FORM_COPY.balance(formatMoney(balanceMinor, currency, { locale: deviceLocale() }))}</AppText>
        {goal.status === 'paused' ? (
          <AppText role="footnote" tone="secondary" testID="entry-goal-paused">
            {ENTRY_FORM_COPY.paused}
          </AppText>
        ) : null}
      </View>
      {formError ? <Notice tone="error" title={formError.title} message={formError.message} announce testID="entry-form-error" /> : null}
      <EntryKindPicker value={draft.kind} onChange={(kind) => update({ kind })} />
      <TextField
        variant="amount"
        label={ENTRY_FORM_COPY.amountLabel}
        accessibilityLabel={ENTRY_FORM_COPY.amountSpoken(currency.code)}
        suffix={currency.code}
        placeholder="0"
        value={draft.amountText}
        onChangeText={(amountText) => update({ amountText })}
        error={errors.amount}
        keyboardType={currency.exponent === 0 ? 'number-pad' : 'decimal-pad'}
        inputRef={amountRef}
        testID="entry-amount"
      />
      <ListGroup>
        <EntryDateField value={draft.entryDate} onChange={(entryDate) => update({ entryDate })} today={todayDate} error={errors.date} />
        <ListCell>
          <TextField
            variant="inset"
            label={ENTRY_FORM_COPY.noteLabel}
            placeholder={ENTRY_FORM_COPY.notePlaceholder}
            value={draft.noteText}
            onChangeText={(noteText) => update({ noteText })}
            error={errors.note}
            multiline
            autoCapitalize="sentences"
            inputRef={noteRef}
            testID="entry-note"
          />
        </ListCell>
      </ListGroup>
      <Button
        label={saveLabel}
        icon={draft.kind}
        onPress={() => void save()}
        loading={pending === 'save'}
        disabled={busy && pending !== 'save'}
        testID="entry-save"
      />
      <Button label={COMMON_COPY.cancel} variant="plain" centered onPress={() => router.back()} disabled={busy} testID="entry-cancel" />
      {editing ? (
        <Button
          label={ENTRY_FORM_COPY.deleteEntry}
          variant="destructive"
          onPress={confirmDelete}
          loading={pending === 'delete'}
          disabled={busy && pending !== 'delete'}
          testID="entry-delete"
        />
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  context: {
    gap: spacing.xs / 2,
  },
});
