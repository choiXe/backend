/**
 * 종목 추천 점수 알고리즘
 * 종목은 다음과 같이 크게 2 종류로 나눌 수 있음: 성장주 & 가치주
 * 일단 성장주를 추천한다고 가정하고 그 기준에 맞게 점수 알고리즘을 짤 예정
 *
 * Categories
 *
 * 신뢰도 (Credibility)
 *     공통 (성장주 & 가치주)
 *         애널리스트 정확도: 높을수록 점수 ↑
 *         expYield: 애널리스트 평균가와 현재 가격의 괴리율 (상승 여력이 높을수록 점수 ↑)
 *         consensusCount: 발행된 리포트의 개수 (많을수록 점수 ↑)
 *
 * 인기도 & 추세 (Popularity)
 *     공통 (성장주 & 가치주)
 *         volume: 거래량 (증가할수록 점수 ↑)
 *         communityScore: 커뮤니티 활성도 (증가할수록 점수 ↑)
 *         momentum: 모멘텀 수치 (높을수록 점수 ↑)
 *             > (금일 종가 / N일 전 종가) * 100
 *
 * 재무 (Financials)
 *     성장주
 *         PEG (Price Earnings Growth): 1을 기준으로 낮으면 저평가, 높으면 고평가
 *             > PER ÷ (주당순이익증가율% X 100)
 *         Growth Rate of Net Income: 순이익 증가율과 주가 상승률을 비교
 *     가치주
 *         PER: 섹터 평균 보다 낮으면 점수 ↑
 *         PBR: 낮을수록 점수 ↑
 *         ROE: 높을수록 점수 ↑
 *         EV/EBITDA: 낮을수록 점수 ↑
 *         GP/A: 높을수록 점수 ↑
 *         Debt Growth Ratio: 0보다 낮으면 점수 ↑
 *             (ROE & EV/EBITDA 와 dependable 하게 계산할 예정)
 */

/**
 * 점수 산정 타겟 기준:
 *     최근 3달 내에 리포트가 하나 이상 발행된 종목일 것
 *
 * 점수 업데이트 방법:
 *     특정 시간 (새벽)에 작동하는 스케쥴러를 만들어서 자동으로 계산
 */

const AWS = require('aws-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const {region, timeoutLimit} = require('../data/constants.js');
const {lSectors} = require('../data/wicsDictionary.js');
const {strToNum} = require('../tools/formatter.js');
const {scoreQuery} = require('../data/queries.js');
const {naverApiUrl2, wiseReportUrl, pastDataUrl} = require('../tools/urlGenerator.js');

AWS.config.update(region);
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = timeoutLimit;

/**
 * Returns list of stockIds and their report count & priceGoal
 * that has at least 1 report for past 3 months.
 */
async function getIdList() {
    let reportList = [], stockList = {};
    let price, id, query = '';

    for (const sector of lSectors) {
        reportList.push.apply(reportList,
            (await docClient.query(scoreQuery(sector)).promise()).Items);
    }
    reportList.forEach(item => {
        price = parseInt(item.priceGoal);
        id = item.stockId;
        if (!stockList[id]) {
            stockList[id] = { stockId: id, count: 1 }
            price !== 0 ? stockList[id].price = [price] :
                stockList[id].price = [];
        }
        stockList[id].count++;
        if (price !== 0) stockList[id].price.push(price);
    });
    for (let i in stockList) {
        query += stockList[i].stockId + ',';
        stockList[i].priceAvg = stockList[i].price.reduce(
            (a, b) => a + b, 0) / stockList[i].price.length;
        delete stockList[i].price;
    }
    stockList.query = query;
    return stockList;
}

/**
 * Returns stockList after adding tradePrice, avgYield, PER, PBR, and ROE
 * @param stockList list of stocks
 */
async function addBasicInfo(stockList) {
    let body, tmp;
    let stockId;
    try {
        body = (await axios.get(naverApiUrl2(stockList.query)))
            .data.result.areas[0].datas;
        delete stockList.query;
    } catch (e) {}
    for (const item of body) {
        stockId = item.cd;
        tmp = stockList[stockId];
        tmp.tradePrice = item.nv;
        tmp.avgYield = tmp.priceAvg / item.nv;
        tmp.per = item.nv / item.eps;
        tmp.pbr = item.nv / item.bps;
        tmp.roe = item.eps / item.bps;
        console.log('Working on: ' + stockId);
        tmp.fData = await getFinancialData(stockId);
        tmp.popularity = await getPopularity(stockId);
        tmp.financial = await calGFinancial(tmp);
    }
    return stockList;
}

/**
 * Returns organized financial information object
 * @param stockId 6 digit number code of stock
 */
async function getFinancialData(stockId) {
    let body, fData = [];
    try {
        body = await axios.get(wiseReportUrl(stockId));
    } catch (e) {}
    const $ = cheerio.load(body.data);
    $('tbody tr').map(function () {
        fData.push({
            year: parseInt($(this).find('td:nth-child(1)').text().split('(')[0]),
            revenue: strToNum($(this).find('td:nth-child(2)').text()),
            revenueDif: strToNum($(this).find('td:nth-child(3)').text()),
            opIncome: strToNum($(this).find('td:nth-child(4)').text()),
            opIncomeDif: strToNum($(this).find('td:nth-child(5)').text()),
            income: strToNum($(this).find('td:nth-child(6)').text()),
            incomeDif: strToNum($(this).find('td:nth-child(7)').text()),
            eps: strToNum($(this).find('td:nth-child(8)').text()),
            evEbitda: strToNum($(this).find('td:nth-child(12)').text()),
            debtRatio: strToNum($(this).find('td:nth-child(13)').text())
        });
    });
    return fData;
}

/**
 * Returns popularity data
 * @param stockId 6 digit number code of stock
 */
async function getPopularity(stockId) {
    let body, tmp;
    let vData = [], pData = [];
    try {
        body = await axios.get(pastDataUrl(stockId, 30, 'day'));
    } catch (e) {}
    const $ = cheerio.load(body.data, {xmlMode: true});

    $('item').each(function () {
        tmp = $(this).attr('data').split('|');
        vData.push(parseInt(tmp[5]));
        pData.push(parseInt(tmp[4]));
    });

    if (vData.length < 30) {
        return {
            volumeInc: '데이터 부족',
            momentum: {
                day10: '데이터 부족',
                day20: '데이터 부족',
                day30: '데이터 부족',
            }
        }
    }

    vData = (vData[25] + vData[26] + vData[27] + vData[28] + vData[29]) /
        (vData[20] + vData[21] + vData[22] + vData[23] + vData[24]);

    return {
        volumeInc: vData - 1,
        momentum: {
            day10: pData[0] / pData[9] > 1 ? 'Up' : 'Down',
            day20: pData[0] / pData[19] > 1 ? 'Up' : 'Down',
            day30: pData[0] / pData[29] > 1 ? 'Up' : 'Down'
        }
    };
}

/**
 * Calculates financial investment data for 'Growth Stock'
 * PEG & Growth Rate of Net Income
 */
function calGFinancial(stockItem) {
    const size = stockItem.fData.length;
    try {
        const peg = stockItem.per /
            (100 * stockItem.fData[size - 1].eps / stockItem.fData[size - 2].eps);
        const niGrowth2yr = (stockItem.fData[size - 1].incomeDif +
            stockItem.fData[size - 2].incomeDif + stockItem.fData[size - 3].incomeDif) / 3;
        const niGrowth1yr = (stockItem.fData[size - 1].incomeDif +
            stockItem.fData[size - 2].incomeDif) / 2;
        return {
            peg: peg,
            niGrowth1yr: niGrowth1yr,
            niGrowth2yr: niGrowth2yr
        };
    } catch (e) {
        return {
            peg: NaN,
            niGrowth1yr: NaN,
            niGrowth2yr: NaN
        }
    }
}

/**
 * TODO: Calculates financial investment data for 'Value Stock'
 *       PER, PBR, GP/A
 *       ROE, EV/EBITDA, Debt Growth Ratio
 */
function calVFinancial() {

}

/**
 * Returns score recommendation of a stock
 * @param expYield expected profit yield
 * @param consensusCount number of reports backing up priceGoal
 */
function getScore(expYield, consensusCount) {
    let a, b;
    expYield >= 50 ? a = 10 : a = Math.abs(expYield) / 5;
    consensusCount >= 10 ? b = 10 : b = consensusCount;

    switch (consensusCount) {
        case 1:
            b -= 4; break;
        case 2:
            b -= 2; break;
        case 3:
            break;
        case 4:
            b += 1.5; break;
        default:
            b += 3;
    }
    return Math.sign(expYield) * Math.round(a + b) * 5;
}

async function test() {
    const a = await getIdList();
    const b = await addBasicInfo(a);
    console.log(b);
}

test();

module.exports = {getScore};
