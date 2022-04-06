'use strict';
/* eslint-disable no-param-reassign */

/**
 * @param {sfra.Request} req - request
 * @param {Object} paymentForm - payment form
 * @param {Object} viewFormData - current view data
 * @returns {Object} result object
 */
function processForm(req, paymentForm, viewFormData) {
    viewFormData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    return {
        error: false,
        viewData: viewFormData
    };
}

module.exports = { processForm: processForm };
