'use strict';

/* eslint no-param-reassign: 0 */

/**
 * @namespace Order
 */

const page = module.superModule;
const server = require('server');
server.extend(page);

const Resource = require('dw/web/Resource');
const URLUtils = require('dw/web/URLUtils');
const csrfProtection = require('*/cartridge/scripts/middleware/csrf');
const consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * Order-Confirm : This endpoint is invoked when the shopper's Order is Placed and Confirmed
 * @name Base/Order-Confirm
 * @function
 * @memberof Order
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - ID - Order ID
 * @param {querystringparameter} - token - token associated with the order
 * @param {category} - sensitive
 * @param {serverfunction} - get
 */
server.prepend(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    // eslint-disable-next-line consistent-return
    function (req, res, next) {
        const reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        const OrderMgr = require('dw/order/OrderMgr');
        const OrderModel = require('*/cartridge/models/order');
        const Locale = require('dw/util/Locale');

        const orderNo = req.form.orderID || req.session.privacyCache.get('orderNo');
        const orderToken = req.form.orderToken || req.session.privacyCache.get('orderToken');

        if (!orderNo || !orderToken) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }

        const order = OrderMgr.getOrder(orderNo, orderToken);

        if (!order || order.customer.ID !== req.currentCustomer.raw.ID) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }
        const lastOrderID = Object.prototype.hasOwnProperty.call(req.session.raw.custom, 'orderID') ? req.session.raw.custom.orderID : null;
        if (lastOrderID === req.querystring.ID) {
            res.redirect(URLUtils.url('Home-Show'));
            return next();
        }

        const config = {
            numberOfLineItems: '*'
        };

        const currentLocale = Locale.getLocale(req.locale.id);

        const orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'order' }
        );
        let passwordForm;

        const reportingURLs = reportingUrlsHelper.getOrderReportingURLs(order);

        if (!req.currentCustomer.profile) {
            passwordForm = server.forms.getForm('newPasswords');
            passwordForm.clear();
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: false,
                passwordForm: passwordForm,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID()
            });
        } else {
            res.render('checkout/confirmation/confirmation', {
                order: orderModel,
                returningCustomer: true,
                reportingURLs: reportingURLs,
                orderUUID: order.getUUID()
            });
        }
        req.session.raw.custom.orderID = orderNo; // eslint-disable-line no-param-reassign

        this.emit('route:Complete', req, res);
    }
);


module.exports = server.exports();
