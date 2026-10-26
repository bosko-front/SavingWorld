import { civilDateAt } from '@/core/calendar';
import { formatMoney, type CurrencyMetadata } from '@/core/money';
import type { ThemeId } from '@/core/progression';
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

// What a souvenir's detail says (owner polish D112): a short, cozy summary under the finished world.
// The souvenir is a snapshot (world, art version and target at the first saved B >= T) and never
// changes; the saved amount and any target change are the goal now. Status appears only while the
// goal is still open (active or paused): "completed" is already said by the headline and the
// actions, so it is never repeated.
export type SouvenirDetail = {
  // "Island completed"; "Island" for a completed goal without a souvenir (never produced by schema 3).
  headline: string;
  // "Your completed island is yours to keep."; null without a souvenir.
  keepLine: string | null;
  // The goal's current saved amount.
  saved: string;
  // The civil date the world was earned; null without a souvenir.
  earnedOn: string | null;
  // The target stored with the souvenir; null without one.
  targetThen: string | null;
  // The goal's target now, only when it differs from targetThen.
  targetNow: string | null;
  // Only for an open goal (active or paused).
  openStatus: StatusLabel | null;
};

export function souvenirDetail(
  entry: CollectionEntry,
  currency: CurrencyMetadata,
  timeZone: string,
  locale: string = deviceLocale(),
): SouvenirDetail {
  const { summary, souvenir } = entry;
  const amounts = goalAmounts(summary, currency, locale);
  const world = themeName(souvenir?.themeId ?? summary.goal.themeId);
  const targetChanged = souvenir !== null && souvenir.targetMinorAtAward !== summary.goal.targetMinor;
  return {
    headline: souvenir ? `${world} completed` : world,
    keepLine: souvenir ? `Your completed ${world.toLowerCase()} is yours to keep.` : null,
    saved: amounts.saved,
    earnedOn: souvenir ? earnedDate(souvenir, timeZone, locale) : null,
    targetThen: souvenir ? formatMoney(souvenir.targetMinorAtAward, currency, { locale }) : null,
    targetNow: targetChanged || !souvenir ? amounts.target : null,
    openStatus: summary.goal.status === 'completed' ? null : statusLabel(summary.goal.status),
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
