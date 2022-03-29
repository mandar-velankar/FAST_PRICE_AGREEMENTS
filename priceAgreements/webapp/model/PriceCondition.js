sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./PriceConditionClassification"
], function (BaseObject,PriceConditionClassification) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.PriceCondition", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            this.priceConditionClassification = undefined;

            if (data) {
                //copy array's manually to objects
                data.PriceConditionClassification && this.setPriceConditionClassification(data.PriceConditionClassification);
            }
        },

        setPriceConditionClassification: function(classification){
            this.priceConditionClassification = new PriceConditionClassification(classification);
        },

        getClassification: function (){
            return this.priceConditionClassification;
        },

        getJSON: function () {
            return this.getJSONObject([
                "CountryCode",  
                "OfferID",
                "ProductCode",
                "PVL",
                "Discount",
                "RoyalDecree",
                "StandardDiscount",
                "AdditionalDiscount",
                "NetPriceWithoutTaxBeforeDeductionRD",
                "NetPriceWithoutTaxAfterDeductionRD",
                "NetPriceWithTaxAfterDeductionRD",
                "NetPriceWithoutTax",
                "NetPriceWithTax",
                "MaximumPrice",
                "Tax",
                "Liquidation",
                "RefundDate",
                "PriceConditionClassification_ID",
                "PriceAgreement_ID"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
});