// TwinkleTouch Chrome Extension - SVG DOM-based Content Script (마법사 등급 시스템)
console.log('TwinkleTouch SVG DOM 마법사 등급 버전이 로드되었습니다!');

// 중복 주입 방지 플래그
if (window.twinkleTouchInitialized) {
  console.log('TwinkleTouch가 이미 초기화되었습니다.');
} else {
  window.twinkleTouchInitialized = true;

let isActive = true; // 기본값을 true로 설정
let sparkleSystem = null;
let effectLevel = 1.0; // 마법사 등급별 효과 강도 (0: 머글, 1.0: 대마법사)
let wizardMode = 'archmage'; // 현재 마법사 등급

// 중복 처리 방지를 위한 전역 플래그
let isHandlingModeChange = false;

class SVGSparkleSystem {
  constructor() {
    this.container = null;
    this.sparklePool = [];
    this.activeSparkleCount = 0;
    this.maxSparkles = 100;
    this.maxParticlesPerClick = 64;
    this.normalMaxActive = 24;
    this.isPaused = false;

    // 색상 배열 정의
    this.colors = {
      white: '#ffffff',
      yellow: '#ffff80',
      cyan: '#80ffff',
      magenta: '#ff80ff',
      green: '#80ff80'
    };
    this.colorKeys = Object.keys(this.colors);

    // 마우스 위치 초기화
    this.pointerX = window.innerWidth / 2;
    this.pointerY = window.innerHeight / 2;

    // 스파클 생성 관련 상수
    this.CLICK_BURST_COUNT = 64;
    this.SPARKLE_THROTTLE = 50; // 50ms
    this.lastSparkleTime = 0;

    // SVG 4망성 별 캐시
    this.starSVGCache = {};

    // 이벤트 리스너들
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);

    // 현재 모드에 따른 최대 스파클 수 설정
    this.setModeBasedLimits();

    console.log(`SVGSparkleSystem 초기화 완료 - 모드: ${wizardMode}, 최대 스파클: ${this.maxSparkles}`);
  }

  setModeBasedLimits() {
    switch(wizardMode) {
      case 'archmage':
        this.maxSparkles = 100;
        this.maxParticlesPerClick = 64;
        this.normalMaxActive = 24;
        break;
      case 'muggle':
      default:
        this.maxSparkles = 0;
        this.maxParticlesPerClick = 0;
        this.normalMaxActive = 0;
        break;
    }
  }

  // SVG 4망성 별 문자열 생성 및 캐싱
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

  // 랜덤 오프셋 생성
  getRandomOffset(range) {
    return (Math.random() * range * 2) - range;
  }

  // 랜덤 방향 생성 (각도)
  getRandomDirection() {
    return Math.random() * 360;
  }

  // 랜덤 거리 생성
  getRandomDistance(min, max) {
    return min + Math.random() * (max - min);
  }

  init() {
    console.log('SVGSparkleSystem.init() 시작');

    try {
      // 모드별 제한 설정 (destroy 제거)
      this.setModeBasedLimits();

      // 컨테이너 생성
      this.createContainer();

      // 스파클 풀 생성
      this.createSparklePool();

      // 이벤트 리스너 등록
      this.attachEventListeners();

      // 시스템 시작
      this.startSparkleSystem();

      console.log(`✅ SVGSparkleSystem 초기화 완료`);

    } catch (error) {
      console.error('❌ SVGSparkleSystem 초기화 오류:', error);
      throw error;
    }
  }

  createContainer() {
    try {
      // 기존 컨테이너 제거
      const existingContainer = document.getElementById('twinkle-sparkle-container');
      if (existingContainer) {
        console.log('기존 컨테이너 제거 중...');
        existingContainer.remove();
      }

      // 새 컨테이너 생성
      this.container = document.createElement('div');
      this.container.id = 'twinkle-sparkle-container';
      this.container.className = 'sparkle-container';
      this.container.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      `;

      // DOM 추가 - 즉시 시도, 실패 시 DOMContentLoaded 대기
      try {
        if (document.body) {
          document.body.appendChild(this.container);
          console.log('✅ 컨테이너 DOM 추가 완료');
        } else {
          throw new Error('document.body not available');
        }
      } catch (domError) {
        console.log('document.body가 없음, DOM 로드 대기 중...');
        const addContainer = () => {
          if (document.body) {
            document.body.appendChild(this.container);
            console.log('✅ DOMContentLoaded 후 컨테이너 추가 완료');
          }
        };
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', addContainer, { once: true });
        } else {
          setTimeout(addContainer, 50);
        }
      }

      console.log('✅ 컨테이너 생성 완료');
      
    } catch (error) {
      console.error('❌ 컨테이너 생성 오류:', error);
      throw error;
    }
  }

  createSparklePool() {
    this.sparklePool = [];

    const poolSize = effectLevel >= 1.0 ? this.maxSparkles : Math.floor(this.maxSparkles * 0.6);

    for (let i = 0; i < poolSize; i++) {
      const sparkleDiv = document.createElement('div');
      sparkleDiv.className = 'sparkle';
      sparkleDiv.style.cssText = `
        position: absolute;
        transform: translate(-50%, -50%);
        will-change: transform, left, top;
        transition: all 1.5s cubic-bezier(0, 0, 0.58, 1);
        backface-visibility: hidden;
        perspective: 1000px;
        transform-style: preserve-3d;
        display: none;
      `;
      
      if (this.container) {
        this.container.appendChild(sparkleDiv);
      }
      this.sparklePool.push(sparkleDiv);
    }

    console.log(`🏊‍♂️ 스파클 풀 생성: ${poolSize}개 (등급: ${wizardMode})`);
  }

  activateSparkleAt(startX, startY, minDistance, maxDistance) {
    if (!isActive || effectLevel === 0) return;

    // 일반 모드에서는 제한된 수의 별만 허용
    const isNormalMode = !this.isClickBurstMode;
    const maxAllowed = isNormalMode ? this.normalMaxActive : this.maxSparkles;
    
    if (this.activeSparkleCount >= maxAllowed) return;

    const hiddenSparkles = this.sparklePool.filter(sparkle => sparkle.style.display === 'none');
    if (hiddenSparkles.length === 0) return;

    this.activeSparkleCount++;

    const sparkleDiv = hiddenSparkles[Math.floor(Math.random() * hiddenSparkles.length)];

    // 색상 선택
    const colorName = this.colorKeys[Math.floor(Math.random() * this.colorKeys.length)];
    const color = this.colors[colorName];

    // 마법사 등급별 크기 조절
    const baseSize = 12 + Math.random() * 36;
    const sizeMultiplier = effectLevel <= 0.33 ? 0.6 + effectLevel * 0.6 : effectLevel;
    const size = Math.floor(baseSize * sizeMultiplier);

    // 마법사 등급별 지속시간 조절
    const baseDuration = 1.2 + Math.random() * 0.6;
    const durationMultiplier = effectLevel <= 0.33 ? 0.7 + effectLevel * 0.6 : effectLevel;
    const animDuration = baseDuration * durationMultiplier;

    // SVG 설정
    sparkleDiv.innerHTML = this.getStarSVGString(size, color);

    const starSVG = sparkleDiv.querySelector('svg');
    if (starSVG) {
      // 블러 효과 및 애니메이션 설정
      const blurSize = size * 0.33;
      starSVG.style.cssText = `
        filter: drop-shadow(0 0 ${blurSize}px ${color});
        animation: continuousScale ${animDuration}s cubic-bezier(0.645, 0.045, 0.355, 1) forwards;
        will-change: transform;
      `;

      // CSS 애니메이션 추가 (한 번만)
      if (!document.getElementById('sparkle-animations')) {
        const style = document.createElement('style');
        style.id = 'sparkle-animations';
        style.textContent = `
          @keyframes continuousScale {
            0% { transform: scale(0) translateZ(0); }
            40% { transform: scale(0.8) translateZ(0); }
            60% { transform: scale(0.9) translateZ(0); }
            100% { transform: scale(0) translateZ(0); }
          }
        `;
        document.head.appendChild(style);
      }
    }

    const startOffsetX = this.getRandomOffset(4);
    const startOffsetY = this.getRandomOffset(4);
    const angle = this.getRandomDirection();

    const distanceMultiplier = effectLevel <= 0.33 ? effectLevel * 1.8 : 1.0 + effectLevel * 1.0;
    const adjustedMinDistance = minDistance * distanceMultiplier;
    const adjustedMaxDistance = maxDistance * distanceMultiplier;
    const distance = this.getRandomDistance(adjustedMinDistance, adjustedMaxDistance);

    const endX = startX + startOffsetX + Math.cos(angle * Math.PI / 180) * distance;
    const endY = startY + startOffsetY + Math.sin(angle * Math.PI / 180) * distance;

    // 시작 위치 설정
    requestAnimationFrame(() => {
      sparkleDiv.style.left = `${startX + startOffsetX}px`;
      sparkleDiv.style.top = `${startY + startOffsetY}px`;
      sparkleDiv.style.display = 'block';

      // 다음 프레임에서 이동 시작
      requestAnimationFrame(() => {
        sparkleDiv.style.left = `${endX}px`;
        sparkleDiv.style.top = `${endY}px`;
      });
    });

    // 애니메이션 완료 후 제거
    setTimeout(() => {
      sparkleDiv.style.display = 'none';
      this.activeSparkleCount--;
    }, animDuration * 1000);
  }

  createClickBurst(x, y) {
    const baseBurstCount = this.CLICK_BURST_COUNT;
    let adjustedBurstCount;

    if (effectLevel <= 0.33) {
      adjustedBurstCount = Math.floor(25 + effectLevel * 30);
    } else {
      adjustedBurstCount = Math.floor(baseBurstCount * (0.85 + (effectLevel - 0.33) * 0.22));
    }

    if (adjustedBurstCount === 0) return;

    console.log(`💥 Click Burst: ${adjustedBurstCount} particles at (${x}, ${y})`);

    this.isClickBurstMode = true;

    const batchSize = 16;
    const batches = Math.ceil(adjustedBurstCount / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      setTimeout(() => {
        const remaining = Math.min(batchSize, adjustedBurstCount - (batch * batchSize));

        for (let i = 0; i < remaining; i++) {
          setTimeout(() => {
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

    // 클릭 버스트 모드 해제
    setTimeout(() => {
      this.isClickBurstMode = false;
    }, batches * 50 + 500);
  }

  handleResize() {
    this.pointerX = window.innerWidth / 2;
    this.pointerY = window.innerHeight / 2;
  }

  handleMouseMove(e) {
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;

    if (!isActive) return;

    const now = performance.now();
    if (now - this.lastSparkleTime < this.SPARKLE_THROTTLE) return;

    this.lastSparkleTime = now;

    let basicSpawnChance = effectLevel <= 0.33 ? 0.6 : 0.4;

    if (Math.random() > basicSpawnChance) {
      this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
    }

    if (Math.random() > 0.9) {
      const extraCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < extraCount; i++) {
        setTimeout(() => {
          this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
        }, i * 20);
      }
    }
  }

  handleTouchMove(e) {
    if (!isActive || e.touches.length === 0) return;

    this.pointerX = e.touches[0].clientX;
    this.pointerY = e.touches[0].clientY;

    const now = performance.now();
    if (now - this.lastSparkleTime < this.SPARKLE_THROTTLE) return;

    this.lastSparkleTime = now;

    let basicSpawnChance = effectLevel <= 0.33 ? 0.6 : 0.4;

    if (Math.random() > basicSpawnChance) {
      this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
    }
  }

  handleClick(e) {
    console.log('🖱️ 클릭 이벤트 수신:', {
      isActive: isActive,
      wizardMode: wizardMode,
      effectLevel: effectLevel,
      position: `(${e.clientX}, ${e.clientY})`,
      activeSparkles: this.activeSparkleCount
    });

    if (!isActive) {
      console.log('❌ 클릭 이벤트 차단됨');
      return;
    }

    console.log('✅ 클릭 이벤트 감지:', e.clientX, e.clientY);
    this.createClickBurst(e.clientX, e.clientY);
  }

  handleTouchStart(e) {
    if (!isActive || e.touches.length === 0) return;

    this.createClickBurst(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }

  pauseAnimations() {
    console.log('⏸️ 애니메이션 일시정지');
    this.removeEventListeners();
    this.isPaused = true;
  }
  
  resumeAnimations() {
    if (!this.isPaused) return;
    
    console.log('▶️ 애니메이션 재시작');
    this.attachEventListeners();
    this.isPaused = false;
  }

  startSparkleSystem() {
    this.isPaused = false;
    
    // 자동 별 생성 시스템
    const autoCreateSparkles = (timestamp) => {
      if (this.isPaused || !isActive) {
        requestAnimationFrame(autoCreateSparkles);
        return;
      }

      if (timestamp - this.lastSparkleTime > 100 + Math.random() * 200) {
        const burstCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
          }, i * 20);
        }
        this.lastSparkleTime = timestamp;
      }
      requestAnimationFrame(autoCreateSparkles);
    };
    
    requestAnimationFrame(autoCreateSparkles);
    console.log('✨ 스파클 시스템 시작');
  }

  attachEventListeners() {
    document.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
    document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
    document.addEventListener('click', this.boundHandleClick, { passive: true });
    document.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
    window.addEventListener('resize', this.boundHandleResize, { passive: true });
    console.log('이벤트 리스너 등록 완료');
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('touchstart', this.boundHandleTouchStart);
    window.removeEventListener('resize', this.boundHandleResize);
    console.log('이벤트 리스너 제거 완료');
  }

  destroy() {
    console.log('🚀 SVG SparkleSystem 정리 중...');

    isActive = false;

    this.removeEventListeners();

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // 애니메이션 스타일 제거
    const animationStyle = document.getElementById('sparkle-animations');
    if (animationStyle) {
      animationStyle.remove();
    }

    // 모든 리소스 정리
    this.sparklePool = [];
    this.starSVGCache = {};
    this.activeSparkleCount = 0;
    this.isPaused = false;

    console.log('✅ SVG SparkleSystem 정리 완료');
  }
}

// Chrome API 사용 가능 확인
function checkChromeAPI() {
  return typeof chrome !== 'undefined' && 
         chrome.storage && 
         chrome.storage.sync && 
         chrome.runtime;
}

// 메시지 리스너 설정
function setupMessageListener() {
  if (!checkChromeAPI()) return;

  try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('메시지 수신:', request);

      if (request.action === 'changeWizardMode') {
        console.log('📨 마법사 모드 변경 요청:', request);

        // 중복 처리 방지
        if (isHandlingModeChange) {
          console.log('⚠️ 모드 변경 중 - 중복 요청 무시');
          sendResponse({ success: false, error: 'Mode change in progress' });
          return;
        }

        // 입력 검증
        if (!request.mode || !['muggle', 'archmage'].includes(request.mode)) {
          console.error('❌ 잘못된 마법사 모드:', request.mode);
          sendResponse({ success: false, error: 'Invalid wizard mode' });
          return;
        }

        if (typeof request.effectLevel !== 'number' || request.effectLevel < 0 || request.effectLevel > 1) {
          console.error('❌ 잘못된 효과 레벨:', request.effectLevel);
          sendResponse({ success: false, error: 'Invalid effect level' });
          return;
        }

        isHandlingModeChange = true;

        // 마법사 등급 모드 변경
        const oldWizardMode = wizardMode;
        const oldIsActive = isActive;
        const oldEffectLevel = effectLevel;

        const newWizardMode = request.mode;
        const newEffectLevel = request.effectLevel;
        const newIsActive = (newWizardMode !== 'muggle');

        console.log(`🔄 마법사 모드 변경: ${oldWizardMode}→${newWizardMode}, 활성화: ${oldIsActive}→${newIsActive}, 효과: ${oldEffectLevel}→${newEffectLevel}`);

        // 실제 변경사항이 있는지 확인
        if (newWizardMode === wizardMode && 
            newEffectLevel === effectLevel && 
            newIsActive === isActive) {
          console.log('⚪ 동일한 상태 - 변경사항 없음');
          sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
          isHandlingModeChange = false;
          return;
        }

        // 상태 업데이트
        wizardMode = newWizardMode;
        effectLevel = newEffectLevel;
        isActive = newIsActive;

        // 시스템 재초기화
        try {
          if (sparkleSystem) {
            sparkleSystem.destroy();
            sparkleSystem = null;
          }

          if (isActive) {
            initializeTwinkleEffect();
          }

          sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
        } catch (error) {
          console.error('❌ 모드 변경 중 오류:', error);
          sendResponse({ success: false, error: error.message });
        } finally {
          // 플래그 해제 (500ms 후)
          setTimeout(() => {
            isHandlingModeChange = false;
          }, 500);
        }

      } else if (request.action === 'tabActivated') {
        if (sparkleSystem && isActive) {
          sparkleSystem.startSparkleSystem();
        }
        sendResponse({ success: true });
      } else if (request.action === 'syncSettings') {
        if (request.settings) {
          const oldMode = wizardMode;
          wizardMode = request.settings.wizardMode || 'archmage';
          effectLevel = request.settings.effectLevel || 1.0;
          isActive = request.settings.twinkleTouchEnabled !== false;
          
          if (oldMode !== wizardMode) {
            initializeTwinkleEffect();
          }
        }
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    console.log('메시지 리스너 설정 오류:', error);
  }
}

// 설정 로드
function loadSettings() {
  if (!checkChromeAPI()) {
    isActive = true;
    effectLevel = 1.0;
    wizardMode = 'archmage';
    initializeTwinkleEffect();
    return;
  }

  try {
    chrome.storage.sync.get(['wizardMode', 'effectLevel', 'twinkleTouchEnabled'], function(result) {
      if (chrome.runtime.lastError) {
        console.log('저장소 읽기 오류:', chrome.runtime.lastError);
        isActive = true;
        effectLevel = 1.0;
        wizardMode = 'archmage';
      } else {
        wizardMode = result.wizardMode || 'archmage';
        effectLevel = result.effectLevel !== undefined ? result.effectLevel : 1.0;
        isActive = result.twinkleTouchEnabled !== false && wizardMode !== 'muggle';
      }

      console.log(`마법사 등급: ${wizardMode}, 효과 강도: ${effectLevel}, 활성화: ${isActive}`);

      if (isActive) {
        initializeTwinkleEffect();
      }
    });
  } catch (error) {
    console.log('저장소 접근 오류:', error);
    isActive = true;
    effectLevel = 1.0;
    wizardMode = 'archmage';
    initializeTwinkleEffect();
  }
}

// 저장소 변경 감지
function setupStorageListener() {
  if (!checkChromeAPI()) return;

  try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'sync') {
        // 메시지 처리 중인지 확인 (전역 변수 접근)
        if (isHandlingModeChange) {
          console.log('⚠️ 메시지 처리 중 - 저장소 변경 무시');
          return;
        }

        let shouldReinitialize = false;
        let newWizardMode = wizardMode;
        let newEffectLevel = effectLevel;
        let newIsActive = isActive;

        if (changes.wizardMode) {
          newWizardMode = changes.wizardMode.newValue;
          shouldReinitialize = true;
        }

        if (changes.effectLevel) {
          newEffectLevel = changes.effectLevel.newValue;
          shouldReinitialize = true;
        }

        if (changes.twinkleTouchEnabled) {
          const newEnabled = changes.twinkleTouchEnabled.newValue;
          newIsActive = newEnabled && newWizardMode !== 'muggle';
          shouldReinitialize = true;
        }

        // 실제 변경사항이 있는지 확인
        if (shouldReinitialize && 
            (newWizardMode !== wizardMode || 
             newEffectLevel !== effectLevel || 
             newIsActive !== isActive)) {
          
          console.log(`📦 저장소 변경 감지: ${wizardMode}→${newWizardMode}, 효과: ${effectLevel}→${newEffectLevel}, 활성화: ${isActive}→${newIsActive}`);
          
          // 상태 업데이트
          wizardMode = newWizardMode;
          effectLevel = newEffectLevel;
          isActive = newIsActive;
          
          // 시스템 재초기화
          try {
            if (sparkleSystem) {
              sparkleSystem.destroy();
              sparkleSystem = null;
            }

            if (isActive) {
              initializeTwinkleEffect();
            }
          } catch (error) {
            console.error('❌ 저장소 변경 처리 중 오류:', error);
          }
        } else if (shouldReinitialize) {
          console.log('⚪ 저장소 변경 감지 - 동일한 상태, 변경사항 없음');
        }
      }
    });
  } catch (error) {
    console.log('저장소 리스너 설정 오류:', error);
  }
}

// 반짝이는 효과 초기화 함수
function initializeTwinkleEffect() {
  console.log('✨ TwinkleTouch 효과 초기화 중...');

  try {
    // 강제 활성화 (머글 모드가 아닌 경우)
    if (wizardMode !== 'muggle') {
      isActive = true;
      console.log(`🔧 강제 활성화: wizardMode=${wizardMode}, isActive=${isActive}`);
    } else {
      isActive = false;
      console.log(`🔧 비활성화: wizardMode=${wizardMode}, isActive=${isActive}`);
    }

    // 기존 시스템 정리
    if (sparkleSystem) {
      console.log('기존 시스템 정리 중...');
      sparkleSystem.destroy();
      sparkleSystem = null;
    }

    // 머글 모드면 시스템 생성하지 않음
    if (wizardMode === 'muggle' || !isActive) {
      console.log('머글 모드 또는 비활성화 상태 - 시스템 생성 안함');
      return { success: true, message: '머글 모드로 설정됨' };
    }

    // 새로운 시스템 생성
    console.log('새로운 SVGSparkleSystem 생성 중...');
    sparkleSystem = new SVGSparkleSystem();
    
    console.log('SVGSparkleSystem 초기화 중...');
    sparkleSystem.init();

    // 초기화 성공 확인 (DOM 생성 완료 대기)
    setTimeout(() => {
      if (sparkleSystem && sparkleSystem.container && sparkleSystem.container.parentNode) {
        console.log(`✅ 초기화 성공: 컨테이너가 DOM에 추가됨`);
      }
    }, 100);

    return { success: true, message: '초기화 성공' };

  } catch (error) {
    console.error('❌ TwinkleTouch 초기화 오류:', error);
    
    // 오류 발생 시 정리
    if (sparkleSystem) {
      sparkleSystem.destroy();
      sparkleSystem = null;
    }
    
    return { success: false, message: `초기화 오류: ${error.message}` };
  }
}

// 페이지 가시성 변경 시 성능 최적화
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (sparkleSystem) {
      sparkleSystem.pauseAnimations();
    }
  } else {
    if (sparkleSystem && isActive) {
      sparkleSystem.resumeAnimations();
    }
  }
});

// 디버깅을 위한 테스트 함수
window.testTwinkleEffect = function() {
  console.log('🧪 TwinkleTouch 테스트 시작');
  console.log('현재 상태:', {
    isActive: isActive,
    wizardMode: wizardMode,
    effectLevel: effectLevel,
    sparkleSystem: !!sparkleSystem,
    container: sparkleSystem ? !!sparkleSystem.container : false
  });
  
  if (sparkleSystem) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    console.log(`중앙 위치에 스파클 생성: (${centerX}, ${centerY})`);
    sparkleSystem.createClickBurst(centerX, centerY);
  } else {
    console.log('❌ SparkleSystem이 초기화되지 않았습니다.');
    initializeTwinkleEffect();
  }
};

// 초기화
setupMessageListener();

// DOM 로드 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupStorageListener();
    
    // 3초 후 자동 테스트
    setTimeout(() => {
      console.log('🔄 자동 테스트 실행');
      if (window.testTwinkleEffect) {
        window.testTwinkleEffect();
      }
    }, 3000);
  });
} else {
  loadSettings();
  setupStorageListener();
  
  // 3초 후 자동 테스트
  setTimeout(() => {
    console.log('🔄 자동 테스트 실행');
    if (window.testTwinkleEffect) {
      window.testTwinkleEffect();
    }
  }, 3000);
}

// 중복 주입 방지 블록 종료
}