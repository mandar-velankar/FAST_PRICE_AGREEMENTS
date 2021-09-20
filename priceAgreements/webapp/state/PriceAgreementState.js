sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseState",
    "../model/PriceAgreement",
    "../model/CandidatePrice",
    "../model/CustomerPrice"
], function (BaseState, PriceAgreement, CandidatePrice, CustomerPrice) {
    "use strict";
    var PriceAgreementState = BaseState.extend("com.bayer.tender.priceagreements.state.PriceAgreementState", {
        constructor: function (service) {
            //data needs to be defined before calling parent. 
            //Parent will use this for creating a JSONModel
            this.data = {
                priceAgreement: new PriceAgreement(),
                editMode: false
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
        getPriceAgreementInstance:function(){
            return this.getProperty("priceAgreement");
        },
        savePriceAgreement: function () {
            const priceAgreement = this.getProperty("priceAgreement");

            if(priceAgreement.iD){
                return this.getService().updatePriceAgreement(priceAgreement);
            }
            
        },
        getCandidatePrices: function (priceAgreementId, materialNumber) {
            this.setProperty("candidatePrices", []);
            return this.getService().getCandidatePrices(priceAgreementId, materialNumber).then(response => {
                const candidatePrices = response.data.results.map(item => new CandidatePrice(item));
                this.setProperty("candidatePrices", candidatePrices);
                return this.getProperty("candidatePrices");
            });
        },
        saveCandidatePrices: function () {

            const candidatePrices = this.getProperty("candidatePrices").filter(cap => cap.applied); // get only the applied candidatePrices
            const priceAgreement = this.getProperty("priceAgreement");

            // create customerPrices object based on candidatePrices
            const customerPrices = candidatePrices.map(candidate => {
                candidate.price = priceAgreement.price;
                candidate.validTo = priceAgreement.expiryDate;

                const customerPrice = new CustomerPrice(candidate.getJSON());

                if(candidate.customerPriceId){
                    customerPrice['iD'] = candidate.customerPriceId;
                }
                
                return customerPrice;
            });

            const promises = customerPrices.map(cp => this.getService().saveCustomerPrice(cp));

            
            return Promise.all(promises);
            
        },
        setEditMode: function (sEditMode) {
            if(sEditMode){
                this.backupPriceAgreement();
            }
            this.setProperty("editMode", sEditMode);
        },
        backupPriceAgreement:function(){
            this.priceAgreementData = this.getPriceAgreementInstance().getAll();
        },
        restorePriceAgreement:function(){
            this.priceAgreementData && this.setProperty("priceAgreement", new PriceAgreement(this.priceAgreementData));
            this.updateModel();
        }

    });

    return PriceAgreementState;

});