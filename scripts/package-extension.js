#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 TwinkleTouch Extension 패키징을 시작합니다...\n');

const BUILD_DIR = 'build';
const EXTENSION_DIR = path.join(BUILD_DIR, 'extension');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

try {
  // 이전 빌드 정리
  if (fs.existsSync(BUILD_DIR)) {
    console.log('🧹 이전 빌드 디렉토리 정리...');
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }

  // 빌드 디렉토리 생성
  fs.mkdirSync(EXTENSION_DIR, { recursive: true });
  console.log('📁 빌드 디렉토리 생성 완료');

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
  console.log('📋 필수 파일 복사 중...');
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
  console.log('\n📄 선택적 파일 복사 중...');
  for (const file of optionalFiles) {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(EXTENSION_DIR, file));
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ⚪ ${file} (없음)`);
    }
  }

  // 디렉토리 복사
  console.log('\n📂 디렉토리 복사 중...');
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      copyDir(dir, path.join(EXTENSION_DIR, dir));
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ⚪ ${dir}/ (없음)`);
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

  console.log('\n🚫 개발용 파일 제외 확인...');
  for (const file of devFiles) {
    if (!fs.existsSync(path.join(EXTENSION_DIR, file))) {
      console.log(`  ✅ ${file} (제외됨)`);
    } else {
      console.log(`  ⚠️  ${file} (포함됨 - 확인 필요)`);
    }
  }

  // ZIP 파일 생성
  console.log('\n🗜️  ZIP 파일 생성 중...');
  const zipName = `twinkle-touch-extension-v${manifest.version}.zip`;
  const zipPath = path.join(BUILD_DIR, zipName);

  process.chdir(EXTENSION_DIR);
  execSync(`zip -r ../${zipName} .`, { stdio: 'inherit' });
  process.chdir('../..');

  // 파일 크기 확인
  const stats = fs.statSync(zipPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`\n✅ 패키징 완료!`);
  console.log(`📦 파일: ${zipPath}`);
  console.log(`📏 크기: ${fileSizeMB} MB`);

  // Chrome Web Store 제한 확인 (25MB)
  if (stats.size > 25 * 1024 * 1024) {
    console.log('⚠️  경고: 파일 크기가 25MB를 초과합니다. Chrome Web Store 업로드가 제한될 수 있습니다.');
  }

  // 패키지 검증
  console.log('\n🔍 패키지 검증 중...');
  const files = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
  
  console.log('📋 패키지 내용:');
  console.log(files);

  // 성공 메시지
  console.log('\n🎉 Extension 패키징이 성공적으로 완료되었습니다!');
  console.log('\n📖 다음 단계:');
  console.log('1. Chrome에서 chrome://extensions/ 페이지 열기');
  console.log('2. "개발자 모드" 활성화');
  console.log('3. "압축해제된 확장 프로그램을 로드합니다" 클릭');
  console.log(`4. ${EXTENSION_DIR} 폴더 선택`);
  console.log('');
  console.log('또는');
  console.log('');
  console.log('1. Chrome Web Store Developer Dashboard에 로그인');
  console.log(`2. ${zipName} 파일 업로드`);

} catch (error) {
  console.error('❌ 패키징 중 오류가 발생했습니다:');
  console.error(error.message);
  process.exit(1);
}

// 디렉토리 재귀 복사 함수
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
} 