# Spring Miner

Spring 기반 레거시 프로젝트의 Java, Mapper XML, SQL 자산에서 명명 정보를 추출하고, 문서 범위와 심볼 관계 기준으로 탐색할 수 있게 만든 로컬 분석 도구입니다.

## 현재 제공 기능

- 개별 파일 업로드, 프로젝트 폴더 업로드, 코드 붙여넣기
- `scan-project.mjs` 결과 JSON 업로드
- 클래스명, 메소드명, 변수명, 매퍼명, 네임스페이스, 테이블명, 컬럼명 추출
- 문서 범위 필터, 결과 유형 필터, 문서 유형 필터, 정렬
- 심볼 상세 패널: 정의/참조 구분, 파일명, 상대 경로, 라인 번호, 스니펫
- 같은 문서의 연관 항목 및 심볼 관계 탐색
- CSV 다운로드
- 스냅샷 저장 / 불러오기 / 삭제 / 현재 결과 비교
- 대형 프로젝트 대응용 단계형 진행률 UI
- 대량 결과/문서/상세 위치의 점진 로드
- 브라우저 UI 인덱싱 시 Web Worker 우선 사용
- 로컬 프로젝트 디렉터리 스캔 CLI

## UI 특징

- 입력, 인덱스 개요, 심볼 탐색이 세로 패널로 구성됩니다.
- 진행 상태는 `파일 읽기`, `인덱스 생성`, `화면 구성` 단계로 분리되어 표시됩니다.
- 문서 탐색은 높이 제한 + 스크롤 + `문서 더 보기`를 사용합니다.
- 결과 카테고리는 항목이 많으면 기본적으로 접힌 채 시작할 수 있으며, 카드 내부에서 스크롤됩니다.
- 결과와 상세 occurrence는 모두 한 번에 전부 렌더링하지 않고 점진적으로 표시합니다.

## 주요 파일

- [index.html](/home/u24/projects/spring_miner/index.html)
- [styles.css](/home/u24/projects/spring_miner/styles.css)
- [app.js](/home/u24/projects/spring_miner/app.js)
- [indexer.js](/home/u24/projects/spring_miner/indexer.js)
- [indexer-worker.js](/home/u24/projects/spring_miner/indexer-worker.js)
- [view-model.js](/home/u24/projects/spring_miner/view-model.js)
- [scripts/scan-project.mjs](/home/u24/projects/spring_miner/scripts/scan-project.mjs)
- [scripts/JavaAstScanner.java](/home/u24/projects/spring_miner/scripts/JavaAstScanner.java)

## 빠른 시작

### 브라우저 UI

로컬 정적 서버로 테스트하려면 아래처럼 실행할 수 있습니다.

```bash
cd /home/u24/projects/spring_miner
python3 -m http.server 4173
```

실행 후 브라우저에서 `http://localhost:4173`로 접속합니다.

1. 브라우저에서 [index.html](/home/u24/projects/spring_miner/index.html) 을 엽니다.
2. 아래 방법 중 하나를 선택합니다.
3. `.java`, `.xml`, `.sql`, `.txt` 파일 업로드
4. 프로젝트 폴더 업로드
5. 코드 또는 SQL 붙여넣기
6. `scan-project.mjs`가 만든 JSON 업로드
7. `분석 실행`을 누릅니다.
8. 진행률 패널에서 파일 읽기, 인덱스 생성, 화면 구성 상태를 확인합니다.
9. 문서 탐색, 검색, 필터, 정렬, 상세 패널, 스냅샷 기능을 사용합니다.

### 로컬 프로젝트 스캔 CLI

```bash
node /home/u24/projects/spring_miner/scripts/scan-project.mjs /path/to/spring-project > spring-miner-report.json
```

생성된 `spring-miner-report.json`은 UI의 `스캔 결과 JSON 업로드`로 다시 불러올 수 있습니다.

## 성능 관련 구현

- 인덱스 생성은 가능하면 Web Worker에서 수행합니다.
- Worker 사용이 실패하면 메인 스레드 경로로 자동 폴백합니다.
- 인덱서 내부 중복 검사와 문서 관계 계산은 해시 기반으로 최적화했습니다.
- `resultMap`은 인덱스 revision 기준으로 캐시합니다.
- 문서 목록, 결과 심볼, 상세 occurrence는 점진 표시로 렌더링 비용을 줄였습니다.

## 테스트 / 점검

- `node --check app.js`
- `node --check indexer.js`
- `node --check view-model.js`
- `node --check scripts/scan-project.mjs`
- `javac scripts/JavaAstScanner.java`
- `node scripts/scan-project.mjs samples`

브라우저 E2E 스크립트는 [tests/run-browser-tests.mjs](/home/u24/projects/spring_miner/tests/run-browser-tests.mjs) 에 있지만, 실행 환경의 Chromium 제약에 따라 동작하지 않을 수 있습니다.

## 문서

- 사용자 매뉴얼: [docs/user-manual.md](/home/u24/projects/spring_miner/docs/user-manual.md)
- 로컬 스캔 가이드: [docs/local-scan-guide.md](/home/u24/projects/spring_miner/docs/local-scan-guide.md)
- 데이터 정의: [docs/data-definition.md](/home/u24/projects/spring_miner/docs/data-definition.md)
- 기능 명세: [docs/feature-spec.md](/home/u24/projects/spring_miner/docs/feature-spec.md)
- 배포 가이드: [docs/deployment-guide.md](/home/u24/projects/spring_miner/docs/deployment-guide.md)
- 테스트 기록: [docs/test-report.md](/home/u24/projects/spring_miner/docs/test-report.md)

## 현재 한계

- 브라우저 UI의 Java 추출은 정규식 기반입니다.
- 로컬 스캔 CLI의 Java 추출만 `javac` 기반 AST를 사용합니다.
- XML, SQL은 규칙 기반이라 복잡한 패턴에서 누락 가능성이 있습니다.
- 스냅샷 저장은 브라우저 `localStorage` 기준입니다.
- 폴더 업로드 시 상대 경로만 표시되며 절대 경로는 브라우저에서 제공되지 않습니다.
- 브라우저의 폴더 업로드 확인창은 웹앱에서 제거할 수 없습니다.
