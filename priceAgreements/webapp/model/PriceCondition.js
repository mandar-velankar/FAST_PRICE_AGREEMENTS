sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./PriceConditionClassification",
    "./DiscountCondition",
    "./FreeGoodsOther",
    "./Settlement"
], function (BaseObject,PriceConditionClassification,DiscountCondition,FreeGoodsOther,Settlement) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.PriceCondition", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            this.priceConditionClassification = undefined;
            this.settlement = undefined;
            this.discountConditions = [];
            this.freeGoodsOther = [];
            
            if (data) {
                //copy array's manually to objects
                this.setPriceConditionClassification(data.PriceConditionClassification||data.priceConditionClassification||{});
                this.setSettlement(data.Settlement||data.settlement||{});
                data.DiscountCondition && this.setDiscountCondition(data.DiscountCondition.results);
                data.FreeGoodsOther && this.setFreeGoodsOther(data.FreeGoodsOther.results);
            }
            this.confidentialPrice = data.ConfidentialPrice || data.confidentialPrice || null;
        },

        setPriceConditionClassification: function(classification){
            this.priceConditionClassification = new PriceConditionClassification(classification);
        },
        setSettlement: function(settlement){
            this.settlement = new Settlement(settlement);
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
                "ConfidentialPrice",
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
            let all = {...this};

            all.priceConditionClassification = this.priceConditionClassification.getAll();
            
            return all;
        }
    });
});