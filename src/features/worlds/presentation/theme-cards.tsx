import { Pressable, StyleSheet, View } from 'react-native';

import { MILESTONE_COUNT, THEME_IDS, type Stage, type ThemeId } from '@/core/progression';
import { useFontScale } from '@/shared/layout';
import { borders, colors, elevation, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon } from '@/shared/ui/icon';
import { StatusBadge } from '@/shared/ui/status-badge';

import { WorldScene } from '../world-scene';

import { THEME_CARD_COPY, themeName } from './theme-copy';

// The world picker (Phase 17; DESIGN_SYSTEM "Theme picker", owner decisions D97, D122): Island and
// Garden as two picture cards, each world drawn by the shared renderer. A card the person may choose is
// a radio (the selection haptic is the caller's, on a changed choice). A theme these capabilities do
// not include is still shown, as the same picture with a small neutral lock mark and "Pro": tapping it
// asks the caller to open the Pro paywall, never selects it. Calm promotion only: no animation, badge
// motion or prompt of its own. Presentation only; the commands check every theme again.

export type ThemeCardState = 'selectable' | 'locked';

type ThemeCardsProps = {
  selected: ThemeId;
  // The stage each card shows: the goal's current stage (the same progress in either world), or the
  // completed world before a goal exists. A locked card the person does not use shows the completed
  // world (D122); their own locked Garden shows its current stage.
  stage: Stage;
  state: (themeId: ThemeId) => ThemeCardState;
  onSelect: (themeId: ThemeId) => void;
  onLocked: (themeId: ThemeId) => void;
  // A change is being saved: the cards wait.
  busy?: boolean;
  // Height of each world picture: short in the goal form (Create stays in view on the SE), taller on
  // the picker screen, which has the room.
  pictureHeight?: number;
};

// Above this text scale the cards stack, so names and the Pro mark keep their room.
const STACK_TEXT_SCALE = 1.35;

export function ThemeCards({ selected, stage, state, onSelect, onLocked, busy = false, pictureHeight = 92 }: ThemeCardsProps) {
  const stacked = useFontScale() > STACK_TEXT_SCALE;
  return (
    <View style={[styles.cards, stacked && styles.stacked]} accessibilityRole="radiogroup" testID="theme-cards">
      {THEME_IDS.map((themeId) => {
        const locked = state(themeId) === 'locked';
        const current = themeId === selected;
        return (
          <ThemeCard
            key={themeId}
            themeId={themeId}
            stage={locked && !current ? MILESTONE_COUNT : stage}
            selected={current}
            locked={locked}
            disabled={busy}
            pictureHeight={pictureHeight}
            onPress={() => (locked ? onLocked(themeId) : current ? undefined : onSelect(themeId))}
          />
        );
      })}
    </View>
  );
}

type ThemeCardProps = { themeId: ThemeId; stage: Stage; selected: boolean; locked: boolean; disabled: boolean; pictureHeight: number; onPress: () => void };

function ThemeCard({ themeId, stage, selected, locked, disabled, pictureHeight, onPress }: ThemeCardProps) {
  const name = themeName(themeId);
  const label = locked
    ? `${name}, ${selected ? `${THEME_CARD_COPY.current}, ` : ''}${THEME_CARD_COPY.lockedLabel}`
    : `${name}${selected ? `, ${THEME_CARD_COPY.current}` : ''}`;
  return (
    <Pressable
      // A locked card is a button that opens the paywall; the others are radios.
      accessibilityRole={locked ? 'button' : 'radio'}
      accessibilityState={locked ? { disabled } : { checked: selected, disabled }}
      accessibilityLabel={label}
      accessibilityHint={locked ? THEME_CARD_COPY.lockedHint : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selectedCard, pressed && !selected && styles.pressed]}
      testID={`theme-card-${themeId}`}>
      <View style={[styles.picture, { height: pictureHeight }]}>
        <WorldScene themeId={themeId} stage={stage} fill decorative />
      </View>
      <View style={styles.footer}>
        <AppText role="label" style={styles.name}>
          {name}
        </AppText>
        {locked ? (
          <StatusBadge label={THEME_CARD_COPY.pro} tone="neutral" icon="lock" testID={`theme-card-${themeId}-locked`} />
        ) : selected ? (
          <Icon name="success" role="title" tone="action" filled testID={`theme-card-${themeId}-selected`} />
        ) : (
          <View style={styles.radio} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cards: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stacked: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.emphasis,
    borderColor: colors.borderSubtle,
    ...elevation.card,
  },
  selectedCard: {
    borderColor: colors.actionPrimary,
  },
  pressed: {
    opacity: 0.85,
  },
  // The world on its sky, edge to edge in a rounded frame.
  picture: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
  // The empty radio ring of the world not chosen; decorative (the radio role carries the state).
  radio: {
    width: spacing.lg,
    height: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: borders.emphasis,
    borderColor: colors.borderControl,
  },
});
