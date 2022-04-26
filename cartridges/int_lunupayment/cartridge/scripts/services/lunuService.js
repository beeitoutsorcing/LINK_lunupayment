'use strict';

const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
const Site = require('dw/system/Site');
const URLUtils = require('dw/web/URLUtils');
const jsonHelpers = require('*/cartridge/scripts/helpers/jsonHelpers');

/**
 * @returns {string | null} Basic token
 */
function getBasicAuthToken() {
    const StringUtils = require('dw/util/StringUtils');
    const appId = Site.current.getCustomPreferenceValue('LunuAppID');
    const secretKey = Site.current.getCustomPreferenceValue('LunuSecretKey');

    if (appId && secretKey) {
        return 'Basic ' + StringUtils.encodeBase64(appId + ':' + secretKey);
    }

    return null;
}

const createPaymentService = LocalServiceRegistry.createService('http.lunupayment', {
    createRequest: function (service, order) {
        const credential = service.configuration.credential;
        const finalUrl = credential.URL + 'payments/create';
        const body = {
            email: order.getCustomerEmail(),
            shop_order_id: order.orderNo,
            amount: order.getTotalGrossPrice().getValue(),
            amount_of_shipping: order.getShippingTotalGrossPrice().getValue(),
            callback_url: URLUtils.https('LunuPayment-ChangeStatus', 'token', order.orderToken).toString(),
            description: 'Order #' + order.orderNo,
            expires: new Date(Date.now() + (5 * 60 * 1000)).toISOString(),
            client_currency: Site.getCurrent().getDefaultCurrency()
        };

        service.setURL(finalUrl);
        service.addHeader('Content-Type', 'application/json');
        service.setRequestMethod('POST');
        service.addHeader('Authorization', getBasicAuthToken());
        service.addHeader('Idempotence-Key', Site.current.getID() + '_' + Date.now() + '_' + order.orderNo);

        return body ? JSON.stringify(body) : '';
    },
    parseResponse: function (service, httpClient) {
        const result = jsonHelpers.parseJson(httpClient.getText());
        if (result && result.response) {
            return {
                confirmationToken: result.response.confirmation_token || null,
                transactionID: result.response.id || null
            };
        }
        return null;
    },
    filterLogMessage: function (msg) {
        if (msg) {
            msg = msg.replace(/UserAgent=.*?&/, 'UserAgent=************&'); // eslint-disable-line no-param-reassign
            msg = msg.replace(/Authorization=.*?&/, 'Authorization=************&'); // eslint-disable-line no-param-reassign
        }
        return msg;
    }
});

const getPaymentService = LocalServiceRegistry.createService('http.lunupayment', {
    createRequest: function (service, transactionID) {
        const credential = service.configuration.credential;
        const finalUrl = credential.URL + 'payments/get/' + transactionID;

        service.setURL(finalUrl);
        service.addHeader('Content-Type', 'application/json');
        service.setRequestMethod('GET');
        service.addHeader('Authorization', getBasicAuthToken());

        return null;
    },
    parseResponse: function (service, httpClient) {
        const result = jsonHelpers.parseJson(httpClient.getText());
        if (result && result.response) {
            return result.response;
        }
        return null;
    },
    filterLogMessage: function (msg) {
        if (msg) {
            msg = msg.replace(/UserAgent=.*?&/, 'UserAgent=************&'); // eslint-disable-line no-param-reassign
            msg = msg.replace(/Authorization=.*?&/, 'Authorization=************&'); // eslint-disable-line no-param-reassign
        }
        return msg;
    }
});

module.exports = {
    createPayment: createPaymentService,
    getPayment: getPaymentService
};
