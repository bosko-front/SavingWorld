import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, StyleSheet, View } from 'react-native';

import { accessView, refreshAppData, useAppDataStore, useCommittedRead } from '@/bootstrap/app-data';
import { canOpenStatistics } from '@/core/access';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { deviceLocale } from '@/shared/i18n/locale';
import { Screen, useFontScale } from '@/shared/layout';
import { borders, colors, layout, radii, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon, type IconName } from '@/shared/ui/icon';
import { StepChart } from '@/shared/ui/line-chart';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { SectionHeader } from '@/shared/ui/section-header';

import { readSavingsStatistics } from '../application/statistics-queries';
import { presentable } from '../domain/savings-statistics';

import { STATISTICS_COPY, statisticsView, type StatisticsView } from './statistics-model';

// The one Pro Statistics screen (v1.2 section 6, R19, Phase 18): exactly four views of every existing
// goal's committed ledger in the global currency, presented as "your savings at a glance" (D97), not a
// dashboard. The all-goal total is the headline; this month's deposits and withdrawals are two small
// cards like the savings plan (D84); the last 30 days are one soft line with a sentence and the list
// of every day; the completed-goal count opens Collection. The read re-runs after every commit and
// when the app's civil date changes (a new day or month), and refuses without Pro, like the screen.
export function StatisticsScreen() {
  const state = useAppDataStore((store) => store.state);
  const data = state.status === 'ready' ? state.data : null;
  const capabilities = data ? accessView(data).capabilities : null;
  const allowed = capabilities !== null && canOpenStatistics(capabilities);
  const today = data?.today ?? null;
  const read = useCommittedRead(`statistics:${today ?? ''}:${allowed ? 'pro' : 'free'}`, (db) =>
    capabilities && today ? readSavingsStatistics(db, capabilities, today) : Promise.reject(new Error('no snapshot')),
  );

  if (state.status === 'failed') {
    return <LoadFailed />;
  }
  if (!data) {
    return <Loading />;
  }
  if (!allowed) {
    return <Locked />;
  }
  if (data.currency.currency.status !== 'set') {
    return (
      <Screen>
        <Notice
          tone="error"
          title={COMMON_COPY.currencyUnreadableTitle}
          message={COMMON_COPY.currencyUnreadableMessage}
        />
      </Screen>
    );
  }
  if (read.status === 'loading') {
    return <Loading />;
  }
  if (read.status === 'failed') {
    return <LoadFailed />;
  }
  if (!read.value.ok) {
    return <Locked />;
  }
  const statistics = read.value.value;
  if (statistics.goalCount === 0) {
    return (
      <Screen testID="statistics" centered>
        <EmptyState icon="statistics" iconColor="honey" title={STATISTICS_COPY.emptyTitle} message={STATISTICS_COPY.emptyMessage} testID="statistics-empty">
          <Link href="/goal-form" asChild>
            <Button label={STATISTICS_COPY.emptyButton} testID="statistics-new-goal" />
          </Link>
        </EmptyState>
      </Screen>
    );
  }
  if (!presentable(statistics)) {
    return (
      <Screen testID="statistics">
        <Notice tone="info" title={STATISTICS_COPY.tooLargeTitle} message={STATISTICS_COPY.tooLargeMessage} testID="statistics-too-large" />
      </Screen>
    );
  }
  return <StatisticsGlance view={statisticsView(statistics, data.currency.currency.currency, deviceLocale())} />;
}

// The four views of one read. Exported for the development-only preview (`/dev-statistics`).
export function StatisticsGlance({ view }: { view: StatisticsView }) {
  const router = useRouter();
  // Above the stacking scale the headline steps down from the display role (it still scales), so a
  // long all-goal total breaks less often on a small screen.
  const large = useFontScale() > STACK_TEXT_SCALE;
  return (
    <Screen testID="statistics">
      <View style={styles.headline} accessible accessibilityLabel={`${STATISTICS_COPY.totalLabel}: ${view.total}`} testID="statistics-total">
        <AppText tone="secondary">{STATISTICS_COPY.totalLabel}</AppText>
        <AmountText formatted={view.total} size={large ? 'large' : 'display'} testID="statistics-total-amount" />
      </View>

      <View style={styles.section}>
        <SectionHeader title={STATISTICS_COPY.monthHeader} caption={view.month.name} />
        <MonthCards view={view} />
      </View>

      <View style={styles.section}>
        <SectionHeader title={STATISTICS_COPY.lineHeader} />
        <View style={styles.chartCard}>
          <StepChart
            points={view.chart.points}
            domain={view.chart.domain}
            gridlines={view.chart.gridlines}
            xLabels={view.chart.xLabels}
            accessibilityLabel={STATISTICS_COPY.lineLabel}
            testID="statistics-line"
          />
        </View>
        <NetChange change={view.change} />
        <DailyBalances days={view.days} />
      </View>

      <ListGroup testID="statistics-completed">
        <ListRow
          icon="finish"
          iconColor="green"
          title={STATISTICS_COPY.completedTitle}
          detail={view.completed.detail}
          value={view.completed.count}
          chevron
          onPress={() => router.navigate('/collection')}
          accessibilityLabel={view.completed.spoken}
          accessibilityHint={STATISTICS_COPY.completedHint}
          testID="statistics-completed-row"
        />
      </ListGroup>
    </Screen>
  );
}

// Above this text scale the two cards stack, as the savings plan cards do (D84).
const STACK_TEXT_SCALE = 1.35;

function MonthCards({ view }: { view: StatisticsView }) {
  const stacked = useFontScale() > STACK_TEXT_SCALE;
  return (
    <View style={[styles.cards, stacked && styles.stacked]} accessible accessibilityLabel={view.month.spoken} testID="statistics-month">
      <MonthCard icon="deposit" label={STATISTICS_COPY.deposits} amount={view.month.deposits} testID="statistics-deposits" />
      <MonthCard icon="withdrawal" label={STATISTICS_COPY.withdrawals} amount={view.month.withdrawals} testID="statistics-withdrawals" />
    </View>
  );
}

function MonthCard({ icon, label, amount, testID }: { icon: IconName; label: string; amount: string; testID: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardLabel}>
        <Icon name={icon} role="footnote" tone="secondary" />
        <AppText role="footnote" tone="secondary">
          {label}
        </AppText>
      </View>
      {/* The words say which is which; both amounts use the primary text color (no trading colors). */}
      <AppText role="headline" style={styles.digits} testID={`${testID}-amount`}>
        {amount}
      </AppText>
    </View>
  );
}

// The 30 days' net change in one row: what the balance moved by, which is not this month's deposits.
function NetChange({ change }: { change: StatisticsView['change'] }) {
  return (
    <View style={styles.change} accessible accessibilityLabel={change.spoken} testID="statistics-change">
      <View style={styles.changeRow}>
        <AppText role="label">{STATISTICS_COPY.changeTitle}</AppText>
        <AppText role="headline" style={styles.digits} testID="statistics-change-amount">
          {change.amount}
        </AppText>
      </View>
      <AppText role="footnote" tone="secondary">
        {STATISTICS_COPY.changeCaption}
      </AppText>
      <AppText role="footnote" tone="secondary" testID="statistics-change-detail">
        {change.detail}
      </AppText>
    </View>
  );
}

// The line's text alternative: every point as a row, newest first, behind a collapsible heading
// (closed at first, like Past quests), so the screen stays calm and nothing depends on the picture.
function DailyBalances({ days }: { days: StatisticsView['days'] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={STATISTICS_COPY.dailyToggle}
        accessibilityHint={open ? STATISTICS_COPY.dailyHideHint : STATISTICS_COPY.dailyShowHint}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        testID="statistics-daily-toggle">
        <AppText role="label" tone="action" style={styles.toggleText}>
          {STATISTICS_COPY.dailyToggle}
        </AppText>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron" role="footnote" tone="action" weight="semibold" />
        </View>
      </Pressable>
      {open ? (
        <ListGroup testID="statistics-daily">
          {days.map((day) => (
            <ListRow key={day.date} title={day.label} value={day.amount} testID={`statistics-day-${day.date}`} />
          ))}
        </ListGroup>
      ) : null}
    </View>
  );
}

function Loading() {
  return (
    <Screen centered testID="statistics-loading">
      <ActivityIndicator color={colors.textSecondary} accessibilityLabel={STATISTICS_COPY.loading} />
    </Screen>
  );
}

// A read that failed: nothing is shown as current, nothing was changed, one tap reads again.
function LoadFailed() {
  return (
    <Screen testID="statistics-failed">
      <Notice tone="error" title={STATISTICS_COPY.failedTitle} message={STATISTICS_COPY.failedMessage} />
      <Button label={STATISTICS_COPY.retry} onPress={() => void refreshAppData()} testID="statistics-retry" />
    </Screen>
  );
}

// Without Pro (a deep link, or Pro was lost while the screen was open) nothing is read; one calm
// invitation to the Pro screen.
function Locked() {
  return (
    <Screen testID="statistics-locked" centered>
      <EmptyState icon="statistics" iconColor="honey" title={STATISTICS_COPY.lockedTitle} message={STATISTICS_COPY.lockedMessage}>
        <Link href="/paywall" asChild>
          <Button label={STATISTICS_COPY.lockedButton} icon="pro" testID="statistics-explore-pro" />
        </Link>
      </EmptyState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: {
    gap: spacing.xs / 2,
  },
  section: {
    gap: spacing.sm,
  },
  cards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stacked: {
    flexDirection: 'column',
  },
  // The savings plan card surface (D84): white, radii.lg, hairline border.
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing.xs / 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
  },
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  digits: {
    fontVariant: ['tabular-nums'],
  },
  chartCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
  },
  change: {
    gap: spacing.xs / 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
  },
  changeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  toggleText: {
    flexShrink: 1,
  },
  chevronOpen: {
    // SF Symbols mirror chevron.right in right-to-left layouts, so it turns the other way there.
    transform: [{ rotate: I18nManager.isRTL ? '-90deg' : '90deg' }],
  },
  pressed: {
    opacity: 0.6,
  },
});
