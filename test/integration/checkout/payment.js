/* eslint-disable no-undef */
var assert = require('chai').assert;
var request = require('request');
var requestPromise = require('request-promise');
var config = require('../it.config');
var testData = require('../helpers/common');

/**
 * Test case:
 * should be able to submit an order with Lunu Payments Method and redirect customer to the confirmation page
 */
describe('Checkout with LUNU', function () {
    this.timeout(8000);

    var variantId = testData.variantId;
    var quantity = 1;
    var cookieJar = requestPromise.jar();
    var cookieString;

    it('should save LUNU Payment Method and then redirect user to the confirmation page', function () {
        var testRequest = {
            url: '',
            method: 'POST',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        testRequest.url = config.baseUrl + '/Cart-AddProduct';
        testRequest.form = {
            pid: variantId,
            quantity: quantity
        };

        // ---- adding product to Cart
        return (
            requestPromise(testRequest)
                .then(function (response) {
                    assert.equal(response.statusCode, 200, 'Expected add to Cart request statusCode to be 200.');
                    cookieString = cookieJar.getCookieString(testRequest.url);
                })
                // ---- go to checkout
                .then(function () {
                    testRequest.url = config.baseUrl + '/Checkout-Begin';
                    testRequest.method = 'GET';
                    return requestPromise(testRequest);
                })
                // ---- csrf token generation
                .then(function () {
                    testRequest.method = 'POST';
                    testRequest.url = config.baseUrl + '/CSRF-Generate';
                    var cookie = request.cookie(cookieString);
                    cookieJar.setCookie(cookie, testRequest.url);
                    return requestPromise(testRequest);
                }) // ---- set customer
                .then(function (csrfResponse) {
                    var csrfJsonResponse = JSON.parse(csrfResponse.body);
                    testRequest.method = 'POST';
                    testRequest.url =
                        config.baseUrl +
                        '/CheckoutServices-SubmitCustomer?' +
                        csrfJsonResponse.csrf.tokenName +
                        '=' +
                        csrfJsonResponse.csrf.token;
                    testRequest.form = {
                        dwfrm_coCustomer_email: testData.billingAddress.email
                    };
                    return requestPromise(testRequest);
                }) // --- response of SubmitCustomer
                .then(function (response) {
                    assert.equal(response.statusCode, 200, 'Expected CheckoutServices-SubmitCustomer statusCode to be 200.');
                })
                // ---- csrf token generation
                .then(function () {
                    testRequest.method = 'POST';
                    testRequest.url = config.baseUrl + '/CSRF-Generate';
                    var cookie = request.cookie(cookieString);
                    cookieJar.setCookie(cookie, testRequest.url);
                    return requestPromise(testRequest);
                })
                // ---- set shipping address
                .then(function (csrfResponse) {
                    var csrfJsonResponse = JSON.parse(csrfResponse.body);
                    testRequest.method = 'POST';
                    testRequest.url =
                        config.baseUrl +
                        '/CheckoutShippingServices-SubmitShipping?' +
                        csrfJsonResponse.csrf.tokenName +
                        '=' +
                        csrfJsonResponse.csrf.token;
                    testRequest.form = {
                        dwfrm_shipping_shippingAddress_addressFields_firstName: testData.shippingAddress.firstName,
                        dwfrm_shipping_shippingAddress_addressFields_lastName: testData.shippingAddress.lastName,
                        dwfrm_shipping_shippingAddress_addressFields_address1: testData.shippingAddress.address1,
                        dwfrm_shipping_shippingAddress_addressFields_address2: testData.shippingAddress.address2,
                        dwfrm_shipping_shippingAddress_addressFields_country: testData.shippingAddress.country,
                        dwfrm_shipping_shippingAddress_addressFields_states_stateCode: testData.shippingAddress.stateCode,
                        dwfrm_shipping_shippingAddress_addressFields_city: testData.shippingAddress.city,
                        dwfrm_shipping_shippingAddress_addressFields_postalCode: testData.shippingAddress.postalCode,
                        dwfrm_shipping_shippingAddress_addressFields_phone: testData.shippingAddress.phone,
                        dwfrm_shipping_shippingAddress_shippingMethodID: testData.shippingMethodId
                    };
                    return requestPromise(testRequest);
                })
                // --- response of submitshipping
                .then(function (response) {
                    assert.equal(response.statusCode, 200, 'Expected CheckoutShippingServices-SubmitShipping statusCode to be 200.');
                })
                // ---- csrf token generation
                .then(function () {
                    testRequest.method = 'POST';
                    testRequest.url = config.baseUrl + '/CSRF-Generate';
                    var cookie = request.cookie(cookieString);
                    cookieJar.setCookie(cookie, testRequest.url);
                    return requestPromise(testRequest);
                })
                // --- submit selected method
                .then(function (csrfResponse) {
                    var csrfJsonResponse = JSON.parse(csrfResponse.body);
                    testRequest.method = 'POST';
                    testRequest.url =
                        config.baseUrl +
                        '/CheckoutServices-SubmitPayment?' +
                        csrfJsonResponse.csrf.tokenName +
                        '=' +
                        csrfJsonResponse.csrf.token;
                    testRequest.form = {
                        dwfrm_billing_shippingAddressUseAsBillingAddress: 'true',
                        dwfrm_billing_addressFields_firstName: testData.billingAddress.firstName,
                        dwfrm_billing_addressFields_lastName: testData.billingAddress.lastName,
                        dwfrm_billing_addressFields_address1: testData.billingAddress.address1,
                        dwfrm_billing_addressFields_address2: '',
                        dwfrm_billing_addressFields_country: testData.billingAddress.country,
                        dwfrm_billing_addressFields_states_stateCode: testData.billingAddress.stateCode,
                        dwfrm_billing_addressFields_city: testData.billingAddress.city,
                        dwfrm_billing_addressFields_postalCode: testData.billingAddress.postalCode,
                        dwfrm_billing_contactInfoFields_phone: testData.billingAddress.phone,
                        dwfrm_billing_contactInfoFields_email: testData.billingAddress.email,
                        dwfrm_billing_paymentMethod: testData.paymentMethod.id
                    };
                    return requestPromise(testRequest);
                })
                // response of submit payment
                .then(function (response) {
                    var responseJson = JSON.parse(response.body);

                    var expectedResBody = {
                        paymentMethod: { value: 'LUNU', htmlName: 'LUNU' },
                        error: false
                    };
                    assert.equal(response.statusCode, 200, 'Expected CheckoutServices-SubmitPayment statusCode to be 200.');
                    assert.equal(responseJson.error, expectedResBody.error, 'Expected error status is false.');
                    assert.equal(
                        responseJson.paymentMethod.value,
                        expectedResBody.paymentMethod.value,
                        'Expected payment method should be displayed.'
                    );
                })
                // ---- csrf token generation
                .then(function () {
                    testRequest.method = 'POST';
                    testRequest.url = config.baseUrl + '/CSRF-Generate';
                    var cookie = request.cookie(cookieString);
                    cookieJar.setCookie(cookie, testRequest.url);
                    return requestPromise(testRequest);
                })
                // CheckoutServices-PlaceOrder-Prepend check
                .then(function (csrfResponse) {
                    var csrfJsonResponse = JSON.parse(csrfResponse.body);
                    testRequest.method = 'POST';
                    testRequest.url =
                        config.baseUrl +
                        '/CheckoutServices-PlaceOrder?' +
                        csrfJsonResponse.csrf.tokenName +
                        '=' +
                        csrfJsonResponse.csrf.token;
                    return requestPromise(testRequest);
                }) // response of submit place order
                .then(function (response) {
                    var responseJson = JSON.parse(response.body);
                    assert.equal(response.statusCode, 200, 'Expected CheckoutServices-PlaceOrder statusCode to be 200.');
                    assert.isTrue(!!responseJson.continueUrl);
                })
        );
    });
});
