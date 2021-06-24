/*
 * generateUrl accepts two arguments: baseUrl and params
 * baseUrl is base of the url ex) www.google.com
 * params is an object containing pairs of search parameter name and its value
 *
 * returning 'url' combines both baseUrl and parameters in an appropriate form
 */
function generateUrl(baseUrl, params) {
    let url = baseUrl + '?';

    for (const property in params) {
        url += `${property}=${params[property]}&`
    }

    url = url.substring(0, url.length - 1);
    return url;
}

module.exports = generateUrl;
