const axios = require('axios');
const AWS = require('aws-sdk');

AWS.config.update({region: 'ap-northeast-2'});
const ddb = new AWS.DynamoDB();

let params;
let totalNum = 0;
const sectorCodes = {
    '에너지': 'G1010',
    '소재': 'G1510',
    '자본재': 'G2010',
    '상업서비스와공급품': 'G2020',
    '운송': 'G2030',
    '자동차와부품': 'G2510',
    '내구소비재와의류': 'G2520',
    '호텔,레스토랑,레저등': 'G2530',
    '소매(유통)': 'G2550',
    '교육서비스': 'G2560',
    '식품과기본식료품소매': 'G3010',
    '식품,음료,담배': 'G3020',
    '가정용품과개인용품': 'G3030',
    '건강관리장비와서비스': 'G3510',
    '제약과생물공학': 'G3520',
    '은행': 'G4010',
    '증권': 'G4020',
    '다각화된금융': 'G4030',
    '보험': 'G4040',
    '부동산': 'G4050',
    '소프트웨어와서비스': 'G4510',
    '기술하드웨어와장비': 'G4520',
    '반도체와반도체장비': 'G4530',
    '전자와 전기제품': 'G4535',
    '디스플레이': 'G4540',
    '전기통신서비스': 'G5010',
    '미디어와엔터테인먼트': 'G5020',
    '유틸리티': 'G5510'
};

async function getSingleSector(code) {
    let response;
    let today = new Date().toISOString().slice(0, 10);
    const date = today.replaceAll(/-/g,'');

    try {
        response = await axios.get(
            `http://www.wiseindex.com/Index/GetIndexComponets?ceil_yn=0&dt=${date}&sec_cd=${code}`
        )
    } catch (err) {
        console.log('[WICS]: error occurred while retrieving WICS data')
    }

    const data = response.data.list;
    for (let element of data) {
        totalNum++;
        params = {
            TableName: 'sectorWICS',
            Item: {
                bSector: { S: element.SEC_CD },
                bSectorName: { S: element.SEC_NM_KOR },
                sSector: { S: element.IDX_CD },
                sSectorName: { S: element.IDX_NM_KOR.substring(5) },
                stockName: { S: element.CMP_KOR }
            }
        }
        await ddb.putItem(params, function (err) {
            if (err) {
                console.log('[WICS]: Error ', err);
            }
        })
    }
}

async function getAllSectors() {
    for (const sector in sectorCodes) {
        const code = sectorCodes[sector];
        await getSingleSector(code);
    }
    console.log('[WICS]: ' + today + ' Finished parsing ' + totalNum + ' sectors');
}

getAllSectors().then();
