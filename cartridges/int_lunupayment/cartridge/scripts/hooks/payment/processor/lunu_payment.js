'use strict';

/* eslint-disable no-undef */
const OrderMgr = require('dw/order/OrderMgr');

/* eslint-disable no-unused-vars */

/**
 * handles the creation of Lunu payment instrument
 * @param {dw.order.Basket} basket - current basket
 * @returns {Object} result object
 */
function Handle(basket) {
    const Transaction = require('dw/system/Transaction');
    const collections = require('*/cartridge/scripts/util/collections');

    const currentBasket = basket;

    Transaction.wrap(function () {
        collections.forEach(currentBasket.getPaymentInstruments(), function (paymentInstrument) {
            currentBasket.removePaymentInstrument(paymentInstrument);
        });

        currentBasket.createPaymentInstrument(
            'LUNU', currentBasket.totalGrossPrice
        );
    });

    return { error: false };
}

/**
 * @param {string} orderNumber - order number that is used
 * @param {Object} paymentInstrument - payment instrument object
 * @param {Object} paymentProcessor - payment processor object
 * @returns {Object} result object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    let error = false;
    let serverErrors = [];

    const Transaction = require('dw/system/Transaction');
    const Resource = require('dw/web/Resource');

    try {
        const lunuService = require('*/cartridge/scripts/services/lunuService');
        const order = OrderMgr.getOrder(orderNumber);

        const createPaymentResponse = lunuService.createPayment.call(order);
        const paymentObject = createPaymentResponse.object;

        if (paymentObject && paymentObject.confirmationToken && paymentObject.transactionID) {
            session.privacy.confirmationToken = paymentObject.confirmationToken;
            session.privacy.orderNo = order.orderNo;
            session.privacy.orderToken = order.orderToken;

            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(paymentObject.transactionID);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            });
        } else {
            throw new Error();
        }
    } catch (e) {
        error = true;
        serverErrors.push(
            Resource.msg('error.technical', 'checkout', null)
        );
    }

    return { fieldErrors: [], serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
