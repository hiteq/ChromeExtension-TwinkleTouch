// TwinkleTouch Chrome Extension - SVG DOM-based Content Script (Wizard Level System)
console.log('TwinkleTouch SVG DOM Wizard Level version loaded!');

// Duplicate injection prevention flag
if (window.twinkleTouchInitialized) {
  console.log('TwinkleTouch already initialized.');
  // Reactivate existing system if available
  if (window.sparkleSystem && window.isActive) {
    console.log('Reactivating existing system');
    window.sparkleSystem.resumeAnimations();
  }
} else {
  window.twinkleTouchInitialized = true;

  // Store global variables in window object
  window.isActive = false; // Default to false (muggle mode)
  window.sparkleSystem = null;
  window.effectLevel = 0.0; // Wizard level effect intensity (0: muggle, 1.0: archmage)
  window.wizardMode = 'muggle'; // Current wizard level

  // Global flag for preventing duplicate processing
  window.isHandlingModeChange = false;

  // Local variable references
  let isActive = window.isActive;
  let sparkleSystem = window.sparkleSystem;
  let effectLevel = window.effectLevel;
  let wizardMode = window.wizardMode;
  let isHandlingModeChange = window.isHandlingModeChange;

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

      console.log(`SVGSparkleSystem initialization complete - Mode: ${wizardMode}, Max sparkles: ${this.maxSparkles}`);
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
      console.log('SVGSparkleSystem.init() started');

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

        console.log(`✅ SVGSparkleSystem initialization complete`);

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
          console.log('Removing existing container...');
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
            console.log('✅ Container DOM addition complete');
          } else {
            throw new Error('document.body not available');
          }
        } catch (domError) {
                      console.log('document.body not available, waiting for DOM load...');
          const addContainer = () => {
            if (document.body) {
              document.body.appendChild(this.container);
              console.log('✅ Container added after DOMContentLoaded');
            }
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addContainer, { once: true });
          } else {
            setTimeout(addContainer, 50);
          }
        }

        console.log('✅ Container creation complete');

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

      console.log(`🏊‍♂️ Creating sparkle pool: ${poolSize} items (Level: ${wizardMode})`);
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

      const basicSpawnChance = effectLevel <= 0.33 ? 0.6 : 0.4;

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

      const basicSpawnChance = effectLevel <= 0.33 ? 0.6 : 0.4;

      if (Math.random() > basicSpawnChance) {
        this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
      }
    }

    handleClick(e) {
      console.log('🖱️ Click event received:', {
        isActive: isActive,
        wizardMode: wizardMode,
        effectLevel: effectLevel,
        position: `(${e.clientX}, ${e.clientY})`,
        activeSparkles: this.activeSparkleCount
      });

      if (!isActive) {
        console.log('❌ Click event blocked');
        return;
      }

              console.log('✅ Click event detected:', e.clientX, e.clientY);
      this.createClickBurst(e.clientX, e.clientY);
    }

    handleTouchStart(e) {
      if (!isActive || e.touches.length === 0) return;

      this.createClickBurst(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }

    pauseAnimations() {
      console.log('⏸️ Animation paused');
      this.removeEventListeners();
      this.isPaused = true;
    }

    resumeAnimations() {
      if (!this.isPaused) return;

      console.log('▶️ Animation resumed');
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
      console.log('✨ Starting sparkle system');
    }

    attachEventListeners() {
      document.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
      document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
      document.addEventListener('click', this.boundHandleClick, { passive: true });
      document.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
      window.addEventListener('resize', this.boundHandleResize, { passive: true });
      console.log('Event listeners registered');
    }

    removeEventListeners() {
      document.removeEventListener('mousemove', this.boundHandleMouseMove);
      document.removeEventListener('touchmove', this.boundHandleTouchMove);
      document.removeEventListener('click', this.boundHandleClick);
      document.removeEventListener('touchstart', this.boundHandleTouchStart);
      window.removeEventListener('resize', this.boundHandleResize);
      console.log('Event listeners removed');
    }

    destroy() {
      console.log('🚀 Cleaning up SVG SparkleSystem...');

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

      console.log('✅ SVG SparkleSystem cleanup complete');
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
        console.log('Message received:', request);

        if (request.action === 'changeWizardMode') {
                      console.log('📨 Wizard mode change request:', request);

          // 중복 처리 방지
                      if (isHandlingModeChange) {
              console.log('⚠️ Mode change in progress - ignoring duplicate request');
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

                      console.log(`🔄 Wizard mode change: ${oldWizardMode}→${newWizardMode}, Active: ${oldIsActive}→${newIsActive}, Effect: ${oldEffectLevel}→${newEffectLevel}`);

          // 실제 변경사항이 있는지 확인
                      if (newWizardMode === wizardMode &&
              newEffectLevel === effectLevel &&
              newIsActive === isActive) {
              console.log('⚪ Same state - no changes');
            sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
            isHandlingModeChange = false;
            return;
          }

          // 상태 업데이트 (전역 변수 동기화)
          window.wizardMode = newWizardMode;
          window.effectLevel = newEffectLevel;
          window.isActive = newIsActive;

          // 로컬 변수 동기화
          wizardMode = window.wizardMode;
          effectLevel = window.effectLevel;
          isActive = window.isActive;

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
              console.log('Message listener setup error:', error);
    }
  }

  // 설정 로드
  function loadSettings() {
    if (!checkChromeAPI()) {
      isActive = false;
      effectLevel = 0.0;
      wizardMode = 'muggle';
      // 머글 모드에서는 초기화하지 않음
      return;
    }

    try {
      chrome.storage.sync.get(['wizardMode', 'effectLevel', 'twinkleTouchEnabled'], function(result) {
        if (chrome.runtime.lastError) {
          console.log('Storage read error:', chrome.runtime.lastError);
          isActive = false;
          effectLevel = 0.0;
          wizardMode = 'muggle';
        } else {
          window.wizardMode = result.wizardMode || 'muggle';
          window.effectLevel = result.effectLevel !== undefined ? result.effectLevel : 0.0;
          window.isActive = result.twinkleTouchEnabled !== false && window.wizardMode !== 'muggle';

          // 로컬 변수 동기화
          wizardMode = window.wizardMode;
          effectLevel = window.effectLevel;
          isActive = window.isActive;
        }

        console.log(`Wizard level: ${wizardMode}, Effect intensity: ${effectLevel}, Active: ${isActive}`);

        if (isActive) {
          initializeTwinkleEffect();
        }
      });
    } catch (error) {
              console.log('Storage access error:', error);
      isActive = false;
      effectLevel = 0.0;
      wizardMode = 'muggle';
    // 머글 모드에서는 초기화하지 않음
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
            console.log('⚠️ Message processing - ignoring storage change');
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

            console.log(`📦 Storage change detected: ${wizardMode}→${newWizardMode}, Effect: ${effectLevel}→${newEffectLevel}, Active: ${isActive}→${newIsActive}`);

            // 상태 업데이트 (전역 변수 동기화)
            window.wizardMode = newWizardMode;
            window.effectLevel = newEffectLevel;
            window.isActive = newIsActive;

            // 로컬 변수 동기화
            wizardMode = window.wizardMode;
            effectLevel = window.effectLevel;
            isActive = window.isActive;

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
            console.log('⚪ Storage change detected - same state, no changes');
          }
        }
      });
    } catch (error) {
      console.log('Storage listener setup error:', error);
    }
  }

  // 반짝이는 효과 초기화 함수
  function initializeTwinkleEffect() {
    console.log('✨ Initializing TwinkleTouch effects...');

    try {
    // 강제 활성화 (머글 모드가 아닌 경우)
      if (wizardMode !== 'muggle') {
        isActive = true;
        console.log(`🔧 Force activation: wizardMode=${wizardMode}, isActive=${isActive}`);
      } else {
        isActive = false;
        console.log(`🔧 Deactivation: wizardMode=${wizardMode}, isActive=${isActive}`);
      }

      // 기존 시스템 정리
      if (sparkleSystem) {
        console.log('Cleaning up existing system...');
        sparkleSystem.destroy();
        sparkleSystem = null;
      }

      // 머글 모드면 시스템 생성하지 않음
      if (wizardMode === 'muggle' || !isActive) {
        console.log('Muggle mode or inactive state - not creating system');
        return { success: true, message: 'Set to muggle mode' };
      }

      // 새로운 시스템 생성
              console.log('Creating new SVGSparkleSystem...');
      sparkleSystem = new SVGSparkleSystem();
      window.sparkleSystem = sparkleSystem;

      console.log('Initializing SVGSparkleSystem...');
      sparkleSystem.init();

      // 초기화 성공 확인 (DOM 생성 완료 대기)
      setTimeout(() => {
        if (sparkleSystem && sparkleSystem.container && sparkleSystem.container.parentNode) {
          console.log(`✅ Initialization successful: container added to DOM`);
        }
      }, 100);

      return { success: true, message: 'Initialization successful' };

    } catch (error) {
      console.error('❌ TwinkleTouch initialization error:', error);

      // 오류 발생 시 정리
      if (sparkleSystem) {
        sparkleSystem.destroy();
        sparkleSystem = null;
      }

      return { success: false, message: `Initialization error: ${error.message}` };
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
    console.log('🧪 Starting TwinkleTouch test');
          console.log('Current state:', {
      isActive: isActive,
      wizardMode: wizardMode,
      effectLevel: effectLevel,
      sparkleSystem: !!sparkleSystem,
      container: sparkleSystem ? !!sparkleSystem.container : false
    });

    if (sparkleSystem) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
              console.log(`Creating sparkle at center: (${centerX}, ${centerY})`);
      sparkleSystem.createClickBurst(centerX, centerY);
    } else {
              console.log('❌ SparkleSystem not initialized.');
      initializeTwinkleEffect();
    }
  };

  // 초기화
  setupMessageListener();

  // 즉시 실행 함수
  function initializeImmediately() {
    console.log('🚀 Starting TwinkleTouch immediate initialization');
    loadSettings();
    setupStorageListener();

    // 1초 후 자동 테스트 (더 빠른 응답)
    setTimeout(() => {
      console.log('🔄 Running auto test');
      if (window.testTwinkleEffect) {
        window.testTwinkleEffect();
      }
    }, 1000);
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeImmediately);
  } else {
  // DOM이 이미 로드된 경우 즉시 실행
    initializeImmediately();
  }

  // 추가 보장: window load 이벤트 후에도 확인
  window.addEventListener('load', () => {
          console.log('📄 Window load event - checking TwinkleTouch status');
    if (window.isActive && !window.sparkleSystem) {
              console.log('🔄 Re-initializing after window load');
      initializeTwinkleEffect();
    }
  });

// 중복 주입 방지 블록 종료
}
