# Spring Miner 로컬 스캔 가이드

## 목적

브라우저 업로드 대신 로컬 Spring 프로젝트 디렉터리를 직접 스캔해 JSON 결과를 생성할 수 있도록 한다.

## 스크립트

- [scan-project.mjs](/home/u24/projects/spring_miner/scripts/scan-project.mjs)
- [JavaAstScanner.java](/home/u24/projects/spring_miner/scripts/JavaAstScanner.java)

## 사용 방법

```bash
node /home/u24/projects/spring_miner/scripts/scan-project.mjs /path/to/spring-project > spring-miner-report.json
```

## UI 연동

1. 위 명령으로 `spring-miner-report.json`을 생성한다.
2. 브라우저에서 [index.html](/home/u24/projects/spring_miner/index.html)을 연다.
3. `스캔 결과 JSON 업로드`에 생성된 파일을 넣는다.
4. `분석 실행`을 누르면 로컬 스캔 결과를 화면에서 검색, 필터, 상세 패널, CSV 다운로드로 활용할 수 있다.

## 출력 내용

- 분석 루트 경로
- 분석 시각
- 문서 수 요약
- 문서 목록
- 카테고리별 추출 결과
- 결과별 `sourcePath`, `lineNumber`, `snippet`

## 지원 확장자

- `.java`
- `.xml`
- `.sql`
- `.txt`

## 비고

- Java 파일은 `javac` 기반 AST 스캐너를 사용한다.
- XML, SQL, TXT는 현재 정규식 기반이다.
- 대규모 프로젝트에서는 실행 시간이 파일 수에 비례해 증가한다.
- 결과 JSON은 후속 UI 연동 또는 내부 배치 처리의 입력으로 활용할 수 있다.
