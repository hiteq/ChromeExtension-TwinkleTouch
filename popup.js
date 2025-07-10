// TwinkleTouch Chrome Extension - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');

  // Chrome API 사용 가능 여부 확인
  function checkChromeAPI() {
    return typeof chrome !== 'undefined' && 
           chrome.storage && 
           chrome.storage.sync && 
           chrome.runtime &&
           chrome.tabs;
  }

  // 현재 설정 상태 불러오기
  function loadCurrentSettings() {
    if (!checkChromeAPI()) {
      console.log('Chrome API를 사용할 수 없습니다.');
      updateUI(true); // 기본값으로 활성화 표시
      return;
    }
    
    try {
      chrome.storage.sync.get(['twinkleEnabled'], function(result) {
        if (chrome.runtime.lastError) {
          console.log('Storage 읽기 오류:', chrome.runtime.lastError);
          updateUI(true);
          return;
        }
        const isEnabled = result.twinkleEnabled !== false; // 기본값은 true
        updateUI(isEnabled);
      });
    } catch (error) {
      console.log('Storage 접근 오류:', error);
      updateUI(true);
    }
  }
  
  loadCurrentSettings();

  // 토글 스위치 클릭 이벤트
  toggleSwitch.addEventListener('click', function() {
    if (!checkChromeAPI()) {
      console.log('Chrome API를 사용할 수 없어 토글이 작동하지 않습니다.');
      return;
    }
    
    const isCurrentlyActive = toggleSwitch.classList.contains('active');
    const newState = !isCurrentlyActive;
    
    // UI 업데이트
    updateUI(newState);
    
    // 설정 저장
    try {
      chrome.storage.sync.set({ twinkleEnabled: newState }, function() {
        if (chrome.runtime.lastError) {
          console.log('Storage 저장 오류:', chrome.runtime.lastError);
        } else {
          console.log('설정이 저장되었습니다:', newState);
        }
      });
    } catch (error) {
      console.log('Storage 저장 오류:', error);
    }
    
    // 현재 탭의 content script에 메시지 전송
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (chrome.runtime.lastError) {
          console.log('탭 쿼리 오류:', chrome.runtime.lastError);
          return;
        }
        
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleTwinkle',
            enabled: newState
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.log('Content script가 아직 로드되지 않았습니다:', chrome.runtime.lastError);
            } else {
              console.log('메시지가 전송되었습니다.');
            }
          });
        }
      });
    } catch (error) {
      console.log('메시지 전송 오류:', error);
    }
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      toggleSwitch.classList.add('active');
      status.classList.remove('disabled');
      status.classList.add('enabled');
      status.textContent = '효과가 활성화되어 있습니다';
    } else {
      toggleSwitch.classList.remove('active');
      status.classList.remove('enabled');
      status.classList.add('disabled');
      status.textContent = '효과가 비활성화되어 있습니다';
    }
  }
}); 