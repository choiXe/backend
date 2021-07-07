const {getPastDate} = require('../tools/formatter.js');

/**
 * Query for stockInfoService.js
 * @param stockId stockId
 */
function stockInfoQuery(stockId) {
    return {
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
            ':date': getPastDate(365)
        },
        ScanIndexForward: false
    };
}

/**
 * Query for sectorInfoService.js
 * @param sector sector
 * @param date start date
 */
function sectorInfoQuery(sector, date) {
    return {
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
}

/**
 * Query for scoreTask.js
 * @param sector sector
 */
function scoreQuery(sector) {
    return {
        TableName: 'reportListComplete',
        IndexName: 'lSector-date-index',
        ProjectionExpression: '#dt, stockId, priceGoal',
        KeyConditionExpression: '#sector = :sector and #dt >= :date',
        ExpressionAttributeNames: {
            '#sector': 'lSector',
            '#dt': 'date'
        },
        ExpressionAttributeValues: {
            ':sector': sector,
            ':date': getPastDate(91)
        },
        ScanIndexForward: false
    };
}

module.exports = {stockInfoQuery, sectorInfoQuery, scoreQuery};