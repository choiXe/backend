# Service Documentation

## mainInfoService.js

> Returns all data needed in the main page of choiXe

### Request Parameters

```
None
```

### Response (mainObj)

```javascript
kr (List)                       // 국내 증시
global (List)                   // 해외 증시
reports (List)                  // 리포트 (최근 10개)
```

#### Structure (kr & global)

```javascript
name (String)                   // 지수 이름
tradePrice (Float)              // 현재 지수
changePrice (Float)             // 변동 (포인트)
changeRate (Float)              // 변동률 (%)
```

#### Structure (reports)

```javascript
date (String)                   // 리포트 발행일
stockName (String)              // 종목
stockId (String)                // 종목 코드
reportName (String)             // 리포트 제목
priceGoal (String)              // 종목 목표가
analyst (String)                // 애널리스트
firm (String)                   // 증권사
reportIdx (String)              // 리포트 url 파라미터
```

## stockInfoService.js

> Returns all data needed in the information page of a selected **stock** (stockObj)

### Request Parameters

```javascript
stockId: 종목 코드    // (Format: 숫자 6자리 ######)
date: 조회 시작 기간   // (Format: YYYY-MM-dd)
```

### Response (stockObj)

```javascript
name (String)                   // 종목 이름
code (String)                   // 종목 ISU 코드
companySummary (String)         // 기업 개요
wicsSectorName (String)         // WICS 섹터
openingPrice (Int)              // 시가
highPrice (Int)                 // 고가
lowPrice (Int)                  // 저가
tradePrice (Int)                // 현재 가격
changePrice (Int)               // 가격 변동 (원)
changeRate (Float)              // 가격 변동 (%)
marketCap (String)              // 시가 총액
high52wPrice (Int)              // 52주 최고가
low52wPrice (Int)               // 52주 최저가
foreignRatio (Float)            // 외국인 소진률
per (Float)                     // Price earning ratio
pbr (Float)                     // Price-to-book ratio
roe (Float)                     // Return on Equity
priceAvg (Int)                  // 애널리스트 목표가의 평균값
expYield (Float)                // 애널리스트 목표가의 평균값과 현재 가격의 괴리율
score (String)                  // 종목 점수 (투자 매력도)
pastData (List)                 // 최근 3달간의 종목 가격 및 거래량 데이터
reportList (List)               // 특정 기간동안에 발행된 리포트의 리스트
invStatistics (List)            // 최근 1달간의 투자자 동향
news (List)                     // 회사 관련 뉴스
newsTitles (String)             // Wordcloud 생성을 위한 뉴스 제목들
```

#### Structure (pastData)

```javascript
date (String)                   // 해당 날짜 (YYYY-MM-DD)
start (Int)                     // 시가
high (Int)                      // 고가
low (Int)                       // 저가
end (Int)                       // 종가
volume (Int)                    // 거래량
```

#### Structure (reportList)

```javascript
reportName (String)             // 리포트 제목
firm (String)                   // 리포트 발행 증권사
date (String)                   // 리포트 발행일
priceGoal (String)              // 목표가
analyst (String)                // 애널리스트
reportIdx (String)              // 리포트 url 파라미터
```

#### Structure (invStatistics)

```javascript
date (String)                   // 기준 날짜
inKR (List)                     // 거래량 (단위: 한국어)
inVal (List)                    // 거래량 (단위: 숫자)
```

#### Structure (news)

```javascript
title (String)                  // 뉴스 제목
description (String)            // 뉴스 본문
date (String)                   // 기준 날짜
link (String)                   // 뉴스 링크
```

## sectorInfoService.js

> Returns all data needed in the information page of a selected **sector** (sectorObj)

### Request Parameters

```javascript
sector: 섹터         // (Format: String)
date: 조회 시작 기간   // (Format: YYYY-MM-dd)
```

### Response (sectorObj)

```javascript
avgYield (Float)                // 섹터 평균 상승여력
stockList (List)                // 섹터에 속한 종목 리스트
top3List (Dictionary)           // 섹터 안에 속한 상승 여력이 가장 높은 Top 3 소섹터
```

#### Structure (stockList)

```javascript
stockName (String)              // 종목 이름
stockId (String)                // 종목 코드
sSector (String)                // 종목 소섹터
tradePrice (Int)                // 현재 가격
changePrice (Int)               // 가격 변동 (원)
changeRate (Float)              // 가격 변동 (%)
priceAvg (Int)                  // 애널리스트 목표가의 평균값
expYield (Float)                // 애널리스트 목표가의 평균값과 현재 가격의 괴리율
score (String)                  // 종목 점수 (투자 매력도)
```