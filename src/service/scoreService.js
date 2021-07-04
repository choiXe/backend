/**
 * 종목 추천 점수 알고리즘
 * 종목은 다음과 같이 크게 2 종류로 나눌 수 있음: 성장주 & 가치주
 * 일단 성장주를 추천한다고 가정하고 그 기준에 맞게 점수 알고리즘을 짤 예정
 *
 * Categories
 *
 * 신뢰도 (Credibility)
 *     공통 (성장주 & 가치주)
 *         애널리스트 정확도: 높을수록 점수 ↑
 *         expYield: 애널리스트 평균가와 현재 가격의 괴리율 (상승 여력이 높을수록 점수 ↑)
 *         consensusCount: 발행된 리포트의 개수 (많을수록 점수 ↑)
 *
 * 인기도 & 추세 (Popularity)
 *     공통 (성장주 & 가치주)
 *         volume: 거래량 (증가할수록 점수 ↑)
 *         communityIndex: 커뮤니티 활성도 (증가할수록 점수 ↑)
 *         momentum: 모멘텀 수치 (높을수록 점수 ↑)
 *
 * 재무 (Financials)
 *     성장주
 *         PEG (Price Earnings Growth): 1을 기준으로 낮으면 저평가, 높으면 고평가
 *         Growth Rate of Net Income: 순이익 증가율과 주가 상승률을 비교
 *     가치주
 *         PER: 섹터 평균 보다 낮으면 점수 ↑
 *         PBR: 낮을수록 점수 ↑
 *         ROE: 높을수록 점수 ↑
 *         EV/EBITDA: 낮을수록 점수 ↑
 *         GP/A: 높을수록 점수 ↑
 *         Debt Growth Ratio: 0보다 낮으면 점수 ↑
 *             (ROE & EV/EBITDA 와 dependable 하게 계산할 예정)
 */

/**
 * 점수 산정 타겟 기준:
 *     최근 3달 내에 리포트가 하나 이상 발행된 종목일 것
 *
 * 점수 업데이트 방법:
 *     특정 시간 (새벽)에 작동하는 스케쥴러를 만들어서 자동으로 계산
 */

const AWS = require('aws-sdk');
const axios = require('axios');

const {region, timeoutLimit} = require('../data/constants.js');
const {lSectors} = require('../data/wicsDictionary.js');
const {scoreQuery} = require('../data/queries.js');

AWS.config.update(region);
const docClient = new AWS.DynamoDB.DocumentClient();
axios.defaults.timeout = timeoutLimit;

/**
 * Returns list of stockIds and their report count & priceGoal
 * that has at least 1 report for past 3 months
 */
async function getIdList() {
    let reportList = [], stockList = {};
    let price;

    for (const sector of lSectors) {
        reportList.push.apply(reportList,
            (await docClient.query(scoreQuery(sector)).promise()).Items);
    }
    reportList.forEach(item => {
        price = parseInt(item.priceGoal);
        if (!stockList[item.stockId]) {
            stockList[item.stockId] = { count: 1 }
            price !== 0 ? stockList[item.stockId].price = [price] :
                stockList[item.stockId].price = [];
        }
        stockList[item.stockId].count++;
        if (price !== 0) stockList[item.stockId].price.push(price);
    })
    return stockList;
}

/**
 * Returns score recommendation of a stock
 * @param expYield expected profit yield
 * @param consensusCount number of reports backing up priceGoal
 */
function getScore(expYield, consensusCount) {
    let a, b;
    expYield >= 50 ? a = 10 : a = Math.abs(expYield) / 5;
    consensusCount >= 10 ? b = 10 : b = consensusCount;

    switch (consensusCount) {
        case 1:
            b -= 4; break;
        case 2:
            b -= 2; break;
        case 3:
            break;
        case 4:
            b += 1.5; break;
        default:
            b += 3;
    }
    return Math.sign(expYield) * Math.round(a + b) * 5;
}

async function test() {
    const a = await getIdList();
    console.log(a);
}

test();

module.exports = {getScore};
