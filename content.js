// TwinkleTouch Chrome Extension - Content Script
console.log('TwinkleTouch 익스텐션이 로드되었습니다!');

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
  console.log('반짝이는 효과를 초기화합니다...');
  
  if (sparkleSystem) {
    sparkleSystem.destroy();
  }
  
  sparkleSystem = new SparkleSystem();
  sparkleSystem.init();
}

// 반짝이는 효과 시스템 클래스
class SparkleSystem {
  constructor() {
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
    this.starSVGCache = {};
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
  }

  init() {
    this.createContainer();
    this.createSparklePool();
    this.attachEventListeners();
    this.startSparkleSystem();
    
    // 초기화 확인용 간단한 테스트 (1초 후)
    setTimeout(() => {
      console.log('TwinkleTouch 초기화 완료! 클릭하거나 마우스를 움직여보세요.');
      // 작은 테스트 효과
      this.activateSparkleAt(100, 100, 50, 100);
    }, 1000);
  }

  createContainer() {
    // 기존 컨테이너가 있으면 제거
    const existingContainer = document.getElementById('twinkle-sparkle-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    this.container = document.createElement('div');
    this.container.id = 'twinkle-sparkle-container';
    this.container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
    `;
    document.body.appendChild(this.container);
    console.log('스파클 컨테이너가 생성되었습니다:', this.container);
  }

  getStarSVGString(size, color) {
    const cacheKey = `${size}_${color}`;
    
    if (!this.starSVGCache[cacheKey]) {
      this.starSVGCache[cacheKey] = `
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path fill="${color}" d="M18 36C18 26.0589 9.94112 18 0 18C9.94112 18 18 9.94112 18 0C18 9.94112 26.0589 18 36 18C26.0589 18 18 26.0589 18 36Z"></path>
        </svg>
      `;
    }
    
    return this.starSVGCache[cacheKey];
  }

  createSparkle() {
    const sparkleDiv = document.createElement('div');
    sparkleDiv.className = 'twinkle-sparkle';
    sparkleDiv.style.cssText = `
      position: absolute !important;
      transform: translate(-50%, -50%) !important;
      will-change: transform, left, top !important;
      transition: all 1.5s cubic-bezier(0, 0, 0.58, 1) !important;
      backface-visibility: hidden !important;
      perspective: 1000px !important;
      transform-style: preserve-3d !important;
      display: none !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      z-index: 999 !important;
    `;
    this.container.appendChild(sparkleDiv);
    this.sparklePool.push(sparkleDiv);
    return sparkleDiv;
  }

  createSparklePool() {
    for (let i = 0; i < this.MAX_SPARKLES; i++) {
      this.createSparkle();
    }
  }

  getRandomOffset(range) {
    return (Math.random() * range * 2) - range;
  }

  getRandomDirection() {
    return Math.random() * 360;
  }

  getRandomDistance(min, max) {
    return min + Math.random() * (max - min);
  }

  activateSparkleAt(startX, startY, minDistance, maxDistance) {
    if (!isActive || this.activeSparkleCount >= this.MAX_SPARKLES) return;

    const hiddenSparkles = this.sparklePool.filter(sparkle => sparkle.style.display === 'none');
    if (hiddenSparkles.length === 0) return;

    this.activeSparkleCount++;
    const sparkleDiv = hiddenSparkles[Math.floor(Math.random() * hiddenSparkles.length)];

    const colorName = Object.keys(this.colors)[Math.floor(Math.random() * Object.keys(this.colors).length)];
    const color = this.colors[colorName];
    const size = 12 + Math.random() * 36;
    const animDuration = 1.2 + Math.random() * 0.6;

    sparkleDiv.innerHTML = this.getStarSVGString(size, color);
    console.log('스파클 활성화:', { startX, startY, color, size });

    if (this.isSafari) {
      sparkleDiv.offsetHeight;
    }

    const starSVG = sparkleDiv.querySelector('svg');
    starSVG.style.cssText = `
      filter: drop-shadow(0 0 ${size * 0.33}px ${color}) !important;
      animation: twinkle-scale ${animDuration}s cubic-bezier(0.645, 0.045, 0.355, 1) forwards !important;
      will-change: transform !important;
      pointer-events: none !important;
    `;

    const startOffsetX = this.getRandomOffset(4);
    const startOffsetY = this.getRandomOffset(4);
    const angle = this.getRandomDirection();
    const distance = this.getRandomDistance(minDistance, maxDistance);
    const endX = startX + startOffsetX + Math.cos(angle * Math.PI / 180) * distance;
    const endY = startY + startOffsetY + Math.sin(angle * Math.PI / 180) * distance;

    requestAnimationFrame(() => {
      sparkleDiv.style.left = `${startX + startOffsetX}px`;
      sparkleDiv.style.top = `${startY + startOffsetY}px`;
      sparkleDiv.style.display = 'block';
      sparkleDiv.style.visibility = 'visible';
      sparkleDiv.style.opacity = '1';

      if (this.isSafari) {
        sparkleDiv.offsetHeight;
      }

      requestAnimationFrame(() => {
        sparkleDiv.style.left = `${endX}px`;
        sparkleDiv.style.top = `${endY}px`;
      });
    });

    setTimeout(() => {
      sparkleDiv.style.display = 'none';
      sparkleDiv.style.visibility = 'hidden';
      sparkleDiv.style.opacity = '0';
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
    this.animationFrameId = requestAnimationFrame(this.autoCreateSparkles);
  }

  destroy() {
    this.removeEventListeners();
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.sparklePool = [];
    this.activeSparkleCount = 0;
  }
}

// popup에서 온오프 메시지 수신
function setupMessageListener() {
  if (!checkChromeAPI()) return;
  
  try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('메시지 수신:', request);
      
      if (request.action === 'toggleTwinkle') {
        isActive = request.enabled;
        console.log('토글 상태 변경:', isActive);
        
        if (isActive && !sparkleSystem) {
          initializeTwinkleEffect();
        } else if (!isActive && sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }
        
        sendResponse({status: 'success'});
      }
    });
  } catch (error) {
    console.log('메시지 리스너 설정 오류:', error);
  }
}

setupMessageListener(); 