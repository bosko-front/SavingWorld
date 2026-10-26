import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { accessView, useAppDataStore, type AppData } from '@/bootstrap/app-data';
import { MILESTONE_COUNT, stageFor, type Stage, type ThemeId } from '@/core/progression';
import { isOpenStatus } from '@/data/repositories/goal-repository';
import { themeManifestAt } from '@/features/worlds/registry';
import { WorldScene, worldArtAspect } from '@/features/worlds/world-scene';
import { FormScreen } from '@/shared/layout';
import { colors, radii, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui/app-text';
import { Button } from '@/shared/ui/button';
import { IconTile } from '@/shared/ui/icon-tile';
import { ListCell, ListGroup } from '@/shared/ui/list-row';
import { Notice } from '@/shared/ui/notice';
import { SectionHeader } from '@/shared/ui/section-header';

import { ANOTHER_WORLD, PAYWALL_COPY, PRO_FEATURES, productMessage, type ResultLine } from './billing-copy';
import { useProProduct, usePurchaseActions } from './use-pro-purchase';

// The Pro paywall (Phase 16; v1.2 section 4, R18/R21; owner design direction D97). World-first and
// honest: the person's own world as the hero, the exact Release 1.0 features as a short list with
// tiles, the store's localized price on the one purchase button with the footnote right under it,
// and Restore Purchases and Not now as small plain buttons. The purchase block is a footer pinned to
// the bottom while the content scrolls (owner polish D125); with large text or a short window the
// shared layout places it at the end of the content instead. No comparison table, discount, timer or pressure; every purchase state is calm
// text in place, never a toast. Garden is described in words until Phase 17 brings its art (V06).
//
// - `another_world`: Free tried to create a second goal (D74). It opens with the owner's "Build
//   another world" entry and "Explore Pro"; Explore Pro shows the offer in the same sheet. The goal
//   form hosts this entry, so once Pro is bought the same sheet becomes Create Goal.
// - `pro`: opened from Settings or a read-only goal; after a purchase it says so and Done returns to
//   where the person was.
// Pro already active shows that, with the same list, so a deep link never offers a second purchase.

export type PaywallEntry = 'another_world' | 'pro';

type PaywallProps = { entry: PaywallEntry; onClose: () => void };

export function PaywallScreen({ entry, onClose }: PaywallProps) {
  const data = useAppDataStore((store) => (store.state.status === 'ready' ? store.state.data : null));
  const [explored, setExplored] = useState(entry !== 'another_world');
  if (!data) {
    return null;
  }
  const hero = <HeroWorld {...heroWorld(data)} />;
  const pro = accessView(data).capabilities.level === 'pro';
  if (!explored) {
    return (
      <FormScreen testID="paywall">
        <PaywallTitle />
        {hero}
        <AnotherWorldIntro onExplore={() => setExplored(true)} onClose={onClose} />
      </FormScreen>
    );
  }
  return <Offer hero={hero} pro={pro} onClose={onClose} />;
}

// One native title; the content headline says the rest (DESIGN_SYSTEM, never repeated).
function PaywallTitle() {
  return <Stack.Screen options={{ title: PAYWALL_COPY.screenTitle }} />;
}

type Hero = { themeId: ThemeId; stage: Stage; version: number | null };

// The person's own world: the goal Home shows at its current stage, otherwise their newest finished
// world (its souvenir's theme and art version), otherwise the empty Island waiting for a first goal.
function heroWorld(data: AppData): Hero {
  const { goals } = data.goals;
  const selected = goals.find((summary) => summary.goal.id === data.goals.selectedGoalId && isOpenStatus(summary.goal.status));
  if (selected) {
    return { themeId: selected.goal.themeId, stage: stageFor(selected.balanceMinor, selected.goal.targetMinor), version: null };
  }
  const souvenir = data.goals.souvenirs[0];
  if (souvenir) {
    return { themeId: souvenir.themeId, stage: MILESTONE_COUNT, version: souvenir.themeVersion };
  }
  return { themeId: 'island', stage: 0, version: null };
}

function HeroWorld({ themeId, stage, version }: Hero) {
  const manifest = version === null ? undefined : themeManifestAt(themeId, version);
  return (
    <View style={[styles.hero, { aspectRatio: worldArtAspect(themeId, manifest) }]} testID="paywall-world">
      <WorldScene themeId={themeId} stage={stage} manifest={manifest} decorative />
    </View>
  );
}

// The D74 entry, in the owner's exact words, with Garden as an extra Pro benefit and the free way
// forward (delete and start over) said plainly.
function AnotherWorldIntro({ onExplore, onClose }: { onExplore: () => void; onClose: () => void }) {
  return (
    <View style={styles.block} testID="paywall-another-world">
      <View style={styles.text}>
        <AppText role="title" accessibilityRole="header" style={styles.centered}>
          {ANOTHER_WORLD.title}
        </AppText>
        <AppText style={styles.centered}>{ANOTHER_WORLD.message}</AppText>
        <AppText tone="secondary" style={styles.centered}>
          {ANOTHER_WORLD.garden}
        </AppText>
      </View>
      <Button label={ANOTHER_WORLD.button} icon="pro" onPress={onExplore} testID="paywall-explore" />
      <AppText role="footnote" tone="secondary" style={styles.centered} testID="paywall-footnote">
        {ANOTHER_WORLD.footnote}
      </AppText>
      <AppText role="footnote" tone="secondary" style={styles.centered}>
        {ANOTHER_WORLD.startOver}
      </AppText>
      <Button label={PAYWALL_COPY.notNow} variant="plain" centered onPress={onClose} testID="paywall-close" />
    </View>
  );
}

function Offer({ hero, pro, onClose }: { hero: ReactNode; pro: boolean; onClose: () => void }) {
  const { product, reload } = useProProduct();
  const actions = usePurchaseActions();
  const productLine = productMessage(product);
  const price = product.kind === 'ready' ? product.displayPrice : null;
  const footer = pro ? (
    <Button label={PAYWALL_COPY.done} onPress={onClose} testID="paywall-done" />
  ) : (
    <View style={styles.purchase} testID="paywall-purchase">
      {productLine ? (
        <View style={styles.productLine} testID="paywall-product-state">
          {product.kind === 'loading' ? <ActivityIndicator color={colors.textSecondary} /> : null}
          <AppText role="footnote" tone="secondary" style={styles.flexText}>
            {productLine}
          </AppText>
          {product.kind === 'failed' ? (
            <Button label={PAYWALL_COPY.retry} variant="plain" onPress={reload} testID="paywall-retry" />
          ) : null}
        </View>
      ) : null}
      <Button
        label={price ? PAYWALL_COPY.buyWithPrice(price) : PAYWALL_COPY.buy}
        icon="pro"
        disabled={price === null || actions.busy === 'restore'}
        loading={actions.busy === 'buy'}
        onPress={() => void actions.buy()}
        testID="paywall-buy"
      />
      <AppText role="footnote" tone="secondary" style={styles.centered} testID="paywall-footnote">
        {PAYWALL_COPY.footnote}
      </AppText>
      {/* Secondary, side by side while they fit; they wrap under each other at large text. */}
      <View style={styles.secondary}>
        <Button
          label={PAYWALL_COPY.restore}
          variant="plain"
          disabled={actions.busy === 'buy'}
          loading={actions.busy === 'restore'}
          onPress={() => void actions.restore()}
          testID="paywall-restore"
        />
        <Button label={PAYWALL_COPY.notNow} variant="plain" disabled={actions.busy !== null} onPress={onClose} testID="paywall-close" />
      </View>
    </View>
  );
  return (
    <FormScreen testID="paywall" footer={footer}>
      <PaywallTitle />
      {hero}
      <View style={styles.block} testID="paywall-offer">
        <View style={styles.text}>
          <AppText role="title" accessibilityRole="header" style={styles.centered}>
            {pro ? PAYWALL_COPY.activeTitle : PAYWALL_COPY.headline}
          </AppText>
          <AppText tone="secondary" style={styles.centered}>
            {pro ? PAYWALL_COPY.activeMessage : PAYWALL_COPY.intro}
          </AppText>
        </View>
        {actions.line ? <ResultNotice line={actions.line} /> : null}
        <Features />
      </View>
    </FormScreen>
  );
}

// The exact Release 1.0 features, each a tile, a short title and one line (D97: a short list, no
// comparison table).
function Features() {
  return (
    <View style={styles.features}>
      <SectionHeader title={PAYWALL_COPY.featuresHeader} />
      <ListGroup testID="paywall-features">
        {PRO_FEATURES.map((feature) => (
          <ListCell key={feature.key}>
            <View style={styles.feature} accessible accessibilityLabel={`${feature.title}. ${feature.detail}`}>
              <IconTile name={feature.icon} color={feature.color} />
              <View style={styles.flexText}>
                <AppText role="label">{feature.title}</AppText>
                <AppText role="footnote" tone="secondary">
                  {feature.detail}
                </AppText>
              </View>
            </View>
          </ListCell>
        ))}
      </ListGroup>
    </View>
  );
}

function ResultNotice({ line }: { line: ResultLine }) {
  return <Notice tone={line.tone} title={line.title} message={line.message} testID="paywall-result" />;
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  block: {
    gap: spacing.lg,
  },
  text: {
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  purchase: {
    gap: spacing.sm,
  },
  secondary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.lg,
  },
  productLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  features: {
    gap: spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flexText: {
    flexShrink: 1,
    gap: spacing.xs / 2,
  },
});
