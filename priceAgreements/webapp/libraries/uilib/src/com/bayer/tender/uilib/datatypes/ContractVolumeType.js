sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType,ValidateException) {
    "use strict";
    return SimpleType.extend("com.bayer.tender.uilib.datatypes.ContractVolumeType", {

        formatValue: function(ContractVolume) {
            return ContractVolume;
        },

        parseValue: function(ContractVolume) {
            return ContractVolume;
        },

        validateValue: function(ContractVolume) {

            if(!(/^\+?[1-9]\d*$/.test(ContractVolume))) {
                throw new ValidateException("Contract Volume can not be zero or negative number or characheters");
            }
        }

    });
});