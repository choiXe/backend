const axios = require('axios');

const {timeoutLimit} = require('../data/constants.js');
const {naverFinancialUrl} = require('../tools/urlGenerator.js');
const {numToKR, round2Deci} = require('../tools/formatter.js');

axios.defaults.timeout = timeoutLimit;

/**
 * Returns financial data of past 6 years
 * If there is no data, returns '' as date and 0 for other values
 * @param stockId 6 digit number code
 */
async function getFinancial(stockId) {
    let body, data = [], data2 = [];
    let cd1, cd2;

    try {
        body = (await axios.get(naverFinancialUrl(stockId))).data;
        for (let i = 0; i < body.chartData1.categories.length; i++) {
            cd1 = body.chartData1;
            cd2 = body.chartData2;
            data.push({
                date: cd1.categories[i],
                rv: Math.round(cd1.series[0].data[i] * 100000000),
                oProfit: Math.round(cd1.series[1].data[i] * 100000000),
                nProfit: Math.round(cd1.series[2].data[i] * 100000000),
                oMargin: round2Deci(cd1.series[3].data[i]),
                npMargin: round2Deci(cd1.series[4].data[i]),
                rGrowth: round2Deci(cd2.series[0].data[i]),
                opGrowth: round2Deci(cd2.series[1].data[i]),
                npGrowth: round2Deci(cd2.series[2].data[i])
            });
            data2.push({
                date: data[i].date,
                rvKR: numToKR(data[i].rv).replace('+', ''),
                oProfitKR: numToKR(data[i].oProfit).replace('+', ''),
                nProfitKR: numToKR(data[i].nProfit).replace('+', ''),
            })
        }
    } catch (e) {
    }
    return {
        data: data,
        formatKR: data2
    };
}

module.exports = {getFinancial};
