function generateUrl(baseUrl, params) {
    let url = baseUrl + '?';

    for (const property in params) {
        url += `${property}=${params[property]}&`
    }

    url = url.substring(0, url.length - 1);
    return url;
}

// stockInfoService

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

function pastDataUrl(stockId, count) {
    return 'https://fchart.stock.naver.com/sise.nhn?timeframe=day&requestType=0&symbol=' +
        stockId + '&count=' + count;

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

// sectorService

function naverApiUrl(stockId) {
    return 'https://api.finance.naver.com/service/itemSummary.naver?itemcode=' + stockId;
}

module.exports = {daumParams, newsUrl, pastDataUrl, investorUrl, naverApiUrl};
