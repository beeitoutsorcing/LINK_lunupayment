'use strict';
/* eslint-disable */

const billing = require('base/checkout/billing');

function updatePaymentInformation(order) {
    // update payment details
    const $paymentSummary = $('.payment-details');
    let htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments
        && order.billing.payment.selectedPaymentInstruments.length > 0) {
        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod === "LUNU") {
            htmlToAppend += `<span>${order.billing.payment.selectedPaymentInstruments[0].paymentMethod}</span>`;
        } else {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + order.billing.payment.selectedPaymentInstruments[0].type
                + '</span><div>'
                + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
                + '</div><div><span>'
                + order.resources.cardEnding + ' '
                + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
                + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
                + '</span></div>';
        }
    }

    $paymentSummary.empty().append(htmlToAppend);
};

billing.methods['updatePaymentInformation'] = updatePaymentInformation;
Object.assign(module.exports, billing, {});