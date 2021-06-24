const axios = require('axios');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');

const {numToKorean} = require('num-to-korean');
const generateUrl = require('../tools/urlGenerator.js');

AWS.config.update({region: 'ap-northeast-2'});
const docClient = new AWS.DynamoDB.DocumentClient();

let stockObj;
const pUrl = 'https://fchart.stock.naver.com/sise.nhn?timeframe=day&requestType=0&count=30&symbol=';

/**
 * 종목을 클릭했을 때 나오는 상세 항목에 들어가는 정보를 밑의 순서대로 리턴
 *
 * 종목이름, 종목정보, 현재가, 변동률, 시가총액
 * 52주 최고/최저가, 외국인소진률, PER, PBR, ROE
 * 애널리스트 평균가, 상승여력, 추천여부, 일별 가격 (1달)
 * 키워드, 리포트 리스트, 매매동향
 */

/**
 * Returns array that contains stock prices of the past 30 days
 * 날짜 | 시가 | 고가 | 저가 | 종가 | 거래량
 * TODO: front-end 상에서 주식 차트 바로 그릴 수 있으면 필요 없는 function 임
 * @param stockId 6 digit number of stock
 */
async function getPastPrice(stockId) {
    let body;
    let prices = [];

    try {
        body = await axios.get(pUrl + stockId);
    } catch (error) { console.log('[stockInfoService]: Error in getPastPrice') }
    const $ = cheerio.load(body.data, {xmlMode: true});

    $('item').each(function () {
        prices.push($(this).attr('data').split('|')[4]);
    })
    return prices;
}

/**
 * Returns reports company with attr: stockId written in specific date range
 * @param stockId 6 digit number of stock
 * @param date starting date of search
 */
async function getReports(stockId, date) {
    const query = {
        TableName: 'reportListComplete',
        IndexName: "stockId-date-index",
        ProjectionExpression: '#dt, reportName, analyst, priceGoal, firm, reportIdx',
        KeyConditionExpression: '#id = :id and #dt >= :date',
        ExpressionAttributeNames: {
            '#id': 'stockId',
            '#dt': 'date'
        },
        ExpressionAttributeValues: {
            ':id': stockId,
            ':date': date
        },
        ScanIndexForward: false
    };
    return (await docClient.query(query).promise()).Items;
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
    } catch (e) { console.log('[stockInfoService]: Error in getBasicInfo'); }

    const stockData = body.data;
    return {
        name: stockData.name,
        companySummary: stockData.companySummary.replace(/^\s+|\s+$/g, ''),
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

    const reportTitles = [];
    for (let i=0; i<reportList.length; i++) {
        reportTitles.push(reportList[i].reportName.replace(/ /g,''));
    }
    return reportTitles;
}

/**
 * Returns average priceGoal
 * @param reportList list of reports
 */
async function getAverage(reportList) {
    let sum = 0, count = 0;
    reportList.forEach(items => {
        if (items.priceGoal !== 0) {
            count++;
            sum += parseInt(items.priceGoal);
        }
    })
    return sum / count;
}

/**
 * Returns investor statistics of past 20 trading days (개인, 외국인, 기관)
 * @param stockId 6 digit number of stock
 */
async function getInvestor(stockId) {
    let body, investInfo = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 21);
    const kUrl = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
    let params = {
        bld: 'dbms/comm/finder/finder_listisu',
        searchText: stockId,
        mktsel: 'ALL'
    };

    try {
        body = await axios.get(generateUrl(kUrl, params));
        params = {
            bld: 'dbms/MDC/STAT/standard/MDCSTAT02302',
            isuCd: body.data.block1[0].full_code,
            strtDd: startDate.toISOString().slice(0, 10).replace(/-/g,''),
            endDd: endDate.toISOString().slice(0, 10).replace(/-/g,''),
            askBid: 3,
            trdVolVal: 2
        }
    } catch (error) { console.log('[stockInfoService]: Error in getInvestor *ISU'); }

    try {
        body = await axios.get(generateUrl(kUrl, params));
        body.data.output.forEach(info => {
            investInfo.push({
                date: info.TRD_DD,
                individual: numToKR(info.TRDVAL3),
                foreign: numToKR(info.TRDVAL4),
                institutions: numToKR(info.TRDVAL1)
            })
        })
    } catch (error) { console.log('[stockInfoService]: Error in getInvestor'); }

    return investInfo;
}

/**
 * Converts str(number) to KR unit
 * @param number a number
 */
function numToKR(number) {
    if (number === '0' ||
        (number.indexOf('-') !== -1 && number.length < 6)) return '-';

    let num, isNegative = false;
    if (number.indexOf('-') !== -1) {
        isNegative = true;
        number = number.substr(1);
    }
    num = numToKorean(parseInt(number.replace(/,/g,'')), 'mixed');
    num.indexOf('억') !== -1 ? num = num.substring(0, num.indexOf('억')) + '억'
        : num = num.substring(0, num.indexOf('만')) + '만';

    if (isNegative) {
        return '-' + num;
    } else {
        return '+' + num;
    }
}

/**
 * Returns stock element
 * 섹터 선택 시 그 섹터에 속한 종목 리스트에 들어갈 element 리턴
 * @param stockId 6 digit number of stock
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockOverview(stockId, date) {
    stockObj = {};

    const reports = await getReports(stockId, date);
    const basicInfo = await getBasicInfo(stockId);
    const past30Price = await getPastPrice(stockId);
    const avgPrice = await getAverage(reports);
    const keywords = await getKeyword(reports);
    const invStatistics = await getInvestor(stockId);

    for (let [key, value] of Object.entries(basicInfo)) {
        stockObj[key] = value;
    }

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
    stockObj['reportList'] = reports;
    stockObj['invStatistics'] = invStatistics;

    return stockObj;
}

async function test() {
    const a = await getStockOverview('011070', '2021-05-01').then();
    console.log(a);
}

test();
