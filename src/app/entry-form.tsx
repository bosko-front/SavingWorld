import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { EntryFormScreen } from '@/features/ledger/presentation/entry-form-screen';

// Add savings with ?goalId=<id>, or Edit Entry with ?entryId=<id>. The route only validates its
// parameters; the shared form does the rest (Home, History and later Challenges open this route).
export default function EntryFormRoute() {
  const { goalId, entryId } = useLocalSearchParams<{ goalId?: string; entryId?: string }>();
  if (isEntityId(entryId)) {
    return <EntryFormScreen mode="edit" entryId={entryId} />;
  }
  return <EntryFormScreen mode="create" goalId={isEntityId(goalId) ? goalId : ''} />;
}
