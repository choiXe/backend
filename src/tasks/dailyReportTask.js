const reqPromise = require('request-promise');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const ddb = new AWS.DynamoDB();

let reportObj, params;
let totalNum = 0;
const url = 'http://consensus.hankyung.com/apps.analysis/analysis.list?skinType=business&pagenum=100';

/**
 * Parses the HTML for each published report of today
 */
async function updateReportData() {
    let body;
    let today = new Date().toISOString().slice(0, 10);

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

                    totalNum++;
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
                            reportIdx: { S: reportObj['reportIdx'] }
                        }
                    }
                    ddb.putItem(params, function (err) {
                        if (err) {
                            console.log("[dailyReportTask]: Error ", err);
                        }
                    })
                }
            }
        }
    })
    console.log('[dailyReportTask]: ' + today + ' ' + totalNum + " reports updated");
}

updateReportData().then();
