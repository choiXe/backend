const axios = require('axios');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');

const {region, timeoutLimit, month} = require('../data/constants.js');
const {stockInfoQuery, getScoreQuery} = require('../data/queries.js');
const {X_NAVER_CLIENT_ID, X_NAVER_CLIENT_SECRET} = require('../data/apiKeys.js');
const {strToNum, round1Deci, round2Deci, numSeparator} = require('../tools/formatter.js');
const {
    newsUrl, pastDataUrl, investorUrl,
    naverWiseUrl, naverIntegrationUrl, naverBasicUrl
} = require('../tools/urlGenerator.js');

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
    } catch (error) {
        console.log('[stockInfoService]: Error in getPastPrice')
    }
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
        });
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
    });

    return [allReport, dateReport];
}

/**
 * Returns basic information of the stock
 * @param stockId 6 digit number code of stock
 */
async function getBasicInfo(stockId) {
    let body, body2, data = {};
    let summary = '';

    try {
        body = (await axios.get(naverIntegrationUrl(stockId))).data;
        body2 = (await axios.get(naverBasicUrl(stockId))).data;
        const $ = cheerio.load((await axios.get(naverWiseUrl(stockId))).data);

        body.totalInfos.forEach(item => {
            data[item.code] = item;
        })

        $('ul .dot_cmp').each(function () {
            summary += $(this).text() + ' ';
        });

        return {
            name: body.stockName,
            companySummary: summary,
            wicsSectorName: $('.td0101 dt:nth-child(4)').text().substr(7),
            lastClosePrice: data.lastClosePrice.value,
            openingPrice: data.openPrice.value,
            highPrice: data.highPrice.value,
            lowPrice: data.lowPrice.value,
            tradePrice: numSeparator(strToNum(data.lastClosePrice.value) +
                strToNum(body2.compareToPreviousClosePrice)),
            changePrice: body2.compareToPreviousClosePrice,
            changeRate: body2.fluctuationsRatio,
            marketCap: data.marketValue.value,
            high52wPrice: data.highPriceOf52Weeks.value,
            low52wPrice: data.lowPriceOf52Weeks.value,
            foreignRatio: data.foreignRate.value,
            per: data.per.value,
            pbr: data.pbr.value,
            roe: round2Deci(100 * strToNum(data.eps.value) /
                strToNum(data.bps.value)) + '%'
        }
    } catch (e) {
        console.log('[stockInfoService]: Error from getBasicInfo');
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
    } catch (e) {
        console.log('[stockInfoService]: Error from getNews');
    }

    return newsList;
}

/**
 * Returns investor statistics of past month (개인, 외국인, 기관)
 * @param stockId 6 digit code of stock
 */
async function getInvestor(stockId) {
    let body, date, investInfo = [];

    try {
        body = await axios.get(investorUrl(stockId));
        body.data.forEach(item => {
            date = item.bizdate;
            investInfo.push({
                date: date.substr(0, 4) + '-' +
                    date.substr(4, 2) + '-' + date.substr(6, 2),
                value: {
                    individual: item.individualPureBuyQuant,
                    foreign: item.foreignerPureBuyQuant,
                    institutions: item.organPureBuyQuant
                }
            })
        })
    } catch (error) {
        console.log('[stockInfoService]: Error in getInvestor');
    }
    return investInfo;
}

/**
 * Returns average priceGoal
 * @param reportList list of reports
 */
async function getAverage(reportList) {
    let sum = 0, count = 0, tmp;
    if (reportList.length !== 0) {
        reportList.forEach(item => {
            tmp = parseInt(item.priceGoal);
            if (tmp !== 0) {
                sum += tmp;
                count++;
            }
        })
        return [sum / count, count];
    }
    return ['NaN', 'NaN'];
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

    promises = [getBasicInfo(stockId), getReports(stockId, date),
        getPastData(stockId), getInvestor(stockId)];

    try {
        promises = await Promise.all(promises);
    } catch (e) {
        console.log('[stockInfoService]: Error in getStockOverview(1)');
    }

    const basicInfo = promises[0];
    if (!basicInfo) return 'Does not exist';

    for (let [key, value] of Object.entries(basicInfo)) {
        stockObj[key] = value;
    }
    const avgPrice = await getAverage(promises[1][1]);

    if (avgPrice[0] === 'NaN') {
        stockObj.priceAvg = '의견 없음';
        stockObj.expYield = '0';
    } else {
        stockObj.priceAvg = numSeparator(Math.round(avgPrice[0]));
        stockObj.expYield = Math.round((strToNum(stockObj.priceAvg) /
            strToNum(stockObj.tradePrice) - 1) * 100) + '';
    }
    try {
        stockObj.score = (await docClient.query(
            getScoreQuery(stockId)).promise()).Items[0].score.toString();
    } catch (e) {
        stockObj.score = '-';
    }

    stockObj.reportList = promises[1][0];
    stockObj.pastData = promises[2];
    stockObj.invStatistics = promises[3];
    stockObj.news = await getNews(basicInfo.name);
    stockObj.newsTitles = '';
    stockObj.news.forEach(item => {
        stockObj.newsTitles += item.title.replace(stockObj.name, '')
            .replace(/ *\[[^)]*] */g, "").replace(reg, ' ') + ' ';
    })
    stockObj.newsTitles = stockObj.newsTitles.replace(/  +/g, ' ');

    return stockObj;
}

module.exports = {getStockOverview};
