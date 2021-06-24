const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const docClient = new AWS.DynamoDB.DocumentClient();

let sectorObj;
let percentList = [];

/**
 * Returns average percentage yield
 * @param reportList list of stock reports
 */
async function getAverage(reportList) {

}

/**
 * Returns list of priceGoals of stocks included in the sector
 * attr: date is used to calculate stock's average priceGoal in specific period
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockList(sector, date) {
    let sortedList = {};
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

    priceList.forEach(item => {
        if (item.priceGoal !== '0') {
            if (!sortedList[item.stockName]) {
                sortedList[item.stockName] = [];
            }
            sortedList[item.stockName].push(item.priceGoal);
        }
    })
    return sortedList;
}

/**
 * Returns all information needed in sector page
 * @param sector name of the sector
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getSectorOverview(sector, date) {
    const priceGoalList = await getStockList(sector, date);
    return priceGoalList;
}

async function test() {
    const a = await getSectorOverview('IT', '2021-05-01').then();
    console.log(a);
}

test();
