'use strict';

/**
 * Safely parse JSON
 * @param {string} stringToParse string to be parsed
 * @param {Object} defaultOnFail default object to be returned if parse fails
 * @returns {Object} parsed object or default value
 */
function parseJson(stringToParse, defaultOnFail) {
    try {
        return JSON.parse(stringToParse);
    } catch (error) {
        return defaultOnFail || null;
    }
}

module.exports = { parseJson: parseJson };
