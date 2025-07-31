#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Starting TwinkleTouch Extension packaging...\n');

const BUILD_DIR = 'build';
const EXTENSION_DIR = path.join(BUILD_DIR, 'extension');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

try {
  // 이전 빌드 정리
  if (fs.existsSync(BUILD_DIR)) {
    console.log('🧹 Cleaning previous build directory...');
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }

  // 빌드 디렉토리 생성
  fs.mkdirSync(EXTENSION_DIR, { recursive: true });
      console.log('📁 Build directory created');

  // 필수 파일 목록
  const requiredFiles = [
    'manifest.json',
    'content.js',
    'popup.html'
  ];

  // 선택적 파일 목록
  const optionalFiles = [
    'popup.js',
    'popup.css',
    'styles.css',
    'background.js'
  ];

  // 디렉토리 목록
  const directories = [
    'icons',
    'images',
    'assets'
  ];

  // 필수 파일 복사
      console.log('📋 Copying required files...');
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(EXTENSION_DIR, file));
      console.log(`  ✅ ${file}`);
    } else {
      console.error(`  ❌ 필수 파일 없음: ${file}`);
      process.exit(1);
    }
  }

  // 선택적 파일 복사
      console.log('\n📄 Copying optional files...');
  for (const file of optionalFiles) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(EXTENSION_DIR, file));
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⚪ ${file} (not found)`);
    }
  }

  // 디렉토리 복사
      console.log('\n📂 Copying directories...');
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      copyDir(dir, path.join(EXTENSION_DIR, dir));
      console.log(`  ✅ ${dir}/`);
    } else {
              console.log(`  ⚪ ${dir}/ (not found)`);
    }
  }

  // 개발용 파일 제외 확인
  const devFiles = [
    'package.json',
    'package-lock.json',
    'node_modules',
    'tests',
    '.github',
    '.git',
    'playwright.config.js',
    '.eslintrc.js',
    'scripts',
    'build',
    'test-results',
    'playwright-report'
  ];

      console.log('\n🚫 Checking excluded development files...');
  for (const file of devFiles) {
    if (!fs.existsSync(path.join(EXTENSION_DIR, file))) {
              console.log(`  ✅ ${file} (excluded)`);
    } else {
              console.log(`  ⚠️  ${file} (included - needs verification)`);
    }
  }

  // ZIP 파일 생성
      console.log('\n🗜️  Creating ZIP file...');
  const zipName = `twinkle-touch-extension-v${manifest.version}.zip`;
  const zipPath = path.join(BUILD_DIR, zipName);

  process.chdir(EXTENSION_DIR);
  execSync(`zip -r ../${zipName} .`, { stdio: 'inherit' });
  process.chdir('../..');

  // 파일 크기 확인
  const stats = fs.statSync(zipPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
      console.log(`\n✅ Packaging complete!`);
      console.log(`📦 File: ${zipPath}`);
    console.log(`📏 Size: ${fileSizeMB} MB`);

  // Chrome Web Store 제한 확인 (25MB)
  if (stats.size > 25 * 1024 * 1024) {
    console.log('⚠️  Warning: File size exceeds 25MB. Chrome Web Store upload may be restricted.');
  }

  // 패키지 검증
      console.log('\n🔍 Verifying package...');
  const files = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
  
      console.log('📋 Package contents:');
  console.log(files);

  // 성공 메시지
      console.log('\n🎉 Extension packaging completed successfully!');
      console.log('\n📖 Next steps:');
    console.log('1. Open chrome://extensions/ in Chrome');
    console.log('2. Enable "Developer mode"');
    console.log('3. Click "Load unpacked extension"');
    console.log(`4. Select ${EXTENSION_DIR} folder`);
    console.log('');
    console.log('Or');
    console.log('');
    console.log('1. Login to Chrome Web Store Developer Dashboard');
    console.log(`2. Upload ${zipName} file`);

} catch (error) {
      console.error('❌ Error occurred during packaging:');
  console.error(error.message);
  process.exit(1);
}

// 디렉토리 재귀 복사 함수
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  // 제외할 파일/폴더 목록
  const excludeFiles = [
    '.DS_Store',
    'Thumbs.db',
    '.git',
    '.gitignore',
    'node_modules',
    '*.log',
    '*.tmp'
  ];

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // 제외할 파일인지 확인
    const shouldExclude = excludeFiles.some(exclude => {
      if (exclude.includes('*')) {
        const pattern = exclude.replace('*', '');
        return entry.name.includes(pattern);
      }
      return entry.name === exclude;
    });

    if (shouldExclude) {
      console.log(`    ⚪ ${entry.name} (excluded)`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`    📄 ${entry.name}`);
    }
  }
} 