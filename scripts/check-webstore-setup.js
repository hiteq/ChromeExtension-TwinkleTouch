#!/usr/bin/env node

/**
 * Chrome Web Store 배포 설정 상태 확인 스크립트
 * GitHub Secrets 및 Variables 설정 여부를 확인합니다.
 */

const https = require('https');

// 필수 환경 변수들
const REQUIRED_SECRETS = [
    'CHROME_EXTENSION_ID',
    'CHROME_CLIENT_ID', 
    'CHROME_CLIENT_SECRET',
    'CHROME_REFRESH_TOKEN'
];

const REQUIRED_VARIABLES = [
    'ENABLE_CHROME_WEBSTORE_DEPLOY',
    'CHROME_WEBSTORE_AUTO_PUBLISH'
];

function checkEnvironmentVariables() {
    console.log('🔍 Chrome Web Store 배포 설정 상태 확인\n');
    
    // GitHub Secrets 확인 (실제 값은 확인할 수 없음)
    console.log('📋 필수 GitHub Secrets:');
    REQUIRED_SECRETS.forEach(secret => {
        const isSet = process.env[secret] ? '✅' : '❌';
        const value = process.env[secret] ? '(설정됨)' : '(누락)';
        console.log(`  ${isSet} ${secret}: ${value}`);
    });
    
    console.log('\n📋 필수 GitHub Variables:');
    REQUIRED_VARIABLES.forEach(variable => {
        const isSet = process.env[variable] ? '✅' : '❌';
        const value = process.env[variable] || '(누락)';
        console.log(`  ${isSet} ${variable}: ${value}`);
    });
    
    // 설정 상태 요약
    const secretsSet = REQUIRED_SECRETS.filter(s => process.env[s]).length;
    const variablesSet = REQUIRED_VARIABLES.filter(v => process.env[v]).length;
    
    console.log('\n📊 설정 상태 요약:');
    console.log(`  GitHub Secrets: ${secretsSet}/${REQUIRED_SECRETS.length}`);
    console.log(`  GitHub Variables: ${variablesSet}/${REQUIRED_VARIABLES.length}`);
    
    const isReady = secretsSet === REQUIRED_SECRETS.length && variablesSet === REQUIRED_VARIABLES.length;
    
    if (isReady) {
        console.log('\n🎉 Chrome Web Store 자동 배포 준비 완료!');
    } else {
        console.log('\n⚠️  Chrome Web Store 자동 배포 설정이 완료되지 않았습니다.');
        console.log('\n📖 설정 방법:');
        console.log('   docs/CHROME_WEBSTORE_SETUP.md 파일을 참조하세요.');
        console.log('   https://github.com/USERNAME/TwinkleTouch-ChromeExtension/blob/main/docs/CHROME_WEBSTORE_SETUP.md');
    }
    
    return isReady;
}

function testChromeWebStoreAPI() {
    if (!process.env.CHROME_CLIENT_ID || !process.env.CHROME_CLIENT_SECRET || !process.env.CHROME_REFRESH_TOKEN) {
        console.log('\n⏭️  API 테스트 건너뜀 (인증 정보 없음)');
        return;
    }
    
    console.log('\n🧪 Chrome Web Store API 연결 테스트...');
    
    const postData = new URLSearchParams({
        client_id: process.env.CHROME_CLIENT_ID,
        client_secret: process.env.CHROME_CLIENT_SECRET,
        refresh_token: process.env.CHROME_REFRESH_TOKEN,
        grant_type: 'refresh_token'
    }).toString();
    
    const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                
                if (response.access_token) {
                    console.log('✅ Chrome Web Store API 인증 성공');
                    console.log(`   액세스 토큰 길이: ${response.access_token.length} 문자`);
                    console.log(`   토큰 만료: ${response.expires_in}초`);
                } else {
                    console.log('❌ Chrome Web Store API 인증 실패');
                    console.log(`   오류: ${response.error || 'Unknown error'}`);
                    console.log(`   설명: ${response.error_description || 'No description'}`);
                }
            } catch (error) {
                console.log('❌ API 응답 파싱 실패:', error.message);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log('❌ API 요청 실패:', error.message);
    });
    
    req.write(postData);
    req.end();
}

function showUsageInstructions() {
    console.log('\n📖 사용법:');
    console.log('');
    console.log('  # 로컬에서 실행 (환경 변수 없이)');
    console.log('  node scripts/check-webstore-setup.js');
    console.log('');
    console.log('  # GitHub Actions에서 실행 (환경 변수와 함께)');
    console.log('  CHROME_CLIENT_ID=${{ secrets.CHROME_CLIENT_ID }} \\');
    console.log('  CHROME_CLIENT_SECRET=${{ secrets.CHROME_CLIENT_SECRET }} \\');
    console.log('  CHROME_REFRESH_TOKEN=${{ secrets.CHROME_REFRESH_TOKEN }} \\');
    console.log('  ENABLE_CHROME_WEBSTORE_DEPLOY=${{ vars.ENABLE_CHROME_WEBSTORE_DEPLOY }} \\');
    console.log('  node scripts/check-webstore-setup.js');
    console.log('');
}

function main() {
    const isReady = checkEnvironmentVariables();
    
    if (isReady) {
        testChromeWebStoreAPI();
    }
    
    showUsageInstructions();
    
    // 스크립트 종료 코드 (CI/CD에서 사용)
    process.exit(isReady ? 0 : 1);
}

// 스크립트가 직접 실행된 경우에만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    checkEnvironmentVariables,
    testChromeWebStoreAPI,
    REQUIRED_SECRETS,
    REQUIRED_VARIABLES
}; 