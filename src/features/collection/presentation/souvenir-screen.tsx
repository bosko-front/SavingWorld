import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appClock, useAppDataStore } from '@/bootstrap/app-data';
import { MILESTONE_COUNT } from '@/core/progression';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import { DELETE_COPY, LIFECYCLE_COPY } from '@/features/goals/presentation/goal-copy';
import { useDeleteGoal } from '@/features/goals/presentation/use-delete-goal';
import { useGoalAction } from '@/features/goals/presentation/use-goal-action';
import { themeManifestAt } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { AdaptiveGoalLayout, Screen } from '@/shared/layout';
import { colors, spacing } from '@/shared/theme';
import { AmbientSparkles, type SparkleSpot } from '@/shared/ui/ambient-float';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { StatusBadge } from '@/shared/ui/status-badge';

import { collectionEntries, souvenirDetail } from './collection-model';

// One goal in Collection (Phase 11, simplified in the owner polish after D100): the finished world
// as it was when the goal first reached its target (the stored theme and art version, all ten
// milestones) is the focus; below it the achievement (status, saved amount, world and the day it was
// completed) and, only when the goal changed since (a lower live stage on Home or another target),
// one plain sentence. The souvenir always stays complete. A completed goal is read-only; Reopen (within the goal limit, never finishing again by
// itself) and Delete (after the D74 confirmation, removing goal, history and souvenir) are its two
// actions. The world here stands still (no ambient motion, D90).
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

  if (state.status !== 'ready' || state.data.currency.currency.status !== 'set') {
    return null;
  }
  const entry = collectionEntries(state.data.goals.goals, state.data.goals.souvenirs).find(
    ({ summary }) => summary.goal.id === goalId,
  );
  if (!entry) {
    return (
      <Screen testID="souvenir">
        <Stack.Screen options={{ title: 'Souvenir' }} />
        <Notice tone="info" title="Not in Collection" message="This goal was deleted or hasn’t reached its target yet." />
      </Screen>
    );
  }
  const { goal } = entry.summary;
  const detail = souvenirDetail(entry, state.data.currency.currency.currency, appClock().timeZone());
  const completed = goal.status === 'completed';
  const busy = action.pending !== null || deleting !== null;

  const details = (
    <View style={styles.details}>
      {/* The achievement, in Home's language: the status, the saved amount as the largest text and
          the world with the day it was completed (owner polish after D100). */}
      <View
        style={styles.hero}
        accessible
        accessibilityLabel={[
          detail.status.label,
          `Saved ${detail.saved}`,
          detail.completedOn ? `${detail.worldType} completed on ${detail.completedOn}` : detail.worldType,
        ].join('. ')}
        testID="souvenir-hero">
        <StatusBadge label={detail.status.label} tone={detail.status.tone} icon={detail.status.icon} testID="souvenir-status" />
        <View style={styles.amount}>
          <AmountText formatted={detail.saved} size="display" testID="souvenir-saved" />
          <AppText tone="secondary">saved</AppText>
        </View>
        <View style={styles.completed}>
          <Icon name="souvenir" role="headline" tone="accent" filled />
          <AppText role="label" tone="accent" style={styles.completedText} testID="souvenir-completed-on">
            {detail.completedOn ? `${detail.worldType} completed on ${detail.completedOn}` : `${detail.worldType}, as it is now`}
          </AppText>
        </View>
      </View>

      {detail.sinceThen ? (
        <AppText role="footnote" tone="secondary" testID="souvenir-since-then">
          {detail.sinceThen}
        </AppText>
      ) : null}

      {completed ? (
        <ListGroup testID="souvenir-actions">
          <ListRow
            title={LIFECYCLE_COPY.reopen.label}
            icon="reopen"
            detail="Edit it or record savings again."
            onPress={() => void action.run('reopen', goal)}
            loading={action.pending?.goalId === goal.id}
            disabled={busy}
            accessibilityHint={`Makes ${goal.title} an open goal again.`}
            testID={`reopen-${goal.id}`}
          />
          <ListRow
            title={`${DELETE_COPY.label}…`}
            icon="delete"
            tone="destructive"
            onPress={() => confirmDelete(goal)}
            loading={deleting === goal.id}
            disabled={busy}
            accessibilityHint="Asks before deleting the goal, its history and this souvenir."
            testID={`delete-${goal.id}`}
          />
        </ListGroup>
      ) : (
        <AppText role="footnote" tone="secondary" testID="souvenir-open-hint">
          This goal is still open on Home. Finish it there when you’re done saving.
        </AppText>
      )}
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
  completed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completedText: {
    flexShrink: 1,
  },
  // Fills the scene region the layout gives it; the sky reaches to the top of the screen.
  world: {
    flex: 1,
  },
});
