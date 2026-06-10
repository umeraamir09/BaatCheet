const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fixElectron() {
  let electronDir;
  try {
    // Resolve the path to the electron package
    const entryPath = require.resolve('electron');
    electronDir = path.dirname(entryPath);
  } catch (err) {
    console.log('Electron package is not installed yet.');
    return;
  }

  const pathTxtPath = path.join(electronDir, 'path.txt');
  let platformPath = 'electron';
  if (process.platform === 'win32') {
    platformPath = 'electron.exe';
  } else if (process.platform === 'darwin') {
    platformPath = 'Electron.app/Contents/MacOS/Electron';
  }

  // 1. Run install.js if the binary is missing
  const binaryPath = path.join(electronDir, 'dist', platformPath);
  if (!fs.existsSync(binaryPath)) {
    console.log('Electron binary not found. Running installer...');
    const installScript = path.join(electronDir, 'install.js');
    if (fs.existsSync(installScript)) {
      spawnSync(process.execPath, [installScript], { stdio: 'inherit' });
    }
  }

  // 2. Fix the path.txt file by trimming any trailing newlines/carriage returns
  if (fs.existsSync(pathTxtPath)) {
    const content = fs.readFileSync(pathTxtPath, 'utf8');
    const trimmed = content.trim();
    if (content !== trimmed) {
      console.log(`Fixing Electron path.txt newline issue (original: ${JSON.stringify(content)} -> trimmed: ${JSON.stringify(trimmed)})`);
      fs.writeFileSync(pathTxtPath, trimmed);
    } else {
      console.log('Electron path.txt is already correct.');
    }
  }
}

fixElectron();
