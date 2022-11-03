sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue : function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

        commaSeparator : function (Materials){
            if(!Materials){return}
            const newMat = Materials;
            const SKUCode = [];
            newMat.forEach((element) => {
                const SKUs = element.split('=').pop().slice(0,-1);
                SKUCode.push(SKUs);
            });
            return SKUCode.join(',');
        }
	};
});