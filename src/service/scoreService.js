/**
 * 종목 추천 점수 알고리즘
 * 종목은 다음과 같이 크게 2 종류로 나눌 수 있음: 성장주 & 가치주
 * 일단 성장주를 추천한다고 가정하고 그 기준에 맞게 점수 알고리즘을 짤 예정
 *
 * Categories
 *
 * 인기도 (Popularity)
 *     공통 (성장주 & 가치주)
 *         expYield: 애널리스트 평균가와 현재 가격의 괴리율 (상승 여력이 높을수록 점수 ↑)
 *         consensusCount: 발행된 리포트의 개수 (많을수록 점수 ↑)
 *         volume: 거래량 (증가할수록 점수 ↑)
 *         communityIndex: 커뮤니티 활성도 (증가할수록 점수 ↑)
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
 *     1. 유저가 종목 상세정보를 클릭할 때 DB 에서 쿼리로 불러오고 오늘 업데이트 된 기록이 있을때 그대로 사용
 *        만약 DB 에 있는 데이터가 최신(오늘)의 데이터가 아닐 경우 정보를 파싱해서 유저에게 보여줌과 동시에 DB 에 저장
 *     2. 특정 시간 (새벽)에 작동하는 스케쥴러를 만들어서 자동으로 계산
 *        DynamoDB 상에서 이렇게 하려면 Query 가 아닌 Scan 을 써야 하는데 너무 비효율적임
 *        만약 query 로 가져올 수 있는 방법이 있다면 가장 나은 방법임
 *     3. Any suggestions?
 */

/**
 * Returns recommendation score of a stock
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

module.exports = {getScore};
