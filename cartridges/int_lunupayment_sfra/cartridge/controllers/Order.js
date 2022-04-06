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
server.replace(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        const reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
        const OrderMgr = require('dw/order/OrderMgr');
        const OrderModel = require('*/cartridge/models/order');
        const Locale = require('dw/util/Locale');

        let order;

        const orderNo = req.form.orderID || req.session.raw.custom.orderNo;
        const orderToken = req.form.orderToken || req.session.raw.custom.orderToken;
        delete req.session.raw.custom.orderNo;
        delete req.session.raw.custom.orderToken;

        if (!orderNo && !orderToken) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        } else if (orderNo && orderToken) {
            order = OrderMgr.getOrder(orderNo, orderToken);
        } else {
            order = OrderMgr.getOrder(orderNo);
        }

        if (!order || order.customer.ID !== req.currentCustomer.raw.ID) {
            res.render('/error', {
                message: Resource.msg('error.confirmation.error', 'confirmation', null)
            });

            return next();
        }
        const lastOrderID = Object.prototype.hasOwnProperty.call(req.session.raw.custom, 'orderNo') ? req.session.raw.custom.orderID : null;
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
        req.session.raw.custom.orderID = req.querystring.ID; // eslint-disable-line no-param-reassign
        return next();
    }
);


module.exports = server.exports();
