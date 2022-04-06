/* eslint-disable no-undef */
/* eslint-disable consistent-return */

'use strict';

/**
 * Checks whether or not service and order data match
 * @param {Object} paymentInformation paymentInformation (service response)
 * @param {dw.order.Order} order - order
 * @param {Array} validPaymentStatuses valid LUNU payment statuses
 * @returns {boolean} result of the check
 */
function comparePaymentInformationAndOrder(paymentInformation, order, validPaymentStatuses) {
    const Logger = require('dw/system/Logger');

    if (paymentInformation.shop_order_id !== order.orderNo) {
        Logger.debug('Incorrect order number. Callback ammount {0} - Order amount {1}', paymentInformation.shop_order_id, order.orderNo);
        return false;
    }

    const paymentStatus = paymentInformation.status.toLowerCase();
    if (validPaymentStatuses.indexOf(paymentStatus) === -1) {
        Logger.debug('Lunu Payment status is invalid. Callback status: {0} - Payment status {1}', callbackPaymentStatus, paymentStatus);
        return false;
    }

    if (parseFloat(paymentInformation.amount) !== order.totalGrossPrice.value) {
        Logger.debug('Incorrect payment amount. Callback ammount {0} - Order amount {1}', paymentInformation.amount, order.totalGrossPrice.value);
        return false;
    }

    if (paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'canceled') {
        // fail order and recreate basket if payment has failed, expired or was canceled
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        return false;
    }
    return true;
}

/**
 * Get or create a new payment paymentInformation CO
 * @param {string} transactionId - transaction ID
 * @returns {Object} payment paymentInformation CO
 */
function getOrCreatePaymentNotificationCO(transactionId) {
    const Transaction = require('dw/system/Transaction');
    const CustomObjectMgr = require('dw/object/CustomObjectMgr');
    let paymentNotificationCO = CustomObjectMgr.getCustomObject('lunuPaymentNotification', transactionId);

    if (!paymentNotificationCO) {
        Transaction.wrap(function () {
            paymentNotificationCO = CustomObjectMgr.createCustomObject('lunuPaymentNotification', transactionId);
        });
    }

    return paymentNotificationCO;
}

module.exports = {
    getOrCreatePaymentNotificationCO: getOrCreatePaymentNotificationCO,
    comparePaymentInformationAndOrder: comparePaymentInformationAndOrder
};
