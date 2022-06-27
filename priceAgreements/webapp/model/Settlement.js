sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var Institute = BaseObject.extend("com.bayer.tender.priceagreements.model.Settlement", {
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
                "Description"
            ]);
        },

        getAll: function () {
            return {
                ...this
            };
        }
    });
    
    return Institute;
});