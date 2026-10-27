import type { CivilDate } from '@/core/calendar';
import { progressPercent, type Stage, type ThemeId } from '@/core/progression';
import type { AttemptResult, ChallengeRuleId } from '@/data/repositories/challenge-attempt-repository';
import type { IconName } from '@/shared/ui/icon';
import type { TileColor } from '@/shared/ui/icon-tile';
import type { BadgeTone } from '@/shared/ui/status-badge';

import type { ChallengeCommandError } from '../application/challenge-commands';
import type { AttemptPreview, AttemptView, UnavailableReason } from '../domain/challenge-rules';

// English copy for the Challenges tab (Phase 13, owner design direction D97 "quests, not a task
// list"; owner polish D105: short, friendly lines on the cards, the full rules behind an info
// button). Every number comes from the Phase 12 board (`readChallengeBoard`): frozen targets,
// counted progress, saved weeks and results. This module only words them; it decides no rule. The
// words encourage and never shame: a quest that ended or was skipped is neutral history, and
// nothing here says money was added.

export type QuestFormatters = {
  amount: (minor: number) => string;
  date: (date: CivilDate) => string;
};

// The person's world: its noun ("island") and the name of an unlock from the theme manifest
// ("Pond"), null for a theme without art.
export type QuestWorld = {
  // The goal's theme: the Next milestone quest shows that theme's picture of what it unlocks (D136).
  themeId: ThemeId;
  noun: string;
  stageName: (stage: Stage) => string | null;
};

export const QUEST_TITLES: Record<ChallengeRuleId, string> = {
  first_step: 'First step',
  next_milestone: 'Next milestone',
  weekly_step: 'Weekly step',
};

// Each quest's identity (D105): its glyph and pastel color, and what it means for the world.
// Green leaf: the journey begins. Honey sparkles: the next part of the world unlocks. Blue calendar:
// this week's progress.
export const QUEST_TILES: Record<ChallengeRuleId, { icon: IconName; color: TileColor }> = {
  first_step: { icon: 'milestone', color: 'green' },
  next_milestone: { icon: 'unlocked', color: 'honey' },
  weekly_step: { icon: 'calendar', color: 'blue' },
};

export const QUEST_TAGLINES: Record<ChallengeRuleId, string> = {
  first_step: 'Begin your journey',
  next_milestone: 'Unlock the next part',
  weekly_step: 'A step this week',
};

// The full rules, shown on request from the info button (D105), so the cards stay short.
export const QUEST_RULES = {
  title: 'How quests work',
  message:
    'Quests count the savings you record. They never add money.\n\n' +
    'You have one quest at a time. Its target, and for a weekly step its Monday-to-Sunday week, are fixed when it starts. Withdrawals while it runs count against it.\n\n' +
    'Skipping is always fine: the quest moves to Past quests and you can choose another right away.',
};

// The unlock's name inside a sentence ("the pond", "the final decorations"); manifest names are
// sentence case and hold no proper nouns.
function unlockInSentence(name: string): string {
  return name.toLocaleLowerCase('en');
}

// "Unlock the pond" (owner, D106: short titles); the last unlock completes the world; a theme
// without art names the percent instead.
export function milestoneGoal(stage: Stage, world: QuestWorld): string {
  if (stage >= 10) {
    return `Complete your ${world.noun}`;
  }
  const name = world.stageName(stage);
  return name ? `Unlock the ${unlockInSentence(name)}` : `Reach ${stage * 10}% of your goal`;
}

export type OfferCopy = {
  title: string;
  // What to do, in the world's terms.
  headline: string;
  // The frozen target or saved week a start would fix, in one short line.
  detail: string;
};

// A quest that can start now: what it asks and what starting would fix.
// The spoken radio of an available quest: "{quest}. {headline}. {detail}." and, for Next milestone,
// the picture's description ("Shows a pond with lily pads.").
export function offerLabel(copy: OfferCopy, picture: string | null): string {
  const label = `${copy.title}. ${copy.headline}. ${copy.detail}`;
  return picture === null ? label : `${label}. ${picture}`;
}

export function offerCopy(preview: AttemptPreview, world: QuestWorld, format: QuestFormatters): OfferCopy {
  const title = QUEST_TITLES[preview.ruleId];
  switch (preview.ruleId) {
    case 'first_step':
      return { title, headline: 'Record your first deposit', detail: 'Any amount counts · no deadline' };
    case 'next_milestone':
      return {
        title,
        headline: milestoneGoal(preview.milestoneStage, world),
        detail: `Save ${format.amount(preview.targetMinor)} more · no deadline`,
      };
    case 'weekly_step':
      return {
        title,
        headline: `Save ${format.amount(preview.targetMinor)} this week`,
        detail: `${format.date(preview.weekStartDate)} – ${format.date(preview.periodEndDate)}`,
      };
  }
}

// Why a quest can't start now: one short, kind line with the next step.
export function unavailableCopy(reason: UnavailableReason, ruleId: ChallengeRuleId, world: QuestWorld): string {
  switch (reason) {
    case 'goal_closed':
      return 'Reopen this goal in Collection first.';
    case 'attempt_active':
      return 'One quest at a time. Finish or skip your current quest first.';
    case 'already_used':
      return 'Each goal has one First step.';
    case 'target_reached':
      return ruleId === 'weekly_step' ? `Your ${world.noun} has reached its target.` : `Every milestone is unlocked.`;
    case 'no_deadline':
      return 'Add a deadline in Edit goal to plan weekly steps.';
    case 'deadline_passed':
      return 'Choose a new deadline in Edit goal to plan weekly steps.';
    case 'used_this_week':
      return 'Done for this week. A new one opens Monday.';
  }
}

export type ProgressCopy =
  | { kind: 'deposit'; status: string }
  | {
      kind: 'amount';
      // Visual position 0..1 and the floored percent.
      fraction: number;
      percent: number;
      // The counted amount and the frozen target, shown large and small.
      saved: string;
      target: string;
      toGo: string;
      label: string;
    };

export type CurrentQuestCopy = {
  title: string;
  headline: string;
  progress: ProgressCopy;
  // When it ends, in a few words.
  period: string;
};

// The one unfinished quest: what it asks, its counted progress and its end.
export function currentQuestCopy(attempt: AttemptView, world: QuestWorld, format: QuestFormatters): CurrentQuestCopy {
  const title = QUEST_TITLES[attempt.ruleId];
  const progress = progressCopy(attempt, format);
  switch (attempt.ruleId) {
    case 'first_step':
      return { title, headline: 'Record your first deposit', progress, period: 'Any amount counts · no deadline' };
    case 'next_milestone':
      return { title, headline: milestoneGoal(attempt.milestoneStage ?? 10, world), progress, period: 'No deadline' };
    case 'weekly_step':
      return {
        title,
        headline: attempt.progress.kind === 'amount' ? `Save ${format.amount(attempt.progress.targetMinor)} this week` : title,
        progress,
        period: `Until Sunday, ${format.date(attempt.periodEndDate ?? attempt.startDate)}`,
      };
  }
}

function progressCopy(attempt: AttemptView, format: QuestFormatters): ProgressCopy {
  const { progress } = attempt;
  if (progress.kind === 'first_deposit') {
    return { kind: 'deposit', status: progress.met ? 'Deposit recorded' : 'Waiting for your first deposit' };
  }
  const saved = format.amount(progress.progressMinor);
  const target = format.amount(progress.targetMinor);
  const toGo = progress.met ? 'Reached' : `${format.amount(progress.remainingMinor)} to go`;
  return {
    kind: 'amount',
    fraction: Math.min(1, progress.progressMinor / progress.targetMinor),
    percent: progressPercent(progress.progressMinor, progress.targetMinor),
    saved,
    target,
    toGo,
    label: `${saved} of ${target} saved, ${toGo}`,
  };
}

// The in-card celebration of a quest the person just completed (never new money).
export function completedQuestCopy(attempt: AttemptView, world: QuestWorld, format: QuestFormatters): { title: string; message: string } {
  const title = `${QUEST_TITLES[attempt.ruleId]} complete!`;
  const target = attempt.progress.kind === 'amount' ? format.amount(attempt.progress.targetMinor) : null;
  switch (attempt.ruleId) {
    case 'first_step':
      return { title, message: `Your ${world.noun} has started to grow.` };
    case 'next_milestone': {
      const stage = attempt.milestoneStage ?? 10;
      const name = stage < 10 ? world.stageName(stage) : null;
      return {
        title,
        message: name ? `You saved ${target} toward the ${unlockInSentence(name)}.` : `You saved ${target} toward your ${world.noun}.`,
      };
    }
    case 'weekly_step':
      return { title, message: `You saved ${target} this week.` };
  }
}

// Neutral words for past quests (D105): only Completed is green; a quest whose time ran out "Ended",
// never "failed" or "missed".
export const RESULT_BADGES: Record<AttemptResult, { label: string; tone: BadgeTone; icon?: IconName }> = {
  completed: { label: 'Completed', tone: 'success', icon: 'success' },
  not_completed: { label: 'Ended', tone: 'neutral' },
  skipped: { label: 'Skipped', tone: 'neutral' },
};

export type HistoryRowCopy = { title: string; detail: string; result: (typeof RESULT_BADGES)[AttemptResult]; label: string };

// One past quest as a calm grouped row: which quest, when, what was saved toward it (only when
// something was; never "0 of …") and its result.
export function historyRowCopy(attempt: AttemptView, world: QuestWorld, format: QuestFormatters): HistoryRowCopy {
  const result = RESULT_BADGES[attempt.result ?? 'not_completed'];
  const stage = attempt.milestoneStage;
  const name = attempt.ruleId === 'next_milestone' && stage !== null && stage < 10 ? world.stageName(stage) : null;
  const title = name ? `${QUEST_TITLES[attempt.ruleId]}: ${name}` : QUEST_TITLES[attempt.ruleId];
  const when =
    attempt.ruleId === 'weekly_step' && attempt.weekStartDate
      ? `Week of ${format.date(attempt.weekStartDate)}`
      : format.date(attempt.startDate);
  const saved =
    attempt.progress.kind === 'amount' && attempt.progress.progressMinor > 0 ? `${format.amount(attempt.progress.progressMinor)} saved` : null;
  const detail = saved ? `${saved} · ${when}` : when;
  return { title, detail, result, label: `${title}, ${result.label}. ${detail}.` };
}

export type ChallengeAction = 'start' | 'skip';

export const ACTION_FAILED: Record<ChallengeAction, string> = { start: 'Quest not started', skip: 'Quest not skipped' };

// What a refused or failed Start or Skip means, with what to do next. The board is read again
// after every refusal, so the screen already shows the current state.
export function challengeActionMessage(action: ChallengeAction, error: ChallengeCommandError, ruleId: ChallengeRuleId, world: QuestWorld): string {
  switch (error.code) {
    case 'challenge_unavailable':
      return unavailableCopy(error.reason, ruleId, world);
    case 'goal_closed':
      return 'This goal is finished. Reopen it in Collection first.';
    case 'goal_not_found':
      return 'This goal no longer exists.';
    case 'goal_read_only':
      return 'Without Pro this goal is read-only, so no quest was started.';
    case 'theme_locked':
      return 'This Garden is kept as it is without Pro, so no quest was started.';
    case 'attempt_not_active':
    case 'attempt_not_found':
      return 'This quest has already ended. You’ll find it in Past quests.';
    default:
      return action === 'start' ? 'Nothing was started. Try again.' : 'Nothing was changed. Try again.';
  }
}

// The Challenges screen's own lines: load failure, empty and finished states, headings, the Skip
// confirmation and the Start/Skip toasts.
export const CHALLENGES_SCREEN_COPY = {
  loadFailedTitle: 'Couldn’t load your quests',
  emptyTitle: 'Quests grow with a goal',
  emptyMessage: 'Create a goal, and three small quests help its world grow.',
  finishedTitle: 'Your world is finished',
  finishedMessageCreate: 'Quests are for worlds that are still growing. Start a new goal, or reopen a finished one in Collection.',
  finishedMessageReopen: 'Quests are for worlds that are still growing. Reopen your goal in Collection to keep saving.',
  openCollection: 'Open Collection',
  goalNotFoundTitle: 'Goal not found',
  goalNotFoundMessage: 'Go to Home and choose a goal.',
  pausedTitle: 'This goal is paused',
  pausedMessage: 'Quests still count your savings. Resume it on Home.',
  completeDetail: 'Every quest for this goal is done. Finish it on Home when you’re ready.',
  goHome: 'Go to Home',
  started: 'Quest started',
  skipped: 'Quest skipped',
  skipTitle: 'Skip this quest?',
  skipMessage: 'It moves to Past quests, and you can choose another one right away.',
  skip: 'Skip',
  skipQuest: 'Skip this quest',
  currentTitle: 'Your quest',
  currentCaption: 'Finish or skip it to choose another.',
  chooseTitle: 'Choose a quest',
  pastQuests: 'Past quests',
  pastQuestsShowHint: 'Shows your past quests.',
  pastQuestsHideHint: 'Hides your past quests.',
} as const;

// "Pick one to help your island grow."
export function chooseCaption(noun: string): string {
  return `Pick one to help your ${noun} grow.`;
}

// The past-quests toggle's spoken name with its count.
export function pastQuestsLabel(count: number): string {
  return `Past quests, ${count}`;
}

// The goal row over the quests: "€40.00 of €100.00" and its spoken name.
export function goalSavedCopy(saved: string, target: string): string {
  return `${saved} of ${target}`;
}

export function goalRowLabel(title: string, saved: string): string {
  return `${title}. ${saved} saved.`;
}

// The quest cards' own lines.
export const QUEST_CARD_COPY = {
  inProgress: 'In progress',
  progressLabel: 'Quest progress',
} as const;

// A quest that can't start now, spoken with its reason.
export function unavailableQuestLabel(title: string, reason: string): string {
  return `${title}, not available now. ${reason}`;
}

// The chosen card's button: "Start First step".
export function startQuestLabel(title: string): string {
  return `Start ${title}`;
}

// The small target under the counted amount: "of €100.00".
export function ofTarget(target: string): string {
  return `of ${target}`;
}
