const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('TwinkleTouch Extension 디버깅', () => {
  let context;
  let page;

  test('Extension 파일 및 구조 확인', async ({ browser }) => {
    console.log('\n=== Extension 파일 구조 검사 ===');

    const projectRoot = process.cwd();
    console.log(`프로젝트 루트: ${projectRoot}`);

    // 필수 파일들 확인
    const requiredFiles = ['manifest.json', 'content.js', 'popup.html'];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      const exists = fs.existsSync(filePath);
      console.log(`${file}: ${exists ? '✅ 존재' : '❌ 없음'}`);

      if (exists) {
        const stat = fs.statSync(filePath);
        console.log(`  크기: ${stat.size} bytes`);

        if (file === 'manifest.json') {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const manifest = JSON.parse(content);
            console.log(`  매니페스트 버전: ${manifest.manifest_version}`);
            console.log(`  이름: ${manifest.name}`);
            console.log(`  권한: ${JSON.stringify(manifest.permissions || [])}`);
            console.log(`  콘텐츠 스크립트: ${JSON.stringify(manifest.content_scripts || [])}`);
          } catch (error) {
            console.log(`  ❌ 매니페스트 파싱 오류: ${error.message}`);
          }
        }
      }
    }
  });

  test('Content Script 기능 테스트', async ({ browser }) => {
    console.log('\n=== Content Script 기능 테스트 ===');

    context = await browser.newContext();
    page = await context.newPage();

    // 테스트 페이지로 이동
    await page.goto('https://example.com');
    console.log('✅ 테스트 페이지 로드 완료');

    // content.js 수동 주입
    const contentScriptPath = path.join(process.cwd(), 'content.js');

    if (fs.existsSync(contentScriptPath)) {
      const contentScript = fs.readFileSync(contentScriptPath, 'utf8');
      console.log(`Content Script 크기: ${contentScript.length} 문자`);

      try {
        await page.addScriptTag({ content: contentScript });
        console.log('✅ Content Script 주입 성공');

        await page.waitForTimeout(2000);

        // 초기화 상태 확인
        const scriptState = await page.evaluate(() => {
          const results = {
            windowObjects: Object.keys(window).filter(key =>
              key.toLowerCase().includes('twinkle') ||
              key.toLowerCase().includes('wizard') ||
              key.toLowerCase().includes('sparkle') ||
              key.includes('Effect')
            ),
            canvasExists: !!document.querySelector('#twinkle-canvas'),
            globalVariables: {
              wizardMode: typeof window.wizardMode !== 'undefined' ? window.wizardMode : 'undefined',
              isActive: typeof window.isActive !== 'undefined' ? window.isActive : 'undefined',
              effectLevel: typeof window.effectLevel !== 'undefined' ? window.effectLevel : 'undefined',
              sparkleSystem: typeof window.sparkleSystem !== 'undefined' ? 'object' : 'undefined'
            },
            functions: {
              initializeTwinkleEffect: typeof window.initializeTwinkleEffect === 'function',
              CanvasSparkleSystem: typeof window.CanvasSparkleSystem === 'function'
            }
          };

          return results;
        });

        console.log('Script 상태:', JSON.stringify(scriptState, null, 2));

        // 강제 초기화 시도
        const initResult = await page.evaluate(() => {
          try {
            // 전역 변수 강제 설정
            window.wizardMode = 'archmage';
            window.effectLevel = 1.0;
            window.isActive = true;

            // 초기화 함수 호출
            if (typeof window.initializeTwinkleEffect === 'function') {
              window.initializeTwinkleEffect();
              return { success: true, message: 'initializeTwinkleEffect 호출 성공' };
            } else {
              return { success: false, message: 'initializeTwinkleEffect 함수를 찾을 수 없음' };
            }
          } catch (error) {
            return { success: false, message: `초기화 오류: ${error.message}` };
          }
        });

        console.log('초기화 결과:', initResult);

        await page.waitForTimeout(1000);

        // 초기화 후 상태 확인
        const afterInit = await page.evaluate(() => ({
          canvasExists: !!document.querySelector('#twinkle-canvas'),
          wizardMode: window.wizardMode,
          isActive: window.isActive,
          sparkleSystemExists: !!window.sparkleSystem
        }));

        console.log('초기화 후 상태:', afterInit);

        // 클릭 테스트
        if (afterInit.isActive) {
          console.log('\n클릭 테스트 시작...');

          await page.click('body', { position: { x: 400, y: 300 } });
          await page.waitForTimeout(1000);

          const afterClick = await page.evaluate(() => ({
            canvasExists: !!document.querySelector('#twinkle-canvas'),
            activeSparkles: window.sparkleSystem ? window.sparkleSystem.poolSize : 'sparkleSystem 없음',
            mode: window.wizardMode
          }));

          console.log('클릭 후 상태:', afterClick);
        } else {
          console.log('⚠️  isActive가 false여서 클릭 테스트를 건너뜁니다.');
        }

      } catch (error) {
        console.log(`❌ Content Script 테스트 실패: ${error.message}`);
      }
    } else {
      console.log('❌ content.js 파일을 찾을 수 없습니다');
    }
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });
});
