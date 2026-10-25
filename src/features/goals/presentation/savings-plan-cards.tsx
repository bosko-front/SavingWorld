import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useFontScale } from '@/shared/layout';
import { PACE_EXPLANATION_TITLE, type SavingsNeededCopy, type SavingsPlanCopy } from '@/shared/i18n/deadline-messages';
import { borders, colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Icon, type IconName } from '@/shared/ui/icon';
import { SectionHeader } from '@/shared/ui/section-header';

// Home's savings plan (owner decision D84): two small KPI cards side by side under the milestone,
// shown only when the goal has a deadline (it is set in Edit goal). Deadline: the date and the time
// left. Savings needed: the remaining amount with at most one honest per-period amount, or the
// completed state. Every value comes from the view model (`savingsPlan` + `savingsPlanCopy`); this
// component only lays them out.

// Above this text scale the cards stack, so a large amount never squeezes into half the width.
const STACK_TEXT_SCALE = 1.35;

export function SavingsPlanCards({ copy }: { copy: SavingsPlanCopy }) {
  const stacked = useFontScale() > STACK_TEXT_SCALE;
  if (copy.kind === 'none') {
    return null;
  }
  const explanation = copy.explanation;
  return (
    <View style={styles.section} testID="home-plan">
      <SectionHeader title="Savings plan" />
      <View style={[styles.cards, stacked && styles.stacked]}>
        <View style={styles.card} accessible accessibilityLabel={copy.deadlineLabel} testID="home-plan-deadline">
          <CardLabel icon="calendar" label="Deadline" />
          <AppText role="headline" testID="home-plan-date">
            {copy.date}
          </AppText>
          <AppText role="footnote" tone={copy.passed ? 'primary' : 'secondary'} testID="home-plan-time-left">
            {copy.timeLeft}
          </AppText>
        </View>
        <View style={styles.card} testID="home-plan-needed">
          <View style={styles.labelRow}>
            <CardLabel icon="milestone" label="Savings needed" />
            {explanation ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PACE_EXPLANATION_TITLE}
                onPress={() => Alert.alert(PACE_EXPLANATION_TITLE, explanation)}
                hitSlop={spacing.md}
                testID="home-plan-info">
                <Icon name="info" role="footnote" tone="action" />
              </Pressable>
            ) : null}
          </View>
          <NeededValue needed={copy.needed} />
        </View>
      </View>
    </View>
  );
}

function CardLabel({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.label}>
      <Icon name={icon} role="footnote" tone="secondary" />
      <AppText role="footnote" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

function NeededValue({ needed }: { needed: SavingsNeededCopy }) {
  if (needed.kind === 'complete') {
    return (
      <View style={styles.value} accessible accessibilityLabel="Savings needed: none, target reached" testID="home-plan-complete">
        <View style={styles.label}>
          <Icon name="success" role="headline" tone="success" />
          <AppText role="headline" tone="success">
            Target reached
          </AppText>
        </View>
        <AppText role="footnote" tone="secondary">
          Nothing more to save
        </AppText>
      </View>
    );
  }
  const spoken = [`Savings needed ${needed.amount}`, needed.pace, needed.note].filter(Boolean).join('. ');
  return (
    <View style={styles.value} accessible accessibilityLabel={spoken} testID="home-plan-saving">
      <AppText role="headline" testID="home-plan-amount">
        {needed.amount}
      </AppText>
      {needed.pace ? (
        <AppText role="footnote" tone="secondary" testID="home-plan-pace">
          {needed.pace}
        </AppText>
      ) : null}
      {needed.note ? (
        <AppText role="footnote" tone="secondary" testID="home-plan-note">
          {needed.note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  // Same surface as the app's grouped cards, kept small: one label line and two value lines.
  card: {
    // Equal halves that may shrink below their text's natural width, so long lines wrap instead
    // of pushing the second card off a small screen.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing.xs / 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: borders.hairline,
    borderColor: colors.borderSubtle,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  value: {
    gap: spacing.xs / 2,
  },
});
