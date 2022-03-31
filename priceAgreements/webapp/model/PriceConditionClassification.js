sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    return BaseObject.extend("com.bayer.tender.priceagreements.model.PriceConditionClassification", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "ID",
                "Classification",
                "ConditionType",
                "CountryCode",
                "Division:",
                "isMain"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
});