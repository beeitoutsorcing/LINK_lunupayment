/* eslint-disable no-undef */

'use strict';

const server = require('server');
const URLUtils = require('dw/web/URLUtils');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const Logger = require('dw/system/Logger').getLogger('LunuLogger');

server.get('Success', server.middleware.https, function (req, res, next) {
    const order = OrderMgr.getOrder(req.session.raw.custom.orderNo, req.session.raw.custom.orderToken);
    if (!order) {
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }

    res.redirect(URLUtils.url('Order-Confirm'));
    return next();
});

server.get('Failed', server.middleware.https, function (req, res, next) {
    const order = OrderMgr.getOrder(req.session.raw.custom.orderNo, req.session.raw.custom.orderToken);
    if (!order) {
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }
    // reopen basket
    Transaction.wrap(function () {
        OrderMgr.failOrder(order, true);
    });

    res.redirect(URLUtils.url('Checkout-Begin', 'stage', 'payment'));
    return next();
});

server.post('ChangeStatus', server.middleware.https, function (req, res, next) {
    const lunuService = require('*/cartridge/scripts/services/lunuService');
    const lunuHelpers = require('*/cartridge/scripts/helpers/lunuHelpers');
    const jsonHelpers = require('*/cartridge/scripts/helpers/jsonHelpers');

    const notification = jsonHelpers.parseJson(req.body);
    const orderID = notification.shop_order_id;
    const paymentTransactionID = notification.id;

    if (empty(notification) || empty(paymentTransactionID) || empty(orderID)) {
        Logger.debug('Empty callback data');
        return next();
    }

    Logger.debug('Callback payment {0}', notification);
    const callbackPaymentStatus = notification.status;
    const VALID_PAYMENT_STATUSES = [
        'awaiting_payment_confirmation',
        'failed',
        'paid',
        'expired',
        'canceled'
    ];

    if (VALID_PAYMENT_STATUSES.indexOf(callbackPaymentStatus) === -1) {
        Logger.debug('Callback payment status {0} is invalid', callbackPaymentStatus);
        return next();
    }

    const order = OrderMgr.getOrder(orderID);
    if (empty(order)) {
        Logger.debug('Order with ID {0} does not exist', orderID);
        return next();
    }

    const paymentInstrument = order.getPaymentInstruments();
    if (empty(paymentInstrument)) {
        Logger.debug('Payment instrument for order with ID {0} does not exist', orderID);
        return next();
    }

    const getPaymentResponse = lunuService.getPayment.call(paymentTransactionID);
    const paymentInformation = getPaymentResponse.object;

    if (empty(paymentInformation)) {
        Logger.debug('Empty payment information data');
        return next();
    }

    if (!lunuHelpers.comparePaymentInformationAndOrder(paymentInformation, order, VALID_PAYMENT_STATUSES)) {
        return next();
    }

    const paymentNotificationCO = lunuHelpers.getOrCreatePaymentNotificationCO(paymentInformation.id);

    // do not overwrite a notification which has the same status
    if (paymentNotificationCO.custom.status !== paymentInformation.status) {
        Transaction.wrap(function () {
            paymentNotificationCO.custom.notificationContent = JSON.stringify(paymentInformation);
            paymentNotificationCO.custom.orderID = orderID;
            paymentNotificationCO.custom.status = paymentInformation.status;
            paymentNotificationCO.custom.amount = paymentInformation.amount;
            paymentNotificationCO.custom.currency = paymentInformation.currency;
            paymentNotificationCO.custom.description = paymentInformation.description;
            paymentNotificationCO.custom.expires = paymentInformation.expires;
            paymentNotificationCO.custom.test = paymentInformation.test;
            paymentNotificationCO.custom.notificationStatus = paymentNotificationCO.custom.notificationStatus === 'PROCESSED' ? 'PROCESSED' : 'PENDING';
        });
    }

    return next();
});

module.exports = server.exports();
