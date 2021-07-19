const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');

const {timeoutLimit} = require('../data/constants.js');
const {round2Deci} = require('../tools/formatter.js');
const {
    indicatorUrlKR, indicatorUrlGlobal, hankyungUrl
} = require('../tools/urlGenerator.js');

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
    let body, gIndicators = [];
    let price, changePrice;
    const name = {
        '000001.SS': '상해 종합',
        '^N225': '니케이 225',
        '^DJI': '다우 산업',
        '^GSPC': 'S&P 500',
        '^IXIC': '나스닥 종합',
        '^FTSE': 'FTSE 100',
        '^GDAXI': 'DAX',
        '^HSI': 'HSI'
    };

    try {
        body = (await axios.get(indicatorUrlGlobal())).data.spark.result;
        body.forEach(item => {
            price = item.response[0].meta.regularMarketPrice;
            changePrice = item.response[0].meta.previousClose;
            gIndicators.push({
                name: name[item.symbol],
                tradePrice: round2Deci(price),
                changePrice:
                    round2Deci(price - changePrice),
                changeRate:
                    round2Deci(100 * (price - changePrice) / price)
            });
        });
    } catch (e) {
        console.log('[mainInfoService]: Error in getGlobalIndicator');
    }
    return gIndicators;
}

/**
 * Returns 10 reports that are published recently
 */
async function getRecentReports() {
    let body, reportList = [], reportObj;

    try {
        body = await axios.get(hankyungUrl(10), {responseType: 'arraybuffer'});
        const $ = cheerio.load(Iconv.decode(body.data, 'EUC-KR'));

        $('.table_style01 tbody tr').each(function () {
            const elem = $(this);

            if (elem.find('td:nth-child(7) > div > a').attr('href') != null) {
                let original = elem.find('strong').text();
                if (original.indexOf('(') === -1 || original.indexOf(')') === -1) {
                    console.log("Parsing unavailable > " + original);
                } else {
                    reportObj = {};
                    reportObj['date'] = elem.find('td.first.txt_number').text();
                    reportObj['stockName'] = original.split('(')[0];
                    reportObj['stockId'] = original.split('(')[1].split(')')[0];

                    if (reportObj['stockId'].length === 6
                        && !isNaN(reportObj['stockId'])
                        && reportObj['stockName'].length <= 20) {

                        reportObj['reportName'] = original.split(')')[1];
                        reportObj['priceGoal'] =
                            elem.find('td.text_r.txt_number').text().replace(/,/g, '');
                        reportObj['analyst'] =
                            elem.find('td:nth-child(5)').text();
                        reportObj['firm'] =
                            elem.find('td:nth-child(6)').text();
                        reportObj['reportIdx'] =
                            elem.find('td.text_l > div > div').attr('id').substr(8, 6);

                        reportList.push(reportObj);
                    }
                }
            }
        });
    } catch (err) {
        console.log('[mainInfoService]: Error in getRecentReports');
    }
    return reportList;
}

/**
 * Returns all information needed in main page
 */
async function getMainOverview() {
    let promises;
    promises = [getKRIndicator(), getGlobalIndicator(), getRecentReports()];
    try {
        promises = await Promise.all(promises);
    } catch (e) {
    }

    return {
        kr: promises[0],
        global: promises[1],
        reports: promises[2]
    }
}

module.exports = {getMainOverview};
