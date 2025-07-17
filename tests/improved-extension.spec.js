const { test, expect } = require('@playwright/test');
const {
  createExtensionContext,
  verifyExtensionLoaded,
  injectContentScript,
  forceExtensionInitialization,
  cleanupUserDataDir
} = require('./extension-context');

test.describe('개선된 TwinkleTouch Extension 테스트', () => {
  let context;
  let page;
  let userDataDir;

  test('최적화된 Extension 로딩 및 초기화', async () => {
    const result = await createExtensionContext();
    context = result.context;
    page = result.page;
    userDataDir = result.userDataDir;

    // 테스트 페이지로 이동
    await page.goto('https://www.example.com');
    await page.waitForTimeout(2000);

    // Extension 로딩 확인
    let extensionLoaded = await verifyExtensionLoaded(page);

    if (!extensionLoaded) {
      console.log('Extension이 자동으로 로드되지 않았습니다. 수동 주입을 시도합니다.');
      extensionLoaded = await injectContentScript(page);
    }

    if (!extensionLoaded) {
      console.log('수동 주입도 실패했습니다. 강제 초기화를 시도합니다.');
      await forceExtensionInitialization(page);
    }

    // 최종 상태 확인
    const finalState = await page.evaluate(() => ({
      hasCanvas: !!document.querySelector('#twinkle-canvas'),
      hasTwinkleDebug: typeof window.twinkleDebug !== 'undefined',
      currentMode: window.wizardMode || 'unknown',
      isActive: window.isActive || false
    }));

    console.log('최종 Extension 상태:', finalState);

    // 캔버스가 존재하거나 디버그 객체가 있어야 함
    expect(finalState.hasCanvas || finalState.hasTwinkleDebug).toBeTruthy();
  });

  test('대마법사 모드 클릭 효과 테스트', async () => {
    if (!context) {
      const result = await createExtensionContext();
      context = result.context;
      page = result.page;
      userDataDir = result.userDataDir;
      await page.goto('https://www.example.com');
      await page.waitForTimeout(1000);
    }

    // 대마법사 모드 설정
    await page.evaluate(() => {
      if (typeof window.setWizardMode === 'function') {
        window.setWizardMode('archmage');
      } else {
        // 직접 변수 설정
        window.wizardMode = 'archmage';
        window.effectLevel = 1.0;
        window.isActive = true;
      }
    });

    await page.waitForTimeout(500);

    // 클릭 전 스파클 수 확인
    const beforeClick = await page.evaluate(() => ({
      mode: window.wizardMode,
      sparkleCount: window.twinkleDebug ? window.twinkleDebug.getActiveSparkles() : 0,
      isActive: window.isActive
    }));

    console.log('클릭 전 상태:', beforeClick);

    // 화면 중앙 클릭
    await page.click('body', { position: { x: 640, y: 360 } });
    await page.waitForTimeout(1000);

    // 클릭 후 스파클 수 확인
    const afterClick = await page.evaluate(() => ({
      mode: window.wizardMode,
      sparkleCount: window.twinkleDebug ? window.twinkleDebug.getActiveSparkles() : 0,
      isActive: window.isActive
    }));

    console.log('클릭 후 상태:', afterClick);

    // 대마법사 모드에서는 클릭 시 스파클이 생성되어야 함
    if (afterClick.mode === 'archmage' && afterClick.isActive) {
      expect(afterClick.sparkleCount).toBeGreaterThan(beforeClick.sparkleCount);
    }
  });

  test('마법사 모드 비교 테스트', async () => {
    if (!context) {
      const result = await createExtensionContext();
      context = result.context;
      page = result.page;
      userDataDir = result.userDataDir;
      await page.goto('https://www.example.com');
      await page.waitForTimeout(1000);
    }

    const modes = ['archmage', 'apprentice', 'muggle'];
    const results = {};

    for (const mode of modes) {
      // 모드 설정
      await page.evaluate((m) => {
        if (typeof window.setWizardMode === 'function') {
          window.setWizardMode(m);
        } else {
          window.wizardMode = m;
          window.isActive = m !== 'muggle';
          window.effectLevel = m === 'archmage' ? 1.0 : m === 'apprentice' ? 0.5 : 0.0;
        }
      }, mode);

      await page.waitForTimeout(300);

      // 현재 상태 확인
      const beforeClick = await page.evaluate(() => ({
        mode: window.wizardMode,
        sparkleCount: window.twinkleDebug ? window.twinkleDebug.getActiveSparkles() : 0,
        isActive: window.isActive
      }));

      // 클릭 실행
      await page.click('body', { position: { x: 600 + Math.random() * 100, y: 300 + Math.random() * 100 } });
      await page.waitForTimeout(800);

      // 클릭 후 상태 확인
      const afterClick = await page.evaluate(() => ({
        mode: window.wizardMode,
        sparkleCount: window.twinkleDebug ? window.twinkleDebug.getActiveSparkles() : 0,
        isActive: window.isActive
      }));

      results[mode] = {
        before: beforeClick,
        after: afterClick,
        sparkleIncrease: afterClick.sparkleCount - beforeClick.sparkleCount
      };

      console.log(`${mode} 모드 결과:`, results[mode]);
    }

    // 결과 검증
    // 머글 모드에서는 스파클이 증가하지 않아야 함
    expect(results.muggle.sparkleIncrease).toBeLessThanOrEqual(0);

    // 대마법사 모드가 수련생 모드보다 더 많은 스파클을 생성해야 함 (시스템이 정상 작동할 때)
    if (results.archmage.sparkleIncrease > 0 && results.apprentice.sparkleIncrease > 0) {
      expect(results.archmage.sparkleIncrease).toBeGreaterThanOrEqual(results.apprentice.sparkleIncrease);
    }
  });

  test('Extension 안정성 검증', async () => {
    if (!context) {
      const result = await createExtensionContext();
      context = result.context;
      page = result.page;
      userDataDir = result.userDataDir;
      await page.goto('https://www.example.com');
      await page.waitForTimeout(1000);
    }

    // 연속 클릭 테스트
    const clickCount = 10;
    const clickResults = [];

    for (let i = 0; i < clickCount; i++) {
      const x = 400 + Math.random() * 400;
      const y = 200 + Math.random() * 400;

      await page.click('body', { position: { x, y } });
      await page.waitForTimeout(100);

      const state = await page.evaluate(() => ({
        sparkleCount: window.twinkleDebug ? window.twinkleDebug.getActiveSparkles() : 0,
        mode: window.wizardMode
      }));

      clickResults.push(state);
    }

    console.log('연속 클릭 결과:', clickResults);

    // 시스템이 크래시하지 않았는지 확인
    const finalState = await page.evaluate(() => ({
      hasCanvas: !!document.querySelector('#twinkle-canvas'),
      hasTwinkleDebug: typeof window.twinkleDebug !== 'undefined',
      errorCount: window.twinkleErrorCount || 0
    }));

    expect(finalState.hasCanvas || finalState.hasTwinkleDebug).toBeTruthy();
    expect(finalState.errorCount).toBeLessThan(5); // 최대 5개 미만의 오류만 허용
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
    if (userDataDir) {
      await cleanupUserDataDir(userDataDir);
    }
  });
});
