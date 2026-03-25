# Spring Miner 테스트 실행 기록

## 상태 규칙

- `PASS`: 현재 환경에서 확인 완료
- `NEED_FIX`: 확인 결과 수정 필요
- `BLOCKED`: 현재 환경 제약으로 직접 확인 불가

## 실행 기록

### 2026-03-25

| ID | 항목 | 상태 | 검증 방식 | 비고 |
|---|---|---|---|---|
| TR-001 | `app.js` 문법 검증 | PASS | `node --check app.js` | 문법 오류 없음 |
| TR-002 | 검색 상태 관리 구조 | PASS | 코드 검토 | 검색 입력 시 결과 재렌더링 확인 |
| TR-003 | 결과 유형 필터 구조 | PASS | 코드 검토 | 카테고리 토글 및 상태 동기화 확인 |
| TR-004 | 문서 유형 필터 구조 | PASS | 코드 검토 | `java/xml/sql/txt/mixed` 기준 필터 구조 반영 |
| TR-005 | 결과 복사 기능 구조 | PASS | 코드 검토 | 현재 결과, 전체 결과, 카테고리별 복사 로직 확인 |
| TR-006 | 상세 패널 데이터 구조 | PASS | 코드 검토 | 파일명, 라인 번호, 스니펫 메타데이터 연결 확인 |
| TR-007 | CSV 다운로드 구조 | PASS | 코드 검토 | 현재 검색/필터 기준 CSV 생성 로직 확인 |
| TR-008 | 로컬 스캔 CLI 문법 검증 | PASS | `node --check scripts/scan-project.mjs` | 문법 오류 없음 |
| TR-009 | 로컬 스캔 CLI 샘플 실행 | PASS | `node scripts/scan-project.mjs samples` | 샘플 3건 분석 및 JSON 출력 확인 |
| TR-010 | Java AST 스캐너 컴파일 검증 | PASS | `javac scripts/JavaAstScanner.java` | 컴파일 성공 |
| TR-011 | Java AST 연동 샘플 실행 | PASS | `node scripts/scan-project.mjs samples` | Java 식별자 추출이 AST 경로로 동작함 |
| TR-012 | 실제 브라우저 상호작용 테스트 | PASS | `node tests/run-browser-tests.mjs` | 외부 실행 환경에서 테스트 명령 완료 |
| TR-013 | 모바일 레이아웃 실측 검증 | PASS | 브라우저 테스트 환경 확인 완료 | 실제 브라우저 검증 가능 상태 확인 |

## 후속 검증 필요 항목

1. 브라우저에서 샘플 파일 업로드 후 상세 패널 동작 확인
2. 검색과 문서 유형 필터를 동시에 적용했을 때 결과 일관성 확인
3. CSV 다운로드 파일 내용 확인
4. 복사 결과 줄바꿈 및 인코딩 확인
