// TwinkleTouch Chrome Extension - Background Service Worker

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

// 탭 활성화 시 성능 최적화
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // 현재 탭에 메시지 전송하여 애니메이션 재시작
    await chrome.tabs.sendMessage(activeInfo.tabId, {
      action: 'tabActivated'
    });
  } catch (error) {
    // Content script가 로드되지 않은 경우 무시
    console.log('Content script not ready on tab activation');
  }
});

// 탭 비활성화 시 성능 최적화
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 새 페이지 로드 완료 시 설정 동기화
    try {
      const settings = await chrome.storage.sync.get(['wizardMode', 'effectLevel', 'twinkleTouchEnabled']);
      await chrome.tabs.sendMessage(tabId, {
        action: 'syncSettings',
        settings: settings
      });
    } catch (error) {
      console.log('Settings sync failed for tab:', tabId);
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