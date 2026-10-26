import { useRouter } from 'expo-router';

import { PaywallScreen } from '@/features/billing/presentation/paywall-screen';

// The Pro paywall sheet (Phase 16), opened from Settings and from a read-only goal. Closing it, or
// Done after a purchase, returns to the screen that opened it. A second goal on Free opens the same
// paywall inside the goal form instead, so that buying Pro continues straight to Create.
export default function PaywallRoute() {
  const router = useRouter();
  return <PaywallScreen entry="pro" onClose={() => router.back()} />;
}
