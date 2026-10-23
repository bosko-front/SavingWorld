import { Link } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import {
  PACE_EXPLANATION_TITLE,
  type DeadlineCopy,
} from "@/shared/i18n/deadline-messages";
import { layout, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui/app-text";
import { Icon } from "@/shared/ui/icon";
import { IconTile } from "@/shared/ui/icon-tile";
import { ListCell, ListGroup, ListRow } from "@/shared/ui/list-row";
import { StatusBadge } from "@/shared/ui/status-badge";

// Home's deadline card (owner request, DECISIONS D72): the deadline and the two alternative paces
// as short values on one grouped surface instead of loose sentences. How the paces are worked out
// is one tap away (the info button), not printed on Home. Without a deadline the card is a row
// that opens Edit goal to add one.
export function DeadlineCard({
  copy,
  goalId,
}: {
  copy: DeadlineCopy;
  goalId: string;
}) {
  if (copy.kind === "none") {
    return (
      <ListGroup testID="home-deadline">
        <Link href={{ pathname: "/goal-form", params: { goalId } }} asChild>
          <ListRow
            title="Add a deadline"
            detail="See how much to save each week or month."
            icon="calendar"
            iconColor="red"
            chevron
            testID="home-add-deadline"
          />
        </Link>
      </ListGroup>
    );
  }
  return (
    <ListGroup testID="home-deadline">
      <ListCell>
        <View style={styles.body}>
          <View
            style={styles.header}
            accessible
            accessibilityLabel={headerLabel(copy)}
            testID="home-deadline-header"
          >
            <IconTile name="calendar" color="red" />
            <View style={styles.headerText}>
              <AppText role="label">Deadline</AppText>
              <AppText
                role="footnote"
                tone="secondary"
                testID="home-deadline-date"
              >
                {copy.date}
              </AppText>
            </View>
            {copy.kind === "pace" ? (
              <AppText
                role="footnote"
                tone="secondary"
                testID="home-deadline-left"
              >
                {copy.timeLeft}
              </AppText>
            ) : null}
            {copy.kind === "overdue" ? (
              <StatusBadge
                label="Overdue"
                tone="neutral"
                testID="home-overdue"
              />
            ) : null}
            {copy.kind === "funded" ? (
              <StatusBadge
                label="Reached"
                tone="success"
                icon="success"
                testID="home-deadline-reached"
              />
            ) : null}
          </View>
          {copy.kind === "pace" ? (
            <PaceValues
              weekly={copy.weekly}
              monthly={copy.monthly}
              explanation={copy.explanation}
            />
          ) : null}
          {copy.kind === "overdue" ? (
            <View
              style={styles.stat}
              accessible
              accessibilityLabel={`${copy.remaining} still to go. Choose a new date in Edit goal.`}
              testID="home-overdue-remaining"
            >
              <AppText role="headline">{copy.remaining}</AppText>
              <AppText role="footnote" tone="secondary">
                still to go · choose a new date in Edit goal
              </AppText>
            </View>
          ) : null}
          {copy.kind === "funded" ? (
            <AppText
              role="footnote"
              tone="secondary"
              testID="home-deadline-funded"
            >
              Nothing more to save by this date.
            </AppText>
          ) : null}
        </View>
      </ListCell>
    </ListGroup>
  );
}

function headerLabel(copy: Exclude<DeadlineCopy, { kind: "none" }>): string {
  switch (copy.kind) {
    case "pace":
      return `Deadline ${copy.date}, ${copy.timeLeft === "Today" ? "today" : copy.timeLeft}`;
    case "overdue":
      return `Deadline ${copy.date}, overdue`;
    case "funded":
      return `Deadline ${copy.date}, target reached`;
  }
}

function PaceValues({
  weekly,
  monthly,
  explanation,
}: {
  weekly: string;
  monthly: string;
  explanation: string;
}) {
  const explain = () => Alert.alert(PACE_EXPLANATION_TITLE, explanation);
  return (
    <View style={styles.paceRow}>
      <View style={styles.stats}>
        <View
          style={styles.stat}
          accessible
          accessibilityLabel={`${weekly} per week`}
          testID="home-pace-weekly"
        >
          <AppText role="headline">{weekly}</AppText>
          <AppText role="footnote" tone="secondary">
            per week
          </AppText>
        </View>
        <View
          style={styles.stat}
          accessible
          accessibilityLabel={`or ${monthly} per month`}
          testID="home-pace-monthly"
        >
          <AppText role="headline">{monthly}</AppText>
          <AppText role="footnote" tone="secondary">
            per month
          </AppText>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={PACE_EXPLANATION_TITLE}
        onPress={explain}
        hitSlop={spacing.sm}
        style={styles.info}
        testID="home-pace-info"
      >
        <Icon name="info" role="headline" tone="action" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 120,
  },
  paceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  // The two amounts sit side by side and wrap under each other when the text is large.
  stats: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.sm,
    columnGap: spacing.xl,
  },
  stat: {
    gap: spacing.xs / 2,
  },
  info: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
