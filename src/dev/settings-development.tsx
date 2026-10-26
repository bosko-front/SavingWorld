import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { describeBuildInfo } from '@/bootstrap/build-info';
import { readBuildInfo } from '@/bootstrap/read-build-info';
import { spacing } from '@/shared/theme';
import { ListGroup, ListRow } from '@/shared/ui/list-row';
import { SectionHeader } from '@/shared/ui/section-header';

// Development/test-only part of Settings (D110): the delivery diagnostics (runtime, channel, update)
// and the links to the development tools. The Settings route requires this module only inside
// `if (__DEV__)`, so release bundles leave it out; the person's About section shows the app name
// and version only.

const DEVELOPMENT_LINKS: { title: string; href: Href }[] = [
  { title: 'Component gallery', href: '/dev-gallery' },
  { title: 'Layout lab', href: '/dev-layout' },
  { title: 'Home directions', href: '/dev-home' },
  { title: 'World inspector', href: '/dev-world' },
  { title: 'Reminder lab', href: '/dev-reminder' },
  { title: 'Store lab', href: '/dev-store' },
  { title: 'Database tests', href: '/dev-db' },
  { title: 'Detail screen', href: '/details' },
  { title: 'Sample form', href: '/sample-form' },
];

export function SettingsDevelopmentSection() {
  const rows = describeBuildInfo(readBuildInfo());
  return (
    <View style={styles.section} testID="settings-development">
      <SectionHeader title="Development only" caption="Not part of the app. Release builds leave these out." />
      <ListGroup>
        {rows.map((row) => (
          <ListRow key={row.label} title={row.label} detail={row.value} />
        ))}
      </ListGroup>
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
