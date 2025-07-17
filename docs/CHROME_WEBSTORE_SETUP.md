# Chrome Web Store 자동 배포 설정 가이드

## 📋 개요

Chrome Web Store에 자동으로 확장 프로그램을 배포하는 시스템입니다. **초기 등록은 수동으로 해야 하며**, 이후 업데이트만 자동화됩니다.

## 🚀 설정 과정

### 1단계: Chrome Web Store 개발자 등록

1. **개발자 계정 등록**
   ```
   https://chrome.google.com/webstore/devconsole
   ```
   - Google 계정으로 로그인
   - $5 등록비 결제 (1회성)

2. **확장 프로그램 초기 등록**
   - "새 항목" 클릭
   - ZIP 파일 업로드 (수동)
   - 스토어 정보 입력 (제목, 설명, 스크린샷 등)
   - **Extension ID 기록** (중요!)

### 2단계: Google Cloud Console API 설정

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/
   ```

2. **새 프로젝트 생성**
   ```bash
   프로젝트 이름: TwinkleTouch-Extension
   ```

3. **Chrome Web Store API 활성화**
   ```
   APIs & Services > Library > Chrome Web Store API > 활성화
   ```

4. **OAuth 2.0 인증 정보 생성**
   ```
   APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
   Application Type: Desktop Application
   Name: TwinkleTouch-Extension-CI
   ```

5. **클라이언트 ID/Secret 다운로드**
   - JSON 파일 다운로드
   - `client_id`와 `client_secret` 기록

### 3단계: Refresh Token 생성

**로컬에서 실행:**

```bash
# OAuth 인증 URL 생성
CLIENT_ID="your_client_id_here"
SCOPE="https://www.googleapis.com/auth/chromewebstore"
AUTH_URL="https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=${SCOPE}&access_type=offline"

echo "다음 URL을 브라우저에서 열어주세요:"
echo $AUTH_URL
```

**브라우저에서:**
1. 위 URL 접속
2. Google 계정으로 로그인
3. 권한 승인
4. **Authorization Code 복사**

**Authorization Code를 Refresh Token으로 교환:**

```bash
CLIENT_ID="your_client_id_here"
CLIENT_SECRET="your_client_secret_here"
AUTH_CODE="your_authorization_code_here"

curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "code=${AUTH_CODE}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
  "https://oauth2.googleapis.com/token"
```

**응답에서 `refresh_token` 기록**

### 4단계: GitHub Secrets 설정

**Repository Settings > Secrets and variables > Actions**에서 다음 Secrets 추가:

```bash
CHROME_EXTENSION_ID=your_extension_id_from_webstore
CHROME_CLIENT_ID=your_oauth_client_id
CHROME_CLIENT_SECRET=your_oauth_client_secret  
CHROME_REFRESH_TOKEN=your_refresh_token
```

### 5단계: GitHub Variables 설정

**Repository Settings > Secrets and variables > Actions > Variables**에서:

```bash
ENABLE_CHROME_WEBSTORE_DEPLOY=true          # 자동 배포 활성화
CHROME_WEBSTORE_AUTO_PUBLISH=false          # 자동 게시 (권장: false)
```

## ⚙️ 작동 방식

### 자동 배포 트리거
```yaml
# main 브랜치에 push 시 자동 실행
git push origin main
```

### 배포 과정
1. **코드 테스트** → ESLint, Manifest 검증, Playwright 테스트
2. **버전 업데이트** → Semantic versioning (patch 자동 증가)
3. **Extension 빌드** → ZIP 파일 생성
4. **GitHub 릴리스** → 자동 릴리스 노트 생성
5. **Chrome Web Store 업로드** → API를 통한 자동 업로드
6. **게시** → 수동 (권장) 또는 자동

### 배포 로그 확인
```
GitHub Actions > TwinkleTouch CI/CD > chrome-webstore-deploy
```

## 🔧 설정 옵션

### 자동 게시 활성화 (선택적)
```bash
# GitHub Variables에서 설정
CHROME_WEBSTORE_AUTO_PUBLISH=true
```

⚠️ **주의**: 자동 게시 시 Google 검토 없이 즉시 배포됩니다.

### 배포 비활성화
```bash
# GitHub Variables에서 설정
ENABLE_CHROME_WEBSTORE_DEPLOY=false
```

## 🐛 문제 해결

### 일반적인 오류들

**1. 인증 실패**
```
❌ Chrome Web Store 인증 실패
```
**해결**: Refresh Token 재생성

**2. Extension ID 오류**
```
ITEM_NOT_FOUND
```
**해결**: Chrome Web Store에서 Extension ID 확인

**3. 권한 오류**
```
INVALID_DEVELOPER
```
**해결**: 개발자 계정 및 OAuth 권한 확인

**4. 업로드 실패**
```
uploadState != "SUCCESS"
```
**해결**: ZIP 파일 구조 및 manifest.json 검증

### 수동 업로드 방법
자동 배포 실패 시 수동으로 업로드:

1. GitHub Releases에서 ZIP 다운로드
2. Chrome Web Store Developer Dashboard 접속
3. 수동 업로드 및 게시

## 📊 배포 상태 확인

### GitHub Actions 상태
```
✅ 테스트 통과
✅ 버전 업데이트
✅ Extension 빌드  
✅ GitHub 릴리스
✅ Chrome Web Store 업로드
```

### Chrome Web Store 상태
```
🔗 https://chrome.google.com/webstore/devconsole
```

## 🔄 업데이트 주기

- **자동 트리거**: main 브랜치 push 시
- **버전 증가**: Patch 버전 자동 증가 (1.0.0 → 1.0.1)
- **배포 시간**: 약 5-10분
- **Google 검토**: 자동 게시 시 24-48시간

## 📝 베스트 프랙티스

1. **초기 등록**: 반드시 수동으로 진행
2. **자동 게시**: 비활성화 권장 (수동 검토 후 게시)
3. **테스트**: 로컬에서 충분한 테스트 후 push
4. **버전 관리**: Semantic versioning 준수
5. **보안**: Secrets 정보 절대 코드에 포함 금지

---

💡 **참고**: Chrome Web Store 정책 변경에 따라 자동 배포가 제한될 수 있습니다. 