function generateUrl(baseUrl, params) {
    let url = baseUrl + '?';
    for (let i=0; i<params.length; i++) {
        url += `${i}=${params[i]}&`
    }
    return url;
}

function daumParams(stockId) {
    const url = 'https://finance.daum.net/api/quotes/A'
        + stockId + '?summary=false&changeStatistics=true';
    const header = {
        referer: 'https://finance.daum.net/quotes/A' + stockId,
        'user-agent': 'Mozilla/5.0'
    };
    return [url, header];
}

function newsUrl(stockName) {
    return 'https://openapi.naver.com/v1/search/news.json?query=' +
        encodeURI(stockName) + '&display=100&sort=sim';
}

/**
 * @param stockId 6 digit number code of stock
 * @param count number of data
 * @param option day, week, month
 */
function pastDataUrl(stockId, count, option) {
    return 'https://fchart.stock.naver.com/sise.nhn?requestType=0&symbol=' +
        stockId + '&count=' + count + '&timeframe=' + option;
}

function investorUrl(stockISU) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    const url = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';

    let params = {
        bld: 'dbms/MDC/STAT/standard/MDCSTAT02302',
        isuCd: stockISU,
        strtDd: startDate.toISOString().slice(0, 10).replace(/-/g,''),
        endDd: endDate.toISOString().slice(0, 10).replace(/-/g,''),
        askBid: 3,
        trdVolVal: 2
    }
    return generateUrl(url, params);
}

function naverApiUrl(stockId) {
    return 'https://api.finance.naver.com/service/itemSummary.naver?itemcode=' + stockId;
}

function naverApiUrl2(stockIds) {
    return 'https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:' + stockIds;
}

function wiseReportUrl(stockId) {
    return 'https://comp.wisereport.co.kr/company/cF1002.aspx?finGubun=MAIN&frq=0&cmp_cd=' + stockId;
}

module.exports = {daumParams, newsUrl, pastDataUrl, investorUrl,
    naverApiUrl, naverApiUrl2, wiseReportUrl};
