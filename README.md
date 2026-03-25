# Spring Miner

`Spring Framework` 기반 레거시 프로젝트의 코드와 DB 자산에서 명명 정보를 추출하고, 검색/비교/조회할 수 있도록 만든 내부 도구입니다.

## 핵심 기능

- 파일 업로드, 폴더 업로드, 코드 붙여넣기
- 스캔 결과 JSON 업로드
- 클래스명, 메소드명, 변수명, 매퍼명, 네임스페이스, 테이블명, 컬럼명 추출
- 검색, 결과 유형 필터, 문서 유형 필터
- 문서 단위 범위 필터와 결과 정렬
- 상세 패널: 정의/참조 구분, 파일명, 상대 경로, 라인 번호, 스니펫
- CSV 다운로드
- 스냅샷 저장 / 불러오기 / 삭제
- 스냅샷과 현재 결과 diff 비교
- 선택 항목 기준 연관 항목 및 심볼 관계 표시
- 로컬 프로젝트 디렉터리 스캔 CLI

## 실행 파일

- `index.html`
- `styles.css`
- `app.js`
- `scripts/scan-project.mjs`
- `scripts/JavaAstScanner.java`

## 빠른 시작

### UI 사용

1. 브라우저에서 `index.html`을 엽니다.
2. `.java`, `.xml`, `.sql`, `.txt` 파일을 업로드하거나 코드를 붙여넣습니다.
3. 필요하면 프로젝트 폴더를 업로드해 상대 경로 기준으로 분석합니다.
4. `분석 실행` 버튼을 누릅니다.
5. 검색, 필터, 상세 패널, CSV 다운로드, 스냅샷 기능을 사용합니다.

### 로컬 프로젝트 스캔

```bash
node /home/u24/projects/spring_miner/scripts/scan-project.mjs /path/to/spring-project > spring-miner-report.json
```

생성된 `spring-miner-report.json`은 UI의 `스캔 결과 JSON 업로드`로 다시 불러올 수 있습니다.

## 문서

- 사용자 매뉴얼: [user-manual.md](/home/u24/projects/spring_miner/docs/user-manual.md)
- 배포 가이드: [deployment-guide.md](/home/u24/projects/spring_miner/docs/deployment-guide.md)
- 최종 산출물 정리: [final-deliverables.md](/home/u24/projects/spring_miner/docs/final-deliverables.md)
- 로컬 스캔 가이드: [local-scan-guide.md](/home/u24/projects/spring_miner/docs/local-scan-guide.md)
- 테스트 기록: [test-report.md](/home/u24/projects/spring_miner/docs/test-report.md)
- 작업 상태: [task-board.md](/home/u24/projects/spring_miner/docs/task-board.md)

## 테스트

- `node --check app.js`
- `node --check scripts/scan-project.mjs`
- `javac scripts/JavaAstScanner.java`
- `node scripts/scan-project.mjs samples`
- `node tests/run-browser-tests.mjs`

## 현재 한계

- 브라우저 UI의 Java 추출은 정규식 기반입니다.
- 로컬 스캔 CLI의 Java 추출만 `javac` 기반 AST를 사용합니다.
- XML, SQL은 규칙 기반이라 복잡한 패턴에서 누락 가능성이 있습니다.
- 스냅샷 저장은 브라우저 `localStorage` 기준입니다.
- 폴더 업로드 시 상대 경로만 표시되며 절대 경로는 브라우저에서 제공되지 않습니다.
# spring-minor
