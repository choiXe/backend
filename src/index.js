'use strict';

const {getStockOverview} = require('./service/stockInfoService.js');
const {getSectorOverview} = require('./service/sectorService.js');

exports.handler = async (event, context, callback) => {
    const { type, startDate } = event.arguments;
    let overview;

    switch (event.field) {
        case 'getStockInfo':
            overview = await getStockOverview(type, startDate);
            break;
        case 'getSectorInfo':
            overview = await getSectorOverview(type, startDate);
            break;
        default:
            callback('no matching function');
    }
    callback(null, overview);
};

/*
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
*/

// test('sector', 'IT', '2021-06-01');
// test('stock', '011070', '2021-06-01');
