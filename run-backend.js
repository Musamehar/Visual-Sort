const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const exePath = path.join(__dirname, 'bin', 'coal_project.exe');
const binDir = path.join(__dirname, 'bin');
const rootDir = __dirname;

console.log('🚀 Running backend...\n');
console.log(`Working Directory: ${rootDir}`);
console.log(`Backend Path: ${exePath}`);
console.log(`Expected output file: ${path.join(rootDir, 'sort_data.txt')}\n`);

const backend = spawn(exePath, {
  stdio: 'inherit',
  cwd: rootDir  // Run from root directory
});

backend.on('close', (code) => {
  console.log(`\n✅ Backend process finished (code: ${code})`);

  // Check if file was created
  const fileInRoot = path.join(rootDir, 'sort_data.txt');
  const fileInBin = path.join(binDir, 'sort_data.txt');

  if (fs.existsSync(fileInRoot)) {
    console.log(`✅ sort_data.txt found in: ${fileInRoot}`);
  } else if (fs.existsSync(fileInBin)) {
    console.log(`⚠️  sort_data.txt found in bin folder, moving to root...`);
    fs.copyFileSync(fileInBin, fileInRoot);
    console.log(`✅ File moved to root directory`);
  } else {
    console.log('❌ sort_data.txt NOT found in either directory');
    console.log('Files in root:', fs.readdirSync(rootDir).filter(f => f.endsWith('.txt')));
    console.log('Files in bin:', fs.readdirSync(binDir).filter(f => f.endsWith('.txt')));
  }

  console.log('\n📌 Now run: npm run frontend\n');
});

backend.on('error', (err) => {
  console.error('❌ Error running backend:', err);
  process.exit(1);
});

