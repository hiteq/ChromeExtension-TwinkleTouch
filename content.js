// TwinkleTouch Chrome Extension - Canvas-based Content Script
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
}

// 파티클 클래스
class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
    this.color = { r: 255, g: 255, b: 255 };
    this.alpha = 1;
    this.life = 0;
    this.maxLife = 100;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.gravity = 0.1;
    this.fade = true;
  }
  
  update() {
    if (!this.active) return;
    
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.rotationSpeed;
    this.life++;
    
    if (this.fade) {
      this.alpha = 1 - (this.life / this.maxLife);
    }
    
    if (this.life >= this.maxLife || this.alpha <= 0) {
      this.active = false;
    }
  }
}

// Canvas 기반 고성능 SparkleSystem
class CanvasSparkleSystem {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.pool = [];
    this.maxPoolSize = 200;
    this.isActive = true;
    this.animationFrameId = null;
    this.mousePosition = { x: 0, y: 0 };
    this.lastSparkleTime = 0;
    this.sparkleThrottle = 16; // 60fps
    
    // 색상 팔레트 (RGB 객체)
    this.colors = [
      { r: 255, g: 215, b: 0 },   // 금색
      { r: 255, g: 105, b: 180 }, // 핫핑크
      { r: 0, g: 191, b: 255 },   // 스카이블루
      { r: 152, g: 251, b: 152 }, // 연두색
      { r: 221, g: 160, b: 221 }  // 자주색
    ];
    
    // 별 모양 캐싱
    this.starPaths = new Map();
    
    this.init();
  }
  
  init() {
    this.createCanvas();
    this.initializeParticlePool();
    this.setupEventListeners();
    this.startAnimation();
    
    console.log('🌟 Canvas SparkleSystem 초기화 완료 (최대 파티클:', this.maxPoolSize, '개)');
    
    // 테스트 효과
    setTimeout(() => {
      console.log('🧪 Canvas 테스트 효과 실행...');
      this.createBurst(window.innerWidth / 2, window.innerHeight / 2, 30);
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
    
    // GPU 가속 활성화
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    document.body.appendChild(this.canvas);
    console.log('Canvas 생성 완료:', this.canvas.width, 'x', this.canvas.height, 'DPR:', dpr);
  }
  
  initializeParticlePool() {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.pool.push(new Particle());
    }
    console.log('파티클 풀 생성 완료:', this.maxPoolSize, '개');
  }
  
  getParticle() {
    // 비활성 파티클 찾기
    for (let particle of this.pool) {
      if (!particle.active) {
        particle.reset();
        return particle;
      }
    }
    
    // 풀이 가득 찬 경우 가장 오래된 파티클 재사용
    let oldest = this.pool[0];
    let maxLife = oldest.life;
    
    for (let particle of this.pool) {
      if (particle.life > maxLife) {
        maxLife = particle.life;
        oldest = particle;
      }
    }
    
    oldest.reset();
    return oldest;
  }
  
  createParticle(x, y, vx = 0, vy = 0, size = null, color = null) {
    const particle = this.getParticle();
    
    particle.active = true;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.size = size || (12 + Math.random() * 24); // 12-36px
    particle.color = color || this.colors[Math.floor(Math.random() * this.colors.length)];
    particle.alpha = 1;
    particle.life = 0;
    particle.maxLife = 60 + Math.random() * 60; // 1-2초 (60fps 기준)
    particle.rotation = Math.random() * Math.PI * 2;
    particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
    particle.gravity = 0.1 + Math.random() * 0.1;
    particle.fade = true;
    
    return particle;
  }
  
  createTrailParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    this.createParticle(x, y, vx, vy, 8 + Math.random() * 16);
  }
  
  createBurst(x, y, count = 30) {
    console.log('💥 버스트 효과 생성:', x, y, count + '개');
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 3 + Math.random() * 5;
      const speed = 2 + Math.random() * 4;
      
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - Math.random() * 2; // 위쪽으로 약간 편향
      
      this.createParticle(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        vx,
        vy,
        16 + Math.random() * 20
      );
    }
  }
  
  // 4방향 별 모양 그리기 (캐싱됨)
  getStarPath(size) {
    if (!this.starPaths.has(size)) {
      const path = new Path2D();
      const centerX = 0;
      const centerY = 0;
      const outerRadius = size / 2;
      const innerRadius = outerRadius * 0.4;
      
      // 4방향 별 (위, 오른쪽, 아래, 왼쪽)
      path.moveTo(centerX, centerY - outerRadius); // 위쪽 끝
      path.lineTo(centerX + innerRadius * 0.3, centerY - innerRadius * 0.3);
      path.lineTo(centerX + outerRadius, centerY); // 오른쪽 끝
      path.lineTo(centerX + innerRadius * 0.3, centerY + innerRadius * 0.3);
      path.lineTo(centerX, centerY + outerRadius); // 아래쪽 끝
      path.lineTo(centerX - innerRadius * 0.3, centerY + innerRadius * 0.3);
      path.lineTo(centerX - outerRadius, centerY); // 왼쪽 끝
      path.lineTo(centerX - innerRadius * 0.3, centerY - innerRadius * 0.3);
      path.closePath();
      
      this.starPaths.set(size, path);
    }
    
    return this.starPaths.get(size);
  }
  
  drawParticle(particle) {
    this.ctx.save();
    
    // 위치와 회전 설정
    this.ctx.translate(particle.x, particle.y);
    this.ctx.rotate(particle.rotation);
    
    // 색상과 투명도 설정
    const { r, g, b } = particle.color;
    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
    
    // 그림자 효과 (성능상 선택적으로만)
    if (particle.size > 20) {
      this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${particle.alpha * 0.6})`;
      this.ctx.shadowBlur = particle.size * 0.3;
    }
    
    // 별 모양 그리기
    const starPath = this.getStarPath(particle.size);
    this.ctx.fill(starPath);
    
    this.ctx.restore();
  }
  
  update() {
    // 활성 파티클 업데이트
    for (let particle of this.pool) {
      if (particle.active) {
        particle.update();
      }
    }
  }
  
  render() {
    // 캔버스 클리어 (투명 배경)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 활성 파티클 렌더링
    for (let particle of this.pool) {
      if (particle.active) {
        this.drawParticle(particle);
      }
    }
  }
  
  animate() {
    if (!this.isActive) return;
    
    this.update();
    this.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
  
  startAnimation() {
    this.animate();
    console.log('애니메이션 시작');
  }
  
  setupEventListeners() {
    // 마우스 이동 추적
    this.handleMouseMove = (e) => {
      const now = Date.now();
      if (now - this.lastSparkleTime < this.sparkleThrottle) return;
      
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
      
      // 60% 확률로 1개, 10% 확률로 여러 개
      const random = Math.random();
      if (random < 0.6) {
        this.createTrailParticle(e.clientX, e.clientY);
      } else if (random < 0.7) {
        for (let i = 0; i < 3; i++) {
          this.createTrailParticle(
            e.clientX + (Math.random() - 0.5) * 20,
            e.clientY + (Math.random() - 0.5) * 20
          );
        }
      }
      
      this.lastSparkleTime = now;
    };
    
    // 클릭 버스트
    this.handleClick = (e) => {
      this.createBurst(e.clientX, e.clientY, 32);
    };
    
    // 터치 지원
    this.handleTouchMove = (e) => {
      e.preventDefault();
      for (let touch of e.touches) {
        this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      }
    };
    
    this.handleTouchStart = (e) => {
      for (let touch of e.touches) {
        this.createBurst(touch.clientX, touch.clientY, 24);
      }
    };
    
    // 윈도우 리사이즈
    this.handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.ctx.scale(dpr, dpr);
    };
    
    // 이벤트 등록
    document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    document.addEventListener('click', this.handleClick, { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
    
    console.log('이벤트 리스너 등록 완료');
  }
  
  removeEventListeners() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('resize', this.handleResize);
  }
  
  destroy() {
    console.log('Canvas SparkleSystem 정리 중...');
    
    this.isActive = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.removeEventListeners();
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // 리소스 정리
    this.particles = [];
    this.pool = [];
    this.starPaths.clear();
    
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