sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject"
], function (BaseObject) {
    "use strict";

    var Institute = BaseObject.extend("com.bayer.tender.priceagreements.model.Institute", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);

            if (data) {
                //copy array's manually to objects
            }
        },

        getJSON: function () {
            return this.getJSONObject([
                "countryCode",
                "instituteID",
                "customerID",
                "instituteName",
                "instituteType"
            ]);
        },

        getAll: function () {
            return {
                ...this.getJSON(),
            };
        }
    });
    
    return Institute;
});