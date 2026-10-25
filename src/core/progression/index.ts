// Shared progression rules (docs/DATA_MODEL.md "Derived values"). Pure TypeScript.
export {
  isFunded,
  MILESTONE_COUNT,
  nextThresholdMinor,
  progressPercent,
  remainingMinor,
  sceneFeedback,
  stageFor,
  stageThresholdMinor,
  type PercentDecimals,
  type SceneFeedback,
  type Stage,
} from './stage';
export { currentThemeVersion, CURRENT_THEME_VERSIONS, isThemeId, THEME_IDS, type ThemeId } from './theme-ids';
