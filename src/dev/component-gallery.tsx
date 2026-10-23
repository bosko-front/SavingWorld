import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormScreen } from '@/shared/layout';
import { colors, radii, spacing, typography, type ColorToken, type TextRole } from '@/shared/theme';
import { AmountText } from '@/shared/ui/amount-text';
import { AppText } from '@/shared/ui/app-text';
import { Button, type ButtonVariant } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon, ICON_SYMBOLS, type IconName } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { showToast } from '@/shared/ui/toast';

// Development/test-only catalog of shared controls and their states. Reached from Settings in
// development builds via the guarded /dev-gallery route; never part of a release bundle.
// Amounts below are fixed display samples, not output of money logic.

const LONG_LABEL = 'Save this deposit to your goal and update the world with today’s amount';
const LONG_TEXT =
  'Saving Worlds tracks money you set aside yourself. Long copy wraps onto as many lines as it needs at every text size instead of being cut off.';
const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'plain'];
const SWATCHES: ColorToken[] = [
  'canvas',
  'surface',
  'surfaceSoft',
  'textPrimary',
  'textSecondary',
  'actionPrimary',
  'actionPrimaryPressed',
  'borderControl',
  'focus',
  'moneyDeposit',
  'moneyWithdrawal',
  'error',
  'disabledText',
  'accentDecorative',
];

export function ComponentGallery() {
  const { fontScale } = useWindowDimensions();
  return (
    // FormScreen because the gallery contains text fields; keyboard-safe scrolling applies.
    <FormScreen width="readable">
      <AppText role="title" accessibilityRole="header">
        Component gallery
      </AppText>
      <AppText tone="secondary">
        {`Development only. Current text scale ×${fontScale.toFixed(2)}; change Larger Text in iOS Settings to review large text.`}
      </AppText>
      <Section title="Text roles">
        {(Object.keys(typography) as TextRole[]).map((role) => (
          <AppText key={role} role={role}>
            {role}
          </AppText>
        ))}
        <AppText tone="secondary">{LONG_TEXT}</AppText>
      </Section>

      <Section title="Buttons">
        <AppText role="footnote" tone="secondary">
          Press and hold any enabled button to see its pressed state.
        </AppText>
        {VARIANTS.map((variant) => (
          <View key={variant} style={styles.group}>
            <AppText role="label">{variant}</AppText>
            <Button label={`${capitalize(variant)} action`} variant={variant} onPress={noop} />
            <Button label="Disabled" variant={variant} disabled onPress={noop} />
            <Button label="Saving" variant={variant} loading onPress={noop} />
          </View>
        ))}
        <LoadingDemo />
        <Button label={LONG_LABEL} onPress={noop} />
      </Section>

      <Section title="Text fields">
        <FieldDemos />
      </Section>

      <Section title="Cards and amounts">
        <Card>
          <AppText role="label" tone="secondary">
            Saved so far
          </AppText>
          <AmountText formatted="€1,250.00" size="large" />
          <AmountText formatted="+ €50.00 deposit" kind="deposit" />
          <AmountText formatted="− €20.00 withdrawal" kind="withdrawal" />
        </Card>
        <Card variant="soft">
          <AppText role="headline">Soft card</AppText>
          <AppText>{LONG_TEXT}</AppText>
        </Card>
      </Section>

      <Section title="Feedback">
        <Notice tone="error" title="Couldn’t save" message="This withdrawal is larger than the goal’s current balance." />
        <Notice tone="success" title="Saved" message="Your world now reflects your current savings." />
        <Notice tone="info" title="Stored on this device" message={LONG_TEXT} />
      </Section>

      <Section title="Toasts">
        <AppText role="footnote" tone="secondary">
          One at a time near the top; a new one replaces the current one. Each is announced once to VoiceOver. With Reduce
          Motion it fades in instead of sliding. Swipe up or tap to dismiss.
        </AppText>
        <Button label="Show success toast" variant="secondary" icon="success" onPress={() => showToast({ tone: 'success', title: 'Goal created' })} />
        <Button label="Show info toast" variant="secondary" icon="info" onPress={() => showToast({ tone: 'info', title: 'Currency changed to JPY' })} />
        <Button label="Show long toast" variant="secondary" onPress={() => showToast({ tone: 'success', title: LONG_LABEL })} />
      </Section>

      <Section title="Icons">
        <AppText role="footnote" tone="secondary">
          SF Symbols by semantic name. Sizes follow the text role and the current text size; icons are hidden from VoiceOver.
        </AppText>
        {(Object.keys(ICON_SYMBOLS) as IconName[]).map((name) => (
          <View key={name} style={styles.iconRow}>
            <Icon name={name} role="body" tone="action" />
            <AppText>{`${name} · ${ICON_SYMBOLS[name]}`}</AppText>
          </View>
        ))}
      </Section>

      <Section title="Semantic colors">
        {SWATCHES.map((token) => (
          <View key={token} style={styles.swatchRow}>
            <View style={[styles.swatch, { backgroundColor: colors[token] }]} />
            <AppText role="footnote">{`${token} ${colors[token]}`}</AppText>
          </View>
        ))}
      </Section>
    </FormScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText role="title" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <Button
      label={loading ? 'Saving' : 'Tap to simulate saving'}
      loading={loading}
      onPress={() => {
        setLoading(true);
        timer.current = setTimeout(() => setLoading(false), 1500);
      }}
    />
  );
}

function FieldDemos() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('abc');
  return (
    <>
      <AppText role="footnote" tone="secondary">
        Tap a field to see its focus outline.
      </AppText>
      <TextField label="Goal name" value={name} onChangeText={setName} placeholder="Summer trip" hint="Any name you like." />
      <TextField
        label="Amount (display sample, not validated here)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        error="Enter an amount greater than zero."
      />
      <TextField label="Currency" value="EUR" onChangeText={noop} disabled hint="Set once for the whole app." />
      <TextField
        label="A field with a very long label that needs to wrap onto more than one line"
        value=""
        onChangeText={noop}
        error="A long error message also wraps fully so the explanation is never cut off at large text sizes."
      />
      <TextField label="Note" value={note} onChangeText={setNote} multiline placeholder="Optional" />
    </>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function noop() {}

const styles = StyleSheet.create({
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  swatch: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderControl,
  },
});
