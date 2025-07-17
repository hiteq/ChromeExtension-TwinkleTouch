const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  // 테스트 파일 위치
  testDir: './tests',
  
  // 동시 실행할 테스트 수
  fullyParallel: true,
  
  // CI에서 실패 시 재시도 비활성화
  forbidOnly: !!process.env.CI,
  
  // 재시도 횟수
  retries: process.env.CI ? 2 : 0,
  
  // 병렬 테스트 워커 수
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: 'html',
  
  // 모든 테스트에 적용될 설정
  use: {
    // 테스트 결과 추적
    trace: 'on-first-retry',
    
    // 스크린샷 설정
    screenshot: 'only-on-failure',
    
    // 비디오 기록
    video: 'retain-on-failure',
  },

  // 프로젝트별 설정
  projects: [
    {
      name: 'chromium-extension',
      use: { 
        ...devices['Desktop Chrome'],
        // Extension 로딩은 이제 extension-context.js에서 처리
      },
    },
  ],

  // 개발 서버 설정 (필요한 경우)
  webServer: {
    command: 'python -m http.server 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
}); 