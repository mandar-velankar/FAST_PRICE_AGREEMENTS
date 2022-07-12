sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var CandidatePrice = BaseObject.extend("com.bayer.tender.priceagreements.model.CandidatePrice", {
        constructor: function (data,priceCondition,netPrice) {
            if(priceCondition === "Precio Neto"){
                data.Price = netPrice;
            }
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
                "effectiveDate",
                "expiryDate"
            ]);

        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
    
    return CandidatePrice;
});