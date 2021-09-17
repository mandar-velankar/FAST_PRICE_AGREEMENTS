sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./Institute",
    "./Product",
    "./Tender",
    "./Candidate",
    "./Material",
    "./CustomerPrice"
], function (BaseObject,Institute,Product,Tender,Candidate,CustomerPrice, Material) {
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

            if (data) {
                //copy array's manually to objects
                this.setInstitute(data.Institute);
                this.setProduct(data.Product);
                this.setTender(data.Tender);
                data.Candidates && this.setCandidates(data.Candidates.results);
                data.Materials && this.setMaterials(data.Materials.results);
                data.CustomerPrices && this.setCustomerPrices(data.CustomerPrices.results);
            }
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

        getInstitute: function (){
            return this.institute || undefined;
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
            return {
                ...this.getJSON(),
                Institute: this.institute.getJSON(),
                Product: this.product.getJSON()
            };
        }
    });
    
    return PriceAgreement;
});