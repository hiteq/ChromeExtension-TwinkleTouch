// TwinkleTouch Chrome Extension - Canvas-based Content Script (마법사 등급 시스템)
console.log('TwinkleTouch Canvas 마법사 등급 버전이 로드되었습니다!');

let isActive = true; // 기본값을 true로 변경
let sparkleSystem = null;
let effectLevel = 1.0; // 마법사 등급별 효과 강도 (0: 머글, 0.33: 수련생, 1.0: 대마법사)
let wizardMode = 'archmage'; // 현재 마법사 등급

// 고성능 Canvas 별 객체 (메모리 최적화)
class CanvasSparkle {
  constructor() {
    this.reset();
    this.isDirty = false; // 더티 플래그 추가
  }

  reset() {
    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.prevX = 0; // 이전 위치 추적 (더티 리전용)
    this.prevY = 0;
    this.size = 0;
    this.color = '#ffffff';
    this.startTime = 0;
    this.duration = 1500;
    this.animationProgress = 0;
    this.glowSize = 0;
    this.isDirty = false;
    this.scaleCached = 0; // 스케일 캐싱
    this.alphaCached = 0; // 알파 캐싱
  }

  activate(startX, startY, endX, endY, size, color, duration) {
    this.active = true;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.currentX = startX;
    this.currentY = startY;
    this.prevX = startX;
    this.prevY = startY;
    this.size = size;
    this.color = color;
    this.duration = duration * 1000;
    this.startTime = performance.now();
    this.animationProgress = 0;
    this.glowSize = size;
    this.isDirty = true;
    this.scaleCached = 0;
    this.alphaCached = 0;
  }

  // 최적화된 이징 함수 (룩업 테이블 방식)
  static createEasingLUT() {
    if (CanvasSparkle.easingLUT) return CanvasSparkle.easingLUT;

    const LUT_SIZE = 1000;
    CanvasSparkle.easingLUT = new Float32Array(LUT_SIZE);

    for (let i = 0; i < LUT_SIZE; i++) {
      const t = i / (LUT_SIZE - 1);
      const c1 = 0.645, c2 = 0.045, c3 = 0.355, c4 = 1;
      // 베지어 곡선 계산을 미리 수행
      CanvasSparkle.easingLUT[i] = t * t * t * (c1 + c3) + 3 * t * t * (1 - t) * (c2 + c4) + 3 * t * (1 - t) * (1 - t) * c1;
    }

    return CanvasSparkle.easingLUT;
  }

  getEasing(progress) {
    const lut = CanvasSparkle.createEasingLUT();
    const index = Math.floor(progress * (lut.length - 1));
    return lut[Math.min(index, lut.length - 1)];
  }

  update() {
    if (!this.active) return false;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;

    if (elapsed >= this.duration) {
      this.active = false;
      return false;
    }

    // 이전 위치 저장 (더티 리전용)
    this.prevX = this.currentX;
    this.prevY = this.currentY;

    this.animationProgress = elapsed / this.duration;
    const easedProgress = this.getEasing(this.animationProgress);

    // 위치 계산
    this.currentX = this.startX + (this.endX - this.startX) * easedProgress;
    this.currentY = this.startY + (this.endY - this.startY) * easedProgress;

    // 위치가 변경되었는지 확인
    const moved = Math.abs(this.currentX - this.prevX) > 0.1 || Math.abs(this.currentY - this.prevY) > 0.1;
    this.isDirty = moved;

    return true;
  }

  getScale() {
    const progress = this.animationProgress;
    this.scaleCached = progress < 0.5 ?
      progress * 2 :
      2 - (progress * 2);

    return Math.max(0.1, this.scaleCached); // 최소값 보장
  }

  getAlpha() {
    const progress = this.animationProgress;
    this.alphaCached = progress < 0.8 ? 1 : (1 - progress) / 0.2;

    return Math.max(0.1, this.alphaCached); // 최소값 보장
  }

  getBoundingBox() {
    const scale = this.getScale();
    const size = this.size * scale;
    return {
      x: this.currentX - size,
      y: this.currentY - size,
      width: size * 2,
      height: size * 2
    };
  }

  getPrevBoundingBox() {
    const scale = this.getScale();
    const size = this.size * scale;
    return {
      x: this.prevX - size,
      y: this.prevY - size,
      width: size * 2,
      height: size * 2
    };
  }
}

class CanvasSparkleSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.sparklePool = [];
    this.poolSize = 0;
    this.maxSparkles = 30; // 성능 최적화: 50 → 30
    this.maxParticlesPerClick = 10; // 성능 최적화: 15 → 10
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.performanceMode = 'auto'; // auto, high, medium, low
    this.isAnimating = false;
    this.animationId = null;
    this.renderQueue = [];
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.starPath = null;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.lastClickTime = 0;
    this.clickCooldown = 50; // 50ms 쿨다운
    this.burstActive = false;
    this.activeBursts = [];
    this.memoryCleanupInterval = null;
    this.performanceMonitorInterval = null;
    this.averageFrameTime = 16.67; // 60fps 기준
    this.frameTimeHistory = [];
    this.dynamicQuality = 1.0;
    this.webglSupported = false;
    this.dirtyRegions = [];
    this.viewportBounds = { x: 0, y: 0, width: 0, height: 0 };
    this.frustumCulling = true;
    this.lastResizeTime = 0;
    this.resizeThrottle = 150; // 150ms 간격으로 resize 처리

    // 필수 속성들 초기화
    this.activeSparkles = [];
    this.activeSparkleCount = 0;
    this.renderBatch = [];
    this.shadowBatch = new Map();
    this.starPathCache = new Map();
    this.geometryCache = new Map();
    this.transformCache = new Map();
    this.renderQuality = 1.0;
    this.batchingThreshold = 5;
    this.isLowPowerMode = false;
    this.renderSkipCounter = 0;
    this.adaptiveQuality = true;
    this.offscreenSupported = false;
    this.animationFrameId = null;
    this.cullingEnabled = true;
    this.visibleSparkles = [];
    this.memoryCleanupInterval = 30000; // 30초마다 메모리 정리
    this.MAX_SPARKLES = 100;

    // 색상 배열 정의 (중요!)
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
    this.NORMAL_MAX_ACTIVE = 30;
    this.SPARKLE_THROTTLE = 16; // 16ms (60fps)
    this.lastSparkleTime = 0;

    // 상수 정의
    const APPRENTICE_MAX_SPARKLES = 30;
    const ARCHMAGE_MAX_SPARKLES = 50;
    const MUGGLE_MAX_SPARKLES = 0;

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

      // 성능 모니터링 시작
      this.startPerformanceMonitoring();

      // 메모리 정리 시작
      this.startMemoryCleanup();

      // WebGL 지원 확인
      this.webglSupported = this.checkWebGLSupport();

      // 애니메이션 시작
      this.startSparkleSystem();

      console.log(`✅ CanvasSparkleSystem 초기화 완료 - WebGL: ${this.webglSupported ? '지원' : '미지원'}`);

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

      // DOM에 추가 (body가 없으면 기다림)
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

    // 적응형 해상도 (성능에 따라 조절)
    const actualDpr = dpr * this.renderQuality;

    this.canvas.width = width * actualDpr;
    this.canvas.height = height * actualDpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    // 고급 Canvas 최적화 옵션
    this.ctx = this.canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
      desynchronized: true, // 성능 향상 (Chrome)
      powerPreference: 'high-performance', // GPU 가속 우선
      antialias: this.renderQuality > 0.8, // 고품질일 때만 안티에일리어싱
      preserveDrawingBuffer: false, // 메모리 절약
      premultipliedAlpha: true, // 알파 블렌딩 최적화
      failIfMajorPerformanceCaveat: false // 성능 저하 시에도 동작
    });

    this.ctx.scale(actualDpr, actualDpr);

    // 고성능 렌더링 설정
    this.ctx.imageSmoothingEnabled = this.renderQuality > 0.7;
    this.ctx.imageSmoothingQuality = this.renderQuality > 0.9 ? 'high' : 'medium';

    // 텍스트 렌더링 최적화 (사용하지 않지만 전역 설정)
    this.ctx.textRenderingOptimization = 'speed';

    console.log(`🎨 Canvas 최적화 설정: DPR=${actualDpr.toFixed(2)}, 품질=${this.renderQuality}, 안티에일리어싱=${this.ctx.imageSmoothingEnabled}`);
  }

  setupOffscreenCanvas() {
    if (!this.offscreenSupported) return;

    try {
      this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      console.log('오프스크린 캔버스 활성화됨');
    } catch (error) {
      console.log('오프스크린 캔버스 생성 실패:', error);
      this.offscreenSupported = false;
    }
  }

  // 향상된 별 경로 생성 (더 정밀한 캐싱)
  getStarPath(size) {
    const cacheKey = Math.round(size); // 정수로 반올림하여 캐시 효율성 증대

    if (!this.starPathCache.has(cacheKey)) {
      const path = new Path2D();
      const centerX = 0;
      const centerY = 0;
      const outerRadius = cacheKey / 2;

      // 원본과 동일한 별 모양 (벡터 최적화)
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

      // 캐시 크기 제한 (메모리 관리)
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

    // 대마법사 모드일 때 더 큰 풀 생성
    const poolSize = effectLevel >= 1.0 ? 50 : this.MAX_SPARKLES;

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

    // 동적 최대 파티클 수 체크
    const maxSparkles = effectLevel >= 1.0 ? 50 : this.MAX_SPARKLES;
    if (this.activeSparkleCount >= maxSparkles) return;

    const hiddenSparkles = this.sparklePool.filter(sparkle => !sparkle.active);
    if (hiddenSparkles.length === 0) return;

    const sparkle = hiddenSparkles[Math.floor(Math.random() * hiddenSparkles.length)];

    // 색상 선택 최적화 (미리 캐싱된 키 배열 사용)
    const colorName = this.colorKeys[Math.floor(Math.random() * this.colorKeys.length)];
    const color = this.colors[colorName];

    // 마법사 등급별 크기 조절
    const baseSize = 16 + Math.random() * 16;
    let sizeMultiplier;
    if (effectLevel <= 0.33) {
      // 수련생: 60-80% 크기 (적당한 크기)
      sizeMultiplier = 0.6 + effectLevel * 0.6;
    } else {
      // 대마법사: 100% 크기
      sizeMultiplier = effectLevel;
    }
    const size = baseSize * sizeMultiplier;

    // 마법사 등급별 지속시간 조절
    const baseDuration = 1.2 + Math.random() * 0.6;
    let durationMultiplier;
    if (effectLevel <= 0.33) {
      // 수련생: 70-90% 지속시간 (적당한 지속시간)
      durationMultiplier = 0.7 + effectLevel * 0.6;
    } else {
      // 대마법사: 100% 지속시간
      durationMultiplier = effectLevel;
    }
    const animDuration = baseDuration * durationMultiplier;

    // 디버깅: 첫 번째 스파클에 대해서만 로그 출력
    if (this.activeSparkleCount === 0) {
      console.log(`🎯 Sparkle Debug - effectLevel: ${effectLevel}, sizeMultiplier: ${sizeMultiplier.toFixed(2)}, durationMultiplier: ${durationMultiplier.toFixed(2)}, size: ${size.toFixed(1)}, duration: ${animDuration.toFixed(2)}s`);
    }

    const startOffsetX = this.getRandomOffset(4);
    const startOffsetY = this.getRandomOffset(4);
    const angle = this.getRandomDirection();

    // 마법사 등급별 거리 조절
    let distanceMultiplier;
    if (effectLevel <= 0.33) {
      // 수련생: 60% 거리 (적당한 움직임)
      distanceMultiplier = effectLevel * 1.8;
    } else {
      // 대마법사: 200% 거리 (2배 더 멀리)
      distanceMultiplier = 1.0 + effectLevel * 1.0;
    }
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

    // 카운터와 배열 동기화 보장
    this.activeSparkleCount++;
    this.activeSparkles.push(sparkle);
  }

  activateSparkle() {
    // 마법사 등급별 확률 조절
    let spawnChance;
    if (effectLevel <= 0.33) {
      // 수련생: 적당한 확률 (50-60%)
      spawnChance = 0.5 + effectLevel * 0.3;
    } else {
      // 대마법사: 높은 확률 (80-100%)
      spawnChance = 0.8 + (effectLevel - 0.33) * 0.3;
    }

    // 디버깅: 가끔씩 확률 정보 출력
    if (Math.random() < 0.01) { // 1% 확률로 로그 출력
      console.log(`🎲 Spawn Chance Debug - effectLevel: ${effectLevel}, spawnChance: ${spawnChance.toFixed(3)} (${(spawnChance * 100).toFixed(1)}%)`);
    }

    if (Math.random() > spawnChance) return;

    this.activateSparkleAt(this.pointerX, this.pointerY, 70, 140);
  }

  createMultipleSparkles(count, isNormalMode = true) {
    // 마법사 등급별 스파클 개수 조절
    let adjustedCount;
    if (effectLevel <= 0.33) {
      // 수련생: 적당한 개수 (50-70%)
      adjustedCount = Math.floor(count * effectLevel * 2.0);
    } else {
      // 대마법사: 풀 개수 (100%)
      adjustedCount = Math.floor(count * effectLevel);
    }

    if (adjustedCount === 0) return;

    // 최대 한계 적용
    const maxAllowed = isNormalMode ? this.NORMAL_MAX_ACTIVE : this.MAX_SPARKLES;
    const actualCount = Math.min(adjustedCount, maxAllowed - this.activeSparkleCount);

    if (actualCount <= 0) return;

    // 디버깅: 마우스 움직임 스파클 생성 정보 (가끔씩만 출력)
    if (Math.random() < 0.05) { // 5% 확률로 로그 출력
      console.log(`🖱️ Mouse Sparkles - effectLevel: ${effectLevel}, requested: ${count}, adjusted: ${adjustedCount}, actual: ${actualCount}, activeCount: ${this.activeSparkleCount}/${maxAllowed}`);
    }

    // 배치 생성으로 성능 향상
    for (let i = 0; i < actualCount; i++) {
      setTimeout(() => {
        this.activateSparkle();
      }, i * 10);
    }
  }

  createClickBurst(x, y) {
    const baseBurstCount = this.CLICK_BURST_COUNT;
    let adjustedBurstCount;

    if (effectLevel <= 0.33) {
      // 수련생: 의미있는 효과 (25-35개, 약 40-55%)
      adjustedBurstCount = Math.floor(25 + effectLevel * 30);
    } else {
      // 대마법사: 풀 효과 (85-100%)
      adjustedBurstCount = Math.floor(baseBurstCount * (0.85 + (effectLevel - 0.33) * 0.22));
    }

    if (adjustedBurstCount === 0) {
      console.log(`💥 Click Burst Debug - effectLevel: ${effectLevel}, planned: 0 particles (blocked)`);
      return;
    }

    // 디버깅: 클릭 버스트 정보 출력
    console.log(`💥 Click Burst Debug - effectLevel: ${effectLevel}, baseBurstCount: ${baseBurstCount}, adjustedBurstCount: ${adjustedBurstCount}, 비율: ${(adjustedBurstCount/baseBurstCount * 100).toFixed(1)}%`);

    const batchSize = 16;
    const batches = Math.ceil(adjustedBurstCount / batchSize);
    let actualCreatedCount = 0;

    for (let batch = 0; batch < batches; batch++) {
      setTimeout(() => {
        const remaining = Math.min(batchSize, adjustedBurstCount - (batch * batchSize));

        for (let i = 0; i < remaining; i++) {
          setTimeout(() => {
            const beforeCount = this.activeSparkleCount;

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

            // 실제 생성된 경우 카운터 증가
            if (this.activeSparkleCount > beforeCount) {
              actualCreatedCount++;
            }

            // 마지막 배치의 마지막 파티클일 때 최종 결과 출력
            if (batch === batches - 1 && i === remaining - 1) {
              setTimeout(() => {
                console.log(`✨ Click Burst Result - planned: ${adjustedBurstCount}, actual created: ${actualCreatedCount}, success rate: ${(actualCreatedCount/adjustedBurstCount * 100).toFixed(1)}%`);
              }, 10);
            }
          }, i * 5);
        }
      }, batch * 50);
    }
  }



  // 배치 렌더링 시스템 (극한 최적화)
  prepareBatchRender() {
    this.renderBatch.length = 0;
    if (this.shadowBatch && typeof this.shadowBatch.clear === 'function') {
      this.shadowBatch.clear();
    }

    // 활성 스파클들을 그림자 색상별로 그룹화
    for (const sparkle of this.activeSparkles) {
      if (sparkle.active && sparkle.scaleCached > 0 && sparkle.alphaCached > 0) {
        this.renderBatch.push(sparkle);

        const shadowKey = sparkle.color;
        if (!this.shadowBatch.has(shadowKey)) {
          this.shadowBatch.set(shadowKey, []);
        }
        this.shadowBatch.get(shadowKey).push(sparkle);
      }
    }
  }

  drawSparklesBatch() {
    // 그림자 색상별로 배치 렌더링
    for (const [shadowColor, sparkles] of this.shadowBatch) {
      if (sparkles.length === 0) continue;

      this.ctx.save();
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = 10;

      for (const sparkle of sparkles) {
        this.ctx.save();
        this.ctx.translate(sparkle.currentX, sparkle.currentY);
        this.ctx.scale(sparkle.scaleCached, sparkle.scaleCached);
        this.ctx.fillStyle = sparkle.color;
        this.ctx.globalAlpha = sparkle.alphaCached;

        const starPath = this.getStarPath(sparkle.size);
        this.ctx.fill(starPath);

        this.ctx.restore();
      }

      this.ctx.restore();
    }
  }

  // 성능 적응형 렌더링
  adaptiveRender() {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    const fps = 1000 / deltaTime;

    this.frameCount++;

    // FPS 기반 품질 조절 (60fps 기준)
    if (this.adaptiveQuality && this.frameCount % 60 === 0) {
      if (fps < 45) {
        this.renderQuality = Math.max(0.5, this.renderQuality - 0.1);
      } else if (fps > 55) {
        this.renderQuality = Math.min(1.0, this.renderQuality + 0.1);
      }
    }

    this.lastFrameTime = now;
  }

  animate() {
    if (!isActive) {
      this.animationFrameId = requestAnimationFrame(this.boundAnimate);
      return;
    }

    // 성능 모니터링
    this.adaptiveRender();

    // 적응형 품질 조절
    this.adaptiveQualityControl();

    // 저전력 모드에서 프레임 스킵
    if (this.isLowPowerMode && this.renderSkipCounter !== 0) {
      this.animationFrameId = requestAnimationFrame(this.boundAnimate);
      return;
    }

    // 스파클 업데이트 및 정리 (역순으로 순회하여 안전한 제거)
    let hasUpdates = false;
    for (let i = this.activeSparkles.length - 1; i >= 0; i--) {
      const sparkle = this.activeSparkles[i];

      if (sparkle.active) {
        const updated = sparkle.update();
        hasUpdates = hasUpdates || updated;

        // 애니메이션 완료 체크 (update에서 active가 false로 변경됨)
        if (!sparkle.active) {
          this.activeSparkles.splice(i, 1);
          this.activeSparkleCount--;
        }
      } else {
        // 비활성 스파클 즉시 제거 및 카운터 동기화
        this.activeSparkles.splice(i, 1);
        this.activeSparkleCount--;
      }
    }

    // 렌더링이 필요한 경우만 캔버스 업데이트
    if (hasUpdates || this.activeSparkles.length > 0) {
      // 뷰포트 컬링 적용
      const visibleSparkles = this.cullSparkles();

      if (visibleSparkles.length > 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 최적화된 배치 렌더링
        this.optimizedBatchRender(visibleSparkles);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.boundAnimate);
  }

  // 최적화된 배치 렌더링
  optimizedBatchRender(sparkles) {
    // 크기와 색상별로 그룹화 (인스턴스 렌더링을 위해)
    const instanceGroups = new Map();

    for (const sparkle of sparkles) {
      // 스케일과 알파 값을 실시간으로 계산
      const scale = sparkle.getScale();
      const alpha = sparkle.getAlpha();
      
      if (scale <= 0 || alpha <= 0) continue;

      const groupKey = `${Math.round(sparkle.size)}-${sparkle.color}`;
      if (!instanceGroups.has(groupKey)) {
        instanceGroups.set(groupKey, []);
      }
      instanceGroups.get(groupKey).push(sparkle);
    }

    // 그룹별로 인스턴스 렌더링
    for (const [groupKey, groupSparkles] of instanceGroups) {
      if (groupSparkles.length >= this.batchingThreshold) {
        // 배치 렌더링 (5개 이상일 때)
        const [size, color] = groupKey.split('-');
        this.drawInstancedSparkles(groupSparkles, parseInt(size), color);
      } else {
        // 개별 렌더링 (소수일 때)
        this.drawIndividualSparkles(groupSparkles);
      }
    }
  }

  // 개별 스파클 렌더링 (소수 그룹용) - 강화된 글로우 효과
  drawIndividualSparkles(sparkles) {
    for (const sparkle of sparkles) {
      // 실시간으로 스케일과 알파 값 계산
      const scale = sparkle.getScale();
      const alpha = sparkle.getAlpha();
      
      if (scale <= 0 || alpha <= 0) continue;

      this.ctx.save();
      this.ctx.translate(sparkle.currentX, sparkle.currentY);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = alpha;

      const starPath = this.getStarPath(sparkle.size);

      // 다층 글로우 효과 (HTML 예제의 drop-shadow와 유사)
      this.drawMultiLayerGlow(starPath, sparkle);

      this.ctx.restore();
    }
  }

  // 다층 글로우 효과 렌더링 (마법사 등급별 강도 조절)
  drawMultiLayerGlow(starPath, sparkle) {
    const currentScale = sparkle.getScale();
    const baseGlowSize = sparkle.size * currentScale * 0.4;

    // 마법사 등급별 글로우 강도 조절
    const glowMultiplier = effectLevel <= 0.33 ? 0.7 : 1.0; // 수련생: 70%, 대마법사: 100%
    const glowSize = baseGlowSize * glowMultiplier;

    // 1. 외부 글로우 (가장 큰 반경, 투명도 낮음)
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 1.8; // 더 넓은 확산
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    const currentAlpha = sparkle.getAlpha();
    this.ctx.globalAlpha = currentAlpha * 0.25 * effectLevel; // 등급별 조절
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 2. 중간 글로우 (중간 반경, 중간 투명도)
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 1.2;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha * 0.5 * effectLevel;
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 3. 내부 글로우 (작은 반경, 높은 투명도)
    this.ctx.save();
    this.ctx.shadowColor = sparkle.color;
    this.ctx.shadowBlur = glowSize * 0.6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha * 0.75 * effectLevel;
    this.ctx.fill(starPath);
    this.ctx.restore();

    // 4. 핵심 별 (글로우 없이, 최대 밝기)
    this.ctx.save();
    this.ctx.fillStyle = sparkle.color;
    this.ctx.globalAlpha = currentAlpha;
    this.ctx.fill(starPath);
    this.ctx.restore();
  }

  // 성능 모니터링
  startPerformanceMonitoring() {
    setInterval(() => {
      if (this.frameCount > 0) {
        const avgFps = this.frameCount / 1;
        const memoryInfo = this.getMemoryUsage();

        console.log(`🚀 극한 최적화 성능 상태:`, {
          FPS: Math.round(avgFps),
          품질: this.renderQuality.toFixed(2),
          활성파티클: `${this.activeSparkleCount}/${this.activeSparkles.length}`,
          저전력모드: this.isLowPowerMode,
          뷰포트컬링: this.cullingEnabled,
          WebGL지원: this.webglSupported,
          메모리: memoryInfo,
          캐시상태: {
            별경로: this.starPathCache.size,
            기하학: this.geometryCache.size,
            변환: this.transformCache.size
          }
        });
        this.frameCount = 0;
      }
    }, 3000); // 3초마다 상세 리포트
  }

  // 메모리 사용량 체크
  getMemoryUsage() {
    if (performance.memory) {
      return {
        사용중: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        총할당: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        한계: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      };
    }
    return '지원안함';
  }

  // 동적 최적화 설정 조절
  adjustOptimizationSettings() {
    const currentFps = this.frameCount;

    // FPS 기반 동적 조절
    if (currentFps < 30) {
      // 성능이 좋지 않을 때
      this.cullingEnabled = true;
      this.batchingThreshold = 3; // 더 공격적인 배치
      this.renderQuality = Math.max(0.5, this.renderQuality - 0.2);
      this.isLowPowerMode = true;
    } else if (currentFps > 55) {
      // 성능이 좋을 때
      this.batchingThreshold = 5;
      this.renderQuality = Math.min(1.0, this.renderQuality + 0.1);
      this.isLowPowerMode = false;
    }
  }

  handleResize() {
    this.updateCanvasSize();
    this.pointerX = window.innerWidth / 2;
    this.pointerY = window.innerHeight / 2;
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

    // 마법사 등급별 기본 스파클 생성 확률 조정
    let basicSpawnChance, burstSpawnChance;
    if (effectLevel <= 0.33) {
      // 수련생: 적당한 확률 (25% 확률로 생성)
      basicSpawnChance = 0.75; // 75% 확률로 막음
      burstSpawnChance = 0.90; // 90% 확률로 막음 (10% 확률로 생성)
    } else {
      // 대마법사: 높은 확률 (80% 확률로 생성)
      basicSpawnChance = 0.2; // 20% 확률로 막음
      burstSpawnChance = 0.7; // 70% 확률로 막음 (30% 확률로 생성)
    }

    if (Math.random() > basicSpawnChance) {
      this.createMultipleSparkles(1);
    }

    if (Math.random() > burstSpawnChance) {
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

    // 터치에서도 마법사 등급별 확률 적용
    let basicSpawnChance;
    if (effectLevel <= 0.33) {
      // 수련생: 적당한 확률 (25% 확률로 생성)
      basicSpawnChance = 0.75; // 75% 확률로 막음
    } else {
      // 대마법사: 높은 확률 (80% 확률로 생성)
      basicSpawnChance = 0.2; // 20% 확률로 막음
    }

    if (Math.random() > basicSpawnChance) {
      this.createMultipleSparkles(1);
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
      console.log('❌ 클릭 이벤트 차단됨 - isActive:', isActive, 'wizardMode:', wizardMode);
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
    console.log('⏸️ 애니메이션 일시정지 (메모리 최적화)');
    
    // 애니메이션 루프 중지
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 이벤트 리스너 일시 제거 (성능 최적화)
    this.removeEventListeners();
    
    // 상태 저장
    this.isPaused = true;
  }
  
  resumeAnimations() {
    if (!this.isPaused) return;
    
    console.log('▶️ 애니메이션 재시작');
    
    // 이벤트 리스너 다시 연결
    this.attachEventListeners();
    
    // 애니메이션 루프 재시작
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
    console.log('고성능 Canvas 애니메이션 시작');
  }

  // 뷰포트 컬링 (화면 밖 스파클 제거)
  cullSparkles() {
    if (!this.cullingEnabled) return this.activeSparkles;

    const viewportMargin = 100; // 화면 밖 여유 공간
    const visibleSparkles = [];

    for (const sparkle of this.activeSparkles) {
      if (sparkle.active &&
          sparkle.currentX >= -viewportMargin &&
          sparkle.currentX <= window.innerWidth + viewportMargin &&
          sparkle.currentY >= -viewportMargin &&
          sparkle.currentY <= window.innerHeight + viewportMargin) {
        visibleSparkles.push(sparkle);
      }
    }

    return visibleSparkles;
  }

  // 인스턴스 렌더링 (동일한 크기/색상 스파클들을 한 번에) - 강화된 글로우 효과
  drawInstancedSparkles(sparkles, size, color) {
    if (sparkles.length === 0) return;

    // 배치 렌더링으로 성능 향상
    this.ctx.save();
    
    for (const sparkle of sparkles) {
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
    
    this.ctx.restore();
  }

  // 적응형 렌더링 품질 조절
  adaptiveQualityControl() {
    const sparkleCount = this.activeSparkleCount;
    
    // 파티클 수에 따른 품질 조절
    if (sparkleCount > 40) {
      this.renderQuality = Math.max(0.6, this.renderQuality - 0.1);
      this.isLowPowerMode = true;
    } else if (sparkleCount < 20) {
      this.renderQuality = Math.min(1.0, this.renderQuality + 0.05);
      this.isLowPowerMode = false;
    }
  }

  // WebGL 지원 확인
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  // 메모리 정리 시작
  startMemoryCleanup() {
    setInterval(() => {
      // 캐시 크기 제한
      if (this.starPathCache && this.starPathCache.size > 50) {
        this.starPathCache.clear();
      }
      
      if (this.geometryCache && this.geometryCache.size > 50) {
        this.geometryCache.clear();
      }
      
      if (this.transformCache && this.transformCache.size > 100) {
        this.transformCache.clear();
      }
    }, this.memoryCleanupInterval);
  }

  attachEventListeners() {
    document.addEventListener('mousemove', this.boundHandleMouseMove, { passive: true });
    document.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
    document.addEventListener('click', this.boundHandleClick, { passive: true });
    document.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
    window.addEventListener('resize', this.boundHandleResize, { passive: true });
    console.log('고성능 이벤트 리스너가 등록되었습니다');
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('touchmove', this.boundHandleTouchMove);
    document.removeEventListener('click', this.boundHandleClick);
    document.removeEventListener('touchstart', this.boundHandleTouchStart);
    window.removeEventListener('resize', this.boundHandleResize);
    console.log('이벤트 리스너가 제거되었습니다');
  }

  destroy() {
    console.log('🚀 극한 최적화 Canvas SparkleSystem 정리 중...');

    isActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.removeEventListeners();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // 모든 리소스 정리
    this.sparklePool = [];
    this.activeSparkles = [];
    
    // 안전하게 Map 객체들 정리
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
    
    this.renderBatch = [];
    this.dirtyRegions = [];
    this.visibleSparkles = [];

    // 타이머 정리
    if (this.mouseTimer) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }

    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }

    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = null;
    }

    // 상태 초기화
    this.activeSparkleCount = 0;
    this.frameCount = 0;
    this.isAnimating = false;

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

        // 입력 검증 추가
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
        // 머글 모드가 아니면 항상 활성화
        isActive = (wizardMode !== 'muggle');

        console.log(`🔄 마법사 모드 변경: ${oldWizardMode}→${wizardMode}, 활성화: ${oldIsActive}→${isActive}, 효과: ${effectLevel}`);

        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }

        // 최종 상태 확인
        setTimeout(() => {
          console.log(`✅ 최종 상태 확인: isActive=${isActive}, wizardMode=${wizardMode}, sparkleSystem=${!!sparkleSystem}`);
        }, 100);

        sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
      } else if (request.action === 'toggleTwinkle') {
        // 레거시 토글 메시지 지원 (하위 호환성)
        isActive = request.enabled;
        effectLevel = isActive ? 1.0 : 0;
        wizardMode = isActive ? 'archmage' : 'muggle';

        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }

        sendResponse({success: true});
      } else if (request.action === 'tabActivated') {
        // 탭 활성화 시 애니메이션 재시작
        if (sparkleSystem && isActive) {
          sparkleSystem.startSparkleSystem();
        }
        sendResponse({ success: true });
      } else if (request.action === 'syncSettings') {
        // 설정 동기화
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

setupMessageListener();

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
    // 페이지가 숨겨졌을 때 애니메이션 일시정지
    if (sparkleSystem) {
      sparkleSystem.pauseAnimations();
    }
  } else {
    // 페이지가 다시 보일 때 애니메이션 재시작
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
    // 화면 중앙에 강제로 스파클 생성
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    console.log(`중앙 위치에 스파클 생성: (${centerX}, ${centerY})`);
    sparkleSystem.createClickBurst(centerX, centerY);
  } else {
    console.log('❌ SparkleSystem이 초기화되지 않았습니다.');
    initializeTwinkleEffect();
  }
};

// DOM 로드 후 실행
if (document.readyState === 'loading') {0) return;

    this.createClickBurst(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }

  // 뷰포트 컬링 (화면 밖 스파클 제거)
  cullSparkles() {
    if (!this.cullingEnabled) return this.activeSparkles;

    const viewportMargin = 100; // 화면 밖 여유 공간
    const visibleSparkles = [];

    for (const sparkle of this.activeSparkles) {
      if (sparkle.active &&
          sparkle.currentX >= -viewportMargin &&
          sparkle.currentX <= window.innerWidth + viewportMargin &&
          sparkle.currentY >= -viewportMargin &&
          sparkle.currentY <= window.innerHeight + viewportMargin) {
        visibleSparkles.push(sparkle);
      }
    }

    return visibleSparkles;
  }

  // 인스턴스 렌더링 (동일한 크기/색상 스파클들을 한 번에) - 강화된 글로우 효과
  drawInstancedSparkles(sparkles, size, color) {
    if (sparkles.length === 0) return;

    // 배치 렌더링으로 성능 향상
    this.ctx.save();
    
    for (const sparkle of sparkles) {
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
    
    this.ctx.restore();
  }

  // 적응형 렌더링 품질 조절
  adaptiveQualityControl() {
    const sparkleCount = this.activeSparkleCount;
    
    // 파티클 수에 따른 품질 조절
    if (sparkleCount > 40) {
      this.renderQuality = Math.max(0.6, this.renderQuality - 0.1);
      this.isLowPowerMode = true;
    } else if (sparkleCount < 20) {
      this.renderQuality = Math.min(1.0, this.renderQuality + 0.05);
      this.isLowPowerMode = false;
    }
  }

  // WebGL 지원 확인
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  // 메모리 정리 시작
  startMemoryCleanup() {
    setInterval(() => {
      // 캐시 크기 제한
      if (this.starPathCache.size > 50) {
        this.starPathCache.clear();
      }
      
      if (this.geometryCache && this.geometryCache.size > 50) {
        this.geometryCache.clear();
      }
      
      if (this.transformCache && this.transformCache.size > 100) {
        this.transformCache.clear();
      }
    }, this.memoryCleanupInterval);
  }

  attachEventListeners() {
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    console.log('고성능 이벤트 리스너가 등록되었습니다');
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('resize', this.handleResize);
  }

  startSparkleSystem() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.isPaused = false;
    this.animationFrameId = requestAnimationFrame(this.boundAnimate);
    console.log('고성능 Canvas 애니메이션 시작');
  }

  // 뷰포트 컬링 (화면 밖 스파클 제거)
  cullSparkles() {
    if (!this.cullingEnabled) return this.activeSparkles;

    const viewportMargin = 100; // 화면 밖 여유 공간
    const visibleSparkles = [];

    for (const sparkle of this.activeSparkles) {
      if (sparkle.active &&
          sparkle.currentX >= -viewportMargin &&
          sparkle.currentX <= window.innerWidth + viewportMargin &&
          sparkle.currentY >= -viewportMargin &&
          sparkle.currentY <= window.innerHeight + viewportMargin) {
        visibleSparkles.push(sparkle);
      }
    }

    return visibleSparkles;
  }

  // 인스턴스 렌더링 (동일한 크기/색상 스파클들을 한 번에) - 강화된 글로우 효과
  drawInstancedSparkles(sparkles, size, color) {
    if (sparkles.length === 0) return;

    // 배치 렌더링으로 성능 향상
    this.ctx.save();
    
    for (const sparkle of sparkles) {
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
    
    this.ctx.restore();
  }

  // 적응형 렌더링 품질 조절
  adaptiveQualityControl() {
    const sparkleCount = this.activeSparkleCount;
    
    // 파티클 수에 따른 품질 조절
    if (sparkleCount > 40) {
      this.renderQuality = Math.max(0.6, this.renderQuality - 0.1);
      this.isLowPowerMode = true;
    } else if (sparkleCount < 20) {
      this.renderQuality = Math.min(1.0, this.renderQuality + 0.05);
      this.isLowPowerMode = false;
    }
  }

  // WebGL 지원 확인
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }

  // 메모리 정리 시작
  startMemoryCleanup() {
    setInterval(() => {
      // 캐시 크기 제한
      if (this.starPathCache && this.starPathCache.size > 50) {
        this.starPathCache.clear();
      }
      
      if (this.geometryCache && this.geometryCache.size > 50) {
        this.geometryCache.clear();
      }
      
      if (this.transformCache && this.transformCache.size > 100) {
        this.transformCache.clear();
      }
    }, this.memoryCleanupInterval);
  }

  pauseAnimations() {
    console.log('⏸️ 애니메이션 일시정지 (메모리 최적화)');
    
    // 애니메이션 루프 중지
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 이벤트 리스너 일시 제거 (성능 최적화)
    this.removeEventListeners();
    
    // 상태 저장
    this.isPaused = true;
  }
  
  resumeAnimations() {
    if (!this.isPaused) return;
    
    console.log('▶️ 애니메이션 재시작');
    
    // 이벤트 리스너 다시 연결
    this.attachEventListeners();
    
    // 애니메이션 루프 재시작
    if (!this.animationFrameId && isActive) {
      this.animationFrameId = requestAnimationFrame(this.boundAnimate);
    }
    
    this.isPaused = false;
  }

  destroy() {
    console.log('🚀 극한 최적화 Canvas SparkleSystem 정리 중...');

    isActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.removeEventListeners();

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // 모든 리소스 정리
    this.sparklePool = [];
    this.activeSparkles = [];
    
    // 안전하게 Map 객체들 정리
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
    
    this.renderBatch = [];
    this.dirtyRegions = [];
    this.visibleSparkles = [];

    // 타이머 정리
    if (this.mouseTimer) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
    }

    // 룩업 테이블 정리
    CanvasSparkle.easingLUT = null;

    console.log('🧹 극한 최적화 Canvas SparkleSystem 정리 완료');
  }

  // WebGL 지원 체크
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  // 뷰포트 컬링 (화면 밖 스파클 제거)
  cullSparkles() {
    if (!this.cullingEnabled) return this.activeSparkles;

    const margin = 100; // 여유 공간
    const viewportWidth = window.innerWidth + margin * 2;
    const viewportHeight = window.innerHeight + margin * 2;

    this.visibleSparkles.length = 0;

    for (const sparkle of this.activeSparkles) {
      if (sparkle.active &&
          sparkle.currentX >= -margin && sparkle.currentX <= viewportWidth &&
          sparkle.currentY >= -margin && sparkle.currentY <= viewportHeight) {
        this.visibleSparkles.push(sparkle);
      }
    }

    return this.visibleSparkles;
  }

  // 적응형 렌더링 품질 조절
  adaptiveQualityControl() {
    const sparkleCount = this.activeSparkleCount;

    // 스파클 개수에 따른 품질 조절
    if (sparkleCount > 50) {
      this.renderQuality = Math.max(0.5, this.renderQuality - 0.1);
      this.isLowPowerMode = true;
    } else if (sparkleCount < 20) {
      this.renderQuality = Math.min(1.0, this.renderQuality + 0.05);
      this.isLowPowerMode = false;
    }

    // 프레임 스킵 설정
    if (this.isLowPowerMode) {
      this.renderSkipCounter = (this.renderSkipCounter + 1) % 2; // 50% 프레임 스킵
    } else {
      this.renderSkipCounter = 0;
    }
  }

  // 메모리 정리 시스템
  startMemoryCleanup() {
    setInterval(() => {
      this.cleanupMemory();
    }, this.memoryCleanupInterval);
  }

  cleanupMemory() {
    // 캐시 크기 제한
    if (this.starPathCache.size > 20) {
      const keysToDelete = Array.from(this.starPathCache.keys()).slice(0, 10);
      keysToDelete.forEach(key => this.starPathCache.delete(key));
    }

    if (this.geometryCache.size > 50) {
      this.geometryCache.clear();
    }

    if (this.transformCache.size > 100) {
      this.transformCache.clear();
    }

    // 배열 축소
    if (this.renderBatch.length > this.MAX_SPARKLES) {
      this.renderBatch.length = this.MAX_SPARKLES;
    }

    console.log('🧹 메모리 정리 완료:', {
      pathCache: this.starPathCache.size,
      geometryCache: this.geometryCache.size,
      transformCache: this.transformCache.size
    });
  }

  // 인스턴스 렌더링 (동일한 크기/색상 스파클들을 한 번에) - 강화된 글로우 효과
  drawInstancedSparkles(sparkles, size, color) {
    if (sparkles.length === 0) return;

    const cacheKey = `${size}-${color}`;
    let path = this.geometryCache.get(cacheKey);

    if (!path) {
      path = this.getStarPath(size);
      this.geometryCache.set(cacheKey, path);
    }

    // 성능을 위해 개별 글로우보다는 그룹 글로우 적용
    const baseGlowSize = size * 0.4;

    // 마법사 등급별 글로우 강도 조절
    const glowMultiplier = effectLevel <= 0.33 ? 0.7 : 1.0; // 수련생: 70%, 대마법사: 100%
    const glowSize = baseGlowSize * glowMultiplier;

    // 여러 글로우 레이어를 그룹별로 렌더링

    // 1. 외부 글로우 레이어
    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = glowSize * 1.8; // 더 넓은 확산
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = color;

    for (const sparkle of sparkles) {
      this.ctx.save();
      this.ctx.translate(sparkle.currentX, sparkle.currentY);
      this.ctx.scale(sparkle.scaleCached, sparkle.scaleCached);
      this.ctx.globalAlpha = sparkle.alphaCached * 0.25 * effectLevel; // 등급별 조절
      this.ctx.fill(path);
      this.ctx.restore();
    }
    this.ctx.restore();

    // 2. 중간 글로우 레이어
    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = glowSize * 1.2;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = color;

    for (const sparkle of sparkles) {
      this.ctx.save();
      this.ctx.translate(sparkle.currentX, sparkle.currentY);
      this.ctx.scale(sparkle.scaleCached, sparkle.scaleCached);
      this.ctx.globalAlpha = sparkle.alphaCached * 0.5 * effectLevel;
      this.ctx.fill(path);
      this.ctx.restore();
    }
    this.ctx.restore();

    // 3. 내부 글로우 레이어
    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = glowSize * 0.6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = color;

    for (const sparkle of sparkles) {
      this.ctx.save();
      this.ctx.translate(sparkle.currentX, sparkle.currentY);
      this.ctx.scale(sparkle.scaleCached, sparkle.scaleCached);
      this.ctx.globalAlpha = sparkle.alphaCached * 0.75 * effectLevel;
      this.ctx.fill(path);
      this.ctx.restore();
    }
    this.ctx.restore();

    // 4. 핵심 별 레이어 (글로우 없이)
    this.ctx.save();
    this.ctx.fillStyle = color;

    for (const sparkle of sparkles) {
      this.ctx.save();
      this.ctx.translate(sparkle.currentX, sparkle.currentY);
      this.ctx.scale(sparkle.scaleCached, sparkle.scaleCached);
      this.ctx.globalAlpha = sparkle.alphaCached;
      this.ctx.fill(path);
      this.ctx.restore();
    }
    this.ctx.restore();
  }
}

// 메시지 리스너 설정
function setupMessageListener() {
  if (!checkChromeAPI()) return;

  try {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log('메시지 수신:', request);

      if (request.action === 'changeWizardMode') {
        console.log('📨 마법사 모드 변경 요청:', request);

        // 입력 검증 추가
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
        // 머글 모드가 아니면 항상 활성화
        isActive = (wizardMode !== 'muggle');

        console.log(`🔄 마법사 모드 변경: ${oldWizardMode}→${wizardMode}, 활성화: ${oldIsActive}→${isActive}, 효과: ${effectLevel}`);

        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }

        // 최종 상태 확인
        setTimeout(() => {
          console.log(`✅ 최종 상태 확인: isActive=${isActive}, wizardMode=${wizardMode}, sparkleSystem=${!!sparkleSystem}`);
        }, 100);

        sendResponse({success: true, mode: wizardMode, effectLevel: effectLevel});
      } else if (request.action === 'toggleTwinkle') {
        // 레거시 토글 메시지 지원 (하위 호환성)
        isActive = request.enabled;
        effectLevel = isActive ? 1.0 : 0;
        wizardMode = isActive ? 'archmage' : 'muggle';

        if (isActive) {
          initializeTwinkleEffect();
        } else if (sparkleSystem) {
          sparkleSystem.destroy();
          sparkleSystem = null;
        }

        sendResponse({success: true});
      } else if (request.action === 'tabActivated') {
        // 탭 활성화 시 애니메이션 재시작
        if (sparkleSystem && isActive) {
          sparkleSystem.startSparkleSystem();
        }
        sendResponse({ success: true });
      } else if (request.action === 'syncSettings') {
        // 설정 동기화
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

setupMessageListener();

// Chrome API 사용 가능 확인
function checkChromeAPI() {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
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
        let needsRestart = false;

        if (changes.wizardMode) {
          wizardMode = changes.wizardMode.newValue;
          needsRestart = true;
        }

        if (changes.effectLevel) {
          effectLevel = changes.effectLevel.newValue;
          needsRestart = true;
        }

        if (changes.twinkleTouchEnabled) {
          const newEnabled = changes.twinkleTouchEnabled.newValue && wizardMode !== 'muggle';
          if (isActive !== newEnabled) {
            isActive = newEnabled;
            needsRestart = true;
          }
        }

        if (needsRestart) {
          console.log(`마법사 모드 변경: ${wizardMode} (효과 강도: ${effectLevel})`);

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
    // 페이지가 숨겨졌을 때 애니메이션 일시정지
    if (sparkleSystem) {
      sparkleSystem.pauseAnimations();
    }
  } else {
    // 페이지가 다시 보일 때 애니메이션 재시작
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
    // 화면 중앙에 강제로 스파클 생성
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    console.log(`중앙 위치에 스파클 생성: (${centerX}, ${centerY})`);
    sparkleSystem.createClickBurst(centerX, centerY);
  } else {
    console.log('❌ SparkleSystem이 초기화되지 않았습니다.');
    initializeTwinkleEffect();
  }
};

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
    // 화면 중앙에 강제로 스파클 생성
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    console.log(`중앙 위치에 스파클 생성: (${centerX}, ${centerY})`);
    sparkleSystem.createClickBurst(centerX, centerY);
  } else {
    console.log('❌ SparkleSystem이 초기화되지 않았습니다.');
    initializeTwinkleEffect();
  }
};

// DOM 로드 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupStorageListener();
    
    // 3초 후 자동 테스트 (디버깅용)
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
  
  // 3초 후 자동 테스트 (디버깅용)
  setTimeout(() => {
    console.log('🔄 자동 테스트 실행');
    if (window.testTwinkleEffect) {
      window.testTwinkleEffect();
    }
  }, 3000);
}
