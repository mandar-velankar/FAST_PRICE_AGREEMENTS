sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseState",
    "../model/PriceAgreement",
    "../model/CandidatePrice",
], function (BaseState, PriceAgreement, CandidatePrice) {
    "use strict";
    var PriceAgreementState = BaseState.extend("com.bayer.tender.priceagreements.state.PriceAgreementState", {
        constructor: function (service) {
            //data needs to be defined before calling parent. 
            //Parent will use this for creating a JSONModel
            this.data = {
                priceAgreement: new PriceAgreement()
            };
            BaseState.call(this);
            this.paService = service;
        },
        getService: function () {
            return this.paService;
        },
        getPriceAgreement: function (id) {
            this.setProperty("priceAgreement", new PriceAgreement());
            return this.getService().getPriceAgreement(id).then(response => {
                this.setProperty("priceAgreement", new PriceAgreement(response.data));
                return this.getProperty("priceAgreement");
            });
        },

        getCandidatePrices: function (priceAgreementId) {
            this.setProperty("candidatePrices", []);
            return this.getService().getCandidatePrices(priceAgreementId).then(response => {
                const candidatePrices = response.data.results.map(item => new CandidatePrice(item));
                this.setProperty("candidatePrices", candidatePrices);
                return this.getProperty("candidatePrices");
            });
        }
    });

    return PriceAgreementState;

});