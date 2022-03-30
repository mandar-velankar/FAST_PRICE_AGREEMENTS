sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./PriceConditionClassification",
    "./DiscountCondition",
    "./FreeGoodsOther"
], function (BaseObject,PriceConditionClassification,DiscountCondition,FreeGoodsOther) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.PriceCondition", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            this.priceConditionClassification = undefined;
            this.discountConditions = [];
            this.freeGoodsOther = [];
            
            if (data) {
                //copy array's manually to objects
                data.PriceConditionClassification && this.setPriceConditionClassification(data.PriceConditionClassification);
                data.DiscountCondition && this.setDiscountCondition(data.DiscountCondition.results);
                data.FreeGoodsOther && this.setFreeGoodsOther(data.FreeGoodsOther.results);
            }
        },

        setPriceConditionClassification: function(classification){
            this.priceConditionClassification = new PriceConditionClassification(classification);
        },
        setDiscountCondition: function(discountConditions){
            this.discountConditions = discountConditions && discountConditions.map(discountCondition => new DiscountCondition(discountCondition))
        },
        setFreeGoodsOther: function(freeGoodsOther){
            this.freeGoodsOther = freeGoodsOther && freeGoodsOther.map(foc => new FreeGoodsOther(foc))
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