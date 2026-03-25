# Spring Miner 샘플 데이터 가이드

## 목적

이 문서는 `Spring Miner`의 명명 정보 추출 기능을 수동으로 검증하기 위한 샘플 입력 파일의 사용 방법을 설명한다.

## 샘플 파일

- [sample-service.java](/home/u24/projects/spring_miner/samples/sample-service.java)
- [sample-mapper.xml](/home/u24/projects/spring_miner/samples/sample-mapper.xml)
- [sample-schema.sql](/home/u24/projects/spring_miner/samples/sample-schema.sql)

## 파일별 용도

### `sample-service.java`

- 클래스명 추출 확인
- 메소드명 추출 확인
- 변수명 추출 확인
- Spring 서비스 계층 식별 확인

### `sample-mapper.xml`

- `namespace` 추출 확인
- `select`, `update` statement id 추출 확인
- MyBatis `resultMap`과 컬럼명 추출 확인

### `sample-schema.sql`

- 테이블명 추출 확인
- 컬럼명 추출 확인
- `SELECT` 문에서 조인 대상 테이블과 컬럼 추출 확인

## 사용 방법

1. 파일 내용을 각각 복사해서 분석 화면에 붙여넣는다.
2. Java, XML, SQL을 개별로 분석하거나 한 번에 혼합 입력한다.
3. `분석 실행` 버튼을 눌러 추출 결과를 확인한다.
4. 클래스명, 메소드명, 변수명, 매퍼명, 네임스페이스, 테이블명, 컬럼명이 기대값과 맞는지 비교한다.

## 기대되는 주요 추출 예시

- 클래스명: `OrderService`
- 메소드명: `getOrderDetail`, `updateDeliveryStatus`
- 변수명: `orderMapper`, `orderDetailVo`
- 네임스페이스: `com.springminer.sales.mapper.OrderMapper`
- statement id: `selectOrderDetail`, `updateDeliveryStatus`
- 테이블명: `TB_ORDER`, `TB_ORDER_ITEM`
- 컬럼명: `ORDER_ID`, `CUSTOMER_NAME`, `ORDER_STATUS`, `DELIVERY_STATUS`, `ORDER_AMOUNT`, `PRODUCT_NAME`, `QUANTITY`

## 검증 팁

- Java 파일에서는 클래스명과 메소드명이 정확히 잡히는지 본다.
- XML 파일에서는 namespace와 SQL statement id가 분리되는지 본다.
- SQL 파일에서는 테이블명과 컬럼명이 중복 없이 수집되는지 본다.
- 한국어 업무 맥락의 값 `결제완료`처럼 비식별자 문자열은 추출 대상이 아니다.
