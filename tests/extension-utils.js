/**
 * TwinkleTouch Extension 테스트 유틸리티 함수들
 */

export class ExtensionTestUtils {
  constructor(page) {
    this.page = page;
  }

  /**
   * Extension이 로드되었는지 확인
   */
  async isExtensionLoaded() {
    return await this.page.evaluate(() => {
      return typeof window.sparkleSystem !== 'undefined' ||
             document.querySelector('#twinkle-canvas') !== null ||
             typeof window.initializeTwinkleEffect !== 'undefined';
    });
  }

  /**
   * 마법사 모드 설정
   */
  async setWizardMode(mode, effectLevel) {
    await this.page.evaluate(({ mode, effectLevel }) => {
      window.wizardMode = mode;
      window.effectLevel = effectLevel;

      if (mode === 'muggle') {
        window.isActive = false;
      } else {
        window.isActive = true;
      }

      if (window.initializeTwinkleEffect) {
        window.initializeTwinkleEffect();
      }

      console.log(`마법사 모드 변경: ${mode} (효과 레벨: ${effectLevel})`);
    }, { mode, effectLevel });

    await this.page.waitForTimeout(500);
  }

  /**
   * Canvas 상태 확인
   */
  async getCanvasState() {
    return await this.page.evaluate(() => {
      const canvas = document.querySelector('#twinkle-canvas');
      return {
        canvasExists: !!canvas,
        canvasWidth: canvas ? canvas.width : 0,
        canvasHeight: canvas ? canvas.height : 0,
        activeSparkles: window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
        wizardMode: window.wizardMode || 'unknown',
        effectLevel: window.effectLevel || 0,
        isActive: window.isActive || false
      };
    });
  }

  /**
   * 랜덤한 위치에서 클릭
   */
  async randomClick(viewport) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;

    console.log(`랜덤 클릭: (${Math.round(x)}, ${Math.round(y)})`);

    const beforeState = await this.getCanvasState();
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(300);
    const afterState = await this.getCanvasState();

    return {
      position: { x: Math.round(x), y: Math.round(y) },
      beforeState,
      afterState,
      particlesGenerated: afterState.activeSparkles - beforeState.activeSparkles
    };
  }

  /**
   * 여러 번 랜덤 클릭
   */
  async performRandomClicks(count, viewport) {
    const results = [];

    for (let i = 0; i < count; i++) {
      const result = await this.randomClick(viewport);
      results.push({
        clickNumber: i + 1,
        ...result
      });

      // 다음 클릭 전 대기
      await this.page.waitForTimeout(500);
    }

    return results;
  }

  /**
   * 마우스 경로 추적
   */
  async traceMousePath(points) {
    const results = [];

    for (const point of points) {
      const beforeState = await this.getCanvasState();

      await this.page.mouse.move(point.x, point.y);
      await this.page.waitForTimeout(200);

      const afterState = await this.getCanvasState();

      results.push({
        position: point,
        beforeState,
        afterState,
        particlesGenerated: afterState.activeSparkles - beforeState.activeSparkles
      });

      console.log(`마우스 이동: (${point.x}, ${point.y}) - 파티클: ${afterState.activeSparkles}`);
    }

    return results;
  }

  /**
   * 성능 메트릭 수집
   */
  async collectPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const metrics = {
        timestamp: Date.now(),
        memory: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        sparkleSystem: window.sparkleSystem ? {
          activeSparkleCount: window.sparkleSystem.activeSparkleCount,
          totalSparklesCreated: window.sparkleSystem.totalSparklesCreated || 0,
          frameRate: window.sparkleSystem.currentFPS || 0
        } : null
      };

      return metrics;
    });
  }

  /**
   * 효과 로그 수집
   */
  async collectEffectLogs() {
    return await this.page.evaluate(() => {
      // 콘솔 로그에서 TwinkleTouch 관련 메시지 필터링
      return window.twinkleLogs || [];
    });
  }

  /**
   * 스크린샷 촬영 (디버깅용)
   */
  async takeDebugScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tests/screenshots/debug-${name}-${timestamp}.png`;

    await this.page.screenshot({
      path: filename,
      fullPage: true
    });

    console.log(`디버그 스크린샷 저장: ${filename}`);
    return filename;
  }

  /**
   * 전체 테스트 리포트 생성
   */
  async generateTestReport(testName, results) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      browserInfo: await this.page.evaluate(() => navigator.userAgent),
      extensionState: await this.getCanvasState(),
      performanceMetrics: await this.collectPerformanceMetrics(),
      results
    };

    console.log('테스트 리포트:', JSON.stringify(report, null, 2));
    return report;
  }
}
