import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appClock, useAccessView, useAppDataStore } from '@/bootstrap/app-data';
import { canReopenGoal } from '@/core/access';
import { MILESTONE_COUNT } from '@/core/progression';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import { DELETE_COPY, LIFECYCLE_COPY } from '@/features/goals/presentation/goal-copy';
import { useDeleteGoal } from '@/features/goals/presentation/use-delete-goal';
import { useGoalAction } from '@/features/goals/presentation/use-goal-action';
import { themeManifestAt } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { SCREEN_TITLES } from '@/shared/i18n/navigation-copy';
import { AdaptiveGoalLayout, Screen } from '@/shared/layout';
import { colors, spacing } from '@/shared/theme';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { StatusBadge } from '@/shared/ui/status-badge';

import { reopenHint, savedSentence, SOUVENIR_COPY } from './collection-copy';
import { collectionEntries, souvenirDetail } from './collection-model';

// One goal in Collection (Phase 11; summary simplified by the owner, D112): the finished world as it
// was when the goal first reached its target (the stored theme and art version, all ten milestones)
// is the focus. Below it a short summary: "{World} completed", one friendly line, the amount saved
// now, the day it was earned, the target stored with the souvenir and the target now only when it
// differs; a small status badge only while the goal is still open. The souvenir never changes with
// the goal. A completed goal is read-only; Reopen (within the goal limit, never finishing again by
// itself) and Delete (after the D74 confirmation, removing goal, history and souvenir) are its two
// actions. The world here stands still (no ambient motion, D90). The tab bar is hidden here (D112).
//
// Layout (owner review after D98): like Home, the souvenir's sky fills the top of the screen edge to
// edge behind a transparent bar that keeps the goal's name as its title and a back chevron without a
// label; the finished world sits in that sky and the details follow on the cream below (D80 on
// `AdaptiveGoalLayout`). A completed goal without a souvenir (never produced by schema 3) keeps a
// plain screen.
export function SouvenirScreen({ goalId }: { goalId: string }) {
  const router = useRouter();
  const state = useAppDataStore((store) => store.state);
  const action = useGoalAction();
  // The goal and its souvenir are gone after a deletion: leave the screen before it re-reads.
  const { deleting, confirmDelete } = useDeleteGoal(() => router.back());
  const access = useAccessView();

  if (state.status !== 'ready' || state.data.currency.currency.status !== 'set') {
    return null;
  }
  const entry = collectionEntries(state.data.goals.goals, state.data.goals.souvenirs).find(
    ({ summary }) => summary.goal.id === goalId,
  );
  if (!entry) {
    return (
      <Screen testID="souvenir">
        <Stack.Screen options={{ title: SCREEN_TITLES.souvenir }} />
        <Notice tone="info" title={SOUVENIR_COPY.notFoundTitle} message={SOUVENIR_COPY.notFoundMessage} />
      </Screen>
    );
  }
  const { goal } = entry.summary;
  const detail = souvenirDetail(entry, state.data.currency.currency.currency, appClock().timeZone());
  const completed = goal.status === 'completed';
  const busy = action.pending !== null || deleting !== null;
  const reopenable = access ? canReopenGoal(access.capabilities, state.data.goals.goals.length, access.keptGoalId, goal.id) : true;

  const details = (
    <View style={styles.details}>
      {/* A short, cozy summary (owner polish D112): what was completed, the amount saved now, and a
          few facts. The status shows only while the goal is still open, so it is said once. */}
      <View
        style={styles.hero}
        accessible
        // Each part is one sentence; the friendly line already ends with its own period.
        accessibilityLabel={[detail.openStatus?.label, detail.headline, detail.keepLine, savedSentence(detail.saved)]
          .filter((part): part is string => Boolean(part))
          .map((part) => part.replace(/\.$/, ''))
          .join('. ')}
        testID="souvenir-hero">
        {detail.openStatus ? (
          <StatusBadge label={detail.openStatus.label} tone={detail.openStatus.tone} icon={detail.openStatus.icon} testID="souvenir-status" />
        ) : null}
        <View style={styles.headline}>
          <Icon name="souvenir" role="title" tone="accent" filled />
          <AppText role="title" style={styles.headlineText} testID="souvenir-headline">
            {detail.headline}
          </AppText>
        </View>
        {detail.keepLine ? (
          <AppText tone="secondary" testID="souvenir-keep">
            {detail.keepLine}
          </AppText>
        ) : null}
        <View style={styles.amount}>
          <AmountText formatted={detail.saved} size="display" testID="souvenir-saved" />
          <AppText tone="secondary">{SOUVENIR_COPY.saved}</AppText>
        </View>
      </View>

      <ListGroup testID="souvenir-facts">
        {detail.earnedOn ? <ListRow icon="souvenir" iconColor="honey" title={SOUVENIR_COPY.earned} value={detail.earnedOn} testID="souvenir-earned" /> : null}
        {detail.targetThen ? (
          <ListRow icon="finish" title={SOUVENIR_COPY.targetThen} value={detail.targetThen} testID="souvenir-target-then" />
        ) : null}
        {detail.targetNow ? (
          <ListRow
            icon="milestone"
            iconColor="neutral"
            title={detail.targetThen ? SOUVENIR_COPY.targetNow : SOUVENIR_COPY.target}
            value={detail.targetNow}
            testID="souvenir-target-now"
          />
        ) : null}
      </ListGroup>

      {completed ? (
        <ListGroup testID="souvenir-actions">
          <ListRow
            title={LIFECYCLE_COPY.reopen.label}
            icon="reopen"
            // After a lost Pro entitlement only the goal kept in use can reopen (Phase 16, D74).
            detail={reopenable ? SOUVENIR_COPY.reopenDetail : SOUVENIR_COPY.readOnlyDetail}
            onPress={() => void action.run('reopen', goal)}
            loading={action.pending?.goalId === goal.id}
            disabled={busy || !reopenable}
            accessibilityHint={reopenHint(goal.title)}
            testID={`reopen-${goal.id}`}
          />
          <ListRow
            title={`${DELETE_COPY.label}…`}
            icon="delete"
            tone="destructive"
            onPress={() => confirmDelete(goal)}
            loading={deleting === goal.id}
            disabled={busy}
            accessibilityHint={SOUVENIR_COPY.deleteHint}
            testID={`delete-${goal.id}`}
          />
        </ListGroup>
      ) : null}
    </View>
  );

  const title = <Stack.Screen options={{ title: goal.title }} />;
  if (!entry.souvenir) {
    return (
      <Screen testID="souvenir">
        {title}
        {details}
      </Screen>
    );
  }
  const manifest = themeManifestAt(entry.souvenir.themeId, entry.souvenir.themeVersion);
  return (
    <>
      {title}
      <AdaptiveGoalLayout
        testID="souvenir"
        sceneAspectRatio={worldArtAspect(entry.souvenir.themeId, manifest)}
        sceneBleed
        sceneBleedColor={colors.sceneSkyTop}
        keyboard="none"
        scene={<SouvenirWorld souvenir={entry.souvenir} />}
        controls={details}
      />
    </>
  );
}

// Where the one-shot sparkle burst glows over a finished world, as fractions of the sky region (D98,
// V02): over the sky around the island, below the navigation bar, where the honey glint reads
// against the soft blue.
const FINISHED_SPARKLES: readonly SparkleSpot[] = [
  { x: 0.1, y: 0.32, delayMs: 0 },
  { x: 0.84, y: 0.3, delayMs: 250 },
  { x: 0.9, y: 0.72, delayMs: 500 },
  { x: 0.06, y: 0.7, delayMs: 750 },
];

// The finished world as it was earned: the stored theme and art version at all ten milestones. A short
// sparkle burst greets it each time the screen is shown (once per showing, never looping; nothing
// under Reduce Motion or in the background).
function SouvenirWorld({ souvenir }: { souvenir: CollectibleRecord }) {
  // The burst waits until the world is drawn: its images load first, and a burst over an empty sky
  // would be over before the island appears.
  const [shown, setShown] = useState(false);
  const manifest = themeManifestAt(souvenir.themeId, souvenir.themeVersion);
  return (
    <View style={styles.world} testID="souvenir-world">
      <WorldScene themeId={souvenir.themeId} stage={MILESTONE_COUNT} manifest={manifest} fill onShown={() => setShown(true)}>
        {shown ? <AmbientSparkles spots={FINISHED_SPARKLES} once large testID="souvenir-sparkles" /> : null}
      </WorldScene>
    </View>
  );
}

const styles = StyleSheet.create({
  details: {
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  amount: {
    gap: spacing.xs / 2,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headlineText: {
    flexShrink: 1,
  },
  // Fills the scene region the layout gives it; the sky reaches to the top of the screen.
  world: {
    flex: 1,
  },
});
