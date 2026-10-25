import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { appClock, useAppDataStore } from '@/bootstrap/app-data';
import { MILESTONE_COUNT, stageFor } from '@/core/progression';
import { themeManifest, themeManifestAt } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { Screen, useMeasuredSize } from '@/shared/layout';
import { borders, colors, elevation, radii, spacing } from '@/shared/theme';
import { AmbientFloat } from '@/shared/ui/ambient-float';
import { AppText } from '@/shared/ui/app-text';
import { EmptyState } from '@/shared/ui/empty-state';
import { SectionHeader } from '@/shared/ui/section-header';
import { StatusBadge } from '@/shared/ui/status-badge';

import { CARD_FLOAT, cardCaption, cardFloatDelay, collectionEntries, statusLabel, type CollectionEntry } from './collection-model';

// Collection tab (v1.2 section 6, owner decision D74; Phase 11): a gallery of achievements (owner
// polish after D100), not a list of records: the finished world of every goal that reached its
// target, as it was then, and every completed goal. Completed worlds come first, then worlds whose
// goals are still open. Each card opens the souvenir and the
// goal now (Reopen and Delete on a completed goal). There is no archived list. The worlds here are
// pictures with no ambient scene motion (D90); since D100 each card's world floats slowly as a whole,
// out of step with the others. Completed cards have a thin gold frame and the empty state is an
// undiscovered gallery (D98). The native large title names the
// tab, so the content does not repeat it.
export function CollectionScreen() {
  const state = useAppDataStore((store) => store.state);
  if (state.status !== 'ready') {
    return null;
  }
  const entries = collectionEntries(state.data.goals.goals, state.data.goals.souvenirs);
  if (entries.length === 0) {
    return (
      <Screen centered testID="collection">
        {/* An undiscovered gallery (D98, V01): the empty Island, softly faded, as the first frame
            still waiting for its world. */}
        <EmptyState
          icon="souvenir"
          iconColor="honey"
          illustration={
            <View style={[styles.emptyWorld, { aspectRatio: worldArtAspect('island') }]} testID="collection-empty-world">
              <WorldScene themeId="island" stage={0} backdrop="none" decorative />
            </View>
          }
          title="Your gallery of worlds"
          message="Each goal that reaches its target leaves its finished world here as a souvenir. It stays, even if you save less later."
          testID="collection-empty"
        />
      </Screen>
    );
  }
  const completed = entries.filter(({ summary }) => summary.goal.status === 'completed');
  const open = entries.filter(({ summary }) => summary.goal.status !== 'completed');
  return (
    <Screen testID="collection">
      <AppText tone="secondary" testID="collection-intro">
        Every world tells a story of something you achieved.
      </AppText>
      {completed.length > 0 ? (
        <CollectionSection title="Completed worlds" entries={completed} firstIndex={0} testID="collection-completed" />
      ) : null}
      {open.length > 0 ? (
        <CollectionSection
          title="Still growing"
          caption="These worlds reached their target and their goals are still open. Finish one on Home when you’re done saving."
          entries={open}
          firstIndex={completed.length}
          testID="collection-open"
        />
      ) : null}
    </Screen>
  );
}

type SectionProps = { title: string; caption?: string; entries: CollectionEntry[]; firstIndex: number; testID: string };

// Gallery layout (owner polish after D100): one world is a large featured card; several form two
// columns when the measured width allows, otherwise one (largest text, narrow split view). The
// columns come from the section's own measured width, never from the window or a device.
const TWO_COLUMNS_MIN_WIDTH = 340;

function CollectionSection({ title, caption, entries, firstIndex, testID }: SectionProps) {
  const [size, onLayout] = useMeasuredSize();
  const featured = entries.length === 1;
  const columns = !featured && size.width >= TWO_COLUMNS_MIN_WIDTH ? 2 : 1;
  const cardWidth = size.width > 0 ? (size.width - spacing.md * (columns - 1)) / columns : undefined;
  return (
    <View style={styles.section} testID={testID}>
      <SectionHeader title={title} caption={caption} />
      <View style={styles.grid} onLayout={onLayout} testID={`${testID}-grid`}>
        {entries.map((entry, index) => (
          <SouvenirCard
            key={entry.summary.goal.id}
            entry={entry}
            variant={featured ? 'featured' : 'compact'}
            width={cardWidth}
            floatDelayMs={cardFloatDelay(firstIndex + index)}
          />
        ))}
      </View>
    </View>
  );
}

type SouvenirCardProps = { entry: CollectionEntry; variant: 'featured' | 'compact'; width: number | undefined; floatDelayMs: number };

// One finished world: the souvenir as it was earned (its theme and art version, all ten milestones)
// is the card; a featured card's status sits on the picture, and under it the goal's name and
// "Island · {date}".
// Long names wrap (compact cards show three lines; VoiceOver hears the whole name). A completed goal
// without a souvenir shows its current world. Each card's world floats slowly (D100, CARD_FLOAT):
// only while Collection is focused and the app is active, still under Reduce Motion.
function SouvenirCard({ entry, variant, width, floatDelayMs }: SouvenirCardProps) {
  const { summary, souvenir } = entry;
  const { goal } = summary;
  const status = statusLabel(goal.status);
  const themeId = souvenir?.themeId ?? goal.themeId;
  const manifest = souvenir ? themeManifestAt(souvenir.themeId, souvenir.themeVersion) : themeManifest(goal.themeId);
  const stage = souvenir ? MILESTONE_COUNT : stageFor(summary.balanceMinor, goal.targetMinor);
  const caption = cardCaption(entry, appClock().timeZone());
  const compact = variant === 'compact';
  const completedGoal = goal.status === 'completed';
  return (
    <Link href={{ pathname: '/souvenir', params: { goalId: goal.id } }} asChild>
      <CardButton
        label={`${goal.title}, ${status.label}. ${caption}.`}
        completed={completedGoal}
        compact={compact}
        width={width}
        testID={`collection-card-${goal.id}`}>
        <View>
          <AmbientFloat
            amplitude={CARD_FLOAT.amplitude}
            periodMs={CARD_FLOAT.periodMs}
            delayMs={floatDelayMs}
            style={[styles.world, { aspectRatio: worldArtAspect(themeId, manifest) }]}
            testID={`collection-card-world-${goal.id}`}>
            <WorldScene themeId={themeId} stage={stage} manifest={manifest} decorative />
          </AmbientFloat>
          {compact ? null : (
            <View style={styles.badge} pointerEvents="none">
              <StatusBadge label={status.label} tone={status.tone} icon={status.icon} />
            </View>
          )}
        </View>
        <View style={styles.text}>
          <AppText role="headline" numberOfLines={compact ? 3 : undefined} testID={`collection-card-title-${goal.id}`}>
            {goal.title}
          </AppText>
          <AppText role="footnote" tone="secondary">
            {caption}
          </AppText>
          {/* A small card leaves the picture clear: under "Completed worlds" the section and the gold
              frame already say it (VoiceOver hears it in the card's label); an open goal's status
              sits under its caption. */}
          {compact && !completedGoal ? <StatusBadge label={status.label} tone={status.tone} icon={status.icon} /> : null}
        </View>
      </CardButton>
    </Link>
  );
}

type CardButtonProps = {
  label: string;
  completed: boolean;
  compact: boolean;
  width: number | undefined;
  testID: string;
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
};

// Its own component, like History's rows: `Link asChild` passes `onPress` to it, while the
// pressed-state style function stays on the Pressable (Link drops a function-valued style).
function CardButton({ label, completed, compact, width, testID, children, onPress }: CardButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Shows the souvenir and the goal now."
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        width !== undefined ? { width } : styles.fullWidth,
        completed && styles.completedCard,
        pressed && styles.pressed,
      ]}
      testID={testID}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
    ...elevation.card,
  },
  compactCard: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  // A thin gold frame for a finished goal (D98, V02), kept subtle at the control width; decorative,
  // the Completed badge carries the meaning.
  completedCard: {
    borderWidth: borders.control,
    borderColor: colors.accentDecorative,
  },
  // The status rests on the picture's top leading corner, like a label in a gallery.
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceSoft,
  },
  // Faded and smaller than a real souvenir: a frame still waiting for its world.
  emptyWorld: {
    width: '100%',
    maxWidth: 300,
    opacity: 0.55,
  },
  world: {
    width: '100%',
  },
  text: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
});
