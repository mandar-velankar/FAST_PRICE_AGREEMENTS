sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException",
    "FAST_NS0FAST0/model/financial"
], function (SimpleType, ValidateException, Financial) {
    "use strict";

    return SimpleType.extend("com.bayer.tender.uilib.datatypes.customSendingApproval", {
		
        formatValue: function(oValue) {
        	
        	//how the binding value should be showed (no change in this case)
            return oValue;
            
        },
        
        
        parseValue: function(oValue) {
        	
            //convert back for input to back-end
            return oValue;
            
        },
        
        validateValue: function(oValue) {
        	
        	//check and trow error if needed
            throw new ValidateException("Not a valid value!");
            
        }

    });

});