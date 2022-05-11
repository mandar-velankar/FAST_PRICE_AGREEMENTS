sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType,ValidateException) {
    "use strict";
    return SimpleType.extend("com.bayer.tender.uilib.datatypes.UoMPriceType", {

        formatValue: function(oValue) {
            return (oValue * 100).toFixed(2);
        },

        parseValue: function(oValue) {
            var floatNum = parseFloat(oValue.replace(",","."));
            return (floatNum/100).toFixed(2);

        },

        validateValue: function(oValue) {

            if(oValue > 1) {
                throw new ValidateException("Not a valid percentage!");
            }
        }

    });
});