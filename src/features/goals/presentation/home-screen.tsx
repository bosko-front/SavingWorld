import { Link } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { accessView, goalCommandDeps, refreshAppData, useAppDataStore, type AccessView } from '@/bootstrap/app-data';
import { releaseLaunchSplash, useReleaseLaunchSplash } from '@/bootstrap/launch-splash';
import { canOpenStatistics, type GoalUse } from '@/core/access';
import { MILESTONE_COUNT, progressPercent, sceneFeedback } from '@/core/progression';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import { isOpenStatus, type GoalSummary } from '@/data/repositories/goal-repository';
import { ANOTHER_WORLD, READ_ONLY_COPY } from '@/features/billing/presentation/billing-copy';
import { themeManifestAt } from '@/features/worlds/registry';
import { THEME_PICKER_COPY } from '@/features/worlds/presentation/theme-copy';
import { UnlockBanner } from '@/features/worlds/unlock-banner';
import { useShownTheme } from '@/features/worlds/use-shown-theme';
import { useWorldMotion, type WorldMotion } from '@/features/worlds/use-world-motion';
import { worldNoun } from '@/features/worlds/world-copy';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { WORLD_MOTION } from '@/features/worlds/world-transition';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { AdaptiveGoalLayout, Screen } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { useCountUp } from '@/shared/ui/count-up';
import { useAmbientMotion } from '@/shared/ui/motion-preferences';
import { EmptyState } from '@/shared/ui/empty-state';
import { haptics } from '@/shared/ui/haptics';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { ProgressBar, progressTextTone } from '@/shared/ui/progress-bar';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { selectGoal } from '../application/goal-selection';

import { SavingsPlanCards } from './savings-plan-cards';
import { GOAL_STATUS_LABEL, HOME_COPY } from './goal-copy';
import { GoalMenu } from './goal-menu';
import { useDeleteGoal } from './use-delete-goal';
import { homeDashboard, type HomeDashboard, type NextMilestone } from './home-dashboard';
import { useGoalAction } from './use-goal-action';

// Home (Phase 06 basics, Phase 07 ledger actions, Phase 07.5 visual direction A "Calm hero", Phase 08
// dashboard): the world first, then progress. The controls show the goal title with its options
// menu (⋯: History, Edit, Pause/Resume, Finish at B ≥ T, New goal, Delete), the saved amount as the largest text,
// the target, a milestone progress bar with the floored percent and the remaining (or overfunded)
// amount, Add savings (the one primary action, a full-width button under the progress since owner
// decision D81; D72/D73 had it floating), the milestone card and the savings plan when a deadline is set (D84). Every number
// comes from the committed snapshot (balance recomputed from the ledger) and the civil date it was
// read on; a commit or a new date re-reads it. Settings is in the navigation bar. Free shows at most one open goal; with more open goals (Pro) a simple list chooses
// which one Home shows. The choice is stored, and after a restart a missing or closed choice falls
// back to the oldest open goal. After Pro was lost with several goals (Phase 16, D74) every goal stays
// visible; the goals not kept in use show a neutral Read-only badge and one sentence instead of Add
// savings, and until the person has chosen the goal to keep using a calm card asks them to choose.
export function HomeScreen() {
  const state = useAppDataStore((store) => store.state);
  // The launch screen stays until Home's world is drawn (D141); a Home without a world (a failed
  // read, an unreadable currency) releases it as soon as it renders.
  useReleaseLaunchSplash(state.status === 'failed' || (state.status === 'ready' && state.data.currency.currency.status !== 'set'));

  if (state.status === 'failed') {
    return <LoadFailed />;
  }
  if (state.status !== 'ready') {
    return null;
  }
  const { currency, goals, today } = state.data;
  if (currency.currency.status !== 'set') {
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

  const open = goals.goals.filter((summary) => isOpenStatus(summary.goal.status));
  const completedCount = goals.goals.length - open.length;
  const selected = open.find((summary) => summary.goal.id === goals.selectedGoalId) ?? null;
  const access = accessView(state.data);
  const { canCreate } = access;

  if (!selected) {
    return (
      <Screen testID="home" centered>
        <EmptyHome
          completedCount={completedCount}
          canCreate={canCreate}
          // Free's one goal is finished (D98, V04): its finished world, newest souvenir of a completed goal.
          finishedWorld={
            canCreate
              ? null
              : (goals.souvenirs.find((souvenir) =>
                  goals.goals.some(({ goal }) => goal.id === souvenir.goalId && goal.status === 'completed'),
                ) ?? null)
          }
        />
      </Screen>
    );
  }

  return (
    <SelectedGoalHome
      summary={selected}
      dashboard={homeDashboard(selected, currency.currency.currency, today)}
      open={open}
      access={access}
      souvenir={goals.souvenirs.some((souvenir) => souvenir.goalId === selected.goal.id)}
    />
  );
}

type SelectedGoalHomeProps = {
  summary: GoalSummary;
  dashboard: HomeDashboard;
  open: GoalSummary[];
  access: AccessView;
  // The goal holds its permanent souvenir (Phase 11): the first time this turns true after a commit,
  // the world's moment is the souvenir moment.
  souvenir: boolean;
};

// The selected goal on AdaptiveGoalLayout: the world, then the numbers, the milestone and the
// savings plan; goal administration is in the ⋯ menu and Add savings sits under the progress (D73,
// D81). After a committed change the world motion (Phase 10) moves the amount, the bar and the
// scene from what was shown to the committed values, with the unlock moment when a deposit crosses
// a threshold; everything else on Home shows the committed values at once.
function SelectedGoalHome({ summary, dashboard, open, access, souvenir }: SelectedGoalHomeProps) {
  const { goal } = summary;
  const revision = useAppDataStore((store) => store.version);
  const motion = useWorldMotion({
    goalId: goal.id,
    themeId: goal.themeId,
    balanceMinor: summary.balanceMinor,
    targetMinor: goal.targetMinor,
    souvenir,
    revision,
  });
  // Living Island (Phase 10.5, D90): clouds, water sparkle and trees move only while Home is focused,
  // the app is active and Reduce Motion is off.
  const ambientMotion = useAmbientMotion();
  // A changed world (Phase 17) crosses over once Home is seen again.
  const world = useShownTheme(goal.themeId);
  const action = useGoalAction();
  const { deleting, confirmDelete } = useDeleteGoal();
  const busy = action.pending?.goalId === goal.id || deleting === goal.id;
  const use = access.use(goal);
  return (
    <AdaptiveGoalLayout
      testID="home"
      sceneAspectRatio={worldArtAspect(world.themeId)}
      // The sky fills the top of the screen edge to edge down to the goal title; the Island stays
      // clear of the bars and the side gutters (owner decision D80).
      sceneBleed
      sceneBleedColor={colors.sceneSkyTop}
      // No text field on Home: the entry sheet's keyboard must not scroll the world away under the
      // sheet, or the unlock moment would play off screen.
      keyboard="none"
      scene={
        <WorldScene
          themeId={world.themeId}
          stage={motion.stage}
          upcomingStage={motion.upcomingStage}
          reveal={motion.reveal}
          ambient={ambientMotion}
          crossfadeTheme={world.crossfade}
          onShown={releaseLaunchSplash}
          onUnavailable={releaseLaunchSplash}
          fill>
          {motion.banner ? <UnlockBanner banner={motion.banner} onDismiss={motion.dismissBanner} /> : null}
        </WorldScene>
      }
      controls={
        <View style={styles.controls}>
          <GoalNumbers
            summary={summary}
            dashboard={dashboard}
            motion={motion}
            busy={busy}
            use={use}
            needsKeptChoice={access.needsKeptChoice}
            menu={
              <GoalMenu
                summary={summary}
                funded={dashboard.amounts.funded}
                use={use}
                busy={busy}
                run={action.run}
                onDelete={() => confirmDelete(goal)}
                statistics={canOpenStatistics(access.capabilities)}
              />
            }
          />
          {open.length > 1 ? <GoalSwitcher open={open} selectedId={goal.id} access={access} /> : null}
        </View>
      }
    />
  );
}

// A read that failed after the app opened: nothing is shown as current, nothing was changed, and
// one tap reads again. The navigator stays, so the person keeps their place.
function LoadFailed() {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    await refreshAppData();
    setRetrying(false);
  };
  return (
    <Screen testID="home-load-failed">
      <Notice tone="error" title={HOME_COPY.loadFailedTitle} message={COMMON_COPY.nothingChangedTryAgain} />
      <Button label={COMMON_COPY.tryAgain} loading={retrying} onPress={() => void retry()} testID="home-retry" />
    </Screen>
  );
}

// No open goal. A finished goal still counts toward Free's one goal (D74), so Free is told
// where it is and what the two ways forward are instead of being sent to a form that would refuse.
// The picture is the empty Island (stage 0, D76 base layer), floating gently with a soft sparkle while
// Home is visible (D69, Phase 10). It keeps that float and no ambient motion of its own (Phase 10.5):
// one gentle movement for a small picture is enough. While Free's one goal is finished (D98, V04) the
// picture is that finished world (its souvenir's theme and version) and the title says so.
type EmptyHomeProps = { completedCount: number; canCreate: boolean; finishedWorld: CollectibleRecord | null };

function EmptyHome({ completedCount, canCreate, finishedWorld }: EmptyHomeProps) {
  const finished = !canCreate && completedCount > 0;
  const title = finished ? HOME_COPY.finishedTitle : completedCount > 0 ? HOME_COPY.newGoalTitle : HOME_COPY.firstGoalTitle;
  const message = finished
    ? HOME_COPY.finishedMessage(worldNoun(finishedWorld?.themeId ?? 'island'))
    : HOME_COPY.firstGoalMessage;
  return (
    <EmptyState
      icon="milestone"
      illustration={
        <View style={[styles.emptyWorld, finishedWorld ? { aspectRatio: worldArtAspect(finishedWorld.themeId, themeManifestAt(finishedWorld.themeId, finishedWorld.themeVersion)) } : null]} testID="home-empty-world">
          {finishedWorld ? (
            <WorldScene
              themeId={finishedWorld.themeId}
              stage={MILESTONE_COUNT}
              manifest={themeManifestAt(finishedWorld.themeId, finishedWorld.themeVersion)}
              backdrop="none"
              decorative
              onShown={releaseLaunchSplash}
              onUnavailable={releaseLaunchSplash}
            />
          ) : (
            <WorldScene themeId="island" stage={0} backdrop="none" decorative onShown={releaseLaunchSplash} onUnavailable={releaseLaunchSplash} />
          )}
          <AmbientSparkles spots={EMPTY_ISLAND_SPARKLES} testID="home-empty-sparkles" />
        </View>
      }
      title={title}
      testID="home-empty"
      message={message}>
      <View style={styles.emptyActions}>
        {canCreate ? (
          <Link href="/goal-form" asChild>
            <Button label={COMMON_COPY.createGoal} testID="home-new-goal" />
          </Link>
        ) : (
          // Free's one goal is finished: the goal form opens the "Build another world" paywall entry
          // (Phase 16) instead of a form that would refuse.
          <Link href="/goal-form" asChild>
            <Button label={ANOTHER_WORLD.title} icon="pro" testID="home-another-world" />
          </Link>
        )}
        {completedCount > 0 ? (
          <AppText role="footnote" tone="secondary" style={styles.centered} testID="home-closed-hint">
            {canCreate
              ? HOME_COPY.finishedInCollection(completedCount)
              : HOME_COPY.finishedAtLimit}
          </AppText>
        ) : null}
      </View>
    </EmptyState>
  );
}

// Where the empty Island sparkles, as fractions of its picture (over the meadow and the shore).
const EMPTY_ISLAND_SPARKLES: readonly SparkleSpot[] = [
  { x: 0.3, y: 0.32, delayMs: 0 },
  { x: 0.66, y: 0.26, delayMs: 950 },
  { x: 0.52, y: 0.58, delayMs: 1900 },
];

type GoalNumbersProps = {
  summary: GoalSummary;
  dashboard: HomeDashboard;
  motion: WorldMotion;
  busy: boolean;
  use: GoalUse;
  needsKeptChoice: boolean;
  menu: ReactElement;
};

// Title and status, saved amount and target, progress, Add savings, the milestone card and, when the
// goal has a deadline, the savings plan cards (D84). The saved amount, the percent and the bar show
// the world motion's values (counting up after a deposit); their VoiceOver labels always say the
// committed values.
function GoalNumbers({ summary, dashboard, motion, busy, use, needsKeptChoice, menu }: GoalNumbersProps) {
  const { goal } = summary;
  const { amounts } = dashboard;
  const paused = goal.status === 'paused';
  const progressDetail = amounts.over ? HOME_COPY.overTarget(amounts.over) : HOME_COPY.toGo(amounts.remaining);
  const count = { enabled: motion.countUp, durationMs: WORLD_MOTION.countMs, resetKey: goal.id };
  const savedMinor = useCountUp(motion.balanceMinor, count);
  const shownPercent = progressPercent(motion.balanceMinor, motion.targetMinor);
  const percent = useCountUp(shownPercent, count);
  return (
    <View style={styles.summary} testID="home-goal">
      <View style={styles.titleRow}>
        <AppText role="title" accessibilityRole="header" style={styles.title} testID="home-goal-title">
          {goal.title}
        </AppText>
        {paused ? <StatusBadge label={GOAL_STATUS_LABEL.paused} tone="info" icon="pause" testID="home-paused" /> : null}
        {amounts.funded ? <StatusBadge label={HOME_COPY.targetReached} tone="success" icon="success" testID="home-funded" /> : null}
        {use !== 'usable' ? <StatusBadge label={READ_ONLY_COPY.badge} tone="neutral" icon="lock" testID="home-read-only" /> : null}
        <View style={styles.menu}>{menu}</View>
      </View>
      <View style={styles.amount} accessible accessibilityLabel={HOME_COPY.savedOfTargetLabel(amounts.saved, amounts.target)} testID="home-amount">
        <AmountText formatted={dashboard.format(savedMinor)} size="display" testID="home-saved" />
        <AppText tone="secondary" testID="home-target">{HOME_COPY.savedOfTarget(amounts.target)}</AppText>
      </View>
      <View style={styles.progress}>
        <ProgressBar
          fraction={sceneFeedback(motion.balanceMinor, motion.targetMinor).overall}
          percent={shownPercent}
          durationMs={WORLD_MOTION.countMs}
          resetKey={goal.id}
          testID="home-progress-bar"
        />
        <View
          style={styles.progressText}
          accessible
          accessibilityLabel={`${amounts.percent}%, ${progressDetail}`}
          testID="home-progress">
          <AppText role="label" tone={progressTextTone(percent)} testID="home-percent">{`${percent}%`}</AppText>
          <AppText role="footnote" tone="secondary" testID="home-remaining">
            {progressDetail}
          </AppText>
        </View>
      </View>
      {/* The one primary action, in the flow right under the progress it changes (owner decision
          D81: it no longer floats). A goal that accepts no entries explains why in its place. */}
      {needsKeptChoice ? (
        <KeptGoalChoice />
      ) : use === 'usable' ? (
        <Link href={{ pathname: '/entry-form', params: { goalId: goal.id } }} asChild>
          <Button label={COMMON_COPY.addSavings} icon="add" disabled={busy} testID="home-add-savings" />
        </Link>
      ) : (
        <ReadOnlyNote use={use} goalId={goal.id} />
      )}
      <MilestoneCallout next={dashboard.next} />
      <SavingsPlanCards copy={dashboard.planCopy} />
    </View>
  );
}

// Pro was lost with several goals and the person has not chosen the goal to keep using (D74): every
// goal is read-only until they do. A calm card with the one next step; nothing was changed.
function KeptGoalChoice() {
  return (
    <View style={styles.readOnly} testID="home-keep-choice">
      <AppText role="label">{READ_ONLY_COPY.chooseTitle}</AppText>
      <AppText role="footnote" tone="secondary">
        {READ_ONLY_COPY.chooseMessage}
      </AppText>
      <Link href="/keep-goal" asChild>
        <Button label={READ_ONLY_COPY.chooseButton} testID="home-choose-goal" />
      </Link>
      <Link href="/paywall" asChild>
        <Button label={READ_ONLY_COPY.explorePro} variant="plain" centered testID="home-explore-pro" />
      </Link>
    </View>
  );
}

// One sentence for a goal that accepts no entries now (D74, D75), and the way back to Pro. A Garden
// goal without Pro (Phase 17, D75) also offers the world picker, where the person may grow it as an
// Island themselves; nothing switches it for them.
function ReadOnlyNote({ use, goalId }: { use: GoalUse; goalId: string }) {
  const locked = use === 'theme_locked';
  return (
    <View style={styles.readOnly} testID="home-read-only-note">
      <AppText role="footnote" tone="secondary">
        {locked ? READ_ONLY_COPY.gardenSentence : READ_ONLY_COPY.sentence}
      </AppText>
      {locked ? (
        <Link href={{ pathname: '/theme-picker', params: { goalId } }} asChild>
          <Button label={THEME_PICKER_COPY.chooseButton} testID="home-choose-world" />
        </Link>
      ) : null}
      <Link href="/paywall" asChild>
        <Button label={READ_ONLY_COPY.explorePro} variant="plain" centered testID="home-explore-pro" />
      </Link>
    </View>
  );
}

// The next of the ten unlocks and the amount still needed for it, on the warm accent surface. The
// name comes from the theme manifest; a theme without art falls back to the percentage. At 100% or
// more the same card says the world is complete, in the theme's words (D83).
function MilestoneCallout({ next }: { next: NextMilestone }) {
  const title = next.kind === 'complete' ? next.title : next.name ? HOME_COPY.nextNamed(next.name) : HOME_COPY.nextPercent(next.percent);
  const detail = next.kind === 'complete' ? next.detail : HOME_COPY.toNext(next.toNext, next.percent);
  return (
    <View style={styles.milestone} accessible accessibilityLabel={`${/[.!?]$/.test(title) ? title : `${title}.`} ${detail}`} testID="home-next-milestone">
      <Icon name="milestone" role="headline" tone="accent" filled />
      <View style={styles.title}>
        <AppText role="label">{title}</AppText>
        <AppText role="footnote" tone="secondary" testID="home-next-detail">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

// Pro only in practice: Free never has more than one open goal, except after a lost entitlement,
// when the goals not kept in use say Read-only. A custom selection control, so a changed selection
// plays the selection haptic once (DESIGN_SYSTEM "Haptics").
function GoalSwitcher({ open, selectedId, access }: { open: GoalSummary[]; selectedId: string; access: AccessView }) {
  const choose = async (goalId: string) => {
    const result = await selectGoal(goalCommandDeps(), goalId);
    if (result.ok) {
      haptics.selection();
    }
    await refreshAppData();
  };
  return (
    <View style={styles.switcher} testID="home-switcher">
      <SectionHeader title={HOME_COPY.openGoals} />
      <ListGroup>
        {open.map(({ goal }) =>
          goal.id === selectedId ? (
            <ListRow key={goal.id} title={goal.title} value={HOME_COPY.shown} accessibilityLabel={HOME_COPY.shownLabel(goal.title)} />
          ) : (
            <ListRow
              key={goal.id}
              title={goal.title}
              detail={access.use(goal) === 'usable' ? undefined : READ_ONLY_COPY.badge}
              chevron
              onPress={() => void choose(goal.id)}
              accessibilityLabel={access.use(goal) === 'usable' ? HOME_COPY.showLabel(goal.title) : HOME_COPY.showReadOnlyLabel(goal.title, READ_ONLY_COPY.badge)}
            />
          ),
        )}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: spacing.md,
  },
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
  // The ⋯ menu sits at the trailing end of the title row.
  menu: {
    marginStart: 'auto',
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
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accentSurface,
  },
  switcher: {
    gap: spacing.sm,
  },
  readOnly: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
  },
  // The empty island floats on the screen background; wide enough to read as a world, small enough
  // that the title, message and button stay in view on the SE.
  emptyWorld: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: worldArtAspect('island'),
  },
  emptyActions: {
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
});
