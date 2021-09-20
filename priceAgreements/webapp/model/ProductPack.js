sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var productPack = BaseObject.extend("com.bayer.tender.priceagreements.model.ProductPack", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "PRODUCTPACKID",
                "PRODUCTPACKNAME",
                "PRESENTATION",
                "UOM",
                "ACTIVERECORD",
                "HLEVEL6_CODE"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
    
    return productPack;
});