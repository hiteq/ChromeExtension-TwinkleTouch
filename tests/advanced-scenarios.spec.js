import { test, expect } from '@playwright/test';
import { ExtensionTestUtils } from './extension-utils.js';

test.describe('TwinkleTouch Advanced Scenarios', () => {
  let context;
  let page;
  let utils;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    utils = new ExtensionTestUtils(page);
    
    // 테스트 페이지로 이동
    await page.goto('data:text/html,<html><head><title>Advanced Test</title></head><body style="width:100vw;height:100vh;background:linear-gradient(45deg, #1e3c72, #2a5298);"><div style="text-align:center;margin-top:40vh;color:white;font-family:Arial;"><h1>🧙‍♂️ Advanced TwinkleTouch Test Arena</h1><p>Testing magical particle effects across different wizard modes</p></div></body></html>');
    
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('마법사 모드 간 효과 차이 정량적 분석', async () => {
    const modes = [
      { name: 'muggle', effectLevel: 0, emoji: '🧑‍💼' },
      { name: 'apprentice', effectLevel: 0.33, emoji: '🎓' },
      { name: 'archmage', effectLevel: 1.0, emoji: '🧙‍♂️' }
    ];
    
    const results = {};
    const viewport = page.viewportSize();
    
    for (const mode of modes) {
      console.log(`\n${mode.emoji} ${mode.name.toUpperCase()} 모드 테스트 시작`);
      
      await utils.setWizardMode(mode.name, mode.effectLevel);
      await page.waitForTimeout(1000);
      
      // 10번 클릭하여 평균 파티클 생성량 측정
      const clickResults = await utils.performRandomClicks(10, viewport);
      
      // 마우스 움직임 테스트
      const mousePath = [
        { x: viewport.width * 0.1, y: viewport.height * 0.1 },
        { x: viewport.width * 0.9, y: viewport.height * 0.1 },
        { x: viewport.width * 0.9, y: viewport.height * 0.9 },
        { x: viewport.width * 0.1, y: viewport.height * 0.9 },
        { x: viewport.width * 0.5, y: viewport.height * 0.5 }
      ];
      
      const mouseResults = await utils.traceMousePath(mousePath);
      
      // 성능 메트릭 수집
      const performanceMetrics = await utils.collectPerformanceMetrics();
      
      // 결과 분석
      const totalParticlesFromClicks = clickResults.reduce((sum, result) => 
        sum + Math.max(0, result.particlesGenerated), 0);
      const avgParticlesPerClick = totalParticlesFromClicks / clickResults.length;
      
      const totalParticlesFromMouse = mouseResults.reduce((sum, result) => 
        sum + Math.max(0, result.particlesGenerated), 0);
      
      results[mode.name] = {
        mode: mode.name,
        effectLevel: mode.effectLevel,
        clickTests: {
          totalClicks: clickResults.length,
          totalParticlesGenerated: totalParticlesFromClicks,
          averageParticlesPerClick: avgParticlesPerClick,
          maxParticlesInSingleClick: Math.max(...clickResults.map(r => r.particlesGenerated))
        },
        mouseTests: {
          totalPathPoints: mouseResults.length,
          totalParticlesFromMovement: totalParticlesFromMouse,
          averageParticlesPerMovement: totalParticlesFromMouse / mouseResults.length
        },
        performance: performanceMetrics
      };
      
      console.log(`${mode.emoji} ${mode.name} 결과:`, results[mode.name]);
      
      // 모드 간 간격을 위한 대기
      await page.waitForTimeout(2000);
    }
    
    // 모드 간 효과 차이 검증
    console.log('\n📊 마법사 모드 간 효과 차이 분석:');
    
    // 머글 모드는 파티클이 거의 또는 전혀 생성되지 않아야 함
    expect(results.muggle.clickTests.averageParticlesPerClick).toBeLessThanOrEqual(1);
    
    // 수련생 모드는 적당한 효과
    expect(results.apprentice.clickTests.averageParticlesPerClick).toBeGreaterThan(
      results.muggle.clickTests.averageParticlesPerClick
    );
    
    // 대마법사 모드는 최대 효과
    expect(results.archmage.clickTests.averageParticlesPerClick).toBeGreaterThan(
      results.apprentice.clickTests.averageParticlesPerClick
    );
    
    // 효과 비율 검증 (수련생 : 대마법사 ≈ 1:3)
    const ratio = results.archmage.clickTests.averageParticlesPerClick / 
                  results.apprentice.clickTests.averageParticlesPerClick;
    
    console.log(`대마법사/수련생 효과 비율: ${ratio.toFixed(2)}:1`);
    expect(ratio).toBeGreaterThan(2); // 최소 2배 이상 차이
    
    // 전체 결과 리포트 생성
    await utils.generateTestReport('wizard-mode-comparison', results);
  });

  test('연속 클릭 버스트 스트레스 테스트', async () => {
    console.log('💥 연속 클릭 버스트 스트레스 테스트');
    
    await utils.setWizardMode('archmage', 1.0);
    await page.waitForTimeout(1000);
    
    const viewport = page.viewportSize();
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    
    // 성능 측정 시작
    const startMetrics = await utils.collectPerformanceMetrics();
    
    // 중앙 지점에서 20번 빠른 연속 클릭
    console.log('중앙에서 20번 연속 클릭 시작...');
    
    const clickResults = [];
    for (let i = 0; i < 20; i++) {
      const beforeState = await utils.getCanvasState();
      
      await page.mouse.click(centerX + (Math.random() - 0.5) * 100, 
                           centerY + (Math.random() - 0.5) * 100);
      
      // 짧은 대기 (빠른 연속 클릭 시뮬레이션)
      await page.waitForTimeout(50);
      
      const afterState = await utils.getCanvasState();
      clickResults.push({
        clickNumber: i + 1,
        beforeSparkles: beforeState.activeSparkles,
        afterSparkles: afterState.activeSparkles,
        particlesGenerated: afterState.activeSparkles - beforeState.activeSparkles
      });
      
      if (i % 5 === 4) {
        console.log(`클릭 ${i + 1}/20 완료 - 현재 활성 파티클: ${afterState.activeSparkles}`);
      }
    }
    
    // 애니메이션이 안정화될 때까지 대기
    await page.waitForTimeout(3000);
    
    // 최종 성능 측정
    const endMetrics = await utils.collectPerformanceMetrics();
    const finalState = await utils.getCanvasState();
    
    // 결과 분석
    const totalParticlesGenerated = clickResults.reduce((sum, result) => 
      sum + Math.max(0, result.particlesGenerated), 0);
    const maxConcurrentParticles = Math.max(...clickResults.map(r => r.afterSparkles));
    
    console.log('🔥 버스트 테스트 결과:');
    console.log(`- 총 생성된 파티클: ${totalParticlesGenerated}`);
    console.log(`- 최대 동시 파티클: ${maxConcurrentParticles}`);
    console.log(`- 최종 활성 파티클: ${finalState.activeSparkles}`);
    
    // 메모리 사용량 변화 확인
    if (startMetrics.memory && endMetrics.memory) {
      const memoryIncrease = endMetrics.memory.usedJSHeapSize - startMetrics.memory.usedJSHeapSize;
      console.log(`- 메모리 사용량 변화: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // 메모리 사용량이 과도하게 증가하지 않았는지 확인 (50MB 이하)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
    
    // 대마법사 모드에서는 상당한 파티클이 생성되어야 함
    expect(totalParticlesGenerated).toBeGreaterThan(100);
    
    // 스크린샷 촬영
    await utils.takeDebugScreenshot('burst-test-result');
  });

  test('장시간 실행 안정성 테스트', async () => {
    console.log('⏱️ 장시간 실행 안정성 테스트 (2분간)');
    
    await utils.setWizardMode('archmage', 1.0);
    
    const viewport = page.viewportSize();
    const startTime = Date.now();
    const testDurationMs = 2 * 60 * 1000; // 2분
    
    let clickCount = 0;
    let totalParticles = 0;
    const memorySnapshots = [];
    
    while (Date.now() - startTime < testDurationMs) {
      // 랜덤 위치에서 클릭
      const result = await utils.randomClick(viewport);
      clickCount++;
      totalParticles += Math.max(0, result.particlesGenerated);
      
      // 10초마다 성능 스냅샷
      if (clickCount % 10 === 0) {
        const metrics = await utils.collectPerformanceMetrics();
        memorySnapshots.push({
          time: Date.now() - startTime,
          clickCount,
          ...metrics
        });
        
        const elapsedMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        console.log(`${elapsedMinutes}분 경과 - 클릭: ${clickCount}, 활성 파티클: ${result.afterState.activeSparkles}`);
      }
      
      // 1초 대기
      await page.waitForTimeout(1000);
    }
    
    const finalState = await utils.getCanvasState();
    const endTime = Date.now();
    
    console.log('📈 장시간 테스트 결과:');
    console.log(`- 실행 시간: ${((endTime - startTime) / 1000 / 60).toFixed(2)}분`);
    console.log(`- 총 클릭 수: ${clickCount}`);
    console.log(`- 총 생성 파티클: ${totalParticles}`);
    console.log(`- 최종 활성 파티클: ${finalState.activeSparkles}`);
    console.log(`- 평균 클릭당 파티클: ${(totalParticles / clickCount).toFixed(2)}`);
    
    // 메모리 누수 검사
    if (memorySnapshots.length > 1) {
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      
      if (firstSnapshot.memory && lastSnapshot.memory) {
        const memoryGrowth = lastSnapshot.memory.usedJSHeapSize - firstSnapshot.memory.usedJSHeapSize;
        const growthMB = memoryGrowth / 1024 / 1024;
        
        console.log(`- 메모리 증가량: ${growthMB.toFixed(2)} MB`);
        
        // 심각한 메모리 누수가 없어야 함 (100MB 이하)
        expect(growthMB).toBeLessThan(100);
      }
    }
    
    // Extension이 여전히 작동하는지 확인
    expect(await utils.isExtensionLoaded()).toBe(true);
    expect(finalState.canvasExists).toBe(true);
    
    // 최종 스크린샷
    await utils.takeDebugScreenshot('long-running-test-final');
  });

  test('복합 사용자 패턴 시뮬레이션', async () => {
    console.log('👥 복합 사용자 패턴 시뮬레이션');
    
    const scenarios = [
      {
        name: '캐주얼 사용자',
        mode: 'apprentice',
        pattern: async () => {
          // 느긋한 클릭과 마우스 움직임
          const viewport = page.viewportSize();
          for (let i = 0; i < 5; i++) {
            await utils.randomClick(viewport);
            await page.waitForTimeout(2000); // 2초 간격
          }
        }
      },
      {
        name: '파워 유저',
        mode: 'archmage',
        pattern: async () => {
          // 빠른 연속 작업
          const viewport = page.viewportSize();
          
          // 빠른 연속 클릭
          for (let i = 0; i < 10; i++) {
            await utils.randomClick(viewport);
            await page.waitForTimeout(200); // 0.2초 간격
          }
          
          // 마우스 드래그 시뮬레이션
          const path = Array.from({ length: 20 }, (_, i) => ({
            x: viewport.width * 0.2 + (viewport.width * 0.6 * i / 19),
            y: viewport.height * 0.5 + Math.sin(i * 0.5) * 100
          }));
          
          await utils.traceMousePath(path);
        }
      },
      {
        name: '테스트 유저',
        mode: 'muggle',
        pattern: async () => {
          // 효과 비활성화 상태에서 클릭
          const viewport = page.viewportSize();
          for (let i = 0; i < 3; i++) {
            await utils.randomClick(viewport);
            await page.waitForTimeout(1000);
          }
        }
      }
    ];
    
    const results = {};
    
    for (const scenario of scenarios) {
      console.log(`\n🎭 ${scenario.name} 패턴 실행 중...`);
      
      await utils.setWizardMode(scenario.mode, scenario.mode === 'muggle' ? 0 : 
                               scenario.mode === 'apprentice' ? 0.33 : 1.0);
      
      const startMetrics = await utils.collectPerformanceMetrics();
      const startTime = Date.now();
      
      await scenario.pattern();
      
      const endTime = Date.now();
      const endMetrics = await utils.collectPerformanceMetrics();
      const finalState = await utils.getCanvasState();
      
      results[scenario.name] = {
        mode: scenario.mode,
        executionTime: endTime - startTime,
        startMetrics,
        endMetrics,
        finalState
      };
      
      console.log(`${scenario.name} 완료 - 실행시간: ${((endTime - startTime) / 1000).toFixed(2)}초`);
      console.log(`최종 활성 파티클: ${finalState.activeSparkles}`);
      
      // 패턴 간 간격
      await page.waitForTimeout(2000);
    }
    
    // 각 사용자 패턴이 예상대로 작동했는지 검증
    expect(results['테스트 유저'].finalState.activeSparkles).toBe(0); // 머글 모드
    expect(results['파워 유저'].finalState.activeSparkles).toBeGreaterThan(
      results['캐주얼 사용자'].finalState.activeSparkles
    ); // 더 많은 활동 = 더 많은 파티클
    
    await utils.generateTestReport('user-pattern-simulation', results);
  });
}); 