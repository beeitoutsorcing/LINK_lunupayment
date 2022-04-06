'use strict';
/* eslint-disable */

const customerHelpers = require('base/checkout/customer');
const shippingHelpers = require('base/checkout/shipping');
const billingHelpers = require('./billing');
const summaryHelpers = require('base/checkout/summary');

const checkout = require('base/checkout/checkout');

checkout.updateCheckoutView = function () {
    $('body').on('checkout:updateCheckoutView', function (e, data) {
        if (data.csrfToken) {
            $("input[name*='csrf_token']").val(data.csrfToken);
        }
        customerHelpers.methods.updateCustomerInformation(data.customer, data.order);
        shippingHelpers.methods.updateMultiShipInformation(data.order);
        summaryHelpers.updateTotals(data.order.totals);
        data.order.shipping.forEach(function (shipping) {
            shippingHelpers.methods.updateShippingInformation(
                shipping,
                data.order,
                data.customer,
                data.options
            );
        });
        billingHelpers.methods.updateBillingInformation(
            data.order,
            data.customer,
            data.options
        );
        billingHelpers.methods.updatePaymentInformation(data.order, data.options);
        summaryHelpers.updateOrderProductSummaryInformation(data.order, data.options);
    });
}

module.exports = checkout;
