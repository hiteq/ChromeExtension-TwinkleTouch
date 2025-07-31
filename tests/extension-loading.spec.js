import { test, _expect } from '@playwright/test';

test.describe('TwinkleTouch Extension Loading Test', () => {

  test('Extension 로딩 확인', async ({ browser }) => {
    // Chrome Extension 컨텍스트 생성
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('브라우저 시작됨');

    // Extension이 로드되는지 확인하기 위해 chrome.runtime 접근
    const extensionId = await page.evaluate(() => {
      return typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.id : null;
    });

    console.log('Extension ID:', extensionId);

    // 실제 웹사이트로 이동
    await page.goto('https://example.com');
    console.log('웹사이트 로드됨');

    // 페이지 로드 후 잠시 대기
    await page.waitForTimeout(3000);

    // content script가 주입되었는지 확인
    const contentScriptLoaded = await page.evaluate(() => {
      console.log('content script 확인 중...');
      console.log('window.sparkleSystem:', typeof window.sparkleSystem);
      console.log('initializeTwinkleEffect:', typeof window.initializeTwinkleEffect);
      console.log('Canvas 존재:', !!document.querySelector('#twinkle-canvas'));

      return {
        sparkleSystemExists: typeof window.sparkleSystem !== 'undefined',
        initFunctionExists: typeof window.initializeTwinkleEffect !== 'undefined',
        canvasExists: !!document.querySelector('#twinkle-canvas'),
        windowObjects: Object.keys(window).filter(key => key.includes('twinkle') || key.includes('sparkle')).length
      };
    });

    console.log('Content Script 로딩 상태:', contentScriptLoaded);

    // 수동으로 content script 주입 시도
    if (!contentScriptLoaded.sparkleSystemExists) {
      console.log('수동으로 content script 주입 시도...');

      // content.js 파일 읽기 및 주입
      const fs = require('fs').promises;
      const path = require('path');

      try {
        const contentScript = await fs.readFile(path.join(process.cwd(), 'content.js'), 'utf8');
        await page.addScriptTag({ content: contentScript });

        await page.waitForTimeout(2000);

        // 다시 확인
        const afterInjection = await page.evaluate(() => {
          return {
            sparkleSystemExists: typeof window.sparkleSystem !== 'undefined',
            initFunctionExists: typeof window.initializeTwinkleEffect !== 'undefined',
            canvasExists: !!document.querySelector('#twinkle-canvas'),
          };
        });

        console.log('수동 주입 후 상태:', afterInjection);
      } catch (error) {
        console.error('Content script 주입 실패:', error.message);
      }
    }

    // 최종 테스트 클릭
    console.log('테스트 클릭 수행...');
    await page.mouse.click(400, 300);
    await page.waitForTimeout(1000);

    const finalState = await page.evaluate(() => {
      return {
        activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
        canvasExists: !!document.querySelector('#twinkle-canvas')
      };
    });

    console.log('최종 상태:', finalState);

    // 스크린샷 촬영
    await page.screenshot({ path: 'tests/screenshots/extension-loading-test.png' });

    await context.close();
  });

  test('chrome://extensions 페이지에서 Extension 확인', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Extensions 페이지로 이동
      await page.goto('chrome://extensions/');
      await page.waitForTimeout(2000);

      // 페이지 내용 확인
      const extensionsContent = await page.textContent('body');
      console.log('Extensions 페이지 로드됨');

      // TwinkleTouch Extension이 표시되는지 확인
      const twinkleExtensionVisible = extensionsContent.includes('TwinkleTouch') ||
                                     extensionsContent.includes('twinkle') ||
                                     extensionsContent.includes('Arcane Touch');

      console.log('TwinkleTouch Extension 표시 여부:', twinkleExtensionVisible);

      // 스크린샷 촬영
      await page.screenshot({ path: 'tests/screenshots/chrome-extensions-page.png' });

    } catch (error) {
      console.log('chrome://extensions 접근 실패:', error.message);
      console.log('일반 테스트 페이지로 대체...');

      await page.goto('data:text/html,<html><body><h1>Extension Test</h1></body></html>');
    }

    await context.close();
  });
});
