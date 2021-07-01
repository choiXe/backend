'use strict';

const {getStockOverview} = require('./service/stockInfoService.js');
const {getSectorOverview} = require('./service/sectorService.js');

exports.handler = (event, context, callback) => {
    const fnName = event.field;

    if (fnName === 'getStockInfo') {
        const { stockId, startDate } = event.arguments;
        getStockOverview(stockId, startDate)
            .then(overview => callback(null, overview));
    } else if (fnName === 'getSectorInfo') {
        const { sectorName, startDate } = event.arguments;
        getSectorOverview(sectorName, startDate)
            .then(overview => callback(null, overview));
    } else {
        callback('no matching function');
    }
};
