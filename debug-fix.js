// TwinkleTouch 디버그 및 수정 스크립트

// 즉시 실행 함수로 마법 효과 강제 활성화
(function() {
  console.log('🔧 TwinkleTouch 디버그 수정 스크립트 실행');
  
  // 전역 변수 강제 설정
  window.isActive = true;
  window.wizardMode = 'archmage';
  window.effectLevel = 1.0;
  
  // 기존 sparkleSystem이 있다면 안전하게 제거
  if (window.sparkleSystem) {
    try {
      // Canvas만 제거하고 나머지는 건드리지 않음
      const canvas = document.getElementById('twinkle-canvas');
      if (canvas) {
        canvas.remove();
      }
      
      if (window.sparkleSystem.animationFrameId) {
        cancelAnimationFrame(window.sparkleSystem.animationFrameId);
      }
      
      window.sparkleSystem = null;
    } catch (e) {
      console.log('기존 시스템 정리 중 오류 (무시):', e.message);
    }
  }
  
  // 간단한 Canvas 기반 마법 효과 시스템 생성
  function createSimpleSparkleSystem() {
    const canvas = document.createElement('canvas');
    canvas.id = 'twinkle-canvas';
    canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 999999 !important;
      background: transparent !important;
    `;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const sparkles = [];
    
    // 간단한 스파클 클래스
    class SimpleSparkle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = 0.02;
        this.size = Math.random() * 8 + 4;
        this.color = ['#ffffff', '#ffff00', '#00ffff', '#ff00ff', '#00ff00'][Math.floor(Math.random() * 5)];
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
        return this.life > 0;
      }
      
      draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // 별 모양 그리기
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5;
          const x = Math.cos(angle) * this.size;
          const y = Math.sin(angle) * this.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    
    // 애니메이션 루프
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 스파클 업데이트 및 렌더링
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sparkle = sparkles[i];
        if (sparkle.update()) {
          sparkle.draw();
        } else {
          sparkles.splice(i, 1);
        }
      }
      
      requestAnimationFrame(animate);
    }
    
    // 클릭 이벤트
    document.addEventListener('click', (e) => {
      console.log('✨ 클릭 이벤트 - 스파클 생성:', e.clientX, e.clientY);
      
      // 클릭 위치에 여러 스파클 생성
      for (let i = 0; i < 15; i++) {
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;
        sparkles.push(new SimpleSparkle(e.clientX + offsetX, e.clientY + offsetY));
      }
    });
    
    // 마우스 움직임 이벤트
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseTime > 50) { // 50ms 간격
        sparkles.push(new SimpleSparkle(e.clientX, e.clientY));
        lastMouseTime = now;
      }
    });
    
    animate();
    console.log('✅ 간단한 마법 효과 시스템 활성화 완료');
  }
  
  // DOM이 준비되면 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSimpleSparkleSystem);
  } else {
    createSimpleSparkleSystem();
  }
  
  // 테스트 함수 재정의
  window.testTwinkleEffect = function() {
    console.log('🧪 간단한 마법 효과 테스트');
    
    // 화면 중앙에 스파클 생성
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // 클릭 이벤트 시뮬레이션
    const clickEvent = new MouseEvent('click', {
      clientX: centerX,
      clientY: centerY,
      bubbles: true
    });
    
    document.dispatchEvent(clickEvent);
    console.log('✨ 테스트 스파클 생성 완료');
  };
  
})();

console.log('🎯 디버그 수정 스크립트 로드 완료 - 3초 후 자동 테스트 실행');

// 3초 후 자동 테스트
setTimeout(() => {
  if (window.testTwinkleEffect) {
    window.testTwinkleEffect();
  }
}, 3000);