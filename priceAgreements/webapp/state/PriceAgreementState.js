sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseState",
    "../model/PriceAgreement",
    "../model/CandidatePrice",
    "../model/CustomerPrice"
], function (BaseState, PriceAgreement, CandidatePrice, CustomerPrice) {
    "use strict";
    var PriceAgreementState = BaseState.extend("com.bayer.tender.priceagreements.state.PriceAgreementState", {
        allFilters:[{key:"",country:"ALL",value:""},
                    {key:"newAgreementsKey",country:"ALL",value:"New Agreements"},
                    {key:"newMaterialNumbersKey",country:"ALL",value:"New Material Numbers"},
                    {key:"updatedRetailPriceKey",country:"IT",value:"Updated Retail Price"},
                    {key:"updatedPVLKey",country:"ES",value:"Updated PVL"},
                    {key:"updatedConfidentialPriceKey",country:"ES",value:"Updated Confidential Price"},
                    {key:"netPriceAbovePVLKey",country:"ES",value:"Net Price Above PVL"},
                    {key:"netPriceBelowFloorPriceKey",country:"ES",value:"Net Price Below Floor Price"},
                    {key:"expiringSoonKey",country:"ALL",value:"Expiring Soon"},
                    {key:"expiredKey",country:"ALL",value:"Expired"}],
        constructor: function (service) {
            //data needs to be defined before calling parent. 
            //Parent will use this for creating a JSONModel
            this.data = {
                priceAgreement: new PriceAgreement(),
                editMode: false,
                allApplied: false,
                selectedCountryFilter:"",
                countryFilters:[]
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
                this.getCandidatePricesByID(id)
            ])
            .then(response => {
                this.setProperty("priceAgreement", new PriceAgreement(response[0].data));
                this.getPriceAgreementInstance().setCandidatePrices(response[1].data.results);
                this.updateModel();
                return this.getProperty("priceAgreement");
            })
            .then(priceAgreement => {
                // fetch the RoyalDecree and add it to PriceAgreement
                this.getService().getRoyalDecree(priceAgreement.productPackId)
                    .then(royalDecree => (priceAgreement.royalDecreePercentage = Number(royalDecree?.data?.results[0]?.Percentage)) && this.updateModel()); // TODO: check whether we should also take the CustomerGroup into account when fetching the RoyalDecree
                // we need to return the priceAgreement here because it is being used in the Controller
                return priceAgreement;
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
        updateCustomerPrices:async function(priceAgreement){
            // other solutions, but MaterialsFOC is not loaded in master so undefined. 
            // if this would be need in master list, this could improve performance for update customer prices in mass
            // const model = this.getService().model;
            // const pathPA = model.createKey("/PriceAgreements",{
            //     ID:priceAgreement.ID
            // });
            // priceAgreement.FOC = model.getProperty(`${pathPA}/FOC`).map(path => model.getProperty(`/${path}`));
            // if(!priceAgreement.MaterialsFOC){
            //     priceAgreement.MaterialsFOC = { FreeGoodsOther : {} };
            // }
            // priceAgreement.MaterialsFOC.FreeGoodsOther = model.getProperty(`${pathPA}/MaterialsFOC/FreeGoodsOther`);
            // const pa = this.paState.createPriceAgreementObject(priceAgreement);
            //getCandidatePrices
            const [responsePA,responseCandidate] = await Promise.all([
                this.getService().getPriceAgreement(priceAgreement.ID),
                this.getCandidatePricesByID(priceAgreement.ID)
            ]);

            // update the price agreement price
            if(responsePA.data.ID === priceAgreement.ID){
                responsePA.data.Price = priceAgreement.Price;
            }

            const pa = new PriceAgreement(responsePA.data);
            pa.setCandidatePrices(responseCandidate.data.results);
            return this.saveCandidatePrice(pa,pa.getCandidatePrices());
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
        findActivePriceAgreement:function(){
            const priceAgreement = this.getPriceAgreementInstance();
            const instituteId = priceAgreement.getInstituteId();
            const productPackId = priceAgreement.getProductPackId();
            // const expiryDate = ;//priceAgreement.getExpiryDate()
            return this.getService().getPriceAgreementsByInstituteProduct(instituteId,productPackId,new Date());
        },
        saveCandidatePrices: function () {
            const candidatePrices = this.getPriceAgreementInstance().getCandidatePrices();
            const priceAgreement = this.getProperty("priceAgreement");
            return this.saveCandidatePrice(priceAgreement,candidatePrices);
        },
        saveCandidatePrice:function(priceAgreement,candidatePrices){

            // cponst candidatePrices = this.getProperty("candidatePrices").filter(cap => cap.applied); // get only the applied candidatePrices
            // const candidatePrices = this.getPriceAgreementInstance().getCandidatePrices().filter(cap => cap.applied); // get only the applied candidatePrices
            // const priceAgreement = this.getProerty("priceAgreement");
            var custPriceFOC = {};
            var CustomerPrices = [];
            var currentProductId;
            let deletedSettlementPriceConditions;

            // create customerPrices object based on candidatePrices
            candidatePrices.forEach((candidate) => {
                
                candidate.price = priceAgreement.price;
                candidate.expiryDate = priceAgreement.expiryDate;
                candidate.effectiveDate = priceAgreement.effectiveDate;

                const customerPrice = new CustomerPrice(candidate.getJSON());

                // if candidate has a customerPriceId then it has an existsing CustomerPrice
                // therefore we add the ID
                if (candidate.customerPriceId) {
                    customerPrice['iD'] = candidate.customerPriceId;
                }

                // This logic is only run for Italy
                if(candidate.countryCode === "IT"){
                    customerPrice.priceCondition = "YLTP";
                    customerPrice.applied = candidate.applied;
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
                                "PriceCondition": "YA03",
                                "Applied": candidate.applied
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
                                            "PriceCondition": "YA03",
                                            "Applied": candidate.applied
                                        }
                                        CustomerPrices.push(new CustomerPrice(custPriceFOC));



                                    })
                                }

                            });
                        }
                    })
                }

                // This logic is only run for Spain
                // The reason for this is because we have different entities (PriceConditions) for Spain 
                if(candidate.countryCode === "ES"){ 
                    const existingPriceConditions = priceAgreement.CustomerPrices;
                    //const existingRappelCondition = existingPriceConditions.find(rappel => rappel.PriceCondition === 'YAW1' && !rappel.EffectiveDate && !rappel.ExpiryDate);
                    const aExistingFOCConditions = existingPriceConditions.filter(foc => foc.PriceCondition === 'YA01');
                    const aExistingSettlementConditions = existingPriceConditions.filter(rappel => rappel.PriceCondition === 'YAW1' && rappel.EffectiveDate && rappel.ExpiryDate);
                    const mainPriceCondition = priceAgreement.priceConditions.find(condition => condition.priceConditionClassification.isMain);
                    const focPriceConditions = priceAgreement.focPriceCondition;
                    //const rappelPriceCondition = priceAgreement.rappelPriceCondition;
                    const settlementDates = priceAgreement.settlementDates;

                    //filter existing settlement conditions compared to settlementDates
                    deletedSettlementPriceConditions = aExistingSettlementConditions.filter(settlementCondition => !settlementDates.find(date => date.fromDate.toISOString() === settlementCondition.EffectiveDate.toISOString() && date.toDate.toISOString() === settlementCondition.ExpiryDate.toISOString()));                                        
                    deletedSettlementPriceConditions = deletedSettlementPriceConditions.map(cp => new CustomerPrice(cp));
                    // Main condition
                    if(mainPriceCondition.priceConditionCode === "YLTF" || mainPriceCondition.priceConditionCode === "YLTP"){
                        customerPrice.price = mainPriceCondition.netPriceWithTaxAfterDeductionRD
                    }
                    customerPrice.priceCondition = mainPriceCondition.priceConditionCode;
                    customerPrice.applied = candidate.applied;
                    CustomerPrices.push(customerPrice);

                    // FOC condition
                    focPriceConditions?.freeGoodsOther.forEach(foc => {
                        const focCustomerPrice = new CustomerPrice({
                            "CountryCode": candidate.countryCode,
                            "EffectiveDate": candidate.effectiveDate,
                            "ExpiryDate": candidate.expiryDate,
                            "InstituteId": candidate.instituteId,
                            "MaterialNumber": candidate.materialNumber,
                            "Price": candidate.price,
                            "PriceAgreementId": candidate.priceAgreementId,
                            "ProductPackId": candidate.productPackId,
                            "Synchronized": candidate.synchronized,
                            "FOCproductPackID": foc.productPackId,
                            "FOCmaterialNumber": null,
                            "PriceCondition": "YA01",
                            "Applied": candidate.applied
                        });
                        CustomerPrices.push(focCustomerPrice);
                        const existingFOCCondition = aExistingFOCConditions.find(condition => condition.FOCproductPackID === foc.productPackId);
                        if(existingFOCCondition) {
                            focCustomerPrice.iD = existingFOCCondition.ID;
                        }
                    });

                    // Rappel condition
                    /*rappelPriceCondition?.discountConditions.forEach(discountCondition => {
                        const rappelCustomerPrice = new CustomerPrice({
                            "CountryCode": candidate.countryCode,
                            "EffectiveDate": candidate.effectiveDate,
                            "ExpiryDate": candidate.expiryDate,
                            "InstituteId": candidate.instituteId,
                            "MaterialNumber": candidate.materialNumber,
                            "Price": candidate.price,
                            "PriceAgreementId": candidate.priceAgreementId,
                            "ProductPackId": candidate.productPackId,
                            "Synchronized": candidate.synchronized,
                            "FOCproductPackID": null,
                            "FOCmaterialNumber": null,
                            "PriceCondition": "YAW1",
                            "Applied": candidate.applied
                        });
                        if(existingRappelCondition?.ID) rappelCustomerPrice.iD = existingRappelCondition.ID;
                        CustomerPrices.push(rappelCustomerPrice);
                    });*/

                    // Rappel condition Settlement Dates
                    settlementDates?.forEach(settlementDate => {
                        const settlementDateCustomerPrice = new CustomerPrice({
                            "CountryCode": candidate.countryCode,
                            "EffectiveDate": settlementDate.fromDate,
                            "ExpiryDate": settlementDate.toDate,
                            "InstituteId": candidate.instituteId,
                            "MaterialNumber": candidate.materialNumber,
                            "Price": candidate.price,
                            "PriceAgreementId": candidate.priceAgreementId,
                            "ProductPackId": candidate.productPackId,
                            "Synchronized": candidate.synchronized,
                            "FOCproductPackID": null,
                            "FOCmaterialNumber": null,
                            "PriceCondition": "YAW1",
                            "Applied": candidate.applied
                        });
                        const existingSettlementCondition = aExistingSettlementConditions.find(condition => condition.EffectiveDate.toISOString() === settlementDateCustomerPrice.effectiveDate.toISOString() && condition.ExpiryDate.toISOString() === settlementDateCustomerPrice.expiryDate.toISOString());
                        if(existingSettlementCondition) {
                            settlementDateCustomerPrice.iD = existingSettlementCondition.ID;
                        }
                        CustomerPrices.push(settlementDateCustomerPrice);
                    });

                }
            });

            //those not existing anymore upon comparison -- delete
            const promiseDeleteSettlementConditions = deletedSettlementPriceConditions?.map(cp => this.getService().deleteCustomerPrice(cp));
            const promises = CustomerPrices.map(cp => this.getService().saveCustomerPrice(cp));
            return Promise.all([promises,promiseDeleteSettlementConditions]);

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
        setAllApplied: function(sAllApplied){
            this.setProperty("allApplied", sAllApplied);
        },
        hasPAExpiryDateChanged:function(){
            var originalPriceAgreement;
            if(this.priceAgreementData){
                originalPriceAgreement = new PriceAgreement(this.priceAgreementData);
            }
            return ( originalPriceAgreement && originalPriceAgreement.expiryDate !== this.getPriceAgreementInstance().expiryDate ) || false;
        },
        hasPAEffectiveDateChanged:function(){
            var originalPriceAgreement;
            if(this.priceAgreementData){
                originalPriceAgreement = new PriceAgreement(this.priceAgreementData);
            }
            return ( originalPriceAgreement && originalPriceAgreement.effectiveDate !== this.getPriceAgreementInstance().effectiveDate ) || false;
        },
        setFiltersByCountry:function(){
            const selectedCountry = this.getProperty("selectedCountryFilter");
            const countryFilterItems = ( selectedCountry && this.allFilters.filter(item => item.country === selectedCountry || item.country === "ALL") ) || [];
            this.setProperty("countryFilters",countryFilterItems);
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

        syncFocCustPrices: function(ids){
            return this.getService().syncFocCustPrices(ids);
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