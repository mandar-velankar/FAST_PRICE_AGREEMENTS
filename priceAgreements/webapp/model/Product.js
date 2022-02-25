sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./ProductPack",
], function (BaseObject, ProductPack) {
    "use strict";

    var product = BaseObject.extend("com.bayer.tender.priceagreements.model.Product", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);
            this.productPack = new ProductPack();

            if (data) {
                //copy array's manually to objects
                this.setProductPack(data.ProductPack);
            }
        },

        setProductPack: function (productPack){
            if(productPack){
                this.productPack = new ProductPack(productPack);
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
                ...this
            };
        }
    });
    
    return product;
});