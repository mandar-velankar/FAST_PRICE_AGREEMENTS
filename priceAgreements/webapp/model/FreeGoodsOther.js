sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.FreeGoodsOther", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
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