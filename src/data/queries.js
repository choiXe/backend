const { getPastDate } = require('../tools/formatter.js');

/**
 * Query for stockInfoService.js
 * @param stockId stockId
 */
function stockInfoQuery(stockId) {
    return {
        TableName: 'reportListComplete',
        IndexName: 'stockId-date-index',
        ProjectionExpression:
            '#dt, reportName, analyst, priceGoal, firm, reportIdx',
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

/**
 * Query for scoreTask.js
 * @param stockId 6 digit number code of stock
 * @param score investment attractiveness score
 * @param date current date
 */
function scoreQuery2(stockId, score, date) {
    return {
        TableName: 'stockScore',
        Key: {
            stockId: stockId
        },
        UpdateExpression: 'set #score = :score, #dt = :date',
        ExpressionAttributeNames: {
            '#dt': 'date',
            '#score': 'score'
        },
        ExpressionAttributeValues: {
            ':score': score,
            ':date': date
        }
    };
}

/**
 * Query for retrieving score from database
 * @param stockId 6 digit number code of stock
 */
function getScoreQuery(stockId) {
    return {
        TableName: 'stockScore',
        ProjectionExpression: '#score',
        KeyConditionExpression: '#stockId = :stockId',
        ExpressionAttributeNames: {
            '#stockId': 'stockId',
            '#score': 'score'
        },
        ExpressionAttributeValues: {
            ':stockId': stockId
        }
    };
}

module.exports = {
    stockInfoQuery,
    sectorInfoQuery,
    scoreQuery,
    scoreQuery2,
    getScoreQuery
};
