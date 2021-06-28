const axios = require('axios');
const cheerio = require('cheerio');
const parser = require('xml2js').parseString;
const AWS = require('aws-sdk');
const {numToKorean} = require('num-to-korean');

const getScore = require('./scoreService.js');
const {region, timeoutLimit, month} = require('../data/constants.js');
const {daumParams, newsUrl, pastDataUrl, investorUrl} =
    require('../tools/urlGenerator.js');

AWS.config.update(region);
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = timeoutLimit;

/**
 * Returns stock data of past 3 months
 * @param stockId 6 digit number of stock
 */
async function getPastData(stockId) {
    let body, tmp;
    let prices = [];

    try {
        body = await axios.get(pastDataUrl(stockId, 65));
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
 * Returns basic information of the stock
 * @param stockId 6 digit number of stock
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
            tradePrice: stockData.tradePrice,
            changeRate: round2Deci(stockData.changeRate * 100),
            marketCap: numToKR(stockData.marketCap).replace('+', ''),
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
 * @param stockName name of the stock
 */
async function getNews(stockName) {
    let body, a;
    let newsList = [];

    try {
        body = await axios.get(newsUrl(stockName));
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
 * Returns investor statistics of past 20 trading days (개인, 외국인, 기관)
 * @param stockISU isu code of stock
 */
async function getInvestor(stockISU) {
    let body, investInfo = [];
    const date = new Date().toISOString().slice(0, 10);

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
                date: date,
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
 * Converts number to KR unit
 * @param number a number
 */
function numToKR(number) {
    number = number.toString();
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
 * @param number a number
 */
function round2Deci(number) {
    return Math.round(number * 100) / 100;
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
 * @param stockId 6 digit number of stock
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockOverview(stockId, date) {
    let stockObj = {};
    let newsTitles = '';
    const reg = /[{}\/?.,;:|)*–~`‘’“”…!^\-_+<>@#$%&\\=('"]/gi;

    const basicInfo = await getBasicInfo(stockId);
    if (!basicInfo) return '존재하지 않는 종목입니다';
    stockObj.reportList = await getReports(stockId, date);
    const avgPrice = await getAverage(stockObj.reportList);

    for (let [key, value] of Object.entries(basicInfo)) {
        stockObj[key] = value;
    }

    if (isNaN(avgPrice[0])) {
        stockObj.priceAvg = '의견 없음';
        stockObj.expYield = 0;
    } else {
        stockObj.priceAvg = Math.round(avgPrice[0]);
        stockObj.expYield = round2Deci((stockObj.priceAvg /
            stockObj.tradePrice - 1) * 100);
    }

    stockObj.recommend = getScore(stockObj.expYield, avgPrice[1]);
    stockObj.pastData = await getPastData(stockId);
    stockObj.invStatistics = await getInvestor(basicInfo.code);
    stockObj.news = await getNews(basicInfo.name);
    stockObj.news.forEach(item => {
        newsTitles += item.title.replace(reg, "") + ' ';
    })
    stockObj.newsTitles = newsTitles;

    return stockObj;
}

module.exports = {getStockOverview};
