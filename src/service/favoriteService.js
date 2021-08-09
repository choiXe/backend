const axios = require('axios');

const { timeoutLimit } = require('../data/constants.js');
const { naverApiUrl } = require('../tools/urlGenerator.js');
const { numSeparator } = require('../tools/formatter.js');

axios.defaults.timeout = timeoutLimit;

async function getPriceRate(stockIds) {
    let body,
        data = [];

    try {
        body = (await axios.get(naverApiUrl(stockIds))).data.result.areas[0].datas;
        body.forEach((item) => {
            data.push({
                stockId: item.cd,
                price: numSeparator(item.nv),
                rate: item.sv < item.nv ? item.cr : -item.cr
            });
        });
    } catch (e) {}
    return {
        data: data
    };
}

module.exports = { getPriceRate };
