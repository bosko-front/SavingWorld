import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';
import { disabled, imageScale, labelStyle, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import type { GoalSummary } from '@/data/repositories/goal-repository';
import { colors, spacing } from '@/shared/theme';
import { ICON_SYMBOLS } from '@/shared/ui/icon';

import { ANOTHER_WORLD, DELETE_COPY, LIFECYCLE_COPY } from './goal-copy';
import type { useGoalAction } from './use-goal-action';

type GoalMenuProps = {
  summary: GoalSummary;
  canCreate: boolean;
  // A lifecycle change or the deletion of this goal is running.
  busy: boolean;
  run: ReturnType<typeof useGoalAction>['run'];
  // Opens the native delete confirmation (useDeleteGoal).
  onDelete: () => void;
};

// Home's goal options (owner directions D73-D74): History, Edit goal, Pause/Resume, Delete goal and
// New goal live in one native pull-down menu (SwiftUI Menu from @expo/ui) behind the ⋯ button next
// to the goal title, so Home shows the world and the progress instead of administration. Delete is
// destructive and confirmed natively; New goal is a separate action and, when Free's one goal
// exists, explains Pro and deleting instead of opening a form that would be refused.
export function GoalMenu({ summary, canCreate, busy, run, onDelete }: GoalMenuProps) {
  const router = useRouter();
  const { goal } = summary;
  const paused = goal.status === 'paused';
  const lifecycle = paused ? 'resume' : 'pause';
  const entries = summary.entryCount === 1 ? '1 entry' : `${summary.entryCount} entries`;

  const newGoal = () => {
    if (canCreate) {
      router.push('/goal-form');
    } else {
      Alert.alert(ANOTHER_WORLD.title, ANOTHER_WORLD.message);
    }
  };

  return (
    // The padding modifier gives the SwiftUI menu button a 44 pt touch area around its glyph.
    <Host matchContents colorScheme="light" testID="home-goal-menu">
      <Menu
        label="Goal options"
        systemImage={ICON_SYMBOLS.more}
        modifiers={[labelStyle('iconOnly'), imageScale('large'), padding({ all: spacing.sm }), tint(colors.actionPrimary), disabled(busy)]}>
        <Button
          label={summary.entryCount === 0 ? 'History' : `History (${entries})`}
          systemImage={ICON_SYMBOLS.history}
          onPress={() => router.push({ pathname: '/history', params: { goalId: goal.id } })}
        />
        <Button
          label="Edit goal"
          systemImage={ICON_SYMBOLS.edit}
          onPress={() => router.push({ pathname: '/goal-form', params: { goalId: goal.id } })}
        />
        <Button label={LIFECYCLE_COPY[lifecycle].label} systemImage={ICON_SYMBOLS[lifecycle]} onPress={() => void run(lifecycle, goal)} />
        <Divider />
        <Button label="New goal" systemImage={ICON_SYMBOLS.add} onPress={newGoal} />
        <Divider />
        <Button label={`${DELETE_COPY.label}…`} systemImage={ICON_SYMBOLS.delete} role="destructive" onPress={onDelete} />
      </Menu>
    </Host>
  );
}
