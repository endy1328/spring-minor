# Spring Miner 데이터 항목 정의서

## 1. 문서 목적

분석 대상, 인덱스 데이터, 화면 표시 데이터의 구조를 정의한다.

## 2. 입력 데이터 정의

### 2.1 분석 요청 단위

| 항목명 | 설명 | 형식 | 필수 |
|---|---|---|---|
| requestId | 분석 요청 식별자 | string | 선택 |
| sourceType | 입력 유형 | enum(`file`, `text`, `mixed`) | 필수 |
| requestedAt | 분석 요청 시각 | datetime | 선택 |

### 2.2 입력 문서

| 항목명 | 설명 | 형식 | 필수 |
|---|---|---|---|
| documentId | 문서 식별자 | string | 선택 |
| name | 파일명 또는 입력명 | string | 필수 |
| extension | 확장자 | string | 선택 |
| content | 원문 텍스트 | text | 필수 |
| size | 파일 크기(byte) | number | 선택 |
| sourcePath | 원본 상대 경로 | string | 현재 |

## 3. 인덱스 데이터 구조

### 3.1 심볼

| 항목명 | 설명 | 형식 | 필수 |
|---|---|---|---|
| symbolId | 심볼 식별자 | string | 필수 |
| kind | 심볼 유형 | enum | 필수 |
| name | 화면 표시명 | string | 필수 |
| qualifiedName | 정규화/확장 이름 | string | 선택 |
| documentId | 대표 문서 식별자 | string | 선택 |
| definedAtOccurrenceId | 정의 위치 occurrence 식별자 | string | 선택 |

### 3.2 발생 위치

| 항목명 | 설명 | 형식 | 필수 |
|---|---|---|---|
| occurrenceId | 발생 위치 식별자 | string | 필수 |
| symbolId | 연결된 심볼 식별자 | string | 필수 |
| documentId | 문서 식별자 | string | 필수 |
| role | 위치 역할 | enum(`definition`, `reference`) | 필수 |
| sourceDocument | 추출 원본 파일명 | string | 현재 |
| sourcePath | 추출 원본 상대 경로 | string | 현재 |
| lineNumber | 추출 위치 라인 번호 | number | 현재 |
| snippet | 원문 일부 | string | 현재 |

### 3.3 관계

| 항목명 | 설명 | 형식 | 필수 |
|---|---|---|---|
| relationId | 관계 식별자 | string | 필수 |
| type | 관계 유형 | enum(`contains`) | 필수 |
| fromSymbolId | 출발 심볼 | string | 필수 |
| toSymbolId | 도착 심볼 | string | 필수 |

## 4. 결과 유형 정의

| category 값 | 설명 |
|---|---|
| classes | 클래스명 및 인터페이스명 |
| methods | 메소드명 |
| variables | 변수명 |
| mappers | mapper statement id 또는 mapper 식별명 |
| namespaces | mapper namespace |
| tables | 테이블명 |
| columns | 컬럼명 |

## 5. 화면 표시용 요약 데이터

| 항목명 | 설명 | 형식 |
|---|---|---|
| totalDocuments | 분석 문서 수 | number |
| totalClasses | 클래스 및 인터페이스 수 | number |
| totalMethods | 메소드 수 | number |
| totalTables | 테이블 수 | number |
| totalColumns | 컬럼 수 | number |

## 6. 검색 및 필터 데이터 정의

### 검색 조건

| 항목명 | 설명 | 형식 |
|---|---|---|
| keyword | 검색 키워드 | string |
| categories | 선택된 결과 유형 목록 | array |
| fileTypes | 선택된 파일 유형 목록 | array |

### 정렬 조건

| 항목명 | 설명 | 형식 |
|---|---|---|
| sortBy | 정렬 기준 | enum(`name`, `count`, `type`) |
| order | 정렬 방향 | enum(`asc`, `desc`) |

## 7. 다운로드 데이터 구조

| 항목명 | 설명 | 형식 |
|---|---|---|
| category | 결과 유형 | string |
| name | 추출 이름 | string |
| sourceDocument | 원본 파일명 | string |
| sourcePath | 원본 경로 | string |
| lineNumber | 라인 번호 | number |

## 8. 차기 버전 확장 데이터

| 항목명 | 설명 |
|---|---|
| relatedItems | 연관 클래스/매퍼/테이블 목록 |
| scanBatchId | 배치 분석 식별자 |
| projectName | 프로젝트명 |
| projectVersion | 프로젝트 버전 |
| analysisStatus | 분석 상태 |
| errorMessage | 분석 실패 메시지 |

## 9. 스냅샷 저장 구조

| 항목명 | 설명 | 형식 |
|---|---|---|
| id | 스냅샷 식별자 | string |
| label | 스냅샷 표시명 | string |
| savedAt | 저장 시각 | datetime |
| index | 문서/심볼/발생위치/관계 인덱스 | object |
| documents | 분석 문서 목록 | array |
| summary | 요약 정보 | object |

현재 구현은 하위 호환을 위해 `results` 기반 구버전 스냅샷도 읽을 수 있다.

## 10. 비교 결과 구조

| 항목명 | 설명 | 형식 |
|---|---|---|
| snapshotId | 비교 기준 스냅샷 식별자 | string |
| category | 비교 카테고리 | string |
| added | 현재 결과에 새로 추가된 이름 목록 | array |
| removed | 현재 결과에서 사라진 이름 목록 | array |

## 11. 구현 메모

- 단일 파일 업로드는 `file.name` 기준으로 처리된다.
- 폴더 업로드 시 `webkitRelativePath` 기반 상대 경로를 사용할 수 있다.
- 실제 절대 원본 경로는 브라우저 업로드 보안 제한 때문에 제공되지 않는다.
- 현재 스냅샷은 브라우저 `localStorage`에 저장된다.
- 현재 브라우저 UI는 `documents`, `symbols`, `occurrences`, `relations` 인덱스를 기준으로 화면 모델을 만든다.
