// Config plugin (Phase 15): attaches the local StoreKit configuration (storekit/SavingWorlds.storekit)
// to the generated Xcode scheme's Run action, so a development build started from Xcode buys from
// StoreKit's local test environment (docs/evidence/PHASE_15.md). It changes nothing else: the file is
// not copied into the app bundle, EAS and release builds never read a scheme's StoreKit setting, and
// the price inside the file matches the owner's 7.99 USD (D116).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const CONFIG_FILE = 'storekit/SavingWorlds.storekit';

module.exports = function withStoreKitTestConfig(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const schemes = path.join(iosRoot, `${modConfig.modRequest.projectName}.xcodeproj`, 'xcshareddata', 'xcschemes');
      if (!fs.existsSync(schemes)) {
        return modConfig;
      }
      // Scheme paths are relative to the workspace folder (ios/).
      const reference = `<StoreKitConfigurationFileReference identifier = "../${CONFIG_FILE}"></StoreKitConfigurationFileReference>`;
      for (const file of fs.readdirSync(schemes).filter((name) => name.endsWith('.xcscheme'))) {
        const schemePath = path.join(schemes, file);
        const scheme = fs.readFileSync(schemePath, 'utf8');
        if (scheme.includes('StoreKitConfigurationFileReference')) {
          continue;
        }
        fs.writeFileSync(schemePath, scheme.replace(/(<LaunchAction[\s\S]*?)(\s*<\/LaunchAction>)/, `$1\n      ${reference}$2`));
      }
      return modConfig;
    },
  ]);
};
