// TwinkleTouch Chrome Extension - Canvas-based Content Script (마법사 등급 시스템)
console.log('TwinkleTouch Canvas 마법사 등급 버전이 로드되었습니다!');

let isActive = true; // 기본값을 true로 설정
let sparkleSystem = null;
let effectLevel = 1.0; // 마법사 등급별 효과 강도 (0: 머글, 0.33: 수련생, 1.0: 대마법사)
let wizardMode = 'archmage'; // 현재 마법사 등급

// 고성능 Canvas 별 객체 (메모리 최적화)
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
    this.duration = 1500;
    this.animationProgress = 0;
  }

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
    this.duration = duration * 1000;
    this.startTime = performance.now();
    this.animationProgress = 0;
  }

  // 최적화된 이징 함수
  getEasing(progress) {
    // 간단한 ease-out 함수
    return 1 - Math.pow(1 - progress, 3);
  }

  update() {
    if (!this.active) return false;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;

    if (elapsed >= this.duration) {
      this.active = false;
      return false;
    }

    this.animationProgress = elapsed / this.duration;
    const easedProgress = this.getEasing(this.animationProgress);

    // 위치 계산
    this.currentX = this.startX + (this.endX - this.startX) * easedProgress;
    this.currentY = this.startY + (this.endY - this.startY) * easedProgress;

    return true;
  }

  getScale() {
    const progress = this.animationProgress;
    const scale = progress < 0.5 ? progress * 2 : 2 - (progress * 2);
    return Math.max(0.1, scale); // 최소값 보장
  }

  getAlpha() {
    const progress = this.animationProgress;
    const alpha = progress < 0.8 ? 1 : (1 - progress) / 0.2;
    return Math.max(0.1, alpha); // 최소값 보장
  }
}

class CanvasSparkleSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.sparklePool = [];
    this.activeSparkles = [];
    this.activeSparkleCount = 0;
    this.maxSparkles = 30;
    this.maxParticlesPerClick = 10;
    this.animationFrameId = null;
    this.isPaused = false;

    // 색상 배열 정의
    this.colors = {
      white: '#ffffff',
      yellow: '#ffff00',
      cyan: '#00ffff',
      magenta: '#ff00ff',
      lime: '#00ff00'
    };
    this.colorKeys = Object.keys(this.colors);

    // 마우스 위치 초기화
    this.pointerX = window.innerWidth / 2;
    this.pointerY = window.innerHeight / 2;

    // 스파클 생성 관련 상수
    this.CLICK_BURST_COUNT = 60;
    this.SPARKLE_THROTTLE = 16; // 16ms (60fps)
    this.lastSparkleTime = 0;

    // 캐시 객체들 (안전하게 초기화)
    this.starPathCache = new Map();
    this.shadowBatch = new Map();
    this.geometryCache = new Map();
    this.transformCache = new Map();

    // 이벤트 리스너들
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundAnimate = this.animate.bind(this);

    // 현재 모드에 따른 최대 스파클 수 설정
    this.setModeBasedLimits();

    console.log(`CanvasSparkleSystem 초기화 완료 - 모드: ${wizardMode}, 최대 스파클: ${this.maxSparkles}`);
  }

  setModeBasedLimits() {
    switch(wizardMode) {
      case 'archmage':
        this.maxSparkles = 50;
        this.maxParticlesPerClick = 15;
        break;
      case 'apprentice':
        this.maxSparkles = 30;
        this.maxParticlesPerClick = 8;
        break;
      case 'muggle':
      default:
        this.maxSparkles = 0;
        this.maxParticlesPerClick = 0;
        break;
    }
  }

  init() {
    console.log('CanvasSparkleSystem.init() 시작');

    try {
      // 기존 리소스 정리
      this.destroy();

      // 모드별 제한 설정
      this.setModeBasedLimits();

      // 머글 모드면 비활성화
      if (wizardMode === 'muggle' || !isActive) {
        console.log('머글 모드 또는 비활성화 상태 - 시스템 초기화 하지 않음');
        return;
      }

      // Canvas 생성
      this.createCanvas();

      // 스파클 풀 생성
      this.createSparklePool();

      // 이벤트 리스너 등록
      this.attachEventListeners();

      // 애니메이션 시작
      this.startSparkleSystem();

      console.log(`✅ CanvasSparkleSystem 초기화 완료`);

    } catch (error) {
      console.error('❌ CanvasSparkleSystem 초기화 오류:', error);
      throw error;
    }
  }

  createCanvas() {
    try {
      // 기존 Canvas 제거
      const existingCanvas = document.getElementById('twinkle-canvas');
      if (existingCanvas) {
        console.log('기존 Canvas 제거 중...');
        existingCanvas.remove();
      }

      // 새 Canvas 생성
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'twinkle-canvas';
      this.canvas.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        background: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      `;

      // Canvas 크기 설정
      this.updateCanvasSize();

      // DOM에 추가
      if (!document.body) {
        console.log('document.body가 없음, DOM 로드 대기 중...');
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(this.canvas);
          console.log('DOMContentLoaded 후 Canvas 추가 완료');
        });
      } else {
        document.body.appendChild(this.canvas);
        console.log('Canvas DOM 추가 완료');
      }

      console.log('✅ Canvas 생성 완료:', this.canvas.width, 'x', this.canvas.height);
      
    } catch (error) {
      console.error('❌ Canvas 생성 오류:', error);
      throw error;
    }
  }

  updateCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // Canvas 컨텍스트 설정
    this.ctx = this.canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
      desynchronized: true
    });

    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    console.log(`🎨 Canvas 크기 설정: ${width}x${height}, DPR: ${dpr}`);
  }

  // 별 경로 생성 (캐싱)
  getStarPath(size) {
    const cacheKey = Math.round(size);

    if (!this.starPathCache.has(cacheKey)) {
      const path = new Path2D();
      const centerX = 0;
      const centerY = 0;
      const outerRadius = cacheKey / 2;

      // 별 모양 그리기
      path.moveTo(centerX, centerY - outerRadius);
      path.lineTo(centerX + outerRadius * 0.3, centerY - outerRadius * 0.3);
      path.lineTo(centerX + outerRadius, centerY);
      path.lineTo(centerX + outerRadius * 0.3, centerY + outerRadius * 0.3);
      path.lineTo(centerX, centerY + outerRadius);
      path.lineTo(centerX - outerRadius * 0.3, centerY + outerRadius * 0.3);
      path.lineTo(centerX - outerRadius, centerY);
      path.lineTo(centerX - outerRadius * 0.3, centerY - outerRadius * 0.3);
      path.closePath();

      this.starPathCache.set(cacheKey, path);

      // 캐시 크기 제한
      if (this.starPathCache.size > 50) {
        const firstKey = this.starPathCache.keys().next().value;
        this.starPathCache.delete(firstKey);
      }
    }

    return this.starPathCache.get(cacheKey);
  }

  createSparklePool() {
    this.sparklePool = [];
    this.activeSparkles = [];

    const poolSize = effectLevel >= 1.0 ? 50 : 30;

    for (let i = 0; i < poolSize; i++) {
      this.sparklePool.push(new CanvasSparkle());
    }

    console.log(`🏊‍♂️ 스파클 풀 생성: ${poolSize}개 (등급: ${wizardMode})`);
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
    if (!isActive || effectLevel === 0) return;

    const maxSparkles = effectLevel >= 1.0 ? 50 : 30;
    if (this.activeSparkleCount >= maxSparkles) return;

    const hiddenSparkles = this.sparklePool.filter(sparkle => !sparkle.active);
    if (hiddenSparkles.length === 0) return;

    const sparkle = hiddenSparkles[Math.floor(Math.random() * hiddenSparkles.length)];

    // 색상 선택
    const colorName = this.colorKeys[Math.floor(Math.random() * this.colorKeys.length)];
    const color = this.colors[colorName];

    // 마법사 등급별 크기 조절
    const baseSize = 16 + Math.random() * 16;
    const sizeMultiplier = effectLevel <= 0.33 ? 0.6 + effectLevel * 0.6 : effectLevel;
    const size = baseSize * sizeMultiplier;

    // 마법사 등급별 지속시간 조절
    const baseDuration = 1.2 + Math.random() * 0.6;
    const durationMultiplier = effectLevel <= 0.33 ? 0.7 + effectLevel * 0.6 : effectLevel;
    const animDuration = baseDuration * durationMultiplier;

    const startOffsetX = this.getRandomOffset(4);
    const startOffsetY = this.getRandomOffset(4);
    const angle = this.getRandomDirection();

    // 마법사 등급별 거리 조절
    const distanceMultiplier = effectLevel <= 0.33 ? effectLevel * 1.8 : 1.0 + effectLevel * 1.0;
    const adjustedMinDistance = minDistance * distanceMultiplier;
    const adjustedMaxDistance = maxDistance * distanceMultiplier;
    const distance = this.getRandomDistance(adjustedMinDistance, adjustedMaxDistance);

    const endX = startX + startOffsetX + Math.cos(angle * Math.PI / 180) * distance;
    const endY = startY + startOffsetY + Math.sin(angle * Math.PI / 180) * distance;

    sparkle.activate(
      startX + startOffsetX,
      startY + startOffsetY,
      endX,
      endY,
      size,
      color,
      animDuration
    );

    this.activeSparkleCount++;
    this.activeSparkles.push(sparkle);
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
  }

  // 다층 글로우 효과 렌더링
  drawMultiLayerGlow(starPath, sparkle) {
    const currentScale = sparkle.getScale();
    const currentAlpha = sparkle.getAlpha();
    const baseGlowSize = sparkle.size * currentScale * 0.4;
    const glowMultiplier = effectLevel <= 0.33 ? 0.7 : 1.0;
    const glowSize = baseGlowSize * glowMultiplier;

    // 1. 외부 글로우
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 1.8;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha * 0.25 * effectLevel;
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 2. 중간 글로우
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 1.2;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha * 0.5 * effectLevel;
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 3. 내부 글로우
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 0.6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha * 0.75 * effectLevel;
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 4. 핵심 별
    this.ctx.save();
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha;
    this.ctx.fill(starPath);
    this.ctx.restore();
  }

  animate() {
    if (!isActive || this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.boundAnimate);
      return;
    }

    // 스파클 업데이트 및 정리
    let hasUpdates = false;
    for (let i = this.activeSparkles.length - 1; i >= 0; i--) {
      const sparkle = this.activeSparkles[i];

      if (sparkle.active) {
        const updated = sparkle.update();
        hasUpdates = hasUpdates || updated;

        if (!sparkle.active) {
          this.activeSparkles.splice(i, 1);
          this.activeSparkleCount--;
        }
      } else {
        this.activeSparkles.splice(i, 1);
        this.activeSparkleCount--;
      }
    }

    // 렌더링
    if (hasUpdates || this.activeSparkles.length > 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const sparkle of this.activeSparkles) {
        if (!sparkle.active) continue;

        const scale = sparkle.getScale();
        const alpha = sparkle.getAlpha();
        
        if (scale <= 0 || alpha <= 0) continue;

        this.ctx.save();
        this.ctx.translate(sparkle.currentX, sparkle.currentY);
        this.ctx.scale(scale, scale);
        this.ctx.globalAlpha = alpha;

        const starPath = this.getStarPath(sparkle.size);
        this.drawMultiLayerGlow(starPath, sparkle);

        this.ctx.restore();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.boundAnimate);
  }

  handleResize() {
    this.updateCanvasSize();
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

    // 마법사 등급별 기본 스파클 생성 확률 조정
    let basicSpawnChance = effectLevel <= 0.33 ? 0.75 : 0.2;

    if (Math.random() > basicSpawnChance) {
      this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
    }
  }

  handleTouchMove(e) {
    if (!isActive || e.touches.length === 0) return;

    this.pointerX = e.touches[0].clientX;
    this.pointerY = e.touches[0].clientY;

    const now = performance.now();
    if (now - this.lastSparkleTime < this.SPARKLE_THROTTLE) return;

    this.lastSparkleTime = now;

    let basicSpawnChance = effectLevel <= 0.33 ? 0.75 : 0.2;

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
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.removeEventListeners();
    this.isPaused = true;
  }
  
  resumeAnimations() {
    if (!this.isPaused) return;
    
    console.log('▶️ 애니메이션 재시작');
    
    this.attachEventListeners();
    
    if (!this.animationFrameId && isActive) {
      this.animationFrameId = requestAnimationFrame(this.boundAnimate);
    }
    
    this.isPaused = false;
  }

  startSparkleSystem() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.isPaused = false;
    this.animationFrameId = requestAnimationFrame(this.boundAnimate);
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
    console.log('🚀 Canvas SparkleSystem 정리 중...');

    isActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.removeEventListeners();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // 모든 리소스 정리 (안전하게)
    this.sparklePool = [];
    this.activeSparkles = [];
    
    if (this.starPathCache && typeof this.starPathCache.clear === 'function') {
      this.starPathCache.clear();
    }
    if (this.shadowBatch && typeof this.shadowBatch.clear === 'function') {
      this.shadowBatch.clear();
    }
    if (this.geometryCache && typeof this.geometryCache.clear === 'function') {
      this.geometryCache.clear();
    }
    if (this.transformCache && typeof this.transformCache.clear === 'function') {
      this.transformCache.clear();
    }

    // 상태 초기화
    this.activeSparkleCount = 0;
    this.isPaused = false;

    console.log('✅ Canvas SparkleSystem 정리 완료');
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

        // 입력 검증
        if (!request.mode || !['muggle', 'apprentice', 'archmage'].includes(request.mode)) {
          console.error('❌ 잘못된 마법사 모드:', request.mode);
          sendResponse({ success: false, error: 'Invalid wizard mode' });
          return;
        }

        if (typeof request.effectLevel !== 'number' || request.effectLevel < 0 || request.effectLevel > 1) {
          console.error('❌ 잘못된 효과 레벨:', request.effectLevel);
          sendResponse({ success: false, error: 'Invalid effect level' });
          return;
        }

        // 마법사 등급 모드 변경
        const oldWizardMode = wizardMode;
        const oldIsActive = isActive;

        wizardMode = request.mode;
        effectLevel = request.effectLevel;
        isActive = (wizardMode !== 'muggle');

        console.log(`🔄 마법사 모드 변경: ${oldWizardMode}→${wizardMode}, 활성화: ${oldIsActive}→${isActive}, 효과: ${effectLevel}`);

        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }

        sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
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
        let shouldReinitialize = false;

        if (changes.wizardMode) {
          wizardMode = changes.wizardMode.newValue;
          shouldReinitialize = true;
        }

        if (changes.effectLevel) {
          effectLevel = changes.effectLevel.newValue;
          shouldReinitialize = true;
        }

        if (changes.twinkleTouchEnabled) {
          const newEnabled = changes.twinkleTouchEnabled.newValue;
          isActive = newEnabled && wizardMode !== 'muggle';
          shouldReinitialize = true;
        }

        if (shouldReinitialize) {
          console.log(`저장소 변경 감지: ${wizardMode}, 효과: ${effectLevel}, 활성화: ${isActive}`);
          
          if (isActive) {
            initializeTwinkleEffect();
          } else if (sparkleSystem) {
            sparkleSystem.destroy();
            sparkleSystem = null;
          }
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
    console.log('새로운 CanvasSparkleSystem 생성 중...');
    sparkleSystem = new CanvasSparkleSystem();
    
    console.log('CanvasSparkleSystem 초기화 중...');
    sparkleSystem.init();

    // 초기화 성공 확인
    if (sparkleSystem && sparkleSystem.canvas) {
      console.log(`✅ 초기화 성공: Canvas 크기=${sparkleSystem.canvas.width}x${sparkleSystem.canvas.height}`);
      return { success: true, message: '초기화 성공' };
    } else {
      throw new Error('Canvas 생성 실패');
    }

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
    canvas: sparkleSystem ? !!sparkleSystem.canvas : false
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