import { Link, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { refreshAppData, useAccessView, useAppDataStore, useCommittedRead } from '@/bootstrap/app-data';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { isOpenStatus } from '@/data/repositories/goal-repository';
import { READ_ONLY_COPY } from '@/features/billing/presentation/billing-copy';
import type { LedgerEntryRecord } from '@/data/repositories/ledger-repository';
import { worldNoun } from '@/features/worlds/world-copy';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { deviceLocale, formatCivilDate } from '@/shared/i18n/locale';
import { Screen } from '@/shared/layout';
import { colors, layout, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListGroup } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';

import { readHistoryPage } from '../application/ledger-queries';

import { entryCountText, HISTORY_COPY, KIND_LABEL } from './ledger-copy';

// Current transaction History for one goal (v1.2 section 6): the saved entries as they are now,
// newest first, each opening the shared form to correct or delete it. There is no change log, no
// previous versions and no audit detail: a correction overwrites, a deletion removes. Add savings is
// a full-width button above the entries, as on Home (D81). Closed goals show the same list
// read-only until Reopen. The list re-reads SQLite after every commit.
//
// Rows are rendered inside the shared scrolling Screen rather than a virtualized list, one bounded
// page at a time (Phase 21): the newest HISTORY_PAGE_SIZE entries, then "Show older entries" adds
// the next page. With 10,000 entries the release build rendered nothing for minutes when every row
// was drawn at once (docs/evidence/PHASE_21.md).
export const HISTORY_PAGE_SIZE = 100;

export function HistoryScreen({ goalId }: { goalId: string }) {
  const currency = useAppDataStore((store) =>
    store.state.status === 'ready' && store.state.data.currency.currency.status === 'set' ? store.state.data.currency.currency.currency : null,
  );
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE);
  // A longer page keeps the shown rows (and the scroll position) until it has loaded.
  const read = useCommittedRead(`history:${goalId}:${limit}`, (db) => readHistoryPage(db, goalId, limit), { keepWhileLoading: true });
  const ledger = read.status === 'ready' && read.value && read.value.goal.id !== goalId ? ({ status: 'loading' } as const) : read;
  const access = useAccessView();

  if (ledger.status === 'loading') {
    return null;
  }
  if (ledger.status === 'failed') {
    return (
      <Screen>
        <Notice tone="error" title={HISTORY_COPY.loadFailedTitle} message={COMMON_COPY.nothingChangedTryAgain} />
        <Button label={COMMON_COPY.tryAgain} onPress={() => void refreshAppData()} />
      </Screen>
    );
  }
  if (!ledger.value || !currency) {
    return (
      <Screen>
        <Notice tone="info" title={HISTORY_COPY.notFoundTitle} message={HISTORY_COPY.notFoundMessage} />
      </Screen>
    );
  }

  const { goal, entries: rows, entryCount, balanceMinor } = ledger.value;
  const closed = !isOpenStatus(goal.status);
  // A goal that is read-only after a lost Pro entitlement keeps its whole history visible (Phase 16).
  const use = access?.use(goal) ?? 'usable';
  const open = !closed && use === 'usable';
  const locale = deviceLocale();

  return (
    <Screen testID="history">
      <Stack.Screen options={{ title: HISTORY_COPY.title }} />
      <Card variant="soft">
        <AppText role="headline" accessibilityRole="header">
          {goal.title}
        </AppText>
        <AppText tone="secondary" testID="history-balance">{HISTORY_COPY.balance(formatMoney(balanceMinor, currency, { locale }))}</AppText>
        <AppText role="footnote" tone="secondary">
          {entryCountText(entryCount)}
          {open ? HISTORY_COPY.tapHint : ''}
        </AppText>
      </Card>
      {/* The screen's one primary action, above the entries (D81: no floating button). */}
      {open ? (
        <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
          <Button label={COMMON_COPY.addSavings} icon="add" testID="history-add" />
        </Link>
      ) : closed ? (
        <Notice
          tone="info"
          title={HISTORY_COPY.closedTitle}
          message={HISTORY_COPY.closedMessage}
          testID="history-closed"
        />
      ) : (
        <Notice
          tone="info"
          title={READ_ONLY_COPY.badge}
          message={use === 'theme_locked' ? READ_ONLY_COPY.gardenSentence : READ_ONLY_COPY.sentence}
          testID="history-read-only"
        />
      )}
      {rows.length === 0 ? (
        // The goal's own world at its start, waiting for its first savings (D98, V03).
        <EmptyState
          icon="history"
          iconColor="blue"
          illustration={
            <View style={[styles.emptyWorld, { aspectRatio: worldArtAspect(goal.themeId) }]} testID="history-empty-world">
              <WorldScene themeId={goal.themeId} stage={0} backdrop="none" decorative />
            </View>
          }
          title={HISTORY_COPY.emptyTitle}
          message={HISTORY_COPY.emptyMessage(worldNoun(goal.themeId))}
          testID="history-empty"
        />
      ) : (
        <ListGroup testID="history-list">
          {rows.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} currency={currency} locale={locale} editable={open} />
          ))}
        </ListGroup>
      )}
      {rows.length < entryCount ? (
        <Button
          label={HISTORY_COPY.showOlder}
          variant="secondary"
          onPress={() => setLimit(rows.length + HISTORY_PAGE_SIZE)}
          testID="history-show-older"
        />
      ) : null}
    </Screen>
  );
}

type HistoryRowProps = { entry: LedgerEntryRecord; currency: CurrencyMetadata; locale: string; editable: boolean };

function HistoryRow({ entry, currency, locale, editable }: HistoryRowProps) {
  const kind = entry.signedAmountMinor < 0 ? 'withdrawal' : 'deposit';
  // The sign and the word always accompany the money color.
  const amount = formatMoney(entry.signedAmountMinor, currency, { locale, signDisplay: 'exceptZero' });
  const date = formatCivilDate(entry.entryDate, locale);
  const label = HISTORY_COPY.rowLabel(KIND_LABEL[kind], amount, date, entry.note);

  const content = (
    <>
      {/* Deposit green, withdrawal honey: warm, never an alarm color (no punitive feel). */}
      <IconTile name={kind} color={kind === 'deposit' ? 'green' : 'honey'} />
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AppText role="headline" style={styles.kind}>
            {KIND_LABEL[kind]}
          </AppText>
          <AmountText formatted={amount} kind={kind} />
        </View>
        <AppText role="footnote" tone="secondary">
          {date}
        </AppText>
        {entry.note ? <AppText role="callout">{entry.note}</AppText> : null}
      </View>
    </>
  );

  if (!editable) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label} testID={`history-row-${entry.id}`}>
        {content}
      </View>
    );
  }
  return (
    <Link href={{ pathname: '/entry-form', params: { entryId: entry.id } }} asChild>
      <RowButton label={label} testID={`history-row-${entry.id}`}>
        {content}
      </RowButton>
    </Link>
  );
}

type RowButtonProps = { label: string; testID: string; children: ReactNode; onPress?: (event: GestureResponderEvent) => void };

// Its own component, like the shared Button: `Link asChild` passes `onPress` to it, while the
// pressed-state style function stays on the Pressable (Link would drop a function-valued style).
function RowButton({ label, testID, children, onPress }: RowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={HISTORY_COPY.rowHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={testID}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Smaller than Home's world: the empty state sits under the goal card and Add savings.
  emptyWorld: {
    width: '100%',
    maxWidth: 280,
  },
  // Rows sit inside the shared ListGroup, which draws the rounded surface and the separators.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  kind: {
    flexShrink: 1,
  },
});
