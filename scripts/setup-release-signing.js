#!/usr/bin/env node

/**
 * Setup Release Signing Script
 *
 * This script configures the build.gradle file for production signing.
 * Run this after adding your keys folder with the keystore file.
 *
 * Usage: node scripts/setup-release-signing.js
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
const keystorePropertiesPath = path.join(__dirname, '../keys/keystore.properties');

console.log('Setting up release signing...\n');

// Check if keystore.properties exists
if (!fs.existsSync(keystorePropertiesPath)) {
  console.error('Error: keys/keystore.properties not found!');
  console.log('\nPlease create keys/keystore.properties with the following content:\n');
  console.log('PASTELLA_RELEASE_STORE_FILE=../../keys/pastella-release.keystore');
  console.log('PASTELLA_RELEASE_KEY_ALIAS=pastella');
  console.log('PASTELLA_RELEASE_STORE_PASSWORD=your_password_here');
  console.log('PASTELLA_RELEASE_KEY_PASSWORD=your_password_here\n');
  process.exit(1);
}

// Check if keystore file exists
const keystoreFile = path.join(__dirname, '../keys/pastella-release.keystore');
if (!fs.existsSync(keystoreFile)) {
  console.warn('Warning: keys/pastella-release.keystore not found!');
  console.log('   Make sure to place your keystore file in the keys/ folder.\n');
}

// Read build.gradle
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

// Check if already configured
if (buildGradle.includes('Load keystore properties from local file')) {
  console.log('Release signing already configured in build.gradle');
  console.log('   If you want to reconfigure, remove the existing keystore configuration first.\n');
  process.exit(0);
}

// Find the line "def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()"
const projectRootLine = "def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()";

if (!buildGradle.includes(projectRootLine)) {
  console.error('Error: Could not find projectRoot line in build.gradle');
  console.log('   The file structure may have changed.\n');
  process.exit(1);
}

// Add keystore properties loading after projectRoot line
const keystorePropertiesCode = `
// Load keystore properties from local file (not committed to git)
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("../keys/keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

buildGradle = buildGradle.replace(
  projectRootLine,
  projectRootLine + keystorePropertiesCode
);

// Add release signing config after debug signing config
const debugSigningConfig = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const releaseSigningConfig = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Use production keystore if keystore.properties exists, otherwise fall back to debug
            if (keystoreProperties['PASTELLA_RELEASE_STORE_FILE']) {
                storeFile file(keystoreProperties['PASTELLA_RELEASE_STORE_FILE'])
                storePassword keystoreProperties['PASTELLA_RELEASE_STORE_PASSWORD']
                keyAlias keystoreProperties['PASTELLA_RELEASE_KEY_ALIAS']
                keyPassword keystoreProperties['PASTELLA_RELEASE_KEY_PASSWORD']
            } else {
                // Fallback to debug keystore if production keystore not configured
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

buildGradle = buildGradle.replace(debugSigningConfig, releaseSigningConfig);

// Update release build type to use release signing config
const releaseSigningConfigLine = `signingConfig signingConfigs.debug`;
const releaseSigningConfigReplacement = `// Use production keystore if configured, otherwise falls back to debug
            signingConfig signingConfigs.release`;

// Only replace the first occurrence (in release buildType)
buildGradle = buildGradle.replace(
  `release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
  `release {
            // Use production keystore if configured, otherwise falls back to debug
            signingConfig signingConfigs.release`
);

// Write the updated build.gradle
fs.writeFileSync(buildGradlePath, buildGradle, 'utf8');

console.log('Release signing configured successfully!\n');
console.log('build.gradle has been updated with:');
console.log('  • Keystore properties loading from keys/keystore.properties');
console.log('  • Release signing configuration');
console.log('  • Release build type now uses production keystore\n');
console.log('You can now build with: npm run build:apk\n');
