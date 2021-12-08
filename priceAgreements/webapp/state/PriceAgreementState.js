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
            return Promise.all([
                this.getService().getPriceAgreement(id), 
                this.getService().getCandidatePrices({
                    priceAgreementId: id
                })])
                .then(response => {
                    this.setProperty("priceAgreement", new PriceAgreement(response[0].data));
                    this.getPriceAgreementInstance().setCandidatePrices(response[1].data.results);
                    this.updateModel();
                    return this.getProperty("priceAgreement");
                })
        },
        getPriceAgreementInstance: function () {
            return this.getProperty("priceAgreement");
        },
        savePriceAgreement: function (priceAgreement) {
            if (priceAgreement.iD) {
                return this.getService().updatePriceAgreement(priceAgreement);
            }

        },

        createPriceAgreementObject: function(priceAgreement){
            if(priceAgreement){
                return new PriceAgreement(priceAgreement);
            }
        },

        getCandidatePrices: function (filters) {
            // this.setProperty("candidatePrices", []);
            this.getPriceAgreementInstance().setCandidatePrices([]);
            return this.getService().getCandidatePrices(filters).then(response => {
                this.getPriceAgreementInstance().setCandidatePrices(response.data.results);
                this.updateModel();
                return this.getPriceAgreementInstance().getCandidatePrices();
            });
        },
        saveCandidatePrices: function () {

            // const candidatePrices = this.getProperty("candidatePrices").filter(cap => cap.applied); // get only the applied candidatePrices
            const candidatePrices = this.getPriceAgreementInstance().getCandidatePrices().filter(cap => cap.applied); // get only the applied candidatePrices
            const priceAgreement = this.getProperty("priceAgreement");

            // create customerPrices object based on candidatePrices
            const customerPrices = candidatePrices.map(candidate => {
                candidate.price = priceAgreement.price;
                candidate.expiryDate = priceAgreement.expiryDate;

                const customerPrice = new CustomerPrice(candidate.getJSON());

                // if candidate has a customerPriceId then it has an existsing CustomerPrice
                // therefore we add the ID
                if (candidate.customerPriceId) {
                    customerPrice['iD'] = candidate.customerPriceId;
                }

                return customerPrice;
            });

            const promises = customerPrices.map(cp => this.getService().saveCustomerPrice(cp));


            return Promise.all(promises);

        },

        createCustomerPriceObject: function(customerPriceData){
            if(customerPriceData){
                return new CustomerPrice(customerPriceData);
            }
        },

        saveCustomerPrice: function (customerPrice) {
            return this.getService().saveCustomerPrice(customerPrice);
        },

        setEditMode: function (sEditMode) {
            if (sEditMode) {
                this.backupPriceAgreement();
            }
            this.setProperty("editMode", sEditMode);
        },
        backupPriceAgreement: function () {
            this.priceAgreementData = this.getPriceAgreementInstance().getAll();
        },
        restorePriceAgreement: function () {
            this.priceAgreementData && this.setProperty("priceAgreement", new PriceAgreement(this.priceAgreementData));
            this.updateModel();
        },

        syncPriceAgreements: function(ids){
            return this.getService().syncPriceAgreements(ids);
        },

        //detailPage so we can access it everywhere
		getDetailPage: function () {
		    return this.detailPage;	
		},

        //keep detailPage so we can access it everywhere
        setDetailPage: function (oDetailPage){
            this.detailPage = oDetailPage;
		}

    });

    return PriceAgreementState;

});