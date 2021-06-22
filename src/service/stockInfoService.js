const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const ddb = new AWS.DynamoDB();

let stockObj;
const pUrl = 'https://fchart.stock.naver.com/sise.nhn?timeframe=day&requestType=0&symbol=';

/**
 * 종목을 클릭했을 때 나오는 상세 항목에 들어가는 정보를 리턴
 *
 * 종목 이름, 종목 정보, 시가총액, 52주 최고/최저가, 외국인 소진률
 * PER, PBR, ROE, 현재가, 변동률, 기대 수익률, 컨센서스 평균가
 * 최근 30일 주가, 키워드
 */

/**
 * Returns array that contains stock prices of the past 30 days
 * TODO: front-end 상에서 주식 차트 바로 그릴 수 있으면 필요 없는 function 임
 * @param stockId 6 digit number of stock
 */
async function getPastPrice(stockId) {
    let body;
    let prices = [];

    try {
        body = await axios.get(pUrl + stockId + '&count=30');
    } catch (error) {
        console.log('[stockInfoService]: Error occurred in getPastPrice')
    }
    const $ = cheerio.load(Iconv.decode(body.data, 'EUC-KR'), {xmlMode: true});

    // 날짜 | 전일종가 | 고가 | 저가 | 현재가 | 거래량
    $('item').each(function () {
        prices.push($(this).attr('data').split('|')[1]);
    })
    return prices;
}

/**
 * TODO: Returns reports of company with attr: stockId
 * @param stockId 6 digit number of stock
 * @param date starting date of search
 */
async function getReports(stockId, date) {
    const reports = [];
    return reports;
}

/**
 * Returns 기업정보, 현재가, 시가총액, 52주 최고/최저가, 외국인 소진률, PER, PBR, ROE
 * @param stockId 6 digit number of stock
 */
async function getBasicInfo(stockId) {
    let body;
    const url = 'https://finance.daum.net/api/quotes/A'
        + stockId + '?summary=false&changeStatistics=true';

    try {
        body = await axios.get(url, {
            headers: {
                referer: 'https://finance.daum.net/quotes/A' + stockId,
                'user-agent': 'Mozilla/5.0'
            },
        });
    } catch (e) {
        console.log('[stockInfoService]: Error in getBasicInfo');
    }

    const stockData = body.data;
    return {
        name: stockData.name,
        companySummary: stockData.companySummary,
        tradePrice: stockData.tradePrice,
        changeRate: stockData.changeRate,
        marketCap: stockData.marketCap,
        high52wPrice: stockData.high52wPrice,
        low52wPrice: stockData.low52wPrice,
        foreignRatio: stockData.foreignRatio,
        per: stockData.per,
        pbr: stockData.pbr,
        roe: (stockData.eps / stockData.bps) * 100.0
    }
}

/**
 * TODO: Returns main keywords from reportList
 * @param reportList list of reports
 */
async function getKeyword(reportList) {
    // KoNLPy (파이썬 한국어 NLP) 사용해서 키워드 가져오면 될 듯
    // AWS Lambda 써서 파이썬으로 코드 짜고 여기서 호출해서 값 받아오면 됨
    // 띄어쓰기 없어도 잘 추출하니까 reportList 보낼 때 안에 있는 리포트 제목들의 공백 전부 제거하고 보내는게 나을듯
}

/**
 * Returns stock element
 * 섹터 선택 시 그 섹터에 속한 종목 리스트에 들어갈 element 리턴
 * @param stockId 6 digit number of stock
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockOverview(stockId, date) {
    let avgPrice;
    stockObj = {};

    const reports = await getReports(stockId, date);
    const basicInfo = await getBasicInfo(stockId);
    const past30Price = await getPastPrice(stockId);
    const keywords = await getKeyword(reports);

    // TODO: reports 에 들어있는 데이터에서 avgPrice 구해야 함
    avgPrice = '250000';

    // TODO: for loop 사용해서 코드 짧게 만들기
    stockObj['name'] = basicInfo.name;
    stockObj['companySummary'] = basicInfo.companySummary;
    stockObj['marketCap'] = basicInfo.marketCap;
    stockObj['high52wPrice'] = basicInfo.high52wPrice;
    stockObj['low52wPrice'] = basicInfo.low52wPrice;
    stockObj['foreignRatio'] = basicInfo.foreignRatio;
    stockObj['per'] = basicInfo.per;
    stockObj['pbr'] = basicInfo.pbr;
    stockObj['roe'] = basicInfo.roe;
    stockObj['tradePrice'] = basicInfo.tradePrice;
    stockObj['changeRate'] = basicInfo.changeRate;

    if (isNaN(avgPrice)) {
        stockObj['priceAvg'] = '의견 없음';
        stockObj['expYield'] = 0;
    } else {
        stockObj['priceAvg'] = Math.round(avgPrice);
        stockObj['expYield'] = stockObj['priceAvg'] / stockObj['tradePrice'] - 1;
    }
    stockObj['expYield'] > 0 ? stockObj['recommend'] = 'O' : stockObj['recommend'] = 'X';
    stockObj['past30Price'] = past30Price;
    stockObj['keywords'] = keywords;

    return stockObj;
}

async function test() {
    const a = await getStockOverview('011070', 'sampleAttribute').then();
    console.log(a);
}

test();
