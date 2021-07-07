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
    let stockList = {};
    let price, id, query = '';
    let reportList = [];

    for (const sector of lSectors) {
        reportList.push.apply(reportList,
            (await docClient.query(scoreQuery(sector)).promise()).Items);
    }

    /*

    Sample reportList for testing
    Comment out line 22~27 in order to test

    let reportList = [{ priceGoal: '265000', date: '2021-07-07', stockId: '018260' },
        { priceGoal: '68000', date: '2021-07-07', stockId: '240810' },
        { priceGoal: '215000', date: '2021-07-07', stockId: '009150' },
        { priceGoal: '70000', date: '2021-07-07', stockId: '213420' },
        { priceGoal: '66000', date: '2021-07-06', stockId: '336260' },
        { priceGoal: '70500', date: '2021-07-06', stockId: '213420' },
        { priceGoal: '900000', date: '2021-07-06', stockId: '006400' },
        { priceGoal: '210000', date: '2021-07-06', stockId: '058470' },
        { priceGoal: '0', date: '2021-07-06', stockId: '083310' },
        { priceGoal: '0', date: '2021-07-05', stockId: '319660' },
        { priceGoal: '24000', date: '2021-07-05', stockId: '086960' },
        { priceGoal: '220000', date: '2021-07-05', stockId: '058470' },
        { priceGoal: '0', date: '2021-07-05', stockId: '376190' },
        { priceGoal: '0', date: '2021-07-05', stockId: '049080' }];

     */

    reportList.forEach(item => {
        price = parseInt(item.priceGoal);
        id = item.stockId;
        if (!stockList[id]) {
            stockList[id] = { stockId: id, count: 1 }
            if (price !== 0) {
                stockList[id].price = [price];
                stockList[id].countPrice = 1;
            } else {
                stockList[id].price = [];
                stockList[id].countPrice = 0;
            }
        }
        stockList[id].count++;
        if (price !== 0) {
            stockList[id].price.push(price);
            stockList[id].countPrice++;
        }
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
        tmp.expYield = tmp.priceAvg / item.nv;
        tmp.per = item.nv / item.eps;
        tmp.pbr = item.nv / item.bps;
        tmp.roe = item.eps / item.bps;
        console.log('Working on: ' + stockId);
        tmp.fData = await getFinancialData(stockId);
        tmp.popularity = await getPopularity(stockId);
        tmp.financial = await calGFinancial(tmp);
        tmp.score = calScore(tmp);
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
        body = await axios.get(pastDataUrl(stockId, 20, 'day'));
    } catch (e) {}
    const $ = cheerio.load(body.data, {xmlMode: true});

    $('item').each(function () {
        tmp = $(this).attr('data').split('|');
        vData.push(parseInt(tmp[5]));
        pData.push(parseInt(tmp[4]));
    });

    if (vData.length < 20) {
        return {
            volumeInc: '데이터 부족',
            momentum: {
                day5: '데이터 부족',
                day10: '데이터 부족',
                day20: '데이터 부족',
            }
        }
    }

    vData = (vData[15] + vData[16] + vData[17] + vData[18] + vData[19]) /
        (vData[10] + vData[11] + vData[12] + vData[13] + vData[14]);

    return {
        volumeInc: vData - 1,
        momentum: {
            day5: pData[0] / pData[4] > 1 ? 'Up' : 'Down',
            day10: pData[0] / pData[9] > 1 ? 'Up' : 'Down',
            day20: pData[0] / pData[19] > 1 ? 'Up' : 'Down'
        }
    };
}

/**
 * Calculates financial investment data for 'Growth Stock'
 * PEG & Growth Rate of Net Income
 */
function calGFinancial(stockItem) {
    const item = stockItem.fData;
    try {
        const peg = stockItem.per /
            (100 * item[item.length - 1].eps / item[item.length - 2].eps);
        const niGrowth2yr = (item[item.length - 1].incomeDif +
            item[item.length - 2].incomeDif + item[item.length - 3].incomeDif) / 3;
        const niGrowth1yr = (item[item.length - 1].incomeDif +
            item[item.length - 2].incomeDif) / 2;
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
 * Calculates investment attractiveness score of growth stock
 * @param stockObj stock object
 */
function calScore(stockObj) {
    let popScore = calPopScore(stockObj); // 데이터 부족 리턴할 수도 있음
    let finScore = calFinScore(stockObj);
    let credScore = calCredScore(stockObj);

    if (popScore === '-' || finScore === '-') return '데이터 부족';
    return Math.round((credScore + popScore + finScore) / 3);
}

/**
 * Returns popularity score (max 100)
 * - volume: 거래량 (증가할수록 점수 ↑)
 * - momentum: 모멘텀 수치 (높을수록 점수 ↑)
 * - TODO: communityScore: 커뮤니티 활성도 (증가할수록 점수 ↑)
 * @param stockObj stock object
 */
function calPopScore(stockObj) {
    let volume, momentum, report;
    const popData = stockObj.popularity;

    if (popData.volumeInc === '데이터 부족') return '-';

    if (popData.volumeInc < 0) {
        volume = 0;
    } else if (popData.volumeInc > 2) {
        volume = 100;
    } else {
        volume = (popData.volumeInc / 0.25) * 12.5;
    }

    if (popData.momentum.day5 === 'Up') {
        if (popData.momentum.day10 === 'Up') {
            if (popData.momentum.day20 === 'Up') {
                momentum = 100;
            } else {
                momentum = 80;
            }
        } else {
            if (popData.momentum.day20 === 'Up') {
                momentum = 60;
            } else {
                momentum = 60;
            }
        }
    } else {
        if (popData.momentum.day10 === 'Up') {
            if (popData.momentum.day20 === 'Up') {
                momentum = 20;
            } else {
                momentum = 40;
            }
        } else {
            if (popData.momentum.day20 === 'Up') {
                momentum = 20;
            } else {
                momentum = 0;
            }
        }
    }
    stockObj.count > 10 ? report = 100 : report = stockObj.count * 12.5;
    return (volume + momentum + report) / 3;
}

/**
 * Returns credibility score (max 100)
 * - expYield: 애널리스트 평균가와 현재 가격의 괴리율 (상승 여력이 높을수록 점수 ↑)
 * - consensusCount: 발행된 리포트의 개수 (많을수록 점수 ↑)
 * - TODO: 애널리스트 정확도: 높을수록 점수 ↑
 *
 * @param stockObj stock object
 */
function calCredScore(stockObj) {
    let expYield, count;
    if (stockObj.expYield <= 0) return 0;

    stockObj.expYield >= 50 ? expYield = 10 :
        expYield = Math.abs(stockObj.expYield) / 5;
    stockObj.countPrice > 10 ? count = 10 :
        count = stockObj.countPrice;

    return (expYield + count) * 5;
}

/**
 * Returns financial score (max 100)
 * - PEG (Price Earnings Growth): 1을 기준으로 낮으면 저평가, 높으면 고평가
 * - Growth Rate of Net Income: 순이익 증가율과 주가 상승률을 비교
 *
 * TODO: Value stock
 *   PER: 섹터 평균 보다 낮으면 점수 ↑
 *   PBR: 낮을수록 점수 ↑
 *   ROE: 높을수록 점수 ↑
 *   EV/EBITDA: 낮을수록 점수 ↑
 *   GP/A: 높을수록 점수 ↑
 *   Debt Growth Ratio: 0보다 낮으면 점수 ↑
 *     (ROE & EV/EBITDA 와 dependable 하게 계산할 예정)
 *
 * @param stockObj stock object
 */
function calFinScore(stockObj) {
    let pegScore, niScore;
    const financial = stockObj.financial;
    const niDif = financial.niGrowth1yr - financial.niGrowth2yr;
    if (isNaN(financial.peg)) return '-';

    if (financial.peg < 0.5) {
        pegScore = 100
    } else if (financial.peg > 1) {
        pegScore = 0
    } else {
        pegScore = Math.round(financial.peg * 100);
    }

    if (financial.niGrowth2yr > 100) {
        niScore = 100;
    } else if (financial.niGrowth2yr < 0) {
        niScore = 0;
    } else {
        niScore = Math.round(financial.niGrowth2yr);
    }

    if (niDif < 0) {
        niScore += niDif;
    }

    return (pegScore + niScore) / 2;
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
