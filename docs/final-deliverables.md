# Spring Miner 최종 산출물 정리

## 1. 프로젝트 개요

`Spring Miner`는 Spring 기반 레거시 프로젝트의 코드와 DB 자산에서 명명 정보를 추출하고, 검색/비교/조회할 수 있도록 만든 내부 도구다.

## 2. 주요 구현 결과

### 브라우저 UI

- 파일 업로드
- 프로젝트 폴더 업로드
- 코드 붙여넣기
- 스캔 결과 JSON 업로드
- 검색
- 결과 유형 필터
- 문서 유형 필터
- 상세 패널
- CSV 다운로드
- 스냅샷 저장/불러오기/삭제
- 스냅샷 비교
- 연관 항목 표시

### 로컬 스캔 CLI

- 프로젝트 디렉터리 직접 스캔
- JSON 결과 생성
- Java AST 기반 식별자 추출
- XML / SQL 규칙 기반 추출

## 3. 핵심 파일

### 실행 파일

- [index.html](/home/u24/projects/spring_miner/index.html)
- [styles.css](/home/u24/projects/spring_miner/styles.css)
- [app.js](/home/u24/projects/spring_miner/app.js)
- [scan-project.mjs](/home/u24/projects/spring_miner/scripts/scan-project.mjs)
- [JavaAstScanner.java](/home/u24/projects/spring_miner/scripts/JavaAstScanner.java)

### 샘플 및 테스트

- [sample-service.java](/home/u24/projects/spring_miner/samples/sample-service.java)
- [sample-mapper.xml](/home/u24/projects/spring_miner/samples/sample-mapper.xml)
- [sample-schema.sql](/home/u24/projects/spring_miner/samples/sample-schema.sql)
- [run-browser-tests.mjs](/home/u24/projects/spring_miner/tests/run-browser-tests.mjs)
- [test-report.md](/home/u24/projects/spring_miner/docs/test-report.md)

### 기획 및 운영 문서

- [planning.md](/home/u24/projects/spring_miner/docs/planning.md)
- [requirements.md](/home/u24/projects/spring_miner/docs/requirements.md)
- [mvp.md](/home/u24/projects/spring_miner/docs/mvp.md)
- [feature-spec.md](/home/u24/projects/spring_miner/docs/feature-spec.md)
- [data-definition.md](/home/u24/projects/spring_miner/docs/data-definition.md)
- [task-board.md](/home/u24/projects/spring_miner/docs/task-board.md)
- [progress-log.md](/home/u24/projects/spring_miner/docs/progress-log.md)

## 4. 완료 상태

- 핵심 개발 작업 완료
- 브라우저 테스트 기록 반영 완료
- 작업 관리판 반영 완료

## 5. 남아 있는 한계

- 브라우저 UI의 Java 분석은 정규식 기반이다.
- XML, SQL 분석은 규칙 기반이라 복잡한 패턴에서 누락 가능성이 있다.
- 스냅샷 저장은 브라우저 `localStorage` 기준이다.
- 연관 관계 표시는 `sourcePath` 공존 기준이라 완전한 의존성 분석은 아니다.

## 6. 다음 확장 후보

- 저장 결과 영속화
- 스냅샷 간 직접 비교 고도화
- 의존 관계 시각화 강화
- XML / SQL 파서 고도화
- 서버형 배포 구조 전환
