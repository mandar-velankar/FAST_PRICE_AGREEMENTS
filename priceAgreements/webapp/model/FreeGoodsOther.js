sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./ProductPack",
], function (BaseObject,ProductPack) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.FreeGoodsOther", {
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
                "FOCBonus",
                "FOCMinAmount",
                "FreeGoodsOther",
                "FreeGoodsOther_ABS_PCT",
                "FreeGoodsOther_Step",
                "ID:",
                "Materials",
                "PotentialGeneratedSavings",
                "PriceCondition",
                "PriceCondition_ID",
                "ProductPack",
                "ProductPackId",
                "ProductPricing",
                "ProductPricing_CountryCode",
                "ProductPricing_ID",
                "ProductPricing_OfferID",
                "ProductPricing_ProductCode",
                "RoyalDecree",
                "VAT"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
});