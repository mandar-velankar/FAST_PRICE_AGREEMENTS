sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.DiscountCondition", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            this.discount = Number(this.discount);
            if(this.discount && this.discount > 1) {this.discount /= 100;} // this is needed because the binding type:'.types.percent' used in the view is doing discount * 100

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "ID",
                "Volume",
                "Discount",
                "NetPriceWithoutTax",
                "NetPriceWithTax"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
});