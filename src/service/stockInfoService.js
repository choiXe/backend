const axios = require('axios');
const cheerio = require('cheerio');
const parser = require('xml2js').parseString;
const AWS = require('aws-sdk');

const {numToKorean} = require('num-to-korean');
const generateUrl = require('../tools/urlGenerator.js');
const getScore = require('./scoreService.js');

AWS.config.update({region: 'ap-northeast-2'});
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = 1500;

const month = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04',
    May: '05', Jun: '06', Jul: '07', Aug: '08',
    Sep: '09', Oct: '10', Nov: '11', Dec: '12'
}

let stockObj;
const pUrl = 'https://fchart.stock.naver.com/sise.nhn?timeframe=day&requestType=0&count=65&symbol=';

/**
 * 종목을 클릭했을 때 나오는 상세 항목에 들어가는 정보를 밑의 순서대로 리턴
 *
 * 종목이름, 종목정보, 현재가, 변동률, 시가총액
 * 52주 최고/최저가, 외국인소진률, PER, PBR, ROE
 * 애널리스트 평균가, 상승여력, 추천여부, 일별 가격 (1달)
 * 키워드, 리포트 리스트, 매매동향
 */

/**
 * Returns stock data of past 3 months
 * 날짜 | 시가 | 고가 | 저가 | 종가 | 거래량
 * TODO: front-end 상에서 주식 차트 바로 그릴 수 있으면 필요 없는 function 임
 * @param stockId 6 digit number of stock
 */
async function getPastData(stockId) {
    let body, tmp;
    let prices = [];

    try {
        body = await axios.get(pUrl + stockId);
    } catch (error) { console.log('[stockInfoService]: Error in getPastPrice') }
    const $ = cheerio.load(body.data, {xmlMode: true});

    $('item').each(function () {
        tmp = $(this).attr('data').split('|');
        prices.push({
            date: tmp[0].substr(0, 4) + '-' + tmp[0].substr(4, 2) + '-' + tmp[0].substr(6),
            start: parseInt(tmp[1]),
            high: parseInt(tmp[2]),
            low: parseInt(tmp[3]),
            end: parseInt(tmp[4]),
            volume: parseInt(tmp[5])
        })
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
        const stockData = body.data;
        return {
            name: stockData.name,
            companySummary: stockData.companySummary.replace(/^\s+|\s+$/g, ''),
            tradePrice: stockData.tradePrice,
            changeRate: round2Deci(stockData.changeRate * 100),
            marketCap: numToKR(stockData.marketCap + '').replace('+', ''),
            high52wPrice: stockData.high52wPrice,
            low52wPrice: stockData.low52wPrice,
            foreignRatio: stockData.foreignRatio,
            per: stockData.per,
            pbr: stockData.pbr,
            roe: round2Deci((stockData.eps / stockData.bps) * 100.0)
        }
    } catch (e) {
        console.log('[stockInfoService]: Error in getBasicInfo');
        return false;
    }
}

/**
 * Return news related to stock
 * @param stockName
 * @returns {Promise<*[]>}
 */
async function getNews(stockName) {
    let body, a;
    let newsList = [];
    const url = 'https://news.google.com/rss/search?q=' +
        stockName + '&hl=ko&gl=KR&ceid=KR%3Ako';
    try {
        body = await axios.get(encodeURI(url));
        parser(body.data, function (err, res) {
            body = res.rss.channel[0].item;
        })
    } catch (e) { console.log('[stockInfoService]: Error from getNews'); }

    body.forEach(item => {
        a = item.pubDate[0].split(' ');
        newsList.push({
            title: item.title[0].split(' - ' + item.source[0]['_'])[0],
            date: a[3] + '-' + month[a[2]] + '-' + a[1],
            source: item.source[0]['_'],
            link: item.link[0]
        })
    })
    return newsList;
}

/**
 * TODO: Returns main keywords from reportList
 * @param reportList list of reports
 */
async function getKeyword(reportList) {
    // 보류
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
    } catch (error) {
        // KRX 홈페이지 점검 중일 때 timeout 걸고 종료
        if (error.code === 'ECONNABORTED') {
            return {
                date: endDate.toISOString().slice(0, 10),
                individual: '',
                foreign: '점검중',
                institutions: ''
            }
        }
        console.log('[stockInfoService]: Error in getInvestor *ISU');
    }

    try {
        body = await axios.get(generateUrl(kUrl, params));
        body.data.output.forEach(info => {
            investInfo.push({
                date: info.TRD_DD.replace(/\//g,'-'),
                inKR: {
                    individual: numToKR(info.TRDVAL3),
                    foreign: numToKR(info.TRDVAL4),
                    institutions: numToKR(info.TRDVAL1)
                },
                inVal: {
                    individual: parseInt(info.TRDVAL3.replace(/,/g,'')),
                    foreign: parseInt(info.TRDVAL4.replace(/,/g,'')),
                    institutions: parseInt(info.TRDVAL1.replace(/,/g,''))
                }
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
 * Returns rounded up number with 2 decimal place
 * @param number value
 */
function round2Deci(number) {
    return Math.round(number * 100) / 100;
}

/**
 * Returns average priceGoal
 * @param reportList list of reports
 */
async function getAverage(reportList) {
    let sum = 0, count = 0;
    reportList.forEach(items => {
        if (items.priceGoal !== '0') {
            count++;
            sum += parseInt(items.priceGoal);
        }
    })
    return [sum / count, count];
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
    if (!basicInfo) return '존재하지 않는 종목입니다';
    const pastData = await getPastData(stockId);
    const avgPrice = await getAverage(reports);
    const invStatistics = await getInvestor(stockId);
    // const keywords = await getKeyword(reports);

    for (let [key, value] of Object.entries(basicInfo)) {
        stockObj[key] = value;
    }

    if (isNaN(avgPrice[0])) {
        stockObj['priceAvg'] = '의견 없음';
        stockObj['expYield'] = 0;
    } else {
        stockObj['priceAvg'] = Math.round(avgPrice[0]);
        stockObj['expYield'] = round2Deci((stockObj['priceAvg'] /
            stockObj['tradePrice'] - 1) * 100);
    }

    stockObj['recommend'] = getScore(stockObj['expYield'], avgPrice[1]);
    stockObj['pastData'] = pastData;
    stockObj['reportList'] = reports;
    stockObj['invStatistics'] = invStatistics;
    stockObj['news'] = await getNews(basicInfo['name']);
    // stockObj['keywords'] = keywords;

    return stockObj;
}

async function test() {
    const a = await getStockOverview('011070', '2021-06-01').then();
    console.log(a);
}

test();
