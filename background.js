// TwinkleTouch Chrome Extension - Background Service Worker (ActiveTab 모델)

// Extension 설치/업데이트 시 초기 설정
chrome.runtime.onInstalled.addListener((details) => {
  console.log('TwinkleTouch Extension 설치됨:', details.reason);
  
  // 기본 설정 초기화
  chrome.storage.sync.set({
    wizardMode: 'archmage',
    twinkleTouchEnabled: true,
    effectLevel: 1.0
  });
});

// 확장 프로그램 아이콘 클릭 시 스크립트 주입
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // activeTab 권한으로 현재 탭에 스크립트 주입
    await injectTwinkleTouch(tab.id);
  } catch (error) {
    console.error('스크립트 주입 실패:', error);
  }
});

// Popup에서 설정 변경 시 호출
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'activateOnCurrentTab') {
    try {
      // 현재 활성 탭 가져오기
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (activeTab) {
        await injectTwinkleTouch(activeTab.id);
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('탭 활성화 실패:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 비동기 응답
  }
});

// TwinkleTouch 스크립트 주입 함수
async function injectTwinkleTouch(tabId) {
  try {
    // 이미 주입되었는지 확인
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => window.twinkleTouchInitialized === true
    });
    
    if (results[0]?.result) {
      console.log('TwinkleTouch가 이미 활성화되어 있습니다.');
      return;
    }

    // CSS 주입
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    });

    // JavaScript 주입
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    console.log('TwinkleTouch 스크립트가 성공적으로 주입되었습니다.');
    
    // 설정 동기화
    const settings = await chrome.storage.sync.get(['wizardMode', 'effectLevel', 'twinkleTouchEnabled']);
    await chrome.tabs.sendMessage(tabId, {
      action: 'syncSettings',
      settings: settings
    });

  } catch (error) {
    console.error('TwinkleTouch 주입 중 오류:', error);
    throw error;
  }
}

// 탭 업데이트 시 자동 주입 (선택사항 - 사용자가 원할 때만)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 자동 주입은 하지 않고, 설정이 활성화된 경우에만 알림
    const settings = await chrome.storage.sync.get(['twinkleTouchEnabled']);
    if (settings.twinkleTouchEnabled) {
      // 브라우저 액션 배지로 상태 표시
      chrome.action.setBadgeText({
        tabId: tabId,
        text: '✨'
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#6B46C1'
      });
    }
  }
});

// 메모리 정리 (주기적)
setInterval(() => {
  // 가비지 컬렉션 힌트 (Chrome에서 지원하는 경우)
  if (typeof gc === 'function') {
    gc();
  }
}, 300000); // 5분마다