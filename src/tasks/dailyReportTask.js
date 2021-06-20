import reqPromise from 'request-promise';
import cheerio from 'cheerio';
import Iconv from 'iconv-lite';
import AWS from 'aws-sdk';

import {wicsDict} from '../data/wicsDictionary.js';

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
    let dBody;
    try {
        dBody = await reqPromise({
            url: 'https://finance.daum.net/api/quotes/A'
                + stockId + '?summary=false&changeStatistics=true',
            headers: {'referer': 'https://finance.daum.net/quotes/A' + stockId}
        });
    } catch (err) {
        console.log('[dailyReportTask]: Could not connect to Daum Finance');
        return {
            lSector: 'X',
            mSector: 'X',
            sSector: 'X'
        }
    }
    const sSector = JSON.parse(dBody).wicsSectorName;
    const lmSector = wicsDict[sSector];

    return {
        lSector: lmSector[1],
        mSector: lmSector[0],
        sSector: sSector
    }
}

/**
 * Parses the HTML for each published report of today
 */
async function updateReportData() {
    let body;

    try {
        body = await reqPromise({
            url: url,
            encoding: null
        })
    } catch (err) {
        console.log('[dailyReportTask]: Could not connect to Hankyung Consensus');
        return;
    }

    const $ = cheerio.load(Iconv.decode(body, 'EUC-KR'));

    $('.table_style01 tbody tr').map(function () {
        if ($(this).find('td:nth-child(7) > div > a').attr('href') != null) {
            let original = $(this).find('strong').text();
            if (original.indexOf('(') === -1 || original.indexOf(')') === -1) {
                console.log("Parsing unavailable > " + original);
            } else {
                reportObj = {};
                reportObj['date'] = $(this).find('td.first.txt_number').text();
                reportObj['stockName'] = original.split('(')[0];
                reportObj['stockId'] = original.split('(')[1].split(')')[0];

                if (reportObj['stockId'].length === 6
                    && !isNaN(reportObj['stockId'])
                    && reportObj['stockName'].length <= 20) {

                    reportObj['reportName'] = original.split(')')[1];
                    reportObj['priceGoal'] = $(this).find('td.text_r.txt_number').text().replace(/,/g, '');
                    reportObj['analyst'] = $(this).find('td:nth-child(5)').text();
                    reportObj['firm'] = $(this).find('td:nth-child(6)').text();
                    reportObj['reportIdx'] = $(this).find('td.text_l > div > div').attr('id').substr(8, 6);

                    const sectorInfo = getSectorInfo(reportObj['stockId']);
                    reportObj['lSector'] = sectorInfo['lSector'];
                    reportObj['mSector'] = sectorInfo['mSector'];
                    reportObj['sSector'] = sectorInfo['sSector'];

                    // 코스피 or 코스닥에 상장이 되어있지 않을 경우 DB에 저장 X
                    if (!reportObj['lSector'].equals('X')) {
                        params = {
                            TableName: 'reportList',
                            Item: {
                                date: { S: reportObj['date'] },
                                stockName: { S: reportObj['stockName'] },
                                stockId: { S: reportObj['stockId'] },
                                reportName: { S: reportObj['reportName'] },
                                priceGoal: { S: reportObj['priceGoal'] },
                                analyst: { S: reportObj['analyst'] },
                                firm: { S: reportObj['firm'] },
                                reportIdx: { S: reportObj['reportIdx'] },
                                lSector: { S: reportObj['lSector'] },
                                mSector: { S: reportObj['mSector'] },
                                sSector: { S: reportObj['sSector'] }
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
    console.log('[dailyReportTask]: update done');
}

updateReportData().then();
