const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    // Only accept JSON files
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Build APK endpoint
app.post('/api/build', upload.single('googleServicesFile'), async (req, res) => {
  const { url, appName, packageName } = req.body;

  // Validate inputs
  if (!url || !appName || !packageName) {
    return res.status(400).json({ error: 'Missing required fields: url, appName, packageName' });
  }

  // Validate package name format
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageName)) {
    return res.status(400).json({ error: 'Invalid package name format. Use: com.example.app' });
  }

  // Handle google-services.json file upload if provided
  const googleServicesPath = path.join(__dirname, '..', 'lite-service', 'android', 'app', 'google-services.json');
  
  if (req.file) {
    // Validate file name
    if (req.file.originalname !== 'google-services.json') {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File must be named "google-services.json"' });
    }

    try {
      // Copy uploaded file to replace google-services.json
      fs.copyFileSync(req.file.path, googleServicesPath);
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      console.log('✅ Replaced google-services.json with uploaded file');
    } catch (error) {
      // Clean up temporary file on error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: `Failed to save google-services.json: ${error.message}` });
    }
  }

  // Set up Server-Sent Events for streaming output
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Create a modified version of build-apk.js that accepts command line arguments
  const buildScriptPath = path.join(__dirname, '..', 'build-apk.js');
  const projectRoot = path.join(__dirname, '..');

  // Run build script with command line arguments
  const buildProcess = spawn('node', [buildScriptPath, url, appName, packageName], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Stream stdout
  buildProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // Send each chunk immediately for real-time streaming
    res.write(`data: ${JSON.stringify({ type: 'stdout', data: output })}\n\n`);
  });

  // Stream stderr
  buildProcess.stderr.on('data', (data) => {
    const output = data.toString();
    // Send each chunk immediately for real-time streaming
    res.write(`data: ${JSON.stringify({ type: 'stderr', data: output })}\n\n`);
  });

  // Handle completion
  buildProcess.on('close', (code) => {
    if (code === 0) {
      // Find the generated APK
      const apkDir = path.join(projectRoot, 'lite-service', 'android', 'app', 'build', 'outputs', 'apk', 'release');
      
      // Try to find APK file, prioritizing universal
      let apkPath = null;
      if (fs.existsSync(apkDir)) {
        const findApk = (dir) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          const apks = [];
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const subApks = findApk(fullPath);
              apks.push(...subApks);
            } else if (entry.name.endsWith('.apk') && !entry.name.includes('unaligned')) {
              apks.push(fullPath);
            }
          }
          return apks;
        };
        
        const allApks = findApk(apkDir);
        
        // Prioritize universal APK
        const universalApk = allApks.find(apk => apk.includes('universal'));
        if (universalApk) {
          apkPath = universalApk;
        } else if (allApks.length > 0) {
          // Fallback to first APK found
          apkPath = allApks[0];
        }
      }

      if (apkPath && fs.existsSync(apkPath)) {
        const apkFileName = path.basename(apkPath);
        res.write(`data: ${JSON.stringify({ type: 'success', apkPath: `/api/download/${encodeURIComponent(apkFileName)}`, apkName: apkFileName })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'success', message: 'Build completed but APK not found. Check build output.' })}\n\n`);
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: `Build failed with exit code ${code}` })}\n\n`);
    }
    res.end();
  });

  // Handle errors
  buildProcess.on('error', (error) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  });
});

// Download APK endpoint
app.get('/api/download/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const apkDir = path.join(__dirname, '..', 'lite-service', 'android', 'app', 'build', 'outputs', 'apk', 'release');

  // Try to find the APK file recursively, prioritizing universal
  let foundApk = null;
  if (fs.existsSync(apkDir)) {
    const findApk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const apks = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subApks = findApk(fullPath);
          apks.push(...subApks);
        } else if (entry.name.endsWith('.apk') && !entry.name.includes('unaligned')) {
          apks.push(fullPath);
        }
      }
      return apks;
    };
    
    const allApks = findApk(apkDir);
    
    // If filename is specified and matches, use it
    if (filename) {
      const matchingApk = allApks.find(apk => apk.includes(filename) || path.basename(apk) === filename);
      if (matchingApk) {
        foundApk = matchingApk;
      }
    }
    
    // If not found by filename, prioritize universal APK
    if (!foundApk) {
      const universalApk = allApks.find(apk => apk.includes('universal'));
      if (universalApk) {
        foundApk = universalApk;
      } else if (allApks.length > 0) {
        // Fallback to first APK found
        foundApk = allApks[0];
      }
    }
  }

  if (foundApk && fs.existsSync(foundApk)) {
    const downloadFilename = path.basename(foundApk);
    res.download(foundApk, downloadFilename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download APK' });
      }
    });
  } else {
    res.status(404).json({ error: 'APK file not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 APK Builder Web Server running on http://localhost:${PORT}`);
});

