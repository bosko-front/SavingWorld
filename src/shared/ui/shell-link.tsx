import { Link, type Href } from 'expo-router';
import { PlatformColor, StyleSheet, Text } from 'react-native';

// Temporary navigation affordance for the Phase 01 shell; Phase 02 supplies the shared Button.
type ShellLinkProps = {
  href: Href;
  label: string;
};

export function ShellLink({ href, label }: ShellLinkProps) {
  return (
    <Link href={href} style={styles.link} accessibilityRole="button">
      <Text style={styles.label}>{label}</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 44,
    paddingVertical: 12,
  },
  label: {
    fontSize: 17,
    color: PlatformColor('link'),
  },
});
