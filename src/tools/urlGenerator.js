function newsUrl(stockName) {
    return 'https://openapi.naver.com/v1/search/news.json?query=' +
        encodeURI(stockName) + '&display=100&sort=sim';
}

function pastDataUrl(stockId, count, option) {
    return 'https://fchart.stock.naver.com/sise.nhn?requestType=0&symbol=' +
        stockId + '&count=' + count + '&timeframe=' + option;
}

function investorUrl(stockId) {
    return 'https://m.stock.naver.com/api/stock/' + stockId + '/trend?pageSize=31';
}

function naverApiUrl(stockIds) {
    return 'https://polling.finance.naver.com/' +
        'api/realtime?query=SERVICE_ITEM:' + stockIds;
}

function naverIntegrationUrl(stockId) {
    return 'https://m.stock.naver.com/api/stock/' + stockId + '/integration';
}

function naverBasicUrl(stockId) {
    return 'https://m.stock.naver.com/api/stock/'+ stockId + '/basic';
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
    newsUrl, pastDataUrl, naverIntegrationUrl, naverBasicUrl,
    investorUrl, naverApiUrl, naverWiseUrl, naverFinancialUrl, wiseReportUrl,
    indicatorUrlKR, indicatorUrlGlobal, hankyungUrl
};
