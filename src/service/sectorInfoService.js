const axios = require('axios');
const AWS = require('aws-sdk');
const Iconv = require('iconv-lite');

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
    let sList = [], yList = {}, pList = {}, tmpList = {};
    let avgYield = 0.0;
    let stockIds = '';

    const priceList = (await docClient.query(
        sectorInfoQuery(sector, date)).promise()).Items;

    priceList.forEach(item => {
        tmpList[item.stockId] = 1;
    });
    for (const [key] of Object.entries(tmpList)) {
        stockIds += key + ',';
    }

    try {
        body = (await axios.get(naverApiUrl(stockIds),
            {responseEncoding: 'binary', responseType: 'arraybuffer'}));
        body = JSON.parse(Iconv.decode(body.data, 'EUC-KR')).result.areas[0].datas;
    } catch (e) {
        return 'No Data';
    }

    for (const item of body) {
        pList[item.cd] = {
            stockName: item.nm,
            stockId: item.cd,
            tradePrice: item.nv,
            changeRate: item.sv >= item.nv ? item.cr : -item.cr,
            priceAvg: 0,
            pCount: 0,
            count: 0
        }
    }

    for (const item of priceList) {
        pList[item.stockId].sSector = item.sSector;
        pList[item.stockId].count++;
        if (item.priceGoal !== '0') {
            pList[item.stockId].priceAvg += parseInt(item.priceGoal);
            pList[item.stockId].pCount++;
        }
    }

    let i = 0;
    for (const item in pList) {
        if (pList[item].pCount !== 0) {
            sList.push(pList[item]);
            sList[i].priceAvg = Math.round(sList[i].priceAvg / sList[i].pCount);
            sList[i].expYield = round1Deci((sList[i].priceAvg /
                sList[i].tradePrice - 1) * 100);
            avgYield += sList[i].expYield;

            // 각 섹터당 해당하는 종목 추가
            if (!yList[sList[i].sSector]) {
                yList[sList[i].sSector] = [0, 0];
            }
            yList[sList[i].sSector][0] += sList[i].expYield;
            yList[sList[i].sSector][1]++;
            try {
                sList[i].score = (await docClient.query(
                    getScoreQuery(sList[i].stockId)).promise()).Items[0].score;
            } catch (e) {
                sList[i].score = '-';
            }

            delete sList[i++].pCount;
        }
    }

    for (const i in yList) {
        yList[i] = yList[i][0] / yList[i][1];
    }

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
    if (sectorObj.stockList === 'No Data') {
        return {
            stockList: [
                {
                    stockName: '데이터 없음',
                    stockId: '',
                    tradePrice: 0,
                    changeRate: 0,
                    priceAvg: 0,
                    sSector: '',
                    expYield: 0,
                    score: 0
                }
            ],
            avgYield: 0,
            top3List: {
                first: '',
                firstYield: 0,
                second: '',
                secondYield: 0,
                third: '',
                thirdYield: 0
            }
        }
    }
    sectorObj.avgYield = sectorObj.stockList.avgYield;
    sectorObj.top3List = sectorObj.stockList.top3List;
    delete sectorObj.stockList.avgYield;
    delete sectorObj.stockList.top3List;
    return sectorObj;
}

module.exports = {getSectorOverview};
