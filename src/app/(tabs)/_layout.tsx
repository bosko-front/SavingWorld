import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { nativeTabsAppearance } from '@/shared/theme';
import { haptics } from '@/shared/ui/haptics';

// OS-native tab bar; the system adapts its chrome (including on iPhone Duo). No custom tab bar.
// A tab press plays the light selection haptic (owner request, DECISIONS D66); a press the native
// side prevented plays nothing.
// Screens without the tab bar: secondary screens that return with their Back button (owner
// requests: Settings D111, a Collection souvenir's detail D112).
const ROUTES_WITHOUT_TAB_BAR = ['/settings', '/souvenir'];

export default function TabsLayout() {
  const pathname = usePathname();
  return (
    <NativeTabs
      tintColor={nativeTabsAppearance.tintColor}
      hidden={ROUTES_WITHOUT_TAB_BAR.includes(pathname)}
      screenListeners={{
        tabPress: (event) => {
          if (!event.data?.isPrevented) {
            haptics.selection();
          }
        },
      }}>
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
