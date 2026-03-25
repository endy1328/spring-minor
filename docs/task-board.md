# Spring Miner 작업 관리판

## 상태 규칙

- `TODO`: 아직 시작하지 않음
- `IN_PROGRESS`: 현재 진행 중
- `BLOCKED`: 외부 조건 또는 선행 작업 대기
- `DONE`: 완료

## 운영 규칙

- 모든 작업은 ID를 가진다.
- 상태 변경 시 본 문서와 `progress-log.md`를 함께 갱신한다.
- 멀티에이전트 작업은 `담당`과 `대상 파일`을 명시한다.

## 작업 목록

| ID | 상태 | 우선순위 | 작업명 | 설명 | 담당 | 대상 파일 |
|---|---|---|---|---|---|---|
| T-001 | DONE | P1 | 기획 문서 정리 | 개요, 요구사항, MVP, 화면 기획 문서 작성 | main | docs/planning.md 외 |
| T-002 | DONE | P1 | 운영 문서 정리 | 작업 규칙, 이슈 템플릿, 리스크/결정 로그 작성 | main | docs/working-rules.md 외 |
| T-003 | DONE | P1 | 에이전트 가이드 작성 | 멀티에이전트 협업용 agent 문서 작성 | progress-agent 지원 | agent.md |
| T-004 | DONE | P1 | 기본 정적 프로토타입 구현 | 업로드, 텍스트 입력, 결과 요약, 결과 카드 구현 | main | index.html, styles.css, app.js |
| T-005 | DONE | P1 | 검색 기능 구현 | 결과 키워드 검색 기능 추가 | main | index.html, styles.css, app.js |
| T-006 | DONE | P1 | 결과 유형 필터 구현 | 결과 카테고리별 필터 기능 추가 | main | index.html, styles.css, app.js |
| T-007 | DONE | P1 | 복사 기능 구현 | 현재 결과, 전체 결과, 카테고리별 복사 기능 추가 | main | index.html, app.js |
| T-008 | DONE | P1 | 샘플 데이터 세트 작성 | Java, Mapper XML, SQL 샘플 및 가이드 작성 | sample-agent | samples/, docs/sample-data-guide.md |
| T-009 | DONE | P1 | UI 검토 체크리스트 작성 | 검색, 필터, 복사 중심 검토 기준 작성 | review-agent | docs/ui-review-checklist.md |
| T-010 | DONE | P2 | 상세 결과 패널 설계 및 구현 | 파일명, 위치, 스니펫을 보여줄 수 있는 구조와 UI 반영 | main | index.html, styles.css, app.js, docs/feature-spec.md |
| T-011 | DONE | P2 | 파일 경로 및 라인 번호 추출 | 파일 업로드는 파일명, 폴더 업로드는 상대 경로(`sourcePath`)와 라인 번호 표시까지 구현 완료. 절대 경로는 브라우저 제한으로 제외. | main | app.js, docs/data-definition.md |
| T-012 | DONE | P2 | 코드 스니펫 미리보기 | 선택 항목의 주변 문맥 표시 | main | index.html, styles.css, app.js |
| T-013 | DONE | P2 | CSV 다운로드 기능 | 현재 결과를 CSV로 저장 | main | index.html, app.js |
| T-014 | DONE | P2 | 파일 유형 필터 고도화 | Java/XML/SQL 기준 필터 분리 | main | index.html, styles.css, app.js |
| T-015 | DONE | P2 | 수동 테스트 실행 기록 | 외부 실행 환경에서 브라우저 테스트 명령 완료 기준으로 검증 기록 반영 | progress-agent 지원 | docs/test-report.md |
| T-016 | DONE | P3 | 프로젝트 디렉터리 자동 스캔 | 로컬 Spring 프로젝트 디렉터리를 스캔하고 JSON 결과를 출력할 수 있음 | main | scripts/scan-project.mjs |
| T-021 | DONE | P2 | 스캔 결과 JSON 로드 | `scan-project.mjs` 출력 JSON을 업로드해 화면에 표시 | main | index.html, app.js, docs/local-scan-guide.md |
| T-017 | DONE | P3 | 분석 결과 저장 구조 | 브라우저 `localStorage` 기반 스냅샷 저장, 목록, 불러오기, 삭제 구조 구현 | main | index.html, styles.css, app.js, docs/data-definition.md |
| T-018 | DONE | P3 | 변경 이력 비교 | 저장된 스냅샷과 현재 결과를 카테고리별 diff로 비교 | main | index.html, styles.css, app.js, docs/feature-spec.md |
| T-019 | DONE | P3 | 연관 관계 시각화 | 선택 항목과 같은 문서/상대 경로에 등장한 관련 항목 표시 | main | app.js, styles.css, docs/feature-spec.md |
| T-020 | DONE | P3 | AST 기반 정밀 분석 | 로컬 스캔 CLI에서 `javac` 기반 Java AST 파서를 사용해 클래스, 메소드, 변수 추출 정밀도 향상 | main | scripts/scan-project.mjs, scripts/JavaAstScanner.java, docs/local-scan-guide.md |

## 현재 진행 중

현재 진행 중인 작업은 없다.

### 다음 후보 작업

- 후속 핵심 개발 작업은 현재 작업판 기준으로 모두 완료되었다.
- 다음 후보는 신규 요구사항 추가 또는 배포/운영 단계다.

## 대기 및 리스크

- `T-011`은 파일 업로드 기준으로 파일명과 라인 번호는 완료됐고, 절대 경로는 브라우저 제한으로 제외한다.
- `T-016`은 로컬 스캔 CLI가 필요하므로 배포 또는 실행 환경 차이가 있으면 재검토가 필요하다.
- `T-021`은 로컬 스캔 JSON 스키마가 바뀌면 화면 렌더링도 함께 맞춰야 한다.
- `T-017`, `T-018`은 브라우저 `localStorage` 기준이므로 브라우저를 바꾸면 저장 스냅샷이 공유되지 않는다.
- `T-019`의 관계 표시는 현재 `sourcePath` 공존 기준이라 논리적 의존 관계와 완전히 같지는 않다.
- `T-020`은 Java만 AST 기반이고 XML, SQL은 아직 규칙 기반이다.
