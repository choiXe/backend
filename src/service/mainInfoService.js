const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');

const {timeoutLimit} = require('../data/constants.js');
const {round2Deci} = require('../tools/formatter.js');
const {indicatorUrlKR, indicatorUrlGlobal, hankyungUrl} =
    require('../tools/urlGenerator.js');

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
    return {
        kr: await getKRIndicator(),
        global: await getGlobalIndicator(),
        reports: await getRecentReports()
    }
}

module.exports = {getMainOverview};
