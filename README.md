# TwinkleTouch Chrome Extension ✨

> 웹페이지에 마법 같은 별빛 효과를 추가하는 크롬 익스텐션

[![CI/CD](https://github.com/USERNAME/TwinkleTouch-ChromeExtension/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/USERNAME/TwinkleTouch-ChromeExtension/actions/workflows/ci-cd.yml)
[![Version](https://img.shields.io/github/v/release/USERNAME/TwinkleTouch-ChromeExtension?include_prereleases)](https://github.com/USERNAME/TwinkleTouch-ChromeExtension/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 주요 기능

- **✨ 다층 글로우 효과**: HTML5 Canvas 기반의 아름다운 별빛 파티클
- **🧙‍♂️ 마법사 등급 시스템**: 대마법사/수련생/머글 모드 지원
- **🎨 5가지 색상**: 흰색, 노란색, 청록색, 자홍색, 초록색 별빛
- **⚡ 고성능 최적화**: 메모리 최적화 및 배치 렌더링 시스템
- **📱 터치 지원**: 데스크톱과 모바일 모두 완벽 지원
- **🔄 실시간 설정**: 팝업에서 즉시 모드 변경 가능

## 🎮 사용법

### 모드 설명

| 모드 | 설명 | 효과 |
|------|------|------|
| 🧙‍♂️ **대마법사** | 최대 강도 | 마우스 움직임과 클릭에 화려한 별빛 폭발 |
| 🧙‍♀️ **수련생** | 중간 강도 | 적당한 수준의 별빛 효과 |
| 👤 **머글** | 비활성화 | 효과 없음 |

### 조작법

- **마우스 움직임**: 커서를 따라 별빛이 생성됩니다
- **클릭**: 클릭 위치에서 별빛 폭발 효과
- **터치** (모바일): 터치와 스와이프로 별빛 생성

## 🛠️ 설치 방법

### Chrome Web Store에서 설치 (권장)
*자동 배포 시스템을 통해 곧 출시됩니다*

> **Note**: Chrome Web Store 자동 배포는 초기 수동 등록 후 활성화됩니다.  
> 자세한 설정 방법은 [Chrome Web Store 배포 가이드](docs/CHROME_WEBSTORE_SETUP.md)를 참조하세요.

### 수동 설치 (개발자용)

1. **릴리스 다운로드**
   ```bash
   # 최신 릴리스에서 ZIP 파일 다운로드
   # https://github.com/USERNAME/TwinkleTouch-ChromeExtension/releases
   ```

2. **Chrome에서 설치**
   - Chrome에서 `chrome://extensions/` 페이지 열기
   - 우측 상단 "개발자 모드" 활성화
   - "압축해제된 확장 프로그램을 로드합니다" 클릭
   - 압축을 푼 확장 프로그램 폴더 선택

3. **사용 시작**
   - 확장 프로그램 아이콘 클릭
   - 원하는 마법사 등급 선택
   - 웹페이지에서 마우스를 움직이거나 클릭해보세요!

## 🔧 개발 환경 설정

### 필요 조건
- Node.js 18.0.0 이상
- npm 또는 yarn
- Chrome 브라우저

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/USERNAME/TwinkleTouch-ChromeExtension.git
cd TwinkleTouch-ChromeExtension

# 의존성 설치
npm install

# 코드 검사
npm run lint

# 테스트 실행
npm test

# Extension 패키징
npm run package
```

### 개발용 스크립트

```bash
# 코드 검사 및 자동 수정
npm run lint:fix

# Playwright 테스트 (UI 모드)
npm run test:ui

# Manifest.json 검증
npm run validate

# 전체 빌드 (린트 + 테스트)
npm run build
```

## 🏗️ 프로젝트 구조

```
TwinkleTouch-ChromeExtension/
├── 📄 manifest.json          # Chrome Extension 설정
├── ⚡ content.js             # 메인 컨텐츠 스크립트
├── 🎨 popup.html             # 팝업 UI
├── 📱 popup.js               # 팝업 로직
├── 🎯 styles.css             # 스타일시트
├── 🧪 tests/                 # Playwright 테스트
├── 🔧 scripts/               # 빌드 스크립트
├── 🚀 .github/workflows/     # CI/CD 설정
└── 📦 build/                 # 빌드 결과물
```

## 🚀 CI/CD 파이프라인

GitHub Actions를 통한 자동화된 워크플로우:

### 트리거
- `main` 브랜치에 push
- `main` 브랜치로 PR
- 릴리스 생성

### 워크플로우 단계

1. **테스트 및 품질 검사**
   - ESLint 코드 검사
   - Extension 파일 구조 검증
   - Manifest.json 유효성 검증
   - Playwright 자동화 테스트

2. **자동 버전 관리**
   - Semantic versioning (patch 자동 증가)
   - package.json 및 manifest.json 동기화
   - 자동 커밋 및 푸시

3. **빌드 및 패키징**
   - Extension ZIP 파일 생성
   - 릴리스 노트 자동 생성
   - 아티팩트 업로드

4. **릴리스 배포**
   - GitHub 릴리스 자동 생성
   - ZIP 파일 첨부
   - 태그 생성

5. **Chrome Web Store 배포** (선택적)
   - 자동 업로드 및 게시
   - OAuth 2.0 인증을 통한 안전한 배포
   - 설정 방법: [배포 가이드](docs/CHROME_WEBSTORE_SETUP.md)

6. **브랜치 동기화**
   - develop 브랜치 자동 업데이트

## 🧪 테스트

### 자동화 테스트
- **Playwright**: Extension 로딩 및 기능 테스트
- **ESLint**: 코드 품질 검사
- **Manifest 검증**: Extension 설정 유효성 검사

### 테스트 실행
```bash
# 전체 테스트 실행
npm test

# 특정 테스트 파일 실행
npx playwright test tests/debug-extension.spec.js

# 헤드리스 모드 비활성화 (브라우저 UI 표시)
npm run test:headed
```

## 📊 성능 최적화

### Canvas 렌더링 최적화
- **배치 렌더링**: 동일한 속성의 파티클을 그룹화
- **뷰포트 컬링**: 화면 밖 파티클 제거
- **메모리 풀링**: 객체 재사용으로 GC 압박 감소
- **적응형 품질 제어**: FPS에 따른 동적 품질 조절

### 브라우저 호환성
- Chrome 88+ (Manifest V3)
- Edge 88+
- Opera 74+

## 🤝 기여 방법

1. **Fork** 이 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/amazing-feature`)
3. **변경사항 커밋** (`git commit -m 'Add amazing feature'`)
4. **브랜치에 Push** (`git push origin feature/amazing-feature`)
5. **Pull Request** 생성

### 기여 가이드라인
- ESLint 규칙 준수
- 모든 테스트 통과
- 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식

## 🐛 버그 신고

버그나 기능 요청은 [Issues](https://github.com/USERNAME/TwinkleTouch-ChromeExtension/issues) 페이지에서 신고해주세요.

## 📝 변경 로그

모든 변경사항은 [Releases](https://github.com/USERNAME/TwinkleTouch-ChromeExtension/releases) 페이지에서 확인할 수 있습니다.

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

## ⭐ 지원

이 프로젝트가 도움이 되었다면 ⭐ Star를 눌러주세요!

---

<div align="center">
Made with ✨ by TwinkleTouch Team
</div> 