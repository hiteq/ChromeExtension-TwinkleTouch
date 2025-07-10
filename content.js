// TwinkleTouch Chrome Extension - Canvas-based Content Script (DOM과 동일한 표현)
console.log('TwinkleTouch Canvas 버전이 로드되었습니다!');

// 익스텐션 활성화 상태 확인
let isActive = true;
let sparkleSystem = null;

// Chrome API 사용 가능 여부 확인
function checkChromeAPI() {
  return typeof chrome !== 'undefined' && 
         chrome.storage && 
         chrome.storage.sync && 
         chrome.runtime;
}

// 설정을 Chrome storage에서 불러오기
function loadSettings() {
  if (!checkChromeAPI()) {
    console.log('Chrome API를 사용할 수 없습니다. 기본 설정으로 실행합니다.');
    isActive = true;
    initializeTwinkleEffect();
    return;
  }
  
  try {
    chrome.storage.sync.get(['twinkleEnabled'], function(result) {
      if (chrome.runtime.lastError) {
        console.log('Storage 읽기 오류:', chrome.runtime.lastError);
        isActive = true;
        initializeTwinkleEffect();
        return;
      }
      
      isActive = result.twinkleEnabled !== false; // 기본값은 true
      console.log('스토리지에서 로드된 설정:', result.twinkleEnabled, '활성 상태:', isActive);
      if (isActive) {
        initializeTwinkleEffect();
      }
    });
  } catch (error) {
    console.log('Storage 접근 오류:', error);
    isActive = true;
    initializeTwinkleEffect();
  }
}

// 설정 변경 사항 리스닝
function setupStorageListener() {
  if (!checkChromeAPI()) return;
  
  try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (changes.twinkleEnabled) {
        isActive = changes.twinkleEnabled.newValue;
        console.log('설정 변경 감지:', isActive);
        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }
      }
    });
  } catch (error) {
    console.log('Storage 리스너 설정 오류:', error);
  }
}

// 초기화
loadSettings();
setupStorageListener();

// 반짝이는 효과 초기화 함수
function initializeTwinkleEffect() {
  console.log('Canvas 기반 반짝이는 효과를 초기화합니다...');
  
  if (sparkleSystem) {
    sparkleSystem.destroy();
  }
  
  sparkleSystem = new CanvasSparkleSystem();
  sparkleSystem.init();
}

// Canvas 별 객체 (원본 DOM과 동일한 동작)
class CanvasSparkle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.size = 0;
    this.color = '#ffffff';
    this.startTime = 0;
    this.duration = 1500; // 1.5초 (원본과 동일)
    this.animationProgress = 0;
    this.glowSize = 0;
  }
  
  // 원본과 동일한 시작 설정
  activate(startX, startY, endX, endY, size, color, duration) {
    this.active = true;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.currentX = startX;
    this.currentY = startY;
    this.size = size;
    this.color = color;
    this.duration = duration * 1000; // 초를 밀리초로
    this.startTime = performance.now();
    this.animationProgress = 0;
    this.glowSize = size * 0.33;
  }
  
  // 원본과 동일한 애니메이션 업데이트
  update() {
    if (!this.active) return;
    
    const now = performance.now();
    const elapsed = now - this.startTime;
    this.animationProgress = Math.min(elapsed / this.duration, 1);
    
    // 원본과 동일한 cubic-bezier(0, 0, 0.58, 1) 이징
    const easeOut = 1 - Math.pow(1 - this.animationProgress, 3);
    
    // 위치 애니메이션
    this.currentX = this.startX + (this.endX - this.startX) * easeOut;
    this.currentY = this.startY + (this.endY - this.startY) * easeOut;
    
    // 애니메이션 완료 체크
    if (this.animationProgress >= 1) {
      this.active = false;
    }
  }
  
  // 원본 스케일 애니메이션과 동일한 크기 계산
  getScale() {
    if (this.animationProgress <= 0.4) {
      // 0% → 40%: 0 → 0.8
      return (this.animationProgress / 0.4) * 0.8;
    } else if (this.animationProgress <= 0.6) {
      // 40% → 60%: 0.8 → 0.9
      const localProgress = (this.animationProgress - 0.4) / 0.2;
      return 0.8 + localProgress * 0.1;
    } else {
      // 60% → 100%: 0.9 → 0
      const localProgress = (this.animationProgress - 0.6) / 0.4;
      return 0.9 * (1 - localProgress);
    }
  }
  
  getAlpha() {
    if (this.animationProgress <= 0.4) {
      return this.animationProgress / 0.4; // 0% → 40%: 0 → 1
    } else if (this.animationProgress <= 0.6) {
      return 1; // 40% → 60%: 1 유지
    } else {
      const localProgress = (this.animationProgress - 0.6) / 0.4;
      return 1 - localProgress; // 60% → 100%: 1 → 0
    }
  }
}

// Canvas 기반 SparkleSystem (원본 DOM 동작과 동일)
class CanvasSparkleSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.colors = {
      white: '#ffffff',
      yellow: '#ffff80',
      cyan: '#80ffff',
      magenta: '#ff80ff',
      green: '#80ff80'
    };
    this.MAX_SPARKLES = 100;
    this.NORMAL_MAX_ACTIVE = 24;
    this.CLICK_BURST_COUNT = 64;
    this.sparklePool = [];
    this.activeSparkleCount = 0;
    this.starPathCache = new Map();
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    this.pointerX = window.innerWidth / 2;
    this.pointerY = window.innerHeight / 2;
    this.lastSparkleTime = 0;
    this.SPARKLE_THROTTLE = 50;
    this.mouseTimer = null;
    this.animationFrameId = null;
    
    // 이벤트 핸들러 바인딩
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.autoCreateSparkles = this.autoCreateSparkles.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    this.createCanvas();
    this.createSparklePool();
    this.attachEventListeners();
    this.startSparkleSystem();
    
    // 초기화 확인용 간단한 테스트 (1초 후)
    setTimeout(() => {
      console.log('Canvas TwinkleTouch 초기화 완료! 클릭하거나 마우스를 움직여보세요.');
      // 작은 테스트 효과
      this.activateSparkleAt(100, 100, 50, 100);
    }, 1000);
  }

  createCanvas() {
    // 기존 캔버스 제거
    const existingCanvas = document.getElementById('twinkle-canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'twinkle-canvas';
    this.canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      background: transparent !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    `;
    
    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    
    document.body.appendChild(this.canvas);
    console.log('Canvas 생성 완료:', this.canvas.width, 'x', this.canvas.height, 'DPR:', dpr);
  }
  
  // 원본과 동일한 4방향 별 모양 생성 (Path2D 캐싱)
  getStarPath(size) {
    if (!this.starPathCache.has(size)) {
      const path = new Path2D();
      const centerX = 0;
      const centerY = 0;
      const outerRadius = size / 2;
      
      // 원본 SVG와 동일한 4방향 별 모양
      path.moveTo(centerX, centerY - outerRadius); // 위쪽
      path.lineTo(centerX + outerRadius * 0.3, centerY - outerRadius * 0.3);
      path.lineTo(centerX + outerRadius, centerY); // 오른쪽
      path.lineTo(centerX + outerRadius * 0.3, centerY + outerRadius * 0.3);
      path.lineTo(centerX, centerY + outerRadius); // 아래쪽
      path.lineTo(centerX - outerRadius * 0.3, centerY + outerRadius * 0.3);
      path.lineTo(centerX - outerRadius, centerY); // 왼쪽
      path.lineTo(centerX - outerRadius * 0.3, centerY - outerRadius * 0.3);
      path.closePath();
      
      this.starPathCache.set(size, path);
    }
    
    return this.starPathCache.get(size);
  }

  createSparklePool() {
    for (let i = 0; i < this.MAX_SPARKLES; i++) {
      this.sparklePool.push(new CanvasSparkle());
    }
  }

  getRandomOffset(range) {
    return (Math.random() - 0.5) * range;
  }

  getRandomDirection() {
    return Math.random() * 360;
  }

  getRandomDistance(min, max) {
    return min + Math.random() * (max - min);
  }

  // 원본과 정확히 동일한 스파클 활성화 로직
  activateSparkleAt(startX, startY, minDistance, maxDistance) {
    if (!isActive || this.activeSparkleCount >= this.MAX_SPARKLES) return;

    const hiddenSparkles = this.sparklePool.filter(sparkle => !sparkle.active);
    if (hiddenSparkles.length === 0) return;

    this.activeSparkleCount++;
    const sparkle = hiddenSparkles[Math.floor(Math.random() * hiddenSparkles.length)];

    const colorName = Object.keys(this.colors)[Math.floor(Math.random() * Object.keys(this.colors).length)];
    const color = this.colors[colorName];
    const size = 12 + Math.random() * 36; // 원본과 동일
    const animDuration = 1.2 + Math.random() * 0.6; // 원본과 동일

    console.log('스파클 활성화:', { startX, startY, color, size });

    const startOffsetX = this.getRandomOffset(4);
    const startOffsetY = this.getRandomOffset(4);
    const angle = this.getRandomDirection();
    const distance = this.getRandomDistance(minDistance, maxDistance);
    const endX = startX + startOffsetX + Math.cos(angle * Math.PI / 180) * distance;
    const endY = startY + startOffsetY + Math.sin(angle * Math.PI / 180) * distance;

    // Canvas 스파클 활성화
    sparkle.activate(
      startX + startOffsetX,
      startY + startOffsetY,
      endX,
      endY,
      size,
      color,
      animDuration
    );

    // 원본과 동일한 타이밍으로 비활성화
    setTimeout(() => {
      this.activeSparkleCount--;
    }, animDuration * 1000);
  }

  activateSparkle() {
    this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
  }

  createMultipleSparkles(count, isNormalMode = true) {
    const maxAllowed = isNormalMode ? this.NORMAL_MAX_ACTIVE : this.MAX_SPARKLES;
    const actualCount = Math.min(count, maxAllowed - this.activeSparkleCount);

    if (actualCount <= 0) return;

    let i = 0;
    const createNext = () => {
      if (i < actualCount && isActive) {
        this.activateSparkle();
        i++;
        setTimeout(createNext, 10);
      }
    };
    createNext();
  }

  // 원본과 동일한 클릭 버스트 로직
  createClickBurst(x, y) {
    console.log('클릭 버스트 생성:', { x, y, isActive, activeCount: this.activeSparkleCount });
    
    const burstCount = this.CLICK_BURST_COUNT;
    const batchSize = 16;
    const batches = Math.ceil(burstCount / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      setTimeout(() => {
        if (!isActive) return;
        
        const remaining = Math.min(batchSize, burstCount - (batch * batchSize));
        console.log(`배치 ${batch + 1}/${batches}: ${remaining}개 스파클 생성`);

        for (let i = 0; i < remaining; i++) {
          setTimeout(() => {
            if (!isActive) return;
            
            const distanceGroup = i % 3;
            let minDist, maxDist;

            if (distanceGroup === 0) {
              minDist = 50; maxDist = 100;
            } else if (distanceGroup === 1) {
              minDist = 100; maxDist = 150;
            } else {
              minDist = 150; maxDist = 200;
            }

            this.activateSparkleAt(x, y, minDist, maxDist);
          }, i * 5);
        }
      }, batch * 50);
    }
  }

  // Canvas에서 별 그리기
  drawSparkle(sparkle) {
    const scale = sparkle.getScale();
    const alpha = sparkle.getAlpha();
    
    if (scale <= 0 || alpha <= 0) return;
    
    this.ctx.save();
    
    // 위치 설정
    this.ctx.translate(sparkle.currentX, sparkle.currentY);
    this.ctx.scale(scale, scale);
    
    // 원본과 동일한 그림자 효과
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = sparkle.glowSize;
    
    // 색상과 투명도 설정
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = alpha;
    
    // 별 모양 그리기
    const starPath = this.getStarPath(sparkle.size);
    this.ctx.fill(starPath);
    
    this.ctx.restore();
  }

  // 애니메이션 루프
  animate() {
    if (!isActive) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }

    // 캔버스 클리어
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 모든 활성 스파클 업데이트 및 렌더링
    for (let sparkle of this.sparklePool) {
      if (sparkle.active) {
        sparkle.update();
        this.drawSparkle(sparkle);
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  autoCreateSparkles(timestamp) {
    if (!isActive) {
      this.animationFrameId = requestAnimationFrame(this.autoCreateSparkles);
      return;
    }

    if (timestamp - this.lastSparkleTime > 100 + Math.random() * 200) {
      const burstCount = 1 + Math.floor(Math.random() * 2);
      this.createMultipleSparkles(burstCount);
      this.lastSparkleTime = timestamp;
    }
    this.animationFrameId = requestAnimationFrame(this.autoCreateSparkles);
  }

  // 원본과 동일한 마우스 이벤트 처리
  handleMouseMove(e) {
    if (!this.mouseTimer) {
      this.mouseTimer = setTimeout(() => {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        this.mouseTimer = null;
      }, 5);
    }

    if (!isActive) return;

    const now = performance.now();
    if (now - this.lastSparkleTime < this.SPARKLE_THROTTLE) return;

    this.lastSparkleTime = now;

    if (Math.random() > 0.4) {
      this.createMultipleSparkles(1);
    }

    if (Math.random() > 0.9) {
      this.createMultipleSparkles(2 + Math.floor(Math.random() * 2));
    }
  }

  handleTouchMove(e) {
    if (!isActive || e.touches.length === 0) return;

    this.pointerX = e.touches[0].clientX;
    this.pointerY = e.touches[0].clientY;

    const now = performance.now();
    if (now - this.lastSparkleTime < this.SPARKLE_THROTTLE) return;

    this.lastSparkleTime = now;

    if (Math.random() > 0.4) {
      this.createMultipleSparkles(1);
    }
  }

  handleClick(e) {
    if (!isActive) return;
    console.log('클릭 이벤트 감지:', e.clientX, e.clientY);
    this.createClickBurst(e.clientX, e.clientY);
  }

  handleTouchStart(e) {
    if (!isActive || e.touches.length === 0) return;
    
    this.createClickBurst(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }

  attachEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    console.log('이벤트 리스너가 등록되었습니다');
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('touchstart', this.handleTouchStart);
  }

  startSparkleSystem() {
    this.animate();
    console.log('Canvas 애니메이션 시작');
  }

  destroy() {
    console.log('Canvas SparkleSystem 정리 중...');
    
    isActive = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.removeEventListeners();
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // 리소스 정리
    this.sparklePool = [];
    this.starPathCache.clear();
    
    console.log('Canvas SparkleSystem 정리 완료');
  }
}

// 메시지 리스너 설정 (popup과의 통신)
function setupMessageListener() {
  if (!checkChromeAPI()) return;
  
  try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === "toggle") {
        isActive = request.enabled;
        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }
        sendResponse({status: "success"});
      }
    });
  } catch (error) {
    console.log('메시지 리스너 설정 오류:', error);
  }
}

setupMessageListener(); 