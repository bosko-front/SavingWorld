import { useLocalSearchParams } from 'expo-router';

import { isEntityId } from '@/data/ids';
import { EntryFormScreen } from '@/features/ledger/presentation/entry-form-screen';

// Add savings with ?goalId=<id> (and &from=challenges from the Challenges tab), or Edit Entry with
// ?entryId=<id>. The route only validates its parameters; the shared form does the rest (Home,
// History and Challenges open this route).
export default function EntryFormRoute() {
  const { goalId, entryId, from } = useLocalSearchParams<{ goalId?: string; entryId?: string; from?: string }>();
  if (isEntityId(entryId)) {
    return <EntryFormScreen mode="edit" entryId={entryId} />;
  }
  return <EntryFormScreen mode="create" goalId={isEntityId(goalId) ? goalId : ''} origin={from === 'challenges' ? 'challenges' : 'home'} />;
}
