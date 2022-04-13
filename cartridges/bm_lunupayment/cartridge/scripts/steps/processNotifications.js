'use strict';
/* eslint-disable */

/*
 * Script to run Luna notification related jobs
 */
const Order = require('dw/order/Order');
const Status = require('dw/system/Status');
const OrderMgr = require('dw/order/OrderMgr');
const Transaction = require('dw/system/Transaction');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const Logger = require('dw/system/Logger').getLogger('Lunu');
const checkoutHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Processes Lunu payment notification custom object
 * @returns {Status} job status
 */
function processNotifications() {
    const searchQuery = CustomObjectMgr.queryCustomObjects('lunuPaymentNotification', "custom.notificationStatus = 'PENDING'", null);
    Logger.info('Process Lunu payment notifications start with count {0}', searchQuery.count);

    try {
        while (searchQuery.hasNext()) {
            let notification = searchQuery.next();
            if (notification.custom.status === 'paid') {
                let order = OrderMgr.getOrder(notification.custom.orderID);
                if (empty(order) || order.status.value !== Order.ORDER_STATUS_CREATED) {
                    continue;
                }
                let fraudDetectionStatus = {
                    status: 'success',
                    errorCode: '',
                    errorMessage: ''
                };;
                let result = checkoutHelpers.placeOrder(order, fraudDetectionStatus);
                if (result.error) {
                    Logger.info('Process Lunu payment notifications: Failed to place order {0}', notification.custom.orderID);
                    continue;
                }
                Transaction.wrap(function () {
                    notification.custom.notificationStatus = 'PROCESSED';
                    order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                    order.setExportStatus(Order.EXPORT_STATUS_READY);
                });
                Logger.info('Process Lunu payment notifications: Order placed successfully {0}', notification.custom.orderID);
            } else if (notification.custom.status === 'failed' || notification.custom.status === 'expired' || notification.custom.status === 'canceled') {
                Transaction.wrap(function () {
                    OrderMgr.failOrder(order, true);
                    order.addNote('Order fail', 'Order failed during lunu notification process. Reason: payment status: {0}. Notification id: {1}', notification.custom.status, notification.transactionId);
                    notification.custom.notificationStatus = 'PROCESSED';
                    Logger.info('Process Lunu payment notifications: Order failed during lunu notification process. Reason: payment status: {0}. Notification id: {1}', notification.custom.status, notification.transactionId);
                });
            }
        }
    } catch (e) {
        return new Status(Status.ERROR, 'ERROR', 'Processed Lunu payment Custom Objects failed. Error message {0}', e.msg);
    } finally {
        Logger.info('Process Lunu payment notifications finished with count {0}', searchQuery.count);
        searchQuery.close();
    }
    return new Status(Status.OK, 'OK', 'Processed Lunu payment Custom Objects finished successfully');
}
/**
 * Deletes Lunu payment notification custom object
 * @returns {Status} job status
 */
function clearNotifications() {
    const searchQuery = CustomObjectMgr.queryCustomObjects('lunuPaymentNotification', "custom.notificationStatus = 'PROCESSED'", null);
    Logger.info('Removing Processed Lunu payment Custom Objects start with count {0}', searchQuery.count);

    try {
        while (searchQuery.hasNext()) {
            let notification = searchQuery.next();
            Transaction.wrap(function () {
                CustomObjectMgr.remove(notification);
            });
        }
    } catch (e) {
        return new Status(Status.ERROR, 'ERROR', 'Clean up Lunu payment Custom Objects failed. Error message {0}', e.msg);
    } finally {
        Logger.info('Removing Processed Custom Objects finished with count {0}', searchQuery.count);
        searchQuery.close();
    }
    return new Status(Status.OK, 'OK', 'Removing Processed Lunu payment Custom Objects finished successfully');
}

module.exports = {
    processNotifications: processNotifications,
    clearNotifications: clearNotifications
};
