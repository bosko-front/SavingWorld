import { StatisticsScreen } from '@/features/statistics/presentation/statistics-screen';

// The one Pro Statistics screen (Phase 18), pushed from Home's goal options and Settings. The screen
// and its read both check the Pro capability; without it the route shows the invitation to Pro.
export default function StatisticsRoute() {
  return <StatisticsScreen />;
}
