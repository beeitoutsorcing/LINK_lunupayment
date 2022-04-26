'use strict';

var getConfig = require('@tridnguyen/config');

var opts = Object.assign({}, getConfig({
    // replace base URL in format https://sandboxURL.salesforce.com/on/demandware.store/Sites-RefArch-Site/en_US
    baseUrl: 'https://REPLACE.ME',
    suite: '*',
    reporter: 'spec',
    timeout: 60000,
    locale: 'x_default'
}, './config.json'));

module.exports = opts;
