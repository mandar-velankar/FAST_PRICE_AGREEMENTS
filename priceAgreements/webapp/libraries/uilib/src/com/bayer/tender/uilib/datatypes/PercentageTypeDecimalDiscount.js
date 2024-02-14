sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException",
    "sap/ui/core/format/NumberFormat"
], function (SimpleType,ValidateException,NumberFormat) {
    "use strict";
    return SimpleType.extend("com.bayer.tender.uilib.datatypes.PercentageTypeDecimalDiscount", {

        _oNumberFormat : NumberFormat.getFloatInstance({
            maxFractionDigits: 5,
            groupingEnabled: false,
            groupingSeparator: ",",
            decimalSeparator: "."   
        }),

        formatValue: function(oValue) {
            oValue = this._oNumberFormat.format(oValue);
            return (oValue * 100).toFixed(3);
        },

        /*formatValue: function(oValue) {
            return (oValue * 100).toFixed(3);
        },*/

        parseValue: function(oValue) {
            var floatNum = parseFloat(oValue.replace(",","."));
            return (floatNum/100);

        },

        validateValue: function(oValue) {

            if(oValue > 1) {
                throw new ValidateException("Not a valid percentage!");
            }
        }

    });
});