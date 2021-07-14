'use strict';

const {getStockOverview} = require('./service/stockInfoService.js');
const {getSectorOverview} = require('./service/sectorInfoService.js');

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
    } else {
        callback('no matching function');
    }
};

async function test(func, type, startDate) {
    let overview;

    switch (func) {
        case 'stock':
            overview = await getStockOverview(type, startDate);
            break;
        case 'sector':
            overview = await getSectorOverview(type, startDate);
            break;
        default:
            overview = 'no matching function';
    }
    console.log(overview);
}

test('sector', '산업재', '2021-06-15');
// test('stock', '034220', '2021-06-01');