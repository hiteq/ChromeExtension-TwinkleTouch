#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Manifest.json 검증을 시작합니다...\n');

const manifestPath = path.join(process.cwd(), 'manifest.json');

try {
  // 파일 존재 확인
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json 파일을 찾을 수 없습니다!');
    process.exit(1);
  }

  // JSON 파싱
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestContent);

  // 필수 필드 검증
  const requiredFields = {
    'manifest_version': 'number',
    'name': 'string',
    'version': 'string',
    'description': 'string'
  };

  let isValid = true;
  const errors = [];
  const warnings = [];

  // 필수 필드 체크
  for (const [field, expectedType] of Object.entries(requiredFields)) {
    if (!(field in manifest)) {
      errors.push(`필수 필드 '${field}'가 없습니다.`);
      isValid = false;
    } else if (typeof manifest[field] !== expectedType) {
      errors.push(`필드 '${field}'의 타입이 잘못되었습니다. 예상: ${expectedType}, 실제: ${typeof manifest[field]}`);
      isValid = false;
    }
  }

  // 버전 형식 검증
  if (manifest.version) {
    const versionRegex = /^\d+(\.\d+)*$/;
    if (!versionRegex.test(manifest.version)) {
      errors.push(`버전 형식이 잘못되었습니다: ${manifest.version}. 예시: "1.0.0"`);
      isValid = false;
    }
  }

  // Manifest V3 특화 검증
  if (manifest.manifest_version === 3) {
    // Service Worker 확인
    if (!manifest.background?.service_worker) {
      warnings.push('Manifest V3에서는 background.service_worker 사용을 권장합니다.');
    }

    // Host permissions 확인
    if (manifest.content_scripts) {
      for (const script of manifest.content_scripts) {
        if (script.matches?.includes('<all_urls>')) {
          warnings.push('보안상 <all_urls> 대신 구체적인 URL 패턴 사용을 권장합니다.');
        }
      }
    }
  }

  // Content Scripts 파일 존재 확인
  if (manifest.content_scripts) {
    for (const script of manifest.content_scripts) {
      if (script.js) {
        for (const jsFile of script.js) {
          const jsPath = path.join(process.cwd(), jsFile);
          if (!fs.existsSync(jsPath)) {
            errors.push(`Content script 파일을 찾을 수 없습니다: ${jsFile}`);
            isValid = false;
          }
        }
      }
      if (script.css) {
        for (const cssFile of script.css) {
          const cssPath = path.join(process.cwd(), cssFile);
          if (!fs.existsSync(cssPath)) {
            warnings.push(`CSS 파일을 찾을 수 없습니다: ${cssFile}`);
          }
        }
      }
    }
  }

  // 아이콘 파일 존재 확인
  if (manifest.icons) {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullIconPath = path.join(process.cwd(), iconPath);
      if (!fs.existsSync(fullIconPath)) {
        warnings.push(`아이콘 파일을 찾을 수 없습니다: ${iconPath} (${size}px)`);
      }
    }
  }

  // 결과 출력
  console.log('📋 Manifest 정보:');
  console.log(`  이름: ${manifest.name}`);
  console.log(`  버전: ${manifest.version}`);
  console.log(`  설명: ${manifest.description}`);
  console.log(`  Manifest 버전: ${manifest.manifest_version}`);
  
  if (manifest.permissions?.length) {
    console.log(`  권한: ${manifest.permissions.join(', ')}`);
  }

  console.log('\n');

  // 오류 출력
  if (errors.length > 0) {
    console.log('❌ 오류:');
    errors.forEach(error => console.log(`  • ${error}`));
    console.log('');
  }

  // 경고 출력
  if (warnings.length > 0) {
    console.log('⚠️  경고:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
    console.log('');
  }

  if (isValid) {
    console.log('✅ Manifest.json 검증이 성공적으로 완료되었습니다!');
    process.exit(0);
  } else {
    console.log('❌ Manifest.json 검증에 실패했습니다.');
    process.exit(1);
  }

} catch (error) {
  if (error instanceof SyntaxError) {
    console.error('❌ manifest.json의 JSON 형식이 잘못되었습니다:');
    console.error(`   ${error.message}`);
  } else {
    console.error('❌ 검증 중 오류가 발생했습니다:');
    console.error(`   ${error.message}`);
  }
  process.exit(1);
} 