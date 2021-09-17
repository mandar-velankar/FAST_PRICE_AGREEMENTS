sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var CandidatePrice = BaseObject.extend("com.bayer.tender.priceagreements.model.CandidatePrice", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);


            if (data) {
                //copy array's manually to objects
               
            }
        },

    
        
        getJSON: function () {

            return this.getJSONObject([
                "instituteId",
                "priceAgreementId",
                "countryCode",
                "productPackId",
                "materialNumber",
                "price",
                "synchronized",
                "validFrom",
                "validTo"
            ]);

        },

        getAll: function () {
            return {
                ...this.getJSON(),
            };
        }
    });
    
    return CandidatePrice;
});