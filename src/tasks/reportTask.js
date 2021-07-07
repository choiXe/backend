const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');
const AWS = require('aws-sdk');

const {wicsDict} = require('../data/wicsDictionary.js');

AWS.config.update({region: 'ap-northeast-2'});
const ddb = new AWS.DynamoDB();

let reportObj, params;
const url = 'http://consensus.hankyung.com/apps.analysis/analysis.list?skinType=business&pagenum=200';

/**
 * Obtains stock's WICS sector
 * @param stockId 6 digit number of stock
 * @return sectors WICS Sectors
 */
async function getSectorInfo(stockId) {
    let sBody;
    const sUrl = 'https://finance.daum.net/api/quotes/A'
        + stockId + '?summary=false&changeStatistics=true';

    try {
        sBody = await axios.get(sUrl, {
            headers: {
                referer: 'https://finance.daum.net/quotes/A' + stockId,
                'user-agent': 'Mozilla/5.0'
            },
        })
    } catch (e) {
        console.log('[reportTask.js]: Error in getSectorInfo');
    }

    const sSector = sBody.data.wicsSectorName.replace(/ /g, '');
    if (sSector == null) {
        return {
            lSector: 'X',
            mSector: 'X',
            sSector: 'X'
        }
    } else {
        const lmSector = wicsDict[sSector];
        return {
            lSector: lmSector[1],
            mSector: lmSector[0],
            sSector: sSector
        }
    }
}

/**
 * Parses the HTML for each published report of today
 */
async function updateReportData() {
    let body;

    try {
        body = await axios.get(url, {responseType: 'arraybuffer'});
    } catch (err) {
        console.log('[dailyReportTask]: Could not connect to Hankyung Consensus');
        return;
    }

    const $ = cheerio.load(Iconv.decode(body.data, 'EUC-KR'));
    let p = Promise.resolve();
    $('.table_style01 tbody tr').map(function () {
        const elem = $(this);
        p = p.then(async function() {
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
                        reportObj['priceGoal'] = elem.find('td.text_r.txt_number').text().replace(/,/g, '');
                        reportObj['analyst'] = elem.find('td:nth-child(5)').text();
                        reportObj['firm'] = elem.find('td:nth-child(6)').text();
                        reportObj['reportIdx'] = elem.find('td.text_l > div > div').attr('id').substr(8, 6);

                        const sectorInfo = await getSectorInfo(reportObj['stockId']);

                        if (!(sectorInfo['lSector'] === 'X')) {
                            params = {
                                TableName: 'reportListComplete',
                                Item: {
                                    date: {S: reportObj['date']},
                                    stockName: {S: reportObj['stockName']},
                                    stockId: {S: reportObj['stockId']},
                                    reportName: {S: reportObj['reportName']},
                                    priceGoal: {S: reportObj['priceGoal']},
                                    analyst: {S: reportObj['analyst']},
                                    firm: {S: reportObj['firm']},
                                    reportIdx: {S: reportObj['reportIdx']},
                                    lSector: {S: sectorInfo['lSector']},
                                    mSector: {S: sectorInfo['mSector']},
                                    sSector: {S: sectorInfo['sSector']}
                                }
                            }
                            ddb.putItem(params, function (err) {
                                if (err) {
                                    console.log('[dailyReportTask]: Error ', err);
                                }
                            })
                        }
                    }
                }
            }
        })
    })
    p.then(function() {
        console.log('[dailyReportTask]: update complete');
    })
}

module.exports = {updateReportData};
