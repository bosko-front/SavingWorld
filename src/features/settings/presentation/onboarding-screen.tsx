import { useRef, useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, type HostInstance } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { appClock, currencyCommandDeps, refreshAppData } from '@/bootstrap/app-data';
import { getCurrency } from '@/core/money';
import { MILESTONE_COUNT } from '@/core/progression';
import { randomUuid } from '@/data/ids';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { COMMON_COPY } from '@/shared/i18n/common-copy';
import { deviceCurrencyCode } from '@/shared/i18n/locale';
import { FormScreen, TopBleed, useFontScale } from '@/shared/layout';
import { colors, motion, radii, spacing } from '@/shared/theme';
import { useAccessibilityFocusOnChange } from '@/shared/ui/accessibility-focus';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { FootnoteWithInfo } from '@/shared/ui/footnote-with-info';
import { useAmbientMotion, useReduceMotion } from '@/shared/ui/motion-preferences';
import { Notice } from '@/shared/ui/notice';

import { setGlobalCurrency } from '../application/currency-commands';

import { CURRENCY_EDITOR_COPY, CURRENCY_SETTINGS_COPY, currencyErrorMessage } from './currency-copy';
import { currencyLabel, CurrencyPicker } from './currency-picker';
import { howPictureLabel, ONBOARDING_COPY } from './onboarding-copy';

export { ONBOARDING_COPY };

const FALLBACK_CURRENCY = 'EUR';

function initialCurrency(): string {
  const code = deviceCurrencyCode();
  return code && getCurrency(code) ? code : FALLBACK_CURRENCY;
}


const STEP_COUNT = 3;

// The Welcome Island grows with the window up to this width.
const HERO_MAX_WIDTH = 420;

// The primary button sits in the same place on every step, so the second tap of a double tap would
// land on the next step's button (and "Get Started" would save a currency the person never saw).
// Presses this soon after a step change are ignored (timed on the app clock, which tests replace).
const STEP_SETTLE_MS = 600;

// The Island stages the "How it works" step shows: empty, halfway and complete (the shared stage
// numbers; stage 5 is the bridge, D76).
const HOW_STAGES = [0, 5, MILESTONE_COUNT] as const;

// Above this text scale the three small worlds of "How it works" sit in rows with their caption
// beside them, so a caption never breaks inside a word.
const STACK_TEXT_SCALE = 1.35;

// First launch (v1.2 sections 2 and 6), as three short steps (owner redesign, D132): Welcome with the
// finished Island on a full-screen sky (D98, V09), How it works (the person keeps their money; the app
// only records what they set aside, with the full "record, not a bank account" disclosure behind an
// info button) and the one global currency choice. No account, purchase or notification prompt. The
// currency draft and its operation ID live here, above the steps, so moving back and forth keeps them;
// only "Get Started" on the last step writes, through the same command as Settings, and the root
// layout then switches to the app. The buttons are the shared FormScreen's pinned footer, so they are
// visible without scrolling and move into the content only at large text sizes.
export function OnboardingScreen() {
  const [step, setStep] = useState(0);
  // VoiceOver moves to the new step's title after Next or Back (Phase 19).
  const titleRef = useAccessibilityFocusOnChange(step);
  const [code, setCode] = useState(initialCurrency);
  const [operationId] = useState(randomUuid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = getCurrency(code);
  const stepShownAt = useRef(0);

  const goTo = (next: number) => {
    stepShownAt.current = appClock().nowMs();
    setStep(next);
  };
  const settled = () => appClock().nowMs() - stepShownAt.current >= STEP_SETTLE_MS;

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await setGlobalCurrency(currencyCommandDeps(), { operationId, currencyCode: code });
    if (!result.ok) {
      setSaving(false);
      setError(currencyErrorMessage(result.error, selected ?? null, () => 'A goal'));
      return;
    }
    // The root layout leaves onboarding once the refreshed data has a currency.
    await refreshAppData();
  };

  const footer = (
    <View style={styles.footer}>
      <StepDots step={step} />
      {step === 0 ? (
        <Button label={ONBOARDING_COPY.next} onPress={() => settled() && goTo(1)} testID="onboarding-next-welcome" />
      ) : step === 1 ? (
        <Button label={ONBOARDING_COPY.next} onPress={() => settled() && goTo(2)} testID="onboarding-next" />
      ) : (
        <Button
          label={ONBOARDING_COPY.getStarted}
          onPress={() => settled() && void save()}
          loading={saving}
          disabled={!selected}
          testID="onboarding-continue"
        />
      )}
      {step > 0 ? (
        <Button
          label={ONBOARDING_COPY.back}
          variant="plain"
          centered
          disabled={saving}
          onPress={() => settled() && goTo(step - 1)}
          testID="onboarding-back"
        />
      ) : null}
    </View>
  );

  return (
    <FormScreen footer={footer} bleed={step === 0 ? <WelcomeSky /> : undefined} testID="onboarding">
      <StepEntrance step={step}>
        {step === 0 ? <WelcomeText titleRef={titleRef} /> : step === 1 ? <HowItWorks titleRef={titleRef} /> : null}
        {step === 2 ? (
          <View style={styles.step} testID="onboarding-step-currency">
            <AppText role="largeTitle" accessibilityRole="header" ref={titleRef}>
              {ONBOARDING_COPY.currencyTitle}
            </AppText>
            <Card>
              <CurrencyPicker value={code} onChange={setCode} testID="onboarding-currency" />
              {selected ? (
                <AppText role="footnote" tone="secondary" testID="onboarding-selected">
                  {CURRENCY_EDITOR_COPY.selected(currencyLabel(selected.code, selected.name))}
                </AppText>
              ) : null}
            </Card>
            <FootnoteWithInfo
              text={ONBOARDING_COPY.currencyLine}
              infoTitle={CURRENCY_SETTINGS_COPY.infoTitle}
              infoMessage={CURRENCY_SETTINGS_COPY.infoMessage}
              testID="onboarding-currency-rule"
            />
            {error ? <Notice tone="error" title={COMMON_COPY.notSaved} message={error} announce /> : null}
          </View>
        ) : null}
      </StepEntrance>
    </FormScreen>
  );
}

// The finished Island, the world a goal grows into, on a full-screen sky like Home's (D79-D82): the
// sky starts at the top of the screen, a pull-down shows more sky (never white), and the art stays
// below the status bar. Its clouds, water and trees move as on Home (Living Island, D90-D91) while the
// screen is visible and Reduce Motion is off. Decorative, because the title says what it is.
function WelcomeSky() {
  const ambient = useAmbientMotion();
  return (
    <TopBleed
      sceneAspectRatio={worldArtAspect('island')}
      maxArtWidth={HERO_MAX_WIDTH}
      topColor={colors.sceneSkyTop}
      testID="onboarding-sky"
      scene={
        <View style={styles.heroScene} testID="onboarding-world">
          <WorldScene themeId="island" stage={MILESTONE_COUNT} ambient={ambient} fill decorative />
        </View>
      }
    />
  );
}

function WelcomeText({ titleRef }: { titleRef: Ref<HostInstance> }) {
  return (
    <View style={styles.step} testID="onboarding-step-welcome">
      <View style={styles.text}>
        <AppText role="largeTitle" accessibilityRole="header" style={styles.centered} ref={titleRef}>
          {ONBOARDING_COPY.welcomeTitle}
        </AppText>
        <AppText tone="secondary" style={styles.centered}>
          {ONBOARDING_COPY.welcomeSubtitle}
        </AppText>
      </View>
    </View>
  );
}

// Three small Islands from the bundled art (empty, halfway, complete) show the idea of growing as you
// record savings. One spoken description for the strip; the money disclosure is one line with the
// full text behind its info button.
function HowItWorks({ titleRef }: { titleRef: Ref<HostInstance> }) {
  const stacked = useFontScale() > STACK_TEXT_SCALE;
  return (
    <View style={styles.step} testID="onboarding-step-how">
      <AppText role="largeTitle" accessibilityRole="header" ref={titleRef}>
        {ONBOARDING_COPY.howTitle}
      </AppText>
      <AppText>{ONBOARDING_COPY.howBody}</AppText>
      <View
        style={[styles.strip, stacked && styles.stripStacked]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={howPictureLabel()}
        testID="onboarding-progression">
        {HOW_STAGES.map((stage, index) => (
          <View key={stage} style={[styles.stripItem, stacked && styles.stripItemStacked]}>
            <View style={[styles.smallWorld, stacked && styles.smallWorldStacked]}>
              <WorldScene themeId="island" stage={stage} decorative />
            </View>
            <AppText role="footnote" style={stacked ? styles.stackedCaption : styles.centered}>
              {ONBOARDING_COPY.howSteps[index]}
            </AppText>
          </View>
        ))}
      </View>
      <FootnoteWithInfo
        text={ONBOARDING_COPY.recordLine}
        infoTitle={ONBOARDING_COPY.recordTitle}
        infoMessage={ONBOARDING_COPY.recordMessage}
        testID="onboarding-record"
      />
    </View>
  );
}

// Each step rises in softly (≤ 360 ms, transforms and opacity, D97 motion budget); under Reduce Motion
// it simply appears.
function StepEntrance({ step, children }: { step: number; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View key={step} entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow)}>
      {children}
    </Animated.View>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={ONBOARDING_COPY.stepOf(step + 1, STEP_COUNT)} testID="onboarding-steps">
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <View key={index} style={[styles.dot, index === step && styles.dotCurrent]} />
      ))}
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  step: {
    gap: spacing.lg,
  },
  heroScene: {
    flex: 1,
  },
  text: {
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSoft,
  },
  stripStacked: {
    flexDirection: 'column',
  },
  stripItem: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  stripItemStacked: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  smallWorld: {
    width: '100%',
    aspectRatio: worldArtAspect('island'),
  },
  smallWorldStacked: {
    width: 96,
  },
  stackedCaption: {
    flex: 1,
  },
  footer: {
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.progressTrack,
  },
  dotCurrent: {
    width: DOT * 3,
    backgroundColor: colors.accent,
  },
});
