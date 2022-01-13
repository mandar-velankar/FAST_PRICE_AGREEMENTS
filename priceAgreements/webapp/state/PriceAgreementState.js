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
                this.getCandidatePricesByID(id)])
                .then(response => {
                    this.setProperty("priceAgreement", new PriceAgreement(response[0].data));
                    this.getPriceAgreementInstance().setCandidatePrices(response[1].data.results);
                    this.updateModel();
                    return this.getProperty("priceAgreement");
                })
        },
        getCandidatePricesByID:function(id){
            return this.getService().getCandidatePrices({
                priceAgreementId: id
            });
        },
        getPriceAgreementInstance: function () {
            return this.getProperty("priceAgreement");
        },
        updateCustomerPrices:async function(priceAgreementId,newNetOfferPrice){
            let customerPrices = await this.getCandidatePricesByID(priceAgreementId);
			if(customerPrices && customerPrices.data && customerPrices.data.results){
				customerPrices = customerPrices.data.results;
			}else{
				customerPrices = [];
			}
			customerPrices = customerPrices.map(customerPrice => {
				customerPrice.Price = newNetOfferPrice;
				return this.createCustomerPriceObject(customerPrice);
			});
            return customerPrices.map(cp => this.saveCustomerPrice(cp));
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
            var custPriceFOC = {};
            var CustomerPrices = [];
            var currentProductId;

            // create customerPrices object based on candidatePrices
            candidatePrices.forEach((candidate) => {
                
                candidate.price = priceAgreement.price;
                candidate.expiryDate = priceAgreement.expiryDate;

                const customerPrice = new CustomerPrice(candidate.getJSON());

                // if candidate has a customerPriceId then it has an existsing CustomerPrice
                // therefore we add the ID
                if (candidate.customerPriceId) {
                    customerPrice['iD'] = candidate.customerPriceId;
                }
                customerPrice.priceCondition = "YLTP";
                CustomerPrices.push(customerPrice);

                // 1) loopen over priceAgreement.FOC
               priceAgreement.FOC.forEach((focProduct) => {
                   currentProductId = focProduct.ProductPackId;
                    
                // 2) indien  FOC.productcode === candidate.productcode( dus main product), 1 extra entry saven voor de main product FOC
                if(focProduct.ProductPackId === candidate.productPackId){
                    custPriceFOC = {
                        "CountryCode": candidate.countryCode,
                        "EffectiveDate": candidate.effectiveDate,
                        "ExpiryDate": candidate.expiryDate,
                        "InstituteId": candidate.instituteId,
                        "MaterialNumber": candidate.materialNumber,
                        "Price": candidate.price,
                        "PriceAgreementId": candidate.priceAgreementId,
                        "ProductPackId": candidate.productPackId,
                        "Synchronized": candidate.synchronized,
                        "FOCproductPackID": candidate.productPackId ,
                        "FOCmaterialNumber": candidate.materialNumber,
                        "PriceCondition": "YA03"
                    }
                    
                    CustomerPrices.push(new CustomerPrice(custPriceFOC));
                    
                } else {
                    // 3) Voor de andere FOC's, alle materialen ophalen via priceAgreement.MaterialsFOC. 
                    priceAgreement.MaterialsFOC.FreeGoodsOther.results.forEach((FOC) => {

                        // loopen over elk materiaal en 1 entry per materiaal naar customerprices wegschrijven

                        if(FOC.ProductPackId === currentProductId){
                        FOC.Materials.results.forEach((Material) => {

                            custPriceFOC = {
                                "CountryCode": candidate.countryCode,
                                "EffectiveDate": candidate.effectiveDate,
                                "ExpiryDate": candidate.expiryDate,
                                "InstituteId": candidate.instituteId,
                                "MaterialNumber": candidate.materialNumber,
                                "Price": candidate.price,
                                "PriceAgreementId": candidate.priceAgreementId,
                                "ProductPackId": candidate.productPackId,
                                "Synchronized": candidate.synchronized,
                                "FOCproductPackID": Material.ProductPackID,
                                "FOCmaterialNumber": Material.SKUCode,
                                "PriceCondition": "YA03"
                            }
                            CustomerPrices.push(new CustomerPrice(custPriceFOC));



                        });
                    }

                });
                }
            });
            });

                

            const promises = CustomerPrices.map(cp => this.getService().saveCustomerPrice(cp));


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
        hasPAExpiryDateChanged:function(){
            var originalPriceAgreement;
            if(this.priceAgreementData){
                originalPriceAgreement = new PriceAgreement(this.priceAgreementData);
            }
            return ( originalPriceAgreement && originalPriceAgreement.expiryDate !== this.getPriceAgreementInstance().expiryDate ) || false;
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

        syncFOCcustPrices: function(ids){
            return this.getService().syncFOCcustPrices(ids);
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