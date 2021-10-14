// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.
var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);

function parseEnvList(env) {
    if (!env) {
        return [];
    }
    return env.split(',');
}

/**
 * @param {string} str
 * @returns {Record<string, string | boolean>}
 */
function parseUrlParams(str) {
    /** @type {Record<string, string | boolean>} */
    var params = {};
    str.split(/&/g).filter(Boolean).forEach(function(part) {
        var parts = part.split(/=/);
        var name = parts[0];
        if (parts.length === 1) {
            params[name] = true;
        } else {
            params[name] = decodeURIComponent(parts[1]);
        }
    });
    return params;
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

var cors_proxy = require('./lib/cors-anywhere');
cors_proxy.createServer({
    originBlacklist: originBlacklist,
    originWhitelist: originWhitelist,
    // requireHeader: ['origin', 'x-requested-with'],
    checkRateLimit: checkRateLimit,
    removeHeaders: [
        'cookie',
        'cookie2',
        // Strip Heroku-specific headers
        'x-request-start',
        'x-request-id',
        'via',
        'connect-time',
        'total-route-time',
        // Other Heroku added debug headers
        // 'x-forwarded-for',
        // 'x-forwarded-proto',
        // 'x-forwarded-port',
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
        // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
        xfwd: false,
    },
    // modifying reponse headers.
    setResponseHeaders: {
        "access-control-allow-origin": "*"
    },
    getRequestUrl: function(req) {
        let url = req.url.split('?')[1]
        let params = parseUrlParams(url ? url : '');
        let requestUrl = params['url'] ? params['url'] : params['download'];

        return requestUrl ? requestUrl : req.url.slice(1);
    },
    responseHeadersHandler: function(headers, req) {
        //有originUrl属性说明 是代理后的请求响应
        if (req.originUrl) {
            let url = req.originUrl.split('?')[1];
            let params = parseUrlParams(url ? url : '');
            if (params['download'] && params['filename']) {
                let filename = encodeURI(params['filename']);
                headers['content-disposition'] = `attachment; filename="${filename}"; filename*=UTF-8''${filename}`;
            }
        }
    }
}).listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});
