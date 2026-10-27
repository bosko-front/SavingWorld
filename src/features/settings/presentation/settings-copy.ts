// English copy for the Settings screen's own sections (D110). The currency, reminder and Pro cards
// keep their copy in their own modules.
export const SETTINGS_COPY = {
  preferences: 'Preferences',
  about: 'About',
  appName: 'Saving Worlds',
  appDetail: 'Record real savings and watch small worlds grow.',
  version: 'Version',
  privacyPolicy: 'Privacy Policy',
  support: 'Support',
  opensInSafari: 'Opens in Safari.',
} as const;

// The public Privacy Policy and Support pages (D137): PRIVACY.md and SUPPORT.md of the public
// repository, served by GitHub Pages. The same URLs go into App Store Connect.
export const PUBLIC_PAGES = {
  privacyPolicy: 'https://bosko-front.github.io/SavingWorld/PRIVACY.html',
  support: 'https://bosko-front.github.io/SavingWorld/SUPPORT.html',
} as const;

// "Your data" (v1.2 section 3, R23, Phase 19): what the app really does with savings records. There
// is no backup, export, import or sync in v1, so nothing here is a button; the short rows say where
// the records live and that deleting the app can remove them for good, and the info button gives the
// whole explanation (D111 pattern). It describes the shipped behavior: records stay in the local
// database, nothing is sent to a server, and the app goes online only for App Store purchases and
// app updates (expo-updates, docs/EAS_AND_OTA.md). An iOS device backup is not an app promise.
export const LOCAL_DATA_COPY = {
  section: 'Your data',
  storedTitle: 'Saved on this iPhone',
  storedDetail: 'Your goals, entries and worlds stay on this iPhone. There’s no account and no cloud copy.',
  lossTitle: 'No backup in the app',
  lossDetail: 'Deleting Saving Worlds or losing this iPhone can remove your savings records for good. The app can’t bring them back.',
  footnote: 'Your goals, amounts and notes are never sent anywhere.',
  infoTitle: 'About your data',
  infoMessage:
    'Saving Worlds keeps your goals, entries, notes and worlds in a database on this iPhone. There is no account, and the app doesn’t send your savings records anywhere. It goes online only for App Store purchases and to download app updates.\n\nThere is no backup, export or sync in Saving Worlds. If you delete the app or lose this iPhone, your savings records can be gone for good, and the app can’t restore them. iPhone and iCloud backups are made by iOS, not by Saving Worlds, so the app can’t promise your records come back from one.\n\nRestore Purchases on the Pro screen brings back Pro, not your goals or entries.',
} as const;
