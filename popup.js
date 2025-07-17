// TwinkleTouch Chrome Extension - Popup Script (Wizard Level System)

document.addEventListener('DOMContentLoaded', function() {
  const wizardTabs = document.querySelectorAll('.wizard-tab');
  const status = document.getElementById('status');

  // Wizard level settings
  const wizardModes = {
    muggle: {
      name: 'Muggle',
      icon: '🧑‍💼',
      description: 'Arcane energies dormant',
      effectLevel: 0,
      statusClass: 'muggle'
    },
    apprentice: {
      name: 'Apprentice',
      icon: '🎓',
      description: 'Minor cantrips manifesting',
      effectLevel: 0.33,
      statusClass: 'apprentice'
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
          updateUI('archmage');
          return;
        }
        const currentMode = result.wizardMode || 'archmage'; // Default to archmage
        updateUI(currentMode);
      });
    } catch (error) {
      console.log('Storage access error:', error);
      updateUI('archmage');
    }
  }
  
  loadCurrentSettings();

  // Tab click event listeners
  wizardTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const selectedMode = this.dataset.mode;
      
      // 입력 검증 추가
      if (!selectedMode || !['muggle', 'apprentice', 'archmage'].includes(selectedMode)) {
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
      
      // Save settings
      try {
        chrome.storage.sync.set({ 
          wizardMode: selectedMode,
          twinkleTouchEnabled: selectedMode !== 'muggle', // Enable if not muggle
          effectLevel: wizardModes[selectedMode].effectLevel
        }, function() {
          if (chrome.runtime.lastError) {
            console.log('Storage save error:', chrome.runtime.lastError);
          } else {
            console.log('Wizard level saved:', selectedMode);
          }
        });
      } catch (error) {
        console.log('Storage save error:', error);
      }
      
      // Send message to current tab's content script
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (chrome.runtime.lastError) {
            console.log('Tab query error:', chrome.runtime.lastError);
            return;
          }
          
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'changeWizardMode',
              mode: selectedMode,
              effectLevel: wizardModes[selectedMode].effectLevel,
              enabled: selectedMode !== 'muggle'
            }, function(response) {
              if (chrome.runtime.lastError) {
                console.log('Content script not loaded yet:', chrome.runtime.lastError);
              } else {
                console.log('Wizard mode change message sent.');
              }
            });
          }
        });
      } catch (error) {
        console.log('Message sending error:', error);
      }
    });
  });

  function updateUI(mode) {
    const modeConfig = wizardModes[mode];
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