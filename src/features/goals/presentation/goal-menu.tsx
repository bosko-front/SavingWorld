import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';
import { disabled, imageScale, labelStyle, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import type { GoalUse } from '@/core/access';
import type { GoalSummary } from '@/data/repositories/goal-repository';
import { colors, spacing } from '@/shared/theme';
import { ICON_SYMBOLS } from '@/shared/ui/icon';

import { DELETE_COPY, LIFECYCLE_COPY } from './goal-copy';
import type { useGoalAction } from './use-goal-action';

type GoalMenuProps = {
  summary: GoalSummary;
  // B ≥ T: Finish is offered (Phase 11).
  funded: boolean;
  // What this goal accepts now (Phase 16): a read-only goal after a lost Pro entitlement offers no
  // Edit, Pause, Resume or Finish; a Garden goal without Pro offers no Edit.
  use: GoalUse;
  // A lifecycle change or the deletion of this goal is running.
  busy: boolean;
  run: ReturnType<typeof useGoalAction>['run'];
  // Opens the native delete confirmation (useDeleteGoal).
  onDelete: () => void;
};

// Home's goal options (owner directions D73-D74): History, Edit goal, Change world (Phase 17: the world
// picker, also for a Garden goal without Pro, which may be grown as an Island), Pause/Resume, Finish goal (only
// at B ≥ T, Phase 11), Delete goal and New goal live in one native pull-down menu (SwiftUI Menu from
// @expo/ui) behind the ⋯ button next to the goal title, so Home shows the world and the progress
// instead of administration. Finish closes the goal (completed, read-only, in Collection); Delete is
// destructive and confirmed natively; New goal opens the goal form, which shows the "Build another
// world" paywall entry when Free's one goal exists (Phase 16). History and Delete stay available for
// every goal.
export function GoalMenu({ summary, funded, use, busy, run, onDelete }: GoalMenuProps) {
  const router = useRouter();
  const { goal } = summary;
  const paused = goal.status === 'paused';
  const lifecycle = paused ? 'resume' : 'pause';
  const entries = summary.entryCount === 1 ? '1 entry' : `${summary.entryCount} entries`;

  const editable = use === 'usable';
  const statusChanges = use !== 'read_only';

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
        {editable ? (
          <Button
            label="Edit goal"
            systemImage={ICON_SYMBOLS.edit}
            onPress={() => router.push({ pathname: '/goal-form', params: { goalId: goal.id } })}
          />
        ) : null}
        {statusChanges ? (
          <Button
            label="Change world"
            systemImage={ICON_SYMBOLS.switchWorld}
            onPress={() => router.push({ pathname: '/theme-picker', params: { goalId: goal.id } })}
          />
        ) : null}
        {statusChanges ? (
          <Button label={LIFECYCLE_COPY[lifecycle].label} systemImage={ICON_SYMBOLS[lifecycle]} onPress={() => void run(lifecycle, goal)} />
        ) : null}
        {funded && statusChanges ? (
          <Button label={LIFECYCLE_COPY.finish.label} systemImage={ICON_SYMBOLS.finish} onPress={() => void run('finish', goal)} />
        ) : null}
        <Divider />
        <Button label="New goal" systemImage={ICON_SYMBOLS.add} onPress={() => router.push('/goal-form')} />
        <Divider />
        <Button label={`${DELETE_COPY.label}…`} systemImage={ICON_SYMBOLS.delete} role="destructive" onPress={onDelete} />
      </Menu>
    </Host>
  );
}
