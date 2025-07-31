module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true, // Chrome Extension API
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script' // Content scripts는 module이 아님
  },
  globals: {
    // Chrome Extension API
    chrome: 'readonly',
    
    // Content Script 전역 변수들
    isActive: 'writable',
    sparkleSystem: 'writable',
    effectLevel: 'writable',
    wizardMode: 'writable',
    
    // 클래스들
    CanvasSparkle: 'writable',
    CanvasSparkleSystem: 'writable',
    
    // 함수들
    initializeTwinkleEffect: 'writable',
    setupMessageListener: 'writable',
    checkChromeAPI: 'writable',
    loadSettings: 'writable',
    setupStorageListener: 'writable'
  },
  rules: {
    // 코드 품질 규칙
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': 'off', // 디버깅을 위해 console 허용
    'no-undef': 'error',
    'no-redeclare': 'error',
    'no-duplicate-case': 'error',
    'no-unreachable': 'warn',
    
    // Chrome Extension 특화 규칙
    'no-global-assign': 'error',
    'no-implicit-globals': 'off', // Content script는 전역 스코프 사용
    
    // 성능 관련
    'no-inner-declarations': 'off', // Chrome Extension에서는 함수를 조건부로 선언할 수 있음
    'prefer-const': 'warn',
    'no-var': 'warn',
    
    // 스타일 규칙 (관대하게 설정)
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
    'semi': ['warn', 'always'],
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn'
  },
  overrides: [
    {
      // 테스트 파일용 설정
      files: ['tests/**/*.js'],
      env: {
        node: true,
        jest: true
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    {
      // Playwright 설정 파일용
      files: ['playwright.config.js'],
      env: {
        node: true
      }
    }
  ]
}; 