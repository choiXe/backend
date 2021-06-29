const {numToKorean} = require('num-to-korean');

/**
 * Converts number to KR unit
 * @param number a number
 */
function numToKR(number) {
    number = number.toString();
    if (number === '0' ||
        (number.indexOf('-') !== -1 && number.length < 6)) return '-';

    let num, isNegative = false;
    if (number.indexOf('-') !== -1) {
        isNegative = true;
        number = number.substr(1);
    }
    num = numToKorean(parseInt(number.replace(/,/g,'')), 'mixed');
    num.indexOf('억') !== -1 ? num = num.substring(0, num.indexOf('억')) + '억'
        : num = num.substring(0, num.indexOf('만')) + '만';

    if (isNegative) {
        return '-' + num;
    } else {
        return '+' + num;
    }
}

/**
 * Returns rounded up number with 1 decimal place
 * @param number a number
 */
function round1Deci(number) {
    return Math.round(number * 10) / 10;
}

module.exports = {numToKR, round1Deci};
