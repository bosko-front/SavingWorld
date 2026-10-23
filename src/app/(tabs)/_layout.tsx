import { NativeTabs } from 'expo-router/native-tabs';

import { nativeTabsAppearance } from '@/shared/theme';

// OS-native tab bar; the system adapts its chrome (including on iPhone Duo). No custom tab bar.
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={nativeTabsAppearance.tintColor}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(challenges)">
        <NativeTabs.Trigger.Icon sf={{ default: 'flag', selected: 'flag.fill' }} />
        <NativeTabs.Trigger.Label>Challenges</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(collection)">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
        <NativeTabs.Trigger.Label>Collection</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
