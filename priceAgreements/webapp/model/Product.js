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
                "COUNTRYCODE",
                "ACTIVERECORD",
                "PRODUCTPACKID",
                "COUNTRYPRODUCTPACKID",
                "COUNTRYOFORIGIN"
            ]);
        },

        getAll: function () {
            return {
                ...this.getJSON(),
            };
        }
    });
    
    return product;
});