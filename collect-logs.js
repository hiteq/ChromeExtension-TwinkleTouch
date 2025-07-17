// TwinkleTouch Chrome Extension - 로그 수집 및 디버깅 도구

/**
 * TwinkleTouch 익스텐션의 로그와 성능 정보를 수집하는 도구입니다.
 * 문제 해결 및 성능 최적화에 활용할 수 있습니다.
 */

(function() {
  // 디버그 모드 활성화 여부
  const DEBUG_MODE = true;
  
  // 로그 저장소
  const logs = [];
  const performanceLogs = [];
  const errorLogs = [];
  
  // 최대 로그 수
  const MAX_LOGS = 1000;
  
  // 로그 레벨
  const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  // 현재 로그 레벨 (INFO 이상만 저장)
  let currentLogLevel = LOG_LEVELS.INFO;
  
  // 원본 콘솔 메서드 저장
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
  
  // 로그 수집 함수
  function collectLog(level, ...args) {
    if (level < currentLogLevel) return;
    
    const log = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level),
      message: args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch (e) {
          return '[객체를 문자열로 변환할 수 없음]';
        }
      }).join(' ')
    };
    
    logs.push(log);
    
    // 에러 로그는 별도 저장
    if (level === LOG_LEVELS.ERROR) {
      errorLogs.push(log);
    }
    
    // 로그 개수 제한
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }
  }
  
  // 성능 정보 수집
  function collectPerformanceData() {
    if (!window.sparkleSystem) return;
    
    try {
      const perfData = {
        timestamp: new Date().toISOString(),
        activeSparkles: window.sparkleSystem.activeSparkleCount || 0,
        fps: window.sparkleSystem.currentFPS || 0,
        renderQuality: window.sparkleSystem.renderQuality || 1.0,
        isLowPowerMode: window.sparkleSystem.isLowPowerMode || false,
        memory: performance.memory ? {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)) + 'MB',
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024)) + 'MB'
        } : 'Not available'
      };
      
      performanceLogs.push(perfData);
      
      // 성능 로그 개수 제한
      if (performanceLogs.length > 100) {
        performanceLogs.shift();
      }
    } catch (e) {
      collectLog(LOG_LEVELS.ERROR, 'Performance data collection error:', e.message);
    }
  }
  
  // 콘솔 오버라이드 (디버그 모드에서만)
  if (DEBUG_MODE) {
    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      collectLog(LOG_LEVELS.DEBUG, ...args);
    };
    
    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      collectLog(LOG_LEVELS.INFO, ...args);
    };
    
    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      collectLog(LOG_LEVELS.WARN, ...args);
    };
    
    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      collectLog(LOG_LEVELS.ERROR, ...args);
    };
  }
  
  // 성능 모니터링 시작
  let performanceMonitorInterval;
  
  function startPerformanceMonitoring() {
    if (performanceMonitorInterval) {
      clearInterval(performanceMonitorInterval);
    }
    
    performanceMonitorInterval = setInterval(() => {
      collectPerformanceData();
    }, 5000); // 5초마다 수집
  }
  
  // 디버그 리포트 생성
  function generateDebugReport() {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      twinkleTouchState: {
        version: '1.0.0',
        isActive: window.isActive || false,
        wizardMode: window.wizardMode || 'unknown',
        effectLevel: window.effectLevel || 0
      },
      systemInfo: {
        screenSize: `${window.screen.width}x${window.screen.height}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        language: navigator.language,
        platform: navigator.platform
      },
      sparkleSystemState: window.sparkleSystem ? {
        activeSparkles: window.sparkleSystem.activeSparkleCount || 0,
        maxSparkles: window.sparkleSystem.maxSparkles || 0,
        renderQuality: window.sparkleSystem.renderQuality || 1.0,
        isLowPowerMode: window.sparkleSystem.isLowPowerMode || false,
        cullingEnabled: window.sparkleSystem.cullingEnabled || false
      } : 'Not initialized',
      performanceSummary: {
        logs: performanceLogs.slice(-10) // 최근 10개만
      },
      recentErrors: errorLogs.slice(-10), // 최근 10개 에러만
      recentLogs: logs.slice(-50) // 최근 50개 로그만
    };
    
    return report;
  }
  
  // 디버그 리포트 다운로드
  function downloadDebugReport() {
    const report = generateDebugReport();
    const reportJson = JSON.stringify(report, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().getTime();
    const filename = `debug-report-${timestamp}.txt`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return filename;
  }
  
  // 전역 디버그 객체 노출
  window.twinkleDebug = {
    getLogs: () => logs.slice(),
    getErrorLogs: () => errorLogs.slice(),
    getPerformanceLogs: () => performanceLogs.slice(),
    setLogLevel: (level) => {
      if (LOG_LEVELS[level] !== undefined) {
        currentLogLevel = LOG_LEVELS[level];
        console.info(`로그 레벨이 ${level}로 설정되었습니다.`);
      }
    },
    startPerformanceMonitoring,
    stopPerformanceMonitoring: () => {
      if (performanceMonitorInterval) {
        clearInterval(performanceMonitorInterval);
        performanceMonitorInterval = null;
      }
    },
    generateDebugReport,
    downloadDebugReport,
    getActiveSparkles: () => window.sparkleSystem ? window.sparkleSystem.activeSparkleCount : 0,
    clearLogs: () => {
      logs.length = 0;
      errorLogs.length = 0;
      console.info('로그가 초기화되었습니다.');
    }
  };
  
  // 자동 시작
  startPerformanceMonitoring();
  
  console.info('TwinkleTouch 디버그 도구가 초기화되었습니다. window.twinkleDebug 객체를 통해 접근할 수 있습니다.');
})();