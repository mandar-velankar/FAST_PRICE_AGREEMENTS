sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var product = BaseObject.extend("com.bayer.tender.priceagreements.model.Product", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

       

        getJSON: function () {
            return this.getJSONObject([
                "offerID",
                "productCode",
                "countryCode",
                "productPackId",
                "freeGoods",
                "freeGoods_ABS_PCT"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
    
    return product;
});