/**
 * Patch for expo-notifications on Expo Go (Android) and TypeScript base configs.
 *
 * 1. In SDK 57 (and 58), expo-notifications includes TopicSubscriptionModule.android.js
 *    which unconditionally executes `requireNativeModule('ExpoTopicSubscriptionModule')`.
 *    Since Expo Go does not bundle FCM/topic push modules, this causes an uncaught
 *    native module resolution error during route evaluation.
 *    This patch replaces the strict requireNativeModule with requireOptionalNativeModule
 *    and falls back to the standard JS no-op implementation.
 *
 * 2. Provides dummy expo-module-scripts/tsconfig.base so that node_modules/expo-notifications/tsconfig.json
 *    resolves without IDE errors.
 *
 * 3. Ensures node_modules/expo/tsconfig.base (without .json) exists for legacy TS resolution.
 */
const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

if (fs.existsSync(targetPath)) {
  const content = fs.readFileSync(targetPath, 'utf8');
  if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
    const patched = `import { requireOptionalNativeModule } from 'expo-modules-core';
const nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
const fallbackModule = {
    addListener: () => { },
    removeListeners: () => { },
    subscribeToTopicAsync: () => Promise.resolve(null),
    unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
export default nativeModule ?? fallbackModule;
//# sourceMappingURL=TopicSubscriptionModule.android.js.map
`;
    fs.writeFileSync(targetPath, patched, 'utf8');
    console.log('[patch-expo-notifications] Successfully patched TopicSubscriptionModule.android.js for Expo Go.');
  } else {
    console.log('[patch-expo-notifications] TopicSubscriptionModule.android.js is already patched.');
  }
} else {
  console.log('[patch-expo-notifications] expo-notifications not found, skipping patch.');
}

// Ensure expo-module-scripts dummy exists for expo-notifications/tsconfig.json
const moduleScriptsDir = path.join(__dirname, '..', 'node_modules', 'expo-module-scripts');
if (!fs.existsSync(moduleScriptsDir)) {
  fs.mkdirSync(moduleScriptsDir, { recursive: true });
}
const moduleScriptsPkg = path.join(moduleScriptsDir, 'package.json');
if (!fs.existsSync(moduleScriptsPkg)) {
  fs.writeFileSync(moduleScriptsPkg, JSON.stringify({ name: 'expo-module-scripts', version: '1.0.0' }, null, 2), 'utf8');
}
const moduleScriptsBase = path.join(moduleScriptsDir, 'tsconfig.base.json');
if (!fs.existsSync(moduleScriptsBase)) {
  fs.writeFileSync(moduleScriptsBase, JSON.stringify({ compilerOptions: { skipLibCheck: true } }, null, 2), 'utf8');
}
const moduleScriptsBaseNoJson = path.join(moduleScriptsDir, 'tsconfig.base');
if (!fs.existsSync(moduleScriptsBaseNoJson)) {
  fs.writeFileSync(moduleScriptsBaseNoJson, JSON.stringify({ compilerOptions: { skipLibCheck: true } }, null, 2), 'utf8');
}

// Ensure expo/tsconfig.base exists without .json for legacy resolvers
const expoDir = path.join(__dirname, '..', 'node_modules', 'expo');
const expoBaseWithJson = path.join(expoDir, 'tsconfig.base.json');
const expoBaseNoJson = path.join(expoDir, 'tsconfig.base');
if (fs.existsSync(expoBaseWithJson) && !fs.existsSync(expoBaseNoJson)) {
  fs.copyFileSync(expoBaseWithJson, expoBaseNoJson);
}

// Ensure expo-notifications tsconfig.json is self-contained
const notificationsTsconfig = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'tsconfig.json');
if (fs.existsSync(notificationsTsconfig)) {
  const tsConfigContent = fs.readFileSync(notificationsTsconfig, 'utf8');
  if (tsConfigContent.includes('expo-module-scripts/tsconfig.base')) {
    fs.writeFileSync(
      notificationsTsconfig,
      JSON.stringify(
        {
          compilerOptions: { rootDir: './src', outDir: './build', skipLibCheck: true },
          include: ['./src'],
          exclude: ['**/__mocks__/*', '**/__tests__/*', '**/__rsc_tests__/*'],
        },
        null,
        2
      ),
      'utf8'
    );
  }
}
