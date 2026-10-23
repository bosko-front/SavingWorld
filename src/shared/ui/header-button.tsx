import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';

import { layout } from '@/shared/theme';

import { Icon, type IconName } from './icon';

type HeaderIconButtonProps = {
  icon: IconName;
  // Required: an icon-only button needs a spoken name (DESIGN_SYSTEM "Icons", rule 2).
  accessibilityLabel: string;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
};

// Icon-only button for a native navigation bar slot (headerRight), for example Settings on Home.
// 44 pt target; works inside `Link asChild`. The system draws its own bar material around it.
export function HeaderIconButton({ icon, accessibilityLabel, onPress, testID }: HeaderIconButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} testID={testID} style={styles.button}>
      <Icon name={icon} role="headline" tone="action" weight="semibold" filled />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

