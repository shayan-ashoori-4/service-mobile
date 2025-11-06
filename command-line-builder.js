#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const CONFIG_PATH = path.join(__dirname, 'lite-service', 'app', 'config.ts');
const MANIFEST_PATH = path.join(__dirname, 'lite-service', 'app', 'manifest.ts');
const APP_JSON_PATH = path.join(__dirname, 'lite-service', 'app.json');
const STRINGS_XML_PATH = path.join(__dirname, 'lite-service', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const BUILD_GRADLE_PATH = path.join(__dirname, 'lite-service', 'android', 'app', 'build.gradle');
const GOOGLE_SERVICES_JSON_PATH = path.join(__dirname, 'lite-service', 'android', 'app', 'google-services.json');
const ANDROID_MANIFEST_PATH = path.join(__dirname, 'lite-service', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const SETTINGS_GRADLE_PATH = path.join(__dirname, 'lite-service', 'android', 'settings.gradle');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask for URL
function askForUrl() {
  return new Promise((resolve) => {
    rl.question('🌐 Enter website URL: ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to ask for app name
function askForAppName() {
  return new Promise((resolve) => {
    rl.question('📱 Enter application name: ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to ask for package name
function askForPackageName() {
  return new Promise((resolve) => {
    rl.question('📦 Enter package name (e.g., com.example.app): ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to find all Kotlin files in a directory recursively
function findKotlinFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findKotlinFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.kt')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function buildApk() {
  // Ask for URL
  const webUrl = await askForUrl();
  
  if (!webUrl) {
    console.error('❌ Error: URL cannot be empty');
    rl.close();
    process.exit(1);
  }

  // Ask for app name
  const appName = await askForAppName();
  
  if (!appName) {
    console.error('❌ Error: Application name cannot be empty');
    rl.close();
    process.exit(1);
  }

  // Ask for package name
  const packageName = await askForPackageName();
  rl.close();
  
  if (!packageName) {
    console.error('❌ Error: Package name cannot be empty');
    process.exit(1);
  }

  // Validate package name format
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName)) {
    console.error('❌ Error: Invalid package name format. Use: com.example.app');
    process.exit(1);
  }

  // Normalize URL
  let normalizedUrl = webUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }
  
  try {
    // Update config.ts
    console.log('📝 Updating config.ts...');
    let configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    configContent = configContent.replace(
      /BASE_URL:\s*['"`][^'"`]+['"`]/,
      `BASE_URL: '${normalizedUrl}'`
    );
    fs.writeFileSync(CONFIG_PATH, configContent, 'utf8');
    console.log(`✅ Updated BASE_URL to: ${normalizedUrl}`);
    
    // Update app.json with application name
    console.log('📝 Updating app.json...');
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    // Sanitize name for React Native (must be valid identifier, no spaces/special chars)
    const sanitizedAppName = appName.replace(/[^a-zA-Z0-9]/g, '') || 'App';
    appJson.name = sanitizedAppName;
    appJson.displayName = appName;
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
    console.log(`✅ Updated app name to: ${appName} (registered as: ${sanitizedAppName})`);
    
    // Update Android strings.xml with application name
    console.log('📝 Updating Android strings.xml...');
    let stringsContent = fs.readFileSync(STRINGS_XML_PATH, 'utf8');
    stringsContent = stringsContent.replace(
      /<string name="app_name">[^<]+<\/string>/,
      `<string name="app_name">${appName}</string>`
    );
    fs.writeFileSync(STRINGS_XML_PATH, stringsContent, 'utf8');
    console.log(`✅ Updated Android app name to: ${appName}`);
    
    // Update Android settings.gradle with app name
    console.log('📝 Updating Android settings.gradle...');
    if (fs.existsSync(SETTINGS_GRADLE_PATH)) {
      let settingsContent = fs.readFileSync(SETTINGS_GRADLE_PATH, 'utf8');
      settingsContent = settingsContent.replace(
        /rootProject\.name\s*=\s*['"][^'"]+['"]/,
        `rootProject.name = '${sanitizedAppName}'`
      );
      fs.writeFileSync(SETTINGS_GRADLE_PATH, settingsContent, 'utf8');
      console.log(`✅ Updated rootProject.name to: ${sanitizedAppName}`);
    }
    
    // Update Android build.gradle with package name
    console.log('📝 Updating Android build.gradle...');
    let gradleContent = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');
    
    // Update namespace
    gradleContent = gradleContent.replace(
      /namespace\s+["'][^"']+["']/,
      `namespace "${packageName}"`
    );
    
    // Update applicationId
    gradleContent = gradleContent.replace(
      /applicationId\s+["'][^"']+["']/,
      `applicationId "${packageName}"`
    );
    
    // Re-enable Google Services plugin (we'll update google-services.json)
    gradleContent = gradleContent.replace(
      /\/\/\s*apply plugin:\s*["']com\.google\.gms\.google-services["'].*/,
      'apply plugin: "com.google.gms.google-services"'
    );
    if (!gradleContent.includes('apply plugin: "com.google.gms.google-services"')) {
      // Add it if it doesn't exist
      gradleContent = gradleContent.replace(
        /apply plugin:\s*["']com\.facebook\.react["']/,
        'apply plugin: "com.facebook.react"\napply plugin: "com.google.gms.google-services"'
      );
    }
    
    // Re-enable Firebase dependencies
    gradleContent = gradleContent.replace(
      /\/\/\s*implementation platform\('com\.google\.firebase:firebase-bom:[^']+'\).*/,
      "implementation platform('com.google.firebase:firebase-bom:33.9.0')"
    );
    gradleContent = gradleContent.replace(
      /\/\/\s*implementation\s+['"]com\.google\.firebase:firebase-analytics['"].*/,
      "implementation 'com.google.firebase:firebase-analytics'"
    );
    
    // Disable Sentry gradle plugin to avoid build errors
    gradleContent = gradleContent.replace(
      /apply from: new File\(\["node", "--print", "require\.resolve\('@sentry\/react-native\/package\.json'\)"\]\.execute\(\)\.text\.trim\(\), "\.\.\/sentry\.gradle"\)/,
      '// apply from: new File(["node", "--print", "require.resolve(\'@sentry/react-native/package.json\')"].execute().text.trim(), "../sentry.gradle") // Disabled: Sentry upload causes build failures'
    );
    
    fs.writeFileSync(BUILD_GRADLE_PATH, gradleContent, 'utf8');
    console.log(`✅ Updated package name to: ${packageName}`);
    console.log(`✅ Re-enabled Google Services`);
    
    // Update or create google-services.json with new package name
    console.log('📝 Updating/Creating google-services.json...');
    if (fs.existsSync(GOOGLE_SERVICES_JSON_PATH)) {
      let googleServices = JSON.parse(fs.readFileSync(GOOGLE_SERVICES_JSON_PATH, 'utf8'));
      
      // Update package_name in the client array
      if (googleServices.client && Array.isArray(googleServices.client) && googleServices.client.length > 0) {
        if (googleServices.client[0].client_info && googleServices.client[0].client_info.android_client_info) {
          googleServices.client[0].client_info.android_client_info.package_name = packageName;
          fs.writeFileSync(GOOGLE_SERVICES_JSON_PATH, JSON.stringify(googleServices, null, 2), 'utf8');
          console.log(`✅ Updated google-services.json package_name to: ${packageName}`);
        }
      }
    } else {
      // Create a default google-services.json file
      console.log('📝 Creating default google-services.json...');
      const defaultGoogleServices = {
        project_info: {
          project_number: "000000000000",
          project_id: "default-project",
          storage_bucket: "default-project.appspot.com"
        },
        client: [
          {
            client_info: {
              mobilesdk_app_id: "1:000000000000:android:0000000000000000000000",
              android_client_info: {
                package_name: packageName
              }
            },
            oauth_client: [],
            api_key: [
              {
                current_key: "AIzaSyDummyKeyForBuildPurposesOnly"
              }
            ],
            services: {
              appinvite_service: {
                other_platform_oauth_client: []
              }
            }
          }
        ],
        configuration_version: "1"
      };
      
      fs.writeFileSync(
        GOOGLE_SERVICES_JSON_PATH,
        JSON.stringify(defaultGoogleServices, null, 2),
        'utf8'
      );
      console.log(`✅ Created default google-services.json with package_name: ${packageName}`);
      console.warn('⚠️  Note: This is a default file. For Firebase features to work, you need to download the real google-services.json from Firebase Console.');
    }
    
    // Find all Kotlin files and update package names
    console.log('📝 Finding and updating all Kotlin files...');
    const javaDir = path.join(__dirname, 'lite-service', 'android', 'app', 'src', 'main', 'java');
    const allKotlinFiles = findKotlinFiles(javaDir);
    
    if (allKotlinFiles.length === 0) {
      console.warn('⚠️  Warning: No Kotlin files found');
    } else {
      // Find the old package directory by reading the first Kotlin file
      let oldPackageName = null;
      if (allKotlinFiles.length > 0) {
        const firstFileContent = fs.readFileSync(allKotlinFiles[0], 'utf8');
        const packageMatch = firstFileContent.match(/^package\s+([^\n]+)/m);
        if (packageMatch) {
          oldPackageName = packageMatch[1];
        }
      }
      
      const oldPackageDir = oldPackageName ? path.join(javaDir, ...oldPackageName.split('.')) : null;
      const newPackageDir = path.join(javaDir, ...packageName.split('.'));
      
      // Create new package directory
      if (!fs.existsSync(newPackageDir)) {
        fs.mkdirSync(newPackageDir, { recursive: true });
      }
      
      // Update and move each Kotlin file
      for (const kotlinFile of allKotlinFiles) {
        let fileContent = fs.readFileSync(kotlinFile, 'utf8');
        
        // Update package declaration
        fileContent = fileContent.replace(
          /^package\s+[^\n]+/m,
          `package ${packageName}`
        );
        
        // Update MainActivity.kt app name registration
        if (kotlinFile.endsWith('MainActivity.kt')) {
          fileContent = fileContent.replace(
            /override fun getMainComponentName\(\): String = ["'][^"']+["']/,
            `override fun getMainComponentName(): String = "${sanitizedAppName}"`
          );
        }
        
        // Determine new file path
        const fileName = path.basename(kotlinFile);
        const newFilePath = path.join(newPackageDir, fileName);
        
        // Write to new location
        fs.writeFileSync(newFilePath, fileContent, 'utf8');
        
        // Delete old file if it's in a different location
        if (kotlinFile !== newFilePath) {
          fs.unlinkSync(kotlinFile);
        }
        
        console.log(`✅ Updated and moved ${fileName} to new package`);
      }
      
      // Clean up old package directories if empty
      if (oldPackageDir && oldPackageDir !== newPackageDir && fs.existsSync(oldPackageDir)) {
        try {
          const cleanupDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir);
            if (entries.length === 0) {
              fs.rmdirSync(dir);
              const parentDir = path.dirname(dir);
              if (parentDir !== javaDir && parentDir !== path.dirname(javaDir)) {
                cleanupDir(parentDir);
              }
            }
          };
          cleanupDir(oldPackageDir);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    
    // Update manifest.ts - add new pattern to linkPatterns
    console.log('📝 Adding new pattern to manifest.ts linkPatterns...');
    let manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    
    // Escape URL for regex pattern in TypeScript string
    const urlPattern = normalizedUrl
      .replace(/\\/g, '\\\\')
      .replace(/\./g, '\\.')
      .replace(/\//g, '\\/')
      .replace(/\$/g, '\\$')
      .replace(/\*/g, '\\*')
      .replace(/\+/g, '\\+')
      .replace(/\?/g, '\\?')
      .replace(/\^/g, '\\^')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\|/g, '\\|')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
    
    // Find the linkPatterns array and add new object at the beginning
    const linkPatternsRegex = /(linkPatterns:\s*\[)/;
    
    if (linkPatternsRegex.test(manifestContent)) {
      const newPatternObject = `$1
      {
        pattern: '^${urlPattern}',
        action: 'webview',
      },`;
      
      manifestContent = manifestContent.replace(linkPatternsRegex, newPatternObject);
      fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf8');
      console.log(`✅ Added new pattern to linkPatterns: ^${normalizedUrl} (opens in webview)`);
    } else {
      console.warn('⚠️  Warning: Could not find linkPatterns array in manifest.ts');
    }
    
    // Update manifest.ts if it has package name in URLs (like Cafebazaar link)
    manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const oldPackagePattern = /com\.digikala\.(test|fresh|wealth|gold)/g;
    if (oldPackagePattern.test(manifestContent)) {
      // Replace old package names in URLs with new one
      manifestContent = manifestContent.replace(
        /https?:\/\/[^'"]*\/(com\.digikala\.(test|fresh|wealth|gold))/g,
        (match, pkg) => match.replace(pkg, packageName)
      );
      fs.writeFileSync(MANIFEST_PATH, manifestContent, 'utf8');
      console.log(`✅ Updated package name in manifest.ts URLs`);
    }
    
    const liteServiceDir = path.join(__dirname, 'lite-service');
    const keystorePath = path.join(liteServiceDir, 'android', 'app', 'debug.keystore');
    
    // Check and create debug keystore if it doesn't exist
    if (!fs.existsSync(keystorePath)) {
      console.log('\n🔑 Creating debug keystore...');
      try {
        await execAsync(
          `keytool -genkeypair -v -storetype PKCS12 -keystore "${keystorePath}" -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"`,
          { cwd: liteServiceDir }
        );
        console.log('✅ Debug keystore created');
      } catch (error) {
        console.warn('⚠️  Warning: Could not create keystore:', error.message);
        console.warn('   The build may fail if keystore is required.');
      }
    }
    
    // Clear Metro bundler cache before building
    console.log('\n🧹 Clearing Metro bundler cache...');
    try {
      await execAsync('yarn start --reset-cache &', { cwd: liteServiceDir });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await execAsync('pkill -f "react-native start" || true', { cwd: liteServiceDir });
    } catch (error) {
      // Ignore cache clear errors
      console.log('Cache clear completed (or skipped)');
    }
    
    // Build Android APK
    console.log('\n🔨 Building Android APK...');
    console.log('This may take a few minutes...\n');
    
    const { stdout, stderr } = await execAsync('yarn android:build', {
      cwd: liteServiceDir,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000 // 10 minutes
    });
    
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    
    console.log('\n✅ Build completed!');
    console.log('APK location: lite-service/android/app/build/outputs/apk/release/');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    if (error.stdout) {
      console.error('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr);
    }
    process.exit(1);
  }
}

buildApk();
