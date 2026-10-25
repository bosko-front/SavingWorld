import { civilDateAt } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import { MILESTONE_COUNT, stageFor, type ThemeId } from '@/core/progression';
import type { CollectibleRecord } from '@/data/repositories/collectible-repository';
import type { GoalStatus, GoalSummary } from '@/data/repositories/goal-repository';
import { deviceLocale, formatCivilDate } from '@/shared/i18n/locale';
import type { BadgeTone } from '@/shared/ui/status-badge';
import type { IconName } from '@/shared/ui/icon';

import { goalAmounts } from '@/features/goals/presentation/goal-amounts';

// What the Collection shows (v1.2 section 6 "Collection", owner decision D74): one finished world per
// goal that reached its target, and every completed goal. The souvenir is history (the art and
// target at the first saved B >= T); the goal's status, balance and live stage are now. Captions
// keep the two apart, because a reopened goal may have saved less since, or changed its target.
// Pure: no React, no database.

export type CollectionEntry = {
  summary: GoalSummary;
  // null only for a completed goal without a souvenir, which schema 3 never produces (its upgrade
  // stored one for every funded goal); shown honestly rather than hidden if it ever happens.
  souvenir: CollectibleRecord | null;
};

// Goals with a souvenir, newest souvenir first, then completed goals without one.
export function collectionEntries(
  goals: readonly GoalSummary[],
  souvenirs: readonly CollectibleRecord[],
): CollectionEntry[] {
  const byId = new Map(goals.map((summary) => [summary.goal.id, summary]));
  const withSouvenir = souvenirs.flatMap((souvenir) => {
    const summary = byId.get(souvenir.goalId);
    return summary ? [{ summary, souvenir }] : [];
  });
  const awarded = new Set(souvenirs.map((souvenir) => souvenir.goalId));
  const completedOnly = goals
    .filter(({ goal }) => goal.status === 'completed' && !awarded.has(goal.id))
    .map((summary) => ({ summary, souvenir: null }));
  return [...withSouvenir, ...completedOnly];
}

export type StatusLabel = { label: string; tone: BadgeTone; icon: IconName };

// The goal's status now, in words (the badge never relies on color).
export function statusLabel(status: GoalStatus): StatusLabel {
  switch (status) {
    case 'completed':
      return { label: 'Completed', tone: 'success', icon: 'finish' };
    case 'paused':
      return { label: 'Paused', tone: 'info', icon: 'pause' };
    case 'active':
      return { label: 'Still open', tone: 'neutral', icon: 'resume' };
  }
}

const THEME_NAMES: Record<ThemeId, string> = { island: 'Island', garden: 'Garden' };

export function themeName(themeId: ThemeId): string {
  return THEME_NAMES[themeId];
}

// The civil date a souvenir was earned, in the device's time zone (earned time is a UTC instant).
export function earnedDate(souvenir: CollectibleRecord, timeZone: string, locale: string = deviceLocale()): string {
  return formatCivilDate(civilDateAt(Date.parse(souvenir.earnedAtUtc), timeZone), locale);
}

// What a souvenir's detail and card say (owner polish after D100): the achievement first, few words.
// The world type and the date it was completed (the first saved B >= T), the amount saved, the goal's
// status, and one plain "since then" note only when the goal has changed since: a lower live stage on
// Home or another target. The souvenir itself always stays complete.
export type SouvenirDetail = {
  // "Island", or "Garden".
  worldType: string;
  // The civil date the world was completed; null for a completed goal without a souvenir.
  completedOn: string | null;
  saved: string;
  status: StatusLabel;
  percent: number;
  stage: number;
  // At most two short sentences; null when nothing changed since the souvenir.
  sinceThen: string | null;
};

export function souvenirDetail(
  entry: CollectionEntry,
  currency: CurrencyMetadata,
  timeZone: string,
  locale: string = deviceLocale(),
): SouvenirDetail {
  const { summary, souvenir } = entry;
  const amounts = goalAmounts(summary, currency, locale);
  const stage = stageFor(summary.balanceMinor, summary.goal.targetMinor);
  const notes: string[] = [];
  if (souvenir && souvenir.targetMinorAtAward !== summary.goal.targetMinor) {
    const then = formatMoney(souvenir.targetMinorAtAward, currency, { locale });
    notes.push(`Completed at a target of ${then}; the target is ${amounts.target} now.`);
  }
  if (souvenir && stage < MILESTONE_COUNT) {
    notes.push(`Its world on Home shows ${stage} of ${MILESTONE_COUNT} milestones now; this souvenir stays complete.`);
  }
  return {
    worldType: themeName(souvenir?.themeId ?? summary.goal.themeId),
    completedOn: souvenir ? earnedDate(souvenir, timeZone, locale) : null,
    saved: amounts.saved,
    status: statusLabel(summary.goal.status),
    percent: amounts.percent,
    stage,
    sinceThen: notes.length > 0 ? notes.join(' ') : null,
  };
}

// A card's one caption line: the world type and the date it was completed ("Island · Oct 25, 2026").
export function cardCaption(entry: CollectionEntry, timeZone: string, locale: string = deviceLocale()): string {
  const { souvenir, summary } = entry;
  return souvenir
    ? `${themeName(souvenir.themeId)} · ${earnedDate(souvenir, timeZone, locale)}`
    : `${themeName(summary.goal.themeId)} · as it is now`;
}

// The slow float of a Collection card's world (owner decision D100, an exception to D90's still
// lists): 3 pt up and down over 4.4 s, never a pulse or scale. Each card starts at a different point
// of the cycle (1.3 s apart, wrapping), so several worlds never move in step.
export const CARD_FLOAT = { amplitude: 3, periodMs: 4400, stepMs: 1300 } as const;

export function cardFloatDelay(index: number): number {
  return (index * CARD_FLOAT.stepMs) % CARD_FLOAT.periodMs;
}
