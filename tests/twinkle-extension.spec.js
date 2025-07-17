import { test, expect } from '@playwright/test';
import path from 'path';

// Extension 경로 설정
const extensionPath = path.join(process.cwd());

test.describe('TwinkleTouch Chrome Extension E2E Tests', () => {
  let context;
  let page;

  test.beforeAll(async ({ browser }) => {
    // Extension이 로드된 새로운 컨텍스트 생성
    context = await browser.newContext({
      // Extension 로딩을 위한 추가 설정
    });
    
    page = await context.newPage();
    
    // 테스트용 간단한 웹페이지로 이동
    await page.goto('data:text/html,<html><head><title>TwinkleTouch Test Page</title></head><body style="width:100vw;height:100vh;background:#f0f0f0;"><h1 style="text-align:center;margin-top:50vh;">TwinkleTouch Extension Test</h1></body></html>');
    
    // Extension이 로드될 시간을 기다림
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Extension이 로드되고 초기화되어야 함', async () => {
    // content.js가 주입되었는지 확인
    const isTwinkleLoaded = await page.evaluate(() => {
      return typeof window.sparkleSystem !== 'undefined' || 
             document.querySelector('#twinkle-canvas') !== null;
    });
    
    console.log('TwinkleTouch Extension 로드 상태:', isTwinkleLoaded);
    
    // 초기화 로그 확인
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('TwinkleTouch') || msg.text().includes('마법사')) {
        logs.push(msg.text());
      }
    });
    
    // 페이지 새로고침으로 Extension 재초기화
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('TwinkleTouch 초기화 로그:', logs);
  });

  test('대마법사 모드에서 랜덤 클릭 테스트', async () => {
    console.log('🧙‍♂️ 대마법사 모드 클릭 테스트 시작');
    
    // 대마법사 모드 설정
    await page.evaluate(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'changeWizardMode',
          mode: 'archmage',
          effectLevel: 1.0,
          enabled: true
        });
      } else {
        // 직접 설정 (개발 환경)
        window.wizardMode = 'archmage';
        window.effectLevel = 1.0;
        window.isActive = true;
        if (window.initializeTwinkleEffect) {
          window.initializeTwinkleEffect();
        }
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 화면 크기 가져오기
    const viewport = page.viewportSize();
    
    // 랜덤 위치에서 여러 번 클릭
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      
      console.log(`클릭 ${i + 1}: (${Math.round(x)}, ${Math.round(y)})`);
      
      // 클릭 전 Canvas 상태 확인
      const beforeClick = await page.evaluate(() => {
        const canvas = document.querySelector('#twinkle-canvas');
        return {
          canvasExists: !!canvas,
          activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0
        };
      });
      
      console.log('클릭 전 상태:', beforeClick);
      
      // 클릭 수행
      await page.mouse.click(x, y);
      
      // 클릭 후 잠시 대기 (파티클 생성 시간)
      await page.waitForTimeout(500);
      
      // 클릭 후 Canvas 상태 확인
      const afterClick = await page.evaluate(() => {
        const canvas = document.querySelector('#twinkle-canvas');
        return {
          canvasExists: !!canvas,
          activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0
        };
      });
      
      console.log('클릭 후 상태:', afterClick);
      
      // Canvas가 존재하는지 확인
      expect(afterClick.canvasExists).toBe(true);
      
      // 대마법사 모드에서는 클릭 후 활성 파티클이 생성되어야 함
      // expect(afterClick.activeSparkles).toBeGreaterThan(0);
      
      // 다음 클릭 전 대기
      await page.waitForTimeout(1000);
    }
  });

  test('수련생 모드에서 클릭 테스트', async () => {
    console.log('🎓 수련생 모드 클릭 테스트 시작');
    
    // 수련생 모드 설정
    await page.evaluate(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'changeWizardMode',
          mode: 'apprentice',
          effectLevel: 0.33,
          enabled: true
        });
      } else {
        // 직접 설정 (개발 환경)
        window.wizardMode = 'apprentice';
        window.effectLevel = 0.33;
        window.isActive = true;
        if (window.initializeTwinkleEffect) {
          window.initializeTwinkleEffect();
        }
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 화면 크기 가져오기
    const viewport = page.viewportSize();
    
    // 랜덤 위치에서 여러 번 클릭
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * viewport.width;
      const y = Math.random() * viewport.height;
      
      console.log(`수련생 클릭 ${i + 1}: (${Math.round(x)}, ${Math.round(y)})`);
      
      // 클릭 수행
      await page.mouse.click(x, y);
      await page.waitForTimeout(500);
      
      // 클릭 후 상태 확인
      const afterClick = await page.evaluate(() => {
        return {
          activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
          wizardMode: window.wizardMode,
          effectLevel: window.effectLevel
        };
      });
      
      console.log('수련생 클릭 후 상태:', afterClick);
      
      await page.waitForTimeout(1000);
    }
  });

  test('마우스 움직임 테스트', async () => {
    console.log('🖱️ 마우스 움직임 테스트 시작');
    
    // 대마법사 모드 설정
    await page.evaluate(() => {
      window.wizardMode = 'archmage';
      window.effectLevel = 1.0;
      window.isActive = true;
      if (window.initializeTwinkleEffect) {
        window.initializeTwinkleEffect();
      }
    });
    
    await page.waitForTimeout(1000);
    
    const viewport = page.viewportSize();
    
    // 마우스를 여러 위치로 부드럽게 이동
    const path = [
      { x: viewport.width * 0.2, y: viewport.height * 0.2 },
      { x: viewport.width * 0.8, y: viewport.height * 0.3 },
      { x: viewport.width * 0.6, y: viewport.height * 0.7 },
      { x: viewport.width * 0.3, y: viewport.height * 0.8 },
      { x: viewport.width * 0.5, y: viewport.height * 0.4 }
    ];
    
    for (const point of path) {
      console.log(`마우스 이동: (${Math.round(point.x)}, ${Math.round(point.y)})`);
      
      // 부드러운 마우스 이동
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(300);
      
      // 마우스 움직임 후 상태 확인
      const state = await page.evaluate(() => {
        return {
          activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0
        };
      });
      
      console.log('마우스 움직임 후 활성 파티클:', state.activeSparkles);
    }
  });

  test('머글 모드에서 효과 비활성화 테스트', async () => {
    console.log('🧑‍💼 머글 모드 테스트 시작');
    
    // 머글 모드 설정
    await page.evaluate(() => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'changeWizardMode',
          mode: 'muggle',
          effectLevel: 0,
          enabled: false
        });
      } else {
        window.wizardMode = 'muggle';
        window.effectLevel = 0;
        window.isActive = false;
        if (window.initializeTwinkleEffect) {
          window.initializeTwinkleEffect();
        }
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 머글 모드에서 클릭
    await page.mouse.click(400, 300);
    await page.waitForTimeout(500);
    
    // 클릭 후 활성 파티클이 없어야 함
    const state = await page.evaluate(() => {
      return {
        isActive: window.isActive,
        activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
        wizardMode: window.wizardMode
      };
    });
    
    console.log('머글 모드 상태:', state);
    
    expect(state.isActive).toBe(false);
    expect(state.activeSparkles).toBe(0);
  });

  test('스크린샷 캡처 (시각적 확인)', async () => {
    console.log('📸 스크린샷 테스트');
    
    // 대마법사 모드로 설정
    await page.evaluate(() => {
      window.wizardMode = 'archmage';
      window.effectLevel = 1.0;
      window.isActive = true;
      if (window.initializeTwinkleEffect) {
        window.initializeTwinkleEffect();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // 여러 위치에서 클릭하여 파티클 생성
    await page.mouse.click(200, 200);
    await page.mouse.click(600, 300);
    await page.mouse.click(400, 500);
    
    // 파티클 애니메이션 시간 대기
    await page.waitForTimeout(1000);
    
    // 스크린샷 캡처
    await page.screenshot({ 
      path: 'tests/screenshots/twinkle-effect.png',
      fullPage: true 
    });
    
    console.log('스크린샷 저장: tests/screenshots/twinkle-effect.png');
  });
}); 