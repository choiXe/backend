'use strict';

const {getStockOverview} = require('./service/stockInfoService.js');
const {getSectorOverview} = require('./service/sectorInfoService.js');
const {getMainOverview} = require('./service/mainInfoService.js');
const {getPriceRate} = require('./service/favoriteService.js');
const {getFinancial} = require('./service/financialService.js');

exports.handler = (event, context, callback) => {
    const fnName = event.field;

    if (fnName === 'getStockInfo') {
        const {stockId, startDate} = event.arguments;
        getStockOverview(stockId, startDate)
            .then(overview => callback(null, overview));
    } else if (fnName === 'getSectorInfo') {
        const {sectorName, startDate} = event.arguments;
        getSectorOverview(sectorName, startDate)
            .then(overview => callback(null, overview));
    } else if (fnName === 'getMainInfo') {
        getMainOverview()
            .then(overview => callback(null, overview));
    } else if (fnName === 'getFavoriteInfo') {
        const {stockIds} = event.arguments;
        getPriceRate(stockIds)
            .then(overview => callback(null, overview));
    } else if (fnName === 'getFinancialInfo') {
        const {stockId} = event.arguments;
        getFinancial(stockId)
            .then(overview => callback(null, overview));
    } else {
        callback('no matching function');
    }
};
