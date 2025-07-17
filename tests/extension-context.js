const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Extension 로딩을 위한 최적화된 브라우저 컨텍스트 생성
 */
async function createExtensionContext(options = {}) {
  const extensionPath = path.join(__dirname, '..');
  
  // 임시 사용자 데이터 디렉토리 생성
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-extension-'));
  
  try {
    // launchPersistentContext 사용으로 변경
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-timer-throttling',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      ignoreDefaultArgs: ['--disable-extensions'],
      ...options
    });

    // 기본 페이지 가져오기 (새 페이지 생성하지 않음)
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    return { context, page, userDataDir };
    
  } catch (error) {
    // 실패 시 임시 디렉토리 정리
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Extension이 로드된 페이지 생성 및 초기화
 */
export async function createExtensionPage(context, url = 'https://example.com') {
  const page = await context.newPage();
  
  // Extension 로딩 로그 수집
  page.on('console', msg => {
    if (msg.text().includes('TwinkleTouch') || 
        msg.text().includes('Extension') || 
        msg.text().includes('마법사') ||
        msg.text().includes('sparkle')) {
      console.log(`[페이지 로그] ${msg.text()}`);
    }
  });
  
  // 네트워크 오류 로깅
  page.on('pageerror', error => {
    console.log(`[페이지 오류] ${error.message}`);
  });
  
  // 테스트 페이지로 이동
  await page.goto(url);
  console.log(`페이지 로드됨: ${url}`);
  
  // Extension 초기화 대기
  await page.waitForTimeout(3000);
  
  return page;
}

/**
 * Extension 로딩 상태 확인
 */
async function verifyExtensionLoaded(page) {
  try {
    // Extension ID 확인
    const extensionId = await page.evaluate(async () => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
          resolve(chrome.runtime.id);
        } else {
          // Background script가 로드될 때까지 대기
          setTimeout(() => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
              resolve(chrome.runtime.id);
            } else {
              resolve(null);
            }
          }, 1000);
        }
      });
    });

    console.log(`Extension ID: ${extensionId || 'null'}`);

    if (!extensionId) {
      console.warn('Extension ID를 찾을 수 없습니다. 수동으로 content script를 주입합니다.');
      return false;
    }

    // Content script 상태 확인
    const contentScriptLoaded = await page.evaluate(() => {
      return typeof window.twinkleDebug !== 'undefined';
    });

    console.log(`Content script 로드됨: ${contentScriptLoaded}`);
    return contentScriptLoaded;

  } catch (error) {
    console.error('Extension 로딩 확인 중 오류:', error);
    return false;
  }
}

/**
 * Content script 수동 주입
 */
async function injectContentScript(page) {
  try {
    console.log('Content script를 수동으로 주입합니다...');
    
    const contentScriptPath = path.join(__dirname, '..', 'content.js');
    const contentScript = fs.readFileSync(contentScriptPath, 'utf8');
    
    await page.addScriptTag({
      content: contentScript
    });

    // 초기화 대기
    await page.waitForTimeout(1000);

    // 초기화 확인
    const initialized = await page.evaluate(() => {
      return typeof window.twinkleDebug !== 'undefined';
    });

    console.log(`수동 주입 후 초기화 상태: ${initialized}`);
    return initialized;

  } catch (error) {
    console.error('Content script 수동 주입 실패:', error);
    return false;
  }
}

/**
 * Extension 강제 초기화
 */
async function forceExtensionInitialization(page) {
  try {
    console.log('Extension 강제 초기화를 시작합니다...');
    
    await page.evaluate(() => {
      // 기존 캔버스 제거
      const existingCanvas = document.querySelector('#twinkle-canvas');
      if (existingCanvas) {
        existingCanvas.remove();
      }

      // 강제 초기화 트리거
      if (typeof window.initializeTwinkleTouch === 'function') {
        window.initializeTwinkleTouch();
      }
    });

    await page.waitForTimeout(500);

    // 초기화 확인
    const canvasExists = await page.evaluate(() => {
      return document.querySelector('#twinkle-canvas') !== null;
    });

    console.log(`강제 초기화 후 캔버스 존재: ${canvasExists}`);
    return canvasExists;

  } catch (error) {
    console.error('강제 초기화 실패:', error);
    return false;
  }
}

/**
 * 임시 디렉토리 정리
 */
async function cleanupUserDataDir(userDataDir) {
  try {
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
      console.log(`임시 디렉토리 정리 완료: ${userDataDir}`);
    }
  } catch (error) {
    console.warn(`임시 디렉토리 정리 실패: ${error.message}`);
  }
}

module.exports = {
  createExtensionContext,
  verifyExtensionLoaded,
  injectContentScript,
  forceExtensionInitialization,
  cleanupUserDataDir
}; 