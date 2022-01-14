sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./Institute",
    "./Product",
    "./Tender",
    "./Candidate",
    "./Material",
    "./CustomerPrice",
    "./CandidatePrice"
], function (BaseObject,Institute,Product,Tender,Candidate,CustomerPrice, Material,CandidatePrice) {
    "use strict";

    var PriceAgreement = BaseObject.extend("com.bayer.tender.priceagreements.model.PriceAgreement", {
        constructor: function (data) {
            //will copy all properties and make them camelcase starting with lowercase ;)
            BaseObject.call(this, data);
            this.institute = new Institute();
            this.product = new Product();
            this.tender = new Tender();
            this.candidates = [];
            this.materials = [];
            this.customerPrices = [];
            this.candidatePrices = [];
            this.expiryDateValueState="None";
            if (data) {
                //copy array's manually to objects
                this.setInstitute(data.Institute||data.institute);//or for backup restore
                this.setProduct(data.Product||data.product);//or for backup restore
                this.setTender(data.Tender||data.tender);//or for backup restore
                data.candidates && this.setCandidates(data.candidates);//used for backup restore
                data.Candidates && this.setCandidates(data.Candidates.results);
                data.materials && this.setMaterials(data.materials);//used for backup restore
                data.Materials && this.setMaterials(data.Materials.results);
                data.customerPrices && this.setCustomerPrices(data.customerPrices);//used for backup restore
                data.CustomerPrices && this.setCustomerPrices(data.CustomerPrices.results);
                data.candidatePrices && this.setCandidatePrices(data.candidatePrices);//used for backup restore
                this.MaterialsFOC = data.MaterialsFOC;
            }
        },


        setCandidatePrices:function(candidatePrices){
            this.candidatePrices = (candidatePrices && candidatePrices.map(candidatePrice => new CandidatePrice(candidatePrice)) ) || [];
        },
        setInstitute: function (institute){
            if(institute){
                this.institute = new Institute(institute);
            }
        },
        setProduct: function (product){
            if(product){
                this.product = new Product(product);
            }
        },
        setTender: function (tender){
            if(tender){
                this.tender = new Tender(tender);
            }
        },
        setCandidates: function (candidates){
            this.candidates = (candidates && candidates.map(candidate => new Candidate(candidate)) ) || [];
        },
        setMaterials: function (materials){
            this.materials = (materials && materials.map(material => new Material(material))) || [];
            this.materials.unshift(new Material({"MaterialNumber":""}));
        },
        setCustomerPrices: function (customerPrices){
            this.customerPrices = (customerPrices && customerPrices.map(customerPrice => new CustomerPrice(customerPrice)) ) || [];
        },
        getCandidatePrices: function(){
            return this.candidatePrices || [];
        },
        getInstitute: function (){
            return this.institute || undefined;
        },
        setExpiryDateValueState:function(state){
            this.expiryDateValueState=state;
        },
        isValid:function(){
            let isValid = false;
            this.expiryDateValueState="Error";
            if(this.expiryDate && this.expiryDate !== ""){
                this.expiryDateValueState="None";
                isValid = true;
            }
            return isValid;
        },
        getJSON: function () {
            const data = this.getJSONObject([
                "iD",
                "expiryDate",
                "effectiveDate",
                "originalEffectiveDate",
                "listPrice",
                "retailPrice",
                "price",
                "discount",
                "deliveredVolume",
                "awardedVolume",
                "countryCode",
                "instituteId",
                "tenderId",
                "productPackId",
                "synchronized"
            ]);

            return data;
        },

        getAll: function () {
            let all = {...this};

            all.institute = this.institute.getAll();
            all.product = this.product.getAll();
            all.tender = this.tender.getAll();
            all.candidates = this.candidates.map(candidate=>candidate.getAll());
            all.materials = this.materials.map(material=>material.getAll());
            all.customerPrices = this.customerPrices.map(customerPrice=>customerPrice.getAll());
            all.candidatePrices = this.candidatePrices.map(candidatePrice=>candidatePrice.getAll());
            
            return all;
        }
    });
    
    return PriceAgreement;
});