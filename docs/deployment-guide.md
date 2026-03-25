# Spring Miner 배포 가이드

## 1. 목적

이 문서는 `Spring Miner`를 내부 배포 또는 전달 가능한 형태로 정리하기 위한 가이드다.

## 2. 배포 형태

현재 프로젝트는 다음 두 방식으로 사용할 수 있다.

### 방식 1. 정적 HTML 도구

- `index.html`
- `styles.css`
- `app.js`

브라우저에서 바로 열거나 정적 서버로 제공할 수 있다.

### 방식 2. 로컬 CLI 도구

- `scripts/scan-project.mjs`
- `scripts/JavaAstScanner.java`

프로젝트 디렉터리를 직접 스캔해 JSON 결과를 생성할 수 있다.

## 3. 배포 전 확인 사항

- 브라우저 UI 파일이 최신 상태인지 확인
- `node --check app.js` 확인
- `node --check scripts/scan-project.mjs` 확인
- `javac scripts/JavaAstScanner.java` 확인
- 샘플 스캔 실행 확인
- 브라우저 테스트 실행 결과 확인

## 4. 정적 배포 방법

### 단순 배포

아래 파일과 폴더를 그대로 전달한다.

- `index.html`
- `styles.css`
- `app.js`
- `samples/`
- `docs/`
- `scripts/`

### 정적 서버 배포 예시

```bash
cd /home/u24/projects/spring_miner
python3 -m http.server 4173
```

## 5. CLI 실행 환경

필수 조건:

- `node`
- `java`
- `javac`

## 6. Playwright 테스트 환경

브라우저 자동 테스트를 유지하려면 아래 조건이 필요하다.

- `playwright` 설치
- Chromium 설치
- 브라우저 프로세스 실행 권한

테스트 스크립트:

- [run-browser-tests.mjs](/home/u24/projects/spring_miner/tests/run-browser-tests.mjs)

## 7. 배포 산출물 권장 구성

- 실행 파일
- 샘플 데이터
- 사용자 매뉴얼
- 배포 가이드
- 테스트 기록
- 작업 관리판

## 8. 운영 시 권장 사항

- 실제 레거시 프로젝트는 먼저 CLI로 스캔 후 JSON 결과를 UI에 업로드하는 방식을 권장한다.
- 브라우저 단독 분석은 소규모 입력이나 빠른 확인에 적합하다.
- 스냅샷은 브라우저 `localStorage`에 저장되므로 브라우저 변경 시 유지되지 않을 수 있다.
