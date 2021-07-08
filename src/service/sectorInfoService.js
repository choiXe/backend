const axios = require('axios');
const AWS = require('aws-sdk');

const {region, timeoutLimit} = require('../data/constants.js');
const {sectorInfoQuery, getScoreQuery} = require('../data/queries.js');
const {naverApiUrl} = require('../tools/urlGenerator.js');
const {round1Deci} = require('../tools/formatter.js');

AWS.config.update(region);
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = timeoutLimit;

/**
 * Returns list of priceGoals of stocks included in the sector
 * attr: date is used to calculate stock's average priceGoal in specific period
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockList(sector, date) {
    let body;
    let sList = [], yList = {}, pList = {};
    let avgYield = 0.0;

    const priceList = (await docClient.query(
        sectorInfoQuery(sector, date)).promise()).Items;

    for (const item of priceList) {
        if (item.priceGoal !== '0') {
            if (!pList[item.stockName]) {
                try {
                    body = await axios.get(naverApiUrl(item.stockId));
                } catch (e) { console.log('[sectorService]: Error in getStockList'); }

                pList[item.stockName] = {
                    stockName: item.stockName,
                    stockId: item.stockId,
                    sSector: item.sSector,
                    tradePrice: body.data.now,
                    changeRate: body.data.rate,
                    priceAvg: 0,
                    count: 0
                };
            }
            pList[item.stockName].priceAvg += parseInt(item.priceGoal);
            pList[item.stockName].count++;
        }
    }

    let i = 0;
    for (const item in pList) {
        sList.push(pList[item]);
        sList[i].priceAvg = Math.round(sList[i].priceAvg / sList[i].count);
        sList[i].expYield = round1Deci((sList[i].priceAvg /
            sList[i].tradePrice - 1) * 100);
        avgYield += sList[i].expYield;

        // 각 섹터당 해당하는 종목 추가
        if (!yList[sList[i].sSector]) {
            yList[sList[i].sSector] = [0, 0];
        }
        yList[sList[i].sSector][0] += sList[i].expYield;
        yList[sList[i].sSector][1]++;
        sList[i].score = (await docClient.query(
            getScoreQuery(sList[i].stockId)).promise()).Items[0].score;

        delete sList[i++].count
    }

    // Calculate expYield of each sector
    for (const i in yList) {
        yList[i] = yList[i][0] / yList[i][1];
    }

    // Get top 3 sectors with highest expYield
    const topList = Object.keys(yList)
        .sort((a, b) => yList[b] - yList[a]).slice(0, 3);
    sList.top3List = {
        first: topList[0],
        firstYield: round1Deci(yList[topList[0]]),
        second: topList[1],
        secondYield: round1Deci(yList[topList[1]]),
        third: topList[2],
        thirdYield: round1Deci(yList[topList[2]]),
    }

    sList.avgYield = round1Deci(avgYield / Object.keys(sList).length);
    return sList;
}

/**
 * Returns all information needed in sector page
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getSectorOverview(sector, date) {
    let sectorObj = {};
    sectorObj.stockList = await getStockList(sector, date);
    sectorObj.avgYield = sectorObj.stockList.avgYield;
    sectorObj.top3List = sectorObj.stockList.top3List;
    delete sectorObj.stockList.avgYield;
    delete sectorObj.stockList.top3List;
    return sectorObj;
}

module.exports = {getSectorOverview};
