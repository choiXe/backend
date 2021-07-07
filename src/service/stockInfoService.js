const axios = require('axios');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');

const {region, timeoutLimit, month} = require('../data/constants.js');
const {stockInfoQuery, getScoreQuery} = require('../data/queries.js');
const {X_NAVER_CLIENT_ID, X_NAVER_CLIENT_SECRET} = require('../data/apiKeys.js');
const {numToKR, round1Deci, getPastDate} = require('../tools/formatter.js');
const {daumParams, newsUrl, pastDataUrl, investorUrl} =
    require('../tools/urlGenerator.js');

AWS.config.update(region);
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = timeoutLimit;

/**
 * Returns stock data of past year
 * @param stockId 6 digit number code of stock
 */
async function getPastData(stockId) {
    let body, tmp;
    let prices = [];

    try {
        body = await axios.get(pastDataUrl(stockId, 250, 'day'));
    } catch (error) { console.log('[stockInfoService]: Error in getPastPrice') }
    const $ = cheerio.load(body.data, {xmlMode: true});

    $('item').each(function () {
        tmp = $(this).attr('data').split('|');
        prices.push({
            date: tmp[0].substr(0, 4) + '-' +
                tmp[0].substr(4, 2) + '-' + tmp[0].substr(6),
            start: parseInt(tmp[1]),
            high: parseInt(tmp[2]),
            low: parseInt(tmp[3]),
            end: parseInt(tmp[4]),
            volume: parseInt(tmp[5])
        })
    });
    return prices;
}

/**
 * Returns reports of company within 1 year and specific date range
 * @param stockId 6 digit number code of stock
 * @param date starting date of search
 */
async function getReports(stockId, date) {
    let allReport, dateReport = [];

    allReport = (await docClient.query(stockInfoQuery(stockId)).promise()).Items;
    allReport.forEach(report => {
        if (report.date >= date) {
            dateReport.push(report);
        }
    })

    return [allReport, dateReport];
}

/**
 * Returns basic information of the stock
 * @param stockId 6 digit number code of stock
 */
async function getBasicInfo(stockId) {
    let body;
    const params = daumParams(stockId);

    try {
        body = await axios.get(params[0], {
            headers: params[1],
        });
        const stockData = body.data;
        return {
            name: stockData.name,
            code: stockData.code,
            companySummary: stockData.companySummary.replace(/^\s+|\s+$/g, ''),
            wicsSectorName: stockData.wicsSectorName,
            openingPrice: stockData.openingPrice,
            highPrice: stockData.highPrice,
            lowPrice: stockData.lowPrice,
            tradePrice: stockData.tradePrice,
            changePrice: stockData.change === 'FALL' ?
                -stockData.changePrice : stockData.changePrice,
            changeRate: stockData.change === 'FALL' ?
                -round1Deci(stockData.changeRate * 100) : round1Deci(stockData.changeRate * 100),
            marketCap: numToKR(stockData.marketCap).replace('+', ''),
            high52wPrice: parseInt(stockData.high52wPrice),
            low52wPrice: parseInt(stockData.low52wPrice),
            foreignRatio: stockData.foreignRatio,
            per: stockData.per,
            pbr: stockData.pbr,
            roe: round1Deci((stockData.eps / stockData.bps) * 100.0)
        }
    } catch (e) {
        console.log('[stockInfoService]: Error in getBasicInfo');
        return false;
    }
}

/**
 * Return news related to stock
 * @param stockName name of the stock
 */
async function getNews(stockName) {
    let body, a;
    let newsList = [];

    try {
        body = (await axios.get(newsUrl(stockName), {
            headers: {
                'X-Naver-Client-Id': X_NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': X_NAVER_CLIENT_SECRET
            }
        })).data.items;
        body.forEach(item => {
            a = item.pubDate.split(' ');
            newsList.push({
                title: item.title.replace(/(&quot;|<([^>]+)>)/ig, ''),
                description: item.description.replace(/(&quot;|<([^>]+)>)/ig, ''),
                date: a[3] + '-' + month[a[2]] + '-' + a[1],
                link: item.link
            })
        })
    } catch (e) { console.log('[stockInfoService]: Error from getNews'); }

    return newsList;
}

/**
 * Returns investor statistics of past 20 trading days (개인, 외국인, 기관)
 * @param stockISU isu code of stock
 */
async function getInvestor(stockISU) {
    let body, investInfo = [];

    try {
        body = await axios.get(investorUrl(stockISU));
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
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return {
                date: getPastDate(0),
                individual: '',
                foreign: '점검중',
                institutions: ''
            }
        }
        console.log('[stockInfoService]: Could not connect to KRX');
    }

    return investInfo;
}

/**
 * Returns average priceGoal
 * @param reportList list of reports
 */
async function getAverage(reportList) {
    let sum = 0, count = 0, tmp;
    reportList.forEach(item => {
        tmp = parseInt(item.priceGoal);
        if (tmp !== 0) {
            sum += tmp;
            count++;
        }
    })
    return [sum / count, count];
}

/**
 * Returns stock element
 * @param stockId 6 digit number code of stock
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockOverview(stockId, date) {
    let stockObj = {};
    let promises;
    const reg = /[{}\/?.,;:|)*–~`‘’“”…!^\-_+<>@#$%&\\=('"]/gi;

    promises = [getBasicInfo(stockId), getReports(stockId, date)];
    try { promises = await Promise.all(promises); } catch (e) {}

    const basicInfo = promises[0];
    if (!basicInfo) return '존재하지 않는 종목입니다';
    stockObj.reportList = promises[1][0];
    const avgPrice = await getAverage(promises[1][1]);

    for (let [key, value] of Object.entries(basicInfo)) {
        stockObj[key] = value;
    }

    if (isNaN(avgPrice[0])) {
        stockObj.priceAvg = '의견 없음';
        stockObj.expYield = 0;
    } else {
        stockObj.priceAvg = Math.round(avgPrice[0]);
        stockObj.expYield = round1Deci((stockObj.priceAvg /
            stockObj.tradePrice - 1) * 100);
    }

    stockObj.score = (await docClient.query(
        getScoreQuery(stockId)).promise()).Items[0].score;
    promises = [getPastData(stockId), getInvestor(basicInfo.code), getNews(basicInfo.name)];

    try { promises = await Promise.all(promises); } catch (e) {}

    stockObj.pastData = promises[0];
    stockObj.invStatistics = promises[1];
    stockObj.news = promises[2];
    stockObj.newsTitles = '';
    stockObj.news.forEach(item => {
        stockObj.newsTitles += item.title.replace(reg, ' ') + ' ';
    })
    stockObj.newsTitles = stockObj.newsTitles.replace(/  +/g, ' ');

    return stockObj;
}

module.exports = {getStockOverview};
