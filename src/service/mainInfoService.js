const axios = require('axios');

const {timeoutLimit} = require('../data/constants.js');
const {indicatorUrlKR, indicatorUrlGlobal} = require('../tools/urlGenerator.js');
const {round2Deci} = require('../tools/formatter.js');

axios.defaults.timeout = timeoutLimit;

/**
 * Returns korea market indicators
 */
async function getKRIndicator() {
    let body, kIndicators = [];
    const name = {
        'KOSPI': '코스피',
        'KOSDAQ': '코스닥',
        'KPI200': '코스피 200'
    };

    try {
        body = (await axios.get(indicatorUrlKR())).data.result.areas[0].datas;
        body.forEach(item => {
            kIndicators.push({
                name: name[item.cd],
                symbolCode: item.cd,
                countryName: '한국',
                tradePrice: item.nv / 100,
                changePrice: item.cv / 100,
                changeRate: item.cr
            });
        });
    } catch (e) {
        console.log('[mainInfoService]: Error in getKRIndicator');
    }
    return kIndicators;
}

/**
 * Returns global market indicators
 */
async function getGlobalIndicator() {
    let body, tmp, gIndicators = [];
    const params = indicatorUrlGlobal();
    const target = [
        '다우 산업', '나스닥 종합', 'S&P 500', 'FTSE 100',
        '니케이 225', '상해 종합', 'DAX', 'H지수'
    ];

    try {
        body = await axios.get(params[0], {
            headers: params[1],
        });

        for (const [k, v] of Object.entries(body.data)) {
            v.data.forEach(item => {
                if (target.includes(item.name)) {
                    tmp = round2Deci((1 - item.tradePrice / item.basePrice) * 100);
                    gIndicators.push({
                        name: item.name,
                        symbolCode: item.symbolCode,
                        countryName: item.countryName,
                        tradePrice: item.tradePrice,
                        changePrice: item.change === 'RISE' ?
                            item.changePrice : -item.changePrice,
                        changeRate: item.change === 'RISE' ? tmp : -tmp
                    });
                }
            });
        }
    } catch (e) {
        console.log('[mainInfoService]: Error in getGlobalIndicator');
    }
    return gIndicators;
}

/**
 * Returns 5 reports that are published recently
 */
async function getRecentReports() {

}

/**
 * Returns all information needed in main page
 */
async function getMainOverview() {
    return {
        kr: getKRIndicator(),
        global: getGlobalIndicator(),
        reports: getRecentReports()
    }
}

module.exports = {getMainOverview};
