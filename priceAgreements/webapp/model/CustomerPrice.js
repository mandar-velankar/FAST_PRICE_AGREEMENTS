sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./Material"
], function (BaseObject,Material) {
    "use strict";

    var customerPrice = BaseObject.extend("com.bayer.tender.priceagreements.model.CustomerPrice", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "iD",
                "instituteId",
                "priceAgreementId",
                "countryCode",
                "productPackId",
                "materialNumber",
                "price",
                "synchronized",
                "effectiveDate",
                "expiryDate",
                "priceCondition",
                "fOCproductPackID",
                "fOCmaterialNumber",
                "applied"
            ]);
        },
        getAll: function () {
            return {
                ...this
            };
        }
    });
    
    return customerPrice;
});