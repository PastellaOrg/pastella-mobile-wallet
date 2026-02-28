const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found. Skipping cleartext traffic setup.');
  process.exit(0);
}

let content = fs.readFileSync(manifestPath, 'utf8');

// Check if usesCleartextTraffic is already set
if (content.includes('android:usesCleartextTraffic="true"')) {
  console.log('✓ Cleartext traffic already enabled in AndroidManifest.xml');
  process.exit(0);
}

// Add usesCleartextTraffic="true" to the application tag
const applicationTagRegex = /(<application[^>]*)(>)/;
const replacement = '$1 android:usesCleartextTraffic="true"$2';

if (applicationTagRegex.test(content)) {
  content = content.replace(applicationTagRegex, replacement);
  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log('✓ Added android:usesCleartextTraffic="true" to AndroidManifest.xml');
} else {
  console.log('✗ Could not find <application> tag in AndroidManifest.xml');
  process.exit(1);
}
