const { numToKorean } = require('num-to-korean');

/**
 * Converts number to KR unit
 * @param number a number
 */
function numToKR(number) {
    number = number.toString().replace('+', '');
    if (number === '0' || (number.indexOf('-') !== -1 && number.length < 6))
        return '-';

    let num,
        isNegative = false;
    if (number.indexOf('-') !== -1) {
        isNegative = true;
        number = number.substr(1);
    }
    num = numToKorean(parseInt(number.replace(/,/g, '')), 'mixed');
    num.indexOf('억') !== -1
        ? (num = num.substring(0, num.indexOf('억')) + '억')
        : (num = num.substring(0, num.indexOf('만')) + '만');

    if (isNegative) {
        return '-' + num;
    } else {
        return '+' + num;
    }
}

/**
 * Converts string number with thousand separator into number
 * @param number a number
 */
function strToNum(number) {
    return parseFloat(number.replace(/[,배원]/g, ''));
}

/**
 * Returns rounded up number with 1 decimal place
 * @param number a number
 */
function round1Deci(number) {
    return Math.round(number * 10) / 10;
}

/**
 * Returns rounded up number with 2 decimal place
 * @param number a number
 */
function round2Deci(number) {
    return Math.round(number * 100) / 100;
}

/**
 * Returns date before attr: daysAgo
 * @param daysAgo days
 */
function getPastDate(daysAgo) {
    let date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().slice(0, 10);
}

function numSeparator(num) {
    if (num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else {
        return num;
    }
}

module.exports = {
    numToKR,
    strToNum,
    round1Deci,
    round2Deci,
    getPastDate,
    numSeparator
};
