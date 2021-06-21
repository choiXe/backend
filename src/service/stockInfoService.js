const axios = require('axios');
const cheerio = require('cheerio');
const Iconv = require('iconv-lite');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const ddb = new AWS.DynamoDB();

let stockObj;

/**
 * 종목을 클릭했을 때 나오는 상세 항목에 들어가는 정보를 리턴
 *
 * 기대 수익률, 시가총액, 52주 최고/최저가, 외국인 소진률
 * ROE, PBR, PER, 현재가, 컨센서스 평균가
 * 최근 30일 주가
 */


/**
 * Returns array that contains stock prices of the past 30 days
 * @param stockId 6 digit number of stock
 */
async function getPastPrice(stockId) {
    let body;
    let prices = [];
    const url = 'https://fchart.stock.naver.com/sise.nhn?timeframe=day&requestType=0&symbol=';

    try {
        body = await axios.get(url + stockId + '&count=30', {
            responseType: 'arraybuffer'
        })
    } catch (error) {
        console.log('[stockInfoService]: Error occurred in getPastPrice')
    }
    const $ = cheerio.load(Iconv.decode(body, 'EUC-KR'), {xmlMode: true});

    $('item').each(function () {
        prices.push(parseInt($(this).attr('data').split('|')[1]));
    })
    return prices;
}

/**
 * Returns reports of company with attr: stockId
 * @param stockId 6 digit number of stock
 */
async function getReports(stockId) {

}

/**
 * Returns 기업정보, 현재가, 시가총액, 52주 최고/최저가, 외국인 소진률, PER, PBR, ROE
 * @param stockId 6 digit number of stock
 */
async function getBasicInfo(stockId) {
    let body;
    const url = 'https://finance.daum.net/api/quotes/A'
        + stockId + '?summary=false&changeStatistics=true';

    try {
        body = await axios.get(url, {
            headers: {
                referer: 'https://finance.daum.net/quotes/A' + stockId,
                'user-agent': 'Mozilla/5.0'
            },
        })
    } catch (e) {
        console.log('[stockInfoService]: Error in getBasicInfo');
    }

    const stockData = body.data;

    return {
        companySummary: stockData.companySummary,
        tradePrice: stockData.tradePrice,
        marketCap: stockData.marketCap,
        high52wPrice: stockData.high52wPrice,
        low52wPrice: stockData.low52wPrice,
        foreignRatio: stockData.foreignRatio,
        per: stockData.per,
        pbr: stockData.pbr,
        roe: (stockData.eps / stockData.bps) * 100.0
    }
}

/**
 * Returns stock element
 * 섹터 선택 시 그 섹터에 속한 종목 리스트에 들어갈 element 리턴
 * @param stockId 6 digit number of stock
 * @param date Lookup start date (YYYY-MM-DD)
 */
async function getStockOverview(stockId, date) {
    // let body, avgPrice;
    //
    // try {
    //     avgPrice = await connection.query(query);
    // } catch(error) {
    //     console.log('[stockService]: Error occurred while sending query to the database');
    //     return;
    // }
    // await connection.end();
    //
    // try {
    //     body = await request({
    //         url: url + stockId + '&count=1',
    //         encoding: null
    //     })
    // } catch (error) {
    //     console.log('[stockService]: Error occurred while requesting from url');
    //     return;
    // }
    // const $ = cheerio.load(Iconv.decode(body, 'EUC-KR'), {xmlMode: true});
    //
    // // 날짜 | 전일종가 | 고가 | 저가 | 현재가 | 거래량
    // const data = $('item').attr('data').split('|');
    //
    // stockObj = {};
    // stockObj['stockName'] = $('chartdata').attr('name');
    // stockObj['price'] = parseInt(data[4]);
    // stockObj['change'] = stockObj['price'] / data[1] - 1;
    //
    // if (!isNaN(avgPrice[0].avg)) {
    //     stockObj['priceAvg'] = '의견 없음';
    //     stockObj['expected'] = 0;
    // } else {
    //     stockObj['priceAvg'] = Math.round(avgPrice[0].avg);
    //     stockObj['expected'] = stockObj['priceAvg'] / stockObj['price'] - 1;
    // }
    // stockObj['pastPrices'] = await getPastPrice(stockId);
    // stockObj['expected'] > 0 ? stockObj['recommend'] = 'O' : stockObj['recommend'] = 'X';
    //
    // console.log(stockObj);
    // return stockObj;
}

async function test() {
    const a = await getBasicInfo('011070').then();
    console.log(a);
}

test();