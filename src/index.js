'use strict';

const { getStockOverview } = require('./service/stockInfoService.js');
const { getSectorOverview } = require('./service/sectorInfoService.js');
const { getMainOverview } = require('./service/mainInfoService.js');
const { getPriceRate } = require('./service/favoriteService.js');
const { getFinancial } = require('./service/financialService.js');

exports.handler = async (event, context, callback) => {
    let overview;

    switch (event.field) {
        case 'getMainInfo':
            overview = await getMainOverview();
            break;
        case 'getStockInfo':
            overview = await getStockOverview(
                event.arguments.stockId,
                event.arguments.startDate
            );
            break;
        case 'getSectorInfo':
            overview = await getSectorOverview(
                event.arguments.sectorName,
                event.arguments.startDate
            );
            break;
        case 'getFinancialInfo':
            overview = await getFinancial(event.arguments.stockId);
            break;
        case 'getFavoriteInfo':
            overview = await getPriceRate(event.arguments.stockIds);
    }
    callback(null, overview);
};
