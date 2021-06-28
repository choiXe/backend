const axios = require('axios');
const AWS = require('aws-sdk');
const getScore = require('./scoreService.js');

AWS.config.update({region: 'ap-northeast-2'});
const docClient = new AWS.DynamoDB.DocumentClient();
const {naverApiUrl} = require('../tools/urlGenerator.js');

let sectorObj;

/**
 * Returns list of priceGoals of stocks included in the sector
 * attr: date is used to calculate stock's average priceGoal in specific period
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockList(sector, date) {
    let body;
    let sList = {}, yList = {};
    let avgYield = 0.0;
    const query = {
        TableName: 'reportListComplete',
        IndexName: 'lSector-date-index',
        ProjectionExpression: '#dt, stockName, stockId, priceGoal, sSector',
        KeyConditionExpression: '#sector = :sector and #dt >= :date',
        ExpressionAttributeNames: {
            '#sector': 'lSector',
            '#dt': 'date'
        },
        ExpressionAttributeValues: {
            ':sector': sector,
            ':date': date
        },
        ScanIndexForward: false
    };

    const priceList = (await docClient.query(query).promise()).Items;
    for (const item of priceList) {
        if (item.priceGoal !== '0') {
            if (!sList[item.stockName]) {
                try {
                    body = await axios.get(naverApiUrl(item.stockId));
                } catch (e) { console.log('[sectorService]: Error in getStockList'); }

                sList[item.stockName] = {
                    stockId: item.stockId,
                    sSector: item.sSector,
                    tradePrice: body.data.now,
                    changeRate: body.data.rate,
                    price: []
                };
            }
            sList[item.stockName].price.push(parseInt(item.priceGoal));
        }
    }

    for (const i in sList) {
        sList[i]['priceAvg'] = Math.round(sList[i].price
            .reduce((a, b) => a + b, 0) / sList[i].price.length);
        sList[i]['expYield'] = Math.round((sList[i]['priceAvg'] /
            sList[i]['tradePrice'] - 1) * 1000) / 10;
        avgYield += sList[i]['expYield'];
        sList[i]['cCount'] = sList[i]['price'].length;

        // 각 섹터당 해당하는 종목 추가
        if (!yList[sList[i].sSector]) {
            yList[sList[i].sSector] = [];
        }
        yList[sList[i].sSector].push(sList[i]['expYield']);
        sList[i]['score'] = getScore(sList[i]['expYield'], sList[i]['cCount']);
        delete sList[i]['price'];
    }

    // 섹터별로 expYield 구하기
    for (const i in yList) {
        yList[i] = yList[i].reduce((a, b) => a + b, 0) / yList[i].length;
    }

    // expYield 가 제일 높은 하위 3개 섹터 분류 구하기
    const topList = Object.keys(yList)
        .sort((a, b) => yList[b] - yList[a]).slice(0, 3);
    sList['top3List'] = {
        [topList[0]]: yList[topList[0]],
        [topList[1]]: yList[topList[1]],
        [topList[2]]: yList[topList[2]]
    }

    sList['avgYield'] = avgYield / Object.keys(sList).length;
    return sList;
}

/**
 * Returns all information needed in sector page
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getSectorOverview(sector, date) {
    sectorObj = {};
    sectorObj['stockList'] = await getStockList(sector, date);
    sectorObj['avgYield'] = sectorObj['stockList']['avgYield'];
    sectorObj['top3List'] = sectorObj['stockList']['top3List'];
    delete sectorObj['stockList']['avgYield'];
    delete sectorObj['stockList']['top3List'];
    return sectorObj;
}

async function test() {
    const a = await getSectorOverview('IT', '2021-06-01').then();
    console.log(a);
}

test();
