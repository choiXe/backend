function generateUrl(baseUrl, params) {
    let url = baseUrl + '?';
    for (const property in params) {
        url += `${property}=${params[property]}&`
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

function pastDataUrl(stockId, count, option) {
    return 'https://fchart.stock.naver.com/sise.nhn?requestType=0&symbol=' +
        stockId + '&count=' + count + '&timeframe=' + option;
}

function isuUrl(stockId) {
    const url = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
    let params = {
        bld: 'dbms/comm/finder/finder_listisu',
        mktsel: 'ALL',
        searchText: stockId
    }
    return generateUrl(url, params);
}

function investorUrl(stockISU) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    const url = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';

    let params = {
        bld: 'dbms/MDC/STAT/standard/MDCSTAT02302',
        isuCd: stockISU,
        strtDd: startDate.toISOString().slice(0, 10).replace(/-/g, ''),
        endDd: endDate.toISOString().slice(0, 10).replace(/-/g, ''),
        askBid: 3,
        trdVolVal: 2
    }

    return generateUrl(url, params);
}

function naverApiUrl(stockIds) {
    return 'https://polling.finance.naver.com/' +
        'api/realtime?query=SERVICE_ITEM:' + stockIds;
}

function naverApiUrl2(stockId) {
    return 'https://api.finance.naver.com/' +
        'service/itemSummary.naver?itemcode=' + stockId;
}

function naverWiseUrl(stockId) {
    return 'https://navercomp.wisereport.co.kr/' +
        'v2/company/c1010001.aspx?cmp_cd=' + stockId;
}

function naverFinancialUrl(stockId) {
    return 'https://navercomp.wisereport.co.kr/' +
        'company/chart/c1030001.aspx?frq=Y&cmp_cd=' + stockId;
}

function wiseReportUrl(stockId) {
    return 'https://comp.wisereport.co.kr/' +
        'company/cF1002.aspx?finGubun=MAIN&frq=0&cmp_cd=' + stockId;
}

function indicatorUrlKR() {
    return 'https://polling.finance.naver.com/' +
        'api/realtime?query=SERVICE_INDEX:KOSPI,KOSDAQ,KPI200';
}

function indicatorUrlGlobal() {
    return 'https://query1.finance.yahoo.com/' +
        'v7/finance/spark?symbols=' +
        '%5EDJI,%5EGSPC,%5EIXIC,%5EFTSE,%5EGDAXI,%5EHSI,%5EN225,000001.SS&range=1d';
}

function hankyungUrl(pageNum) {
    return 'http://consensus.hankyung.com/' +
        'apps.analysis/analysis.list?skinType=business&pagenum=' + pageNum;
}

module.exports = {
    daumParams, newsUrl, pastDataUrl, isuUrl,
    investorUrl, naverApiUrl, naverWiseUrl, naverFinancialUrl, wiseReportUrl,
    naverApiUrl2, indicatorUrlKR, indicatorUrlGlobal, hankyungUrl
};
