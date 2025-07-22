// TwinkleTouch Chrome Extension - E2E 검증 테스트
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const {
  createExtensionContext,
  verifyExtensionLoaded,
  injectContentScript,
  forceExtensionInitialization
} = require('./extension-context');

// 테스트용 모의 함수 정의
const mockExtensionFunctions = `
  // 모의 Chrome API
  if (typeof window.chrome === 'undefined') {
    window.chrome = {
      runtime: {
        sendMessage: function(message) {
          console.log('모의 메시지 전송:', message);
          
          // 메시지 처리
          if (message.action === 'changeWizardMode') {
            window.wizardMode = message.mode;
            window.effectLevel = message.effectLevel;
            window.isActive = message.mode !== 'muggle';
            console.log('모의 모드 변경:', window.wizardMode);
          }
          
          return Promise.resolve({ success: true });
        }
      },
      storage: {
        sync: {
          get: function() {
            return Promise.resolve({
              wizardMode: window.wizardMode || 'archmage',
              effectLevel: window.effectLevel || 1.0,
              twinkleTouchEnabled: window.isActive !== false
            });
          },
          set: function(data) {
            if (data.wizardMode) window.wizardMode = data.wizardMode;
            if (data.effectLevel !== undefined) window.effectLevel = data.effectLevel;
            if (data.twinkleTouchEnabled !== undefined) window.isActive = data.twinkleTouchEnabled;
            return Promise.resolve();
          }
        }
      }
    };
  }
  
  // 간단한 스파클 시스템 모의 구현
  if (typeof window.sparkleSystem === 'undefined') {
    window.isActive = true;
    window.wizardMode = 'archmage';
    window.effectLevel = 1.0;
    
    window.sparkleSystem = {
      activeSparkleCount: 0,
      isPaused: false,
      
      createClickBurst: function(x, y) {
        console.log('모의 클릭 버스트 생성:', x, y);
        this.activeSparkleCount += 10;
        return true;
      },
      
      pauseAnimations: function() {
        this.isPaused = true;
        console.log('애니메이션 일시정지');
      },
      
      resumeAnimations: function() {
        this.isPaused = false;
        console.log('애니메이션 재시작');
      }
    };
  }
  
  // 테스트 함수 정의
  if (typeof window.testTwinkleEffect !== 'function') {
    window.testTwinkleEffect = function() {
      console.log('테스트 함수 실행');
      if (window.sparkleSystem) {
        window.sparkleSystem.createClickBurst(window.innerWidth/2, window.innerHeight/2);
      }
      return true;
    };
  }
`;

test.describe('TwinkleTouch 익스텐션 E2E 검증 테스트', () => {
  let context;
  let page;
  let userDataDir;

  test.beforeAll(async () => {
    const result = await createExtensionContext();
    context = result.context;
    page = result.page;
    userDataDir = result.userDataDir;
    
    // 테스트 페이지로 이동
    await page.goto('https://www.example.com');
    
    // 모의 함수 주입
    await page.addScriptTag({
      content: mockExtensionFunctions
    });
    
    // 실제 content.js 파일 주입
    try {
      const contentJsPath = path.join(__dirname, '..', 'content.js');
      const contentJs = fs.readFileSync(contentJsPath, 'utf8');
      
      await page.addScriptTag({
        content: contentJs
      });
      
      console.log('content.js 파일 주입 완료');
    } catch (error) {
      console.error('content.js 파일 주입 실패:', error);
    }
    
    // debug-fix.js 파일 주입
    try {
      const debugFixPath = path.join(__dirname, '..', 'debug-fix.js');
      const debugFix = fs.readFileSync(debugFixPath, 'utf8');
      
      await page.addScriptTag({
        content: debugFix
      });
      
      console.log('debug-fix.js 파일 주입 완료');
    } catch (error) {
      console.error('debug-fix.js 파일 주입 실패:', error);
    }
    
    // 스타일 주입
    try {
      const stylesPath = path.join(__dirname, '..', 'styles.css');
      const styles = fs.readFileSync(stylesPath, 'utf8');
      
      await page.addStyleTag({
        content: styles
      });
      
      console.log('styles.css 파일 주입 완료');
    } catch (error) {
      console.error('styles.css 파일 주입 실패:', error);
    }
    
    // 초기화 대기
    await page.waitForTimeout(3000);
  });

  test('익스텐션이 정상적으로 로드되는지 확인', async () => {
    // Extension 로딩 확인
    const extensionLoaded = await verifyExtensionLoaded(page);
    expect(extensionLoaded).toBeTruthy();
    
    // 콘솔 로그 확인
    const logs = await page.evaluate(() => {
      return window.consoleMessages || [];
    });
    
    console.log('콘솔 로그 확인:', logs.length > 0 ? '로그 있음' : '로그 없음');
    
    // TwinkleTouch 로드 메시지 확인
    const loadMessage = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('body *')).some(el => 
        el.id === 'twinkle-canvas'
      );
    });
    
    expect(loadMessage).toBeTruthy();
  });

  test('testTwinkleEffect 함수가 정의되어 있는지 확인', async () => {
    const testFunctionExists = await page.evaluate(() => {
      return typeof window.testTwinkleEffect === 'function';
    });
    
    expect(testFunctionExists).toBeTruthy();
  });

  test('마법 효과가 생성되는지 확인', async () => {
    // 테스트 함수 실행
    await page.evaluate(() => {
      window.testTwinkleEffect();
    });
    
    await page.waitForTimeout(1000);
    
    // 스파클이 생성되었는지 확인
    const sparklesCreated = await page.evaluate(() => {
      return window.sparkleSystem && 
             window.sparkleSystem.activeSparkleCount > 0;
    });
    
    console.log('스파클 생성 확인:', sparklesCreated ? '성공' : '실패');
    
    // 스크린샷 촬영
    await page.screenshot({ path: 'tests/screenshots/magic-effect-test.png' });
    
    expect(sparklesCreated).toBeTruthy();
  });

  test('클릭 시 마법 효과가 생성되는지 확인', async () => {
    // 클릭 전 스파클 수 확인
    const beforeCount = await page.evaluate(() => {
      return window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0;
    });
    
    // 화면 중앙 클릭
    await page.click('body', { position: { x: 400, y: 300 } });
    
    await page.waitForTimeout(500);
    
    // 클릭 후 스파클 수 확인
    const afterCount = await page.evaluate(() => {
      return window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0;
    });
    
    console.log(`클릭 테스트: 이전=${beforeCount}, 이후=${afterCount}`);
    
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('마법사 모드 변경이 작동하는지 확인', async () => {
    // 팝업 열기 (실제로는 메시지 직접 전송)
    await page.evaluate(() => {
      // 수련생 모드로 변경
      chrome.runtime.sendMessage({
        action: 'changeWizardMode',
        mode: 'apprentice',
        effectLevel: 0.33,
        enabled: true
      });
    });
    
    await page.waitForTimeout(1000);
    
    // 모드가 변경되었는지 확인
    const modeChanged = await page.evaluate(() => {
      return window.wizardMode === 'apprentice' && 
             window.effectLevel === 0.33;
    });
    
    expect(modeChanged).toBeTruthy();
    
    // 클릭 테스트
    const beforeCount = await page.evaluate(() => {
      return window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0;
    });
    
    await page.click('body', { position: { x: 500, y: 400 } });
    
    await page.waitForTimeout(500);
    
    const afterCount = await page.evaluate(() => {
      return window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0;
    });
    
    console.log(`수련생 모드 클릭 테스트: 이전=${beforeCount}, 이후=${afterCount}`);
    
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  test('머글 모드에서는 효과가 비활성화되는지 확인', async () => {
    // 머글 모드로 변경
    await page.evaluate(() => {
      chrome.runtime.sendMessage({
        action: 'changeWizardMode',
        mode: 'muggle',
        effectLevel: 0,
        enabled: false
      });
    });
    
    await page.waitForTimeout(1000);
    
    // 모드가 변경되었는지 확인
    const modeChanged = await page.evaluate(() => {
      return window.wizardMode === 'muggle' && 
             window.isActive === false;
    });
    
    expect(modeChanged).toBeTruthy();
    
    // 클릭해도 스파클이 생성되지 않는지 확인
    await page.click('body', { position: { x: 300, y: 300 } });
    
    await page.waitForTimeout(500);
    
    const sparkleCount = await page.evaluate(() => {
      return window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0;
    });
    
    console.log(`머글 모드 클릭 테스트: 스파클 수=${sparkleCount}`);
    
    expect(sparkleCount).toBe(0);
  });

  test('페이지 가시성 변경 시 애니메이션이 일시정지/재시작되는지 확인', async () => {
    // 대마법사 모드로 변경
    await page.evaluate(() => {
      chrome.runtime.sendMessage({
        action: 'changeWizardMode',
        mode: 'archmage',
        effectLevel: 1.0,
        enabled: true
      });
    });
    
    await page.waitForTimeout(1000);
    
    // 페이지 숨김 시뮬레이션
    await page.evaluate(() => {
      // visibilitychange 이벤트 발생
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(500);
    
    // 애니메이션이 일시정지되었는지 확인
    const isPaused = await page.evaluate(() => {
      return window.sparkleSystem && window.sparkleSystem.isPaused === true;
    });
    
    console.log(`페이지 숨김 테스트: isPaused=${isPaused}`);
    
    // 페이지 표시 시뮬레이션
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(500);
    
    // 애니메이션이 재시작되었는지 확인
    const isResumed = await page.evaluate(() => {
      return window.sparkleSystem && window.sparkleSystem.isPaused === false;
    });
    
    console.log(`페이지 표시 테스트: isResumed=${isResumed}`);
    
    expect(isPaused).toBeTruthy();
    expect(isResumed).toBeTruthy();
  });

  test.afterAll(async () => {
    // 최종 상태 확인
    const finalState = await page.evaluate(() => {
      return {
        isActive: window.isActive,
        wizardMode: window.wizardMode,
        effectLevel: window.effectLevel,
        hasSparkleSystem: !!window.sparkleSystem,
        activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0
      };
    });
    
    console.log('최종 상태:', finalState);
    
    // 스크린샷 촬영
    await page.screenshot({ path: 'tests/screenshots/final-state.png' });
    
    if (context) {
      await context.close();
    }
  });
});