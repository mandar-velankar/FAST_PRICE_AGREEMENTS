sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var tender = BaseObject.extend("com.bayer.tender.priceagreements.model.Tender", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "tenderID",
                "countryCode",
                "toolID",
                "tenderNo",
                "cloneTenderID"
            ]);
        },

        getAll: function () {
            return {
                ...this.getJSON(),
            };
        }
    });
    
    return tender;
});