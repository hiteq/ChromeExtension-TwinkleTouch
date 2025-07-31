const chokidar = require('chokidar');
const open = require('open');
const path = require('path');

console.log('🚀 Chrome Extension Hot Reloader 시작! 파일 변경을 감지합니다...');

const extensionPath = path.resolve(__dirname, '..');

const watcher = chokidar.watch([
  path.join(extensionPath, 'content.js'),
  path.join(extensionPath, 'background.js'),
  path.join(extensionPath, 'popup.js'),
  path.join(extensionPath, 'popup.html'),
  path.join(extensionPath, 'styles.css'),
], {
  ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  persistent: true,
  ignoreInitial: true, // 초기 스캔 시 발생하는 add 이벤트는 무시
});

let isReloading = false;
const debounceTime = 500; // 500ms 디바운스 타임

watcher.on('all', (event, filePath) => {
  if (isReloading) return;
  isReloading = true;
  
  const relativePath = path.relative(extensionPath, filePath);
  console.log(`[${new Date().toLocaleTimeString()}] 📝 파일 변경 감지: ${relativePath} (${event})`);
  console.log('🔄 익스텐션을 리로드합니다...');

  open('http://reload.extensions').catch(err => {
    console.error('❌ "Extensions Reloader"를 여는 데 실패했습니다. 설치되어 있는지 확인해주세요.');
    console.error('설치 링크: https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid');
  });

  setTimeout(() => {
    isReloading = false;
  }, debounceTime);
});

console.log('👀 다음 파일들을 주시하고 있습니다:');
console.log('  - content.js');
console.log('  - background.js');
console.log('  - popup.js');
console.log('  - popup.html');
console.log('  - styles.css');
console.log('\n개발 중 이 터미널 창을 열어두세요.'); 