// TwinkleTouch Chrome Extension - Popup Script (Wizard Level System)

document.addEventListener('DOMContentLoaded', function() {
  const wizardTabs = document.querySelectorAll('.wizard-tab');
  const status = document.getElementById('status');

  // Wizard level settings
  const wizardConfig = {
    muggle: {
      name: 'Muggle',
      icon: '🧑‍💼',
      description: 'Arcane energies dormant',
      effectLevel: 0,
      statusClass: 'muggle'
    },
    archmage: {
      name: 'Archmage',
      icon: '🧙‍♂️',
      description: 'Spell matrix at full resonance',
      effectLevel: 1.0,
      statusClass: 'archmage'
    }
  };

  // Check Chrome API availability
  function checkChromeAPI() {
    return typeof chrome !== 'undefined' && 
           chrome.storage && 
           chrome.storage.sync && 
           chrome.runtime &&
           chrome.tabs;
  }

  // Load current settings
  function loadCurrentSettings() {
    if (!checkChromeAPI()) {
      console.log('Chrome API not available.');
      updateUI('archmage'); // Default to archmage mode
      return;
    }
    
    try {
      chrome.storage.sync.get(['wizardMode'], function(result) {
        if (chrome.runtime.lastError) {
          console.log('Storage read error:', chrome.runtime.lastError);
          updateUI('muggle');
          return;
        }
        const currentMode = result.wizardMode || 'muggle'; // Default to muggle
        updateUI(currentMode);
      });
            } catch (error) {
          console.log('Storage access error:', error);
          updateUI('muggle');
        }
  }
  
  loadCurrentSettings();

  // Tab click event listeners
  wizardTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const selectedMode = this.dataset.mode;
      
      // 입력 검증 추가
      if (!selectedMode || !['muggle', 'archmage'].includes(selectedMode)) {
        console.error('Invalid wizard mode:', selectedMode);
        return;
      }
      
      if (!checkChromeAPI()) {
        console.log('Chrome API not available, mode change will not be saved.');
        updateUI(selectedMode);
        return;
      }
      
      // Update UI immediately
      updateUI(selectedMode);
      
      // Save settings first, then send message
      try {
        chrome.storage.sync.set({ 
          wizardMode: selectedMode,
          twinkleTouchEnabled: selectedMode !== 'muggle',
          effectLevel: wizardConfig[selectedMode].effectLevel
        }, function() {
          if (chrome.runtime.lastError) {
            console.log('Storage save error:', chrome.runtime.lastError);
            return;
          }
          
          console.log('✅ Wizard level saved:', selectedMode);
          
          // Send message to content script after storage save
          // Background script에 활성화 요청
          chrome.runtime.sendMessage({
            action: 'activateOnCurrentTab'
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.log('Background script 통신 실패:', chrome.runtime.lastError.message);
            } else if (response?.success) {
              console.log('🎉 TwinkleTouch 활성화 성공');
              
              // 설정 동기화를 위해 탭에 메시지 전송
              chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0]) {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                      action: 'changeWizardMode',
                      mode: selectedMode,
                      effectLevel: wizardConfig[selectedMode].effectLevel,
                      enabled: selectedMode !== 'muggle'
                    }, function(syncResponse) {
                      if (!chrome.runtime.lastError) {
                        console.log('✅ 설정 동기화 완료:', syncResponse);
                      }
                    });
                  }, 500);
                }
              });
            } else {
              console.log('TwinkleTouch 활성화 실패:', response?.error);
            }
          });
        });
      } catch (error) {
        console.log('Storage save error:', error);
      }
    });
  });

  function updateUI(mode) {
    const modeConfig = wizardConfig[mode];
    if (!modeConfig) return;

    // Remove active class from all tabs and update ARIA attributes
    wizardTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });
    
    // Add active class to selected tab and update ARIA attributes
    const selectedTab = document.querySelector(`[data-mode="${mode}"]`);
    if (selectedTab) {
      selectedTab.classList.add('active');
      selectedTab.setAttribute('aria-selected', 'true');
    }

    // Update status display
    status.className = `status ${modeConfig.statusClass}`;
    status.textContent = modeConfig.description;
    
    // 접근성: 상태 변경 알림
    status.setAttribute('aria-live', 'polite');

    console.log(`UI updated: ${modeConfig.name} mode`);
  }
}); 