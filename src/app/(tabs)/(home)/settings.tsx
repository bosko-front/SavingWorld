import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { describeBuildInfo } from '@/bootstrap/build-info';
import { readBuildInfo } from '@/bootstrap/read-build-info';
import { CurrencySettings } from '@/features/settings/presentation/currency-settings';
import { Screen } from '@/shared/layout';
import { spacing } from '@/shared/theme';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { SectionHeader } from '@/shared/ui/section-header';

// Settings (Phase 06 currency; reminder Phase 14, local-data and support text Phase 19). The native
// navigation title names the screen; sections use the shared SectionHeader and grouped rows.
export default function SettingsScreen() {
  const rows = describeBuildInfo(readBuildInfo());
  return (
    <Screen>
      <View style={styles.section}>
        <SectionHeader title="Currency" />
        <CurrencySettings />
      </View>
      <View style={styles.section}>
        <SectionHeader title="About this build" />
        <ListGroup>
          {rows.map((row) => (
            <ListRow key={row.label} title={row.label} detail={row.value} />
          ))}
        </ListGroup>
      </View>
      {__DEV__ ? <DevelopmentLinks /> : null}
    </Screen>
  );
}

const DEVELOPMENT_LINKS: { title: string; href: Href }[] = [
  { title: 'Component gallery', href: '/dev-gallery' },
  { title: 'Layout lab', href: '/dev-layout' },
  { title: 'Home directions', href: '/dev-home' },
  { title: 'Database tests', href: '/dev-db' },
  { title: 'Detail screen', href: '/details' },
  { title: 'Sample form', href: '/sample-form' },
];

// Development/test-only tools; the routes are guarded and absent from release bundles.
function DevelopmentLinks() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Development only" caption="Not part of the app. Release builds leave these out." />
      <ListGroup>
        {DEVELOPMENT_LINKS.map((link) => (
          <Link key={link.title} href={link.href} asChild>
            <ListRow title={link.title} chevron accessibilityLabel={`${link.title} (development only)`} />
          </Link>
        ))}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
});
