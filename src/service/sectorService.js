const axios = require('axios');
const cheerio = require('cheerio');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const docClient = new AWS.DynamoDB.DocumentClient();

let sectorObj, url;

/**
 * Returns list of priceGoals of stocks included in the sector
 * attr: date is used to calculate stock's average priceGoal in specific period
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockList(sector, date) {
    let body, sList = {};
    const query = {
        TableName: 'reportListComplete',
        IndexName: 'lSector-date-index',
        ProjectionExpression: '#dt, stockName, stockId, priceGoal',
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
                url = 'https://api.finance.naver.com/service/itemSummary.naver?itemcode=' + item.stockId;
                try {
                    body = await axios.get(url);
                } catch (e) { console.log('[sectorService]: Error in getStockList'); }

                sList[item.stockName] = {
                    stockId: item.stockId,
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
        sList[i]['expYield'] = (sList[i]['priceAvg'] / sList[i]['tradePrice'] - 1) * 100;
        sList[i]['expYield'] > 0 ? sList[i]['recommend'] = 'O' : sList[i]['recommend'] = 'X';
        delete sList[i]['price'];
    }

    return sList;
}

/**
 * Returns all information needed in sector page
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getSectorOverview(sector, date) {
    let avgYield = 0.0, avgChange = 0.0;
    sectorObj = {};
    sectorObj['stockList'] = await getStockList(sector, date);
    const listSize = Object.keys(sectorObj['stockList']).length;

    for (let i in sectorObj['stockList']) {
        avgYield += sectorObj['stockList'][i]['expYield'];
        avgChange += sectorObj['stockList'][i]['changeRate'];
    }

    sectorObj['avgChange'] = avgChange / listSize;
    sectorObj['avgYield'] = avgYield / listSize;

    return sectorObj;
}

async function test() {
    const a = await getSectorOverview('IT', '2021-06-01').then();
    console.log(a);
}

test();
