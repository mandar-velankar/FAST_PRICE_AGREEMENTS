sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseObject",
    "./Institute",
    "./Product",
    "./Tender",
    "./Candidate",
    "./Material",
    "./CustomerPrice",
    "./CandidatePrice",
    "./PriceCondition",
    "./SettlementDate"
], function (BaseObject,Institute,Product,Tender,Candidate,CustomerPrice,Material,CandidatePrice,PriceCondition,SettlementDate) {
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
            this.priceConditions = [];
            this.settlementDates = [];
            this.mainPriceCondition = {};
            this.focPriceCondition = {};
            this.rappelPriceCondition = {};
            this.expiryDateValueState="None";
            this.effectiveDateValueState="None";
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
                data.PriceConditions && this.setPriceConditions(data.PriceConditions.results);
                data.priceConditions && this.setPriceConditions(data.priceConditions);//used for backup restore
                data.SettlementDates && this.setSettlementDates(data.SettlementDates.results || data.SettlementDates);
                data.settlementDates && this.setSettlementDates(data.settlementDates);//used for backup restore
                this.MaterialsFOC = data.MaterialsFOC;
                this.MasterPrices = data.MasterPrices;
            }
        },


        setCandidatePrices:function(candidatePrices){
            let priceCondition = this.mainPriceCondition?.priceConditionClassification?.conditionType;
            let netPrice = this.mainPriceCondition?.netPriceWithoutTaxBeforeDeductionRD;
            this.candidatePrices = (candidatePrices && candidatePrices.map(candidatePrice => new CandidatePrice(candidatePrice,priceCondition,netPrice )) ) || [];
        },
        calculateSettlementCalendarProposal:function(){
            const settlementId = this.rappelPriceCondition?.settlement?.iD;
            const months = this.rappelPriceCondition?.getLiquidationInMonths();
            let settlementDates = [];
            switch (settlementId) {
                case 'VALIDITY':
                    settlementDates.push(new SettlementDate({
                        priceAgreementId:this.priceAgreementId,
                        fromDate:new Date(this.rappelPriceCondition.refundDate.getTime()),
                        toDate: new Date(this.expiryDate.getTime()),
                        minDate: new Date(this.rappelPriceCondition.refundDate.getTime()),
                        maxDate: new Date(this.expiryDate.getTime())
                    }));
                    break;
                case 'FREQUENCY':
                    let dateFrom = new Date(this.rappelPriceCondition.refundDate.getTime());
                    let idx = 0;
                    do {
                        let dateTo = new Date(dateFrom.getTime());
                        dateTo.setMonth(dateTo.getMonth() + months);
                        dateTo.setDate(dateTo.getDate() - 1 );
                        settlementDates.push(new SettlementDate({
                            priceAgreementId:this.priceAgreementId,
                            fromDate:new Date(dateFrom.getTime()),
                            toDate:new Date(dateTo.getTime())//,
                            // minDate: this.getPreviousSettlementDate(idx,settlementDates),
                            // maxDate: this.getNextSettlementDate(idx,settlementDates)
                        }));
                        dateFrom.setMonth(dateFrom.getMonth() + months);
                        idx++;
                    } while (dateFrom < this.expiryDate);
                    //set last record todate with expirydate value
                    if(settlementDates.length > 0){
                        settlementDates[settlementDates.length-1].toDate = new Date(this.expiryDate.getTime());
                    }
                    settlementDates = this.calculateSettlementCalendarMinMaxDate(settlementDates);
                    break;
                default:
                    break;
            }
            return settlementDates;
        },
        calculateSettlementCalendarMinMaxDate:function(settlementDates){
            for(const [idx,settlementDate] of settlementDates.entries()){
                settlementDate.minDate = this.getPreviousSettlementDate(idx,settlementDates);
                settlementDate.maxDate = this.getNextSettlementDate(idx,settlementDates);
            }
            return settlementDates;
        },
        getPreviousSettlementDate:function(idx,settlementDates){
            const prevSettlementDate = settlementDates[idx-1];
            let prevDate = new Date(this.rappelPriceCondition.refundDate.getTime());
            if(prevSettlementDate?.toDate){
                prevDate = new Date(prevSettlementDate.toDate.getTime());
                prevDate.setDate(prevDate.getDate()+1);
            }
            if(prevDate.getTime()>this.expiryDate.getTime()){
                prevDate = new Date(this.expiryDate.getTime());
            }
            return prevDate;
        },
        getNextSettlementDate:function(idx,settlementDates){
            const nextSettlementDate = settlementDates[idx+1];
            let nextDate = new Date(this.expiryDate.getTime());
            if(nextSettlementDate?.fromDate){
                nextDate = new Date(nextSettlementDate.fromDate.getTime());
                nextDate.setDate(nextDate.getDate()-1);
            }
            if(nextDate.getTime()<this.rappelPriceCondition.refundDate.getTime()){
                nextDate = new Date(this.rappelPriceCondition.refundDate.getTime());
            }
            return nextDate;
        },
        cloneSettlementDates:function(){
            return this.settlementDates.map( settlementDate => new SettlementDate(settlementDate.getAll()));
        },
        applySettlementDates:function(settlementDates){
            this.settlementDates = settlementDates.map( settlementDate => new SettlementDate(settlementDate.getAll()));
        },
        setSettlementDates:function(settlementDates){
            this.settlementDates = settlementDates && settlementDates.length > 0 && settlementDates.map(settlementDate => new SettlementDate(settlementDate));
            
            // if(!this.effectiveDate || !this.expiryDate){
            //     return;
            // }
            
            if(this.settlementDates && this.settlementDates.length > 0){
                this.settlementDates.sort( ( settlementDateA,settlementDateB ) => {
                    if(settlementDateA.fromDate < settlementDateB.fromDate) return -1;
                    if(settlementDateA.fromDate > settlementDateB.fromDate) return 1;
                    return 0;
                });
                this.settlementDates = this.calculateSettlementCalendarMinMaxDate(this.settlementDates);
            }
        },
        setPriceConditions:function(priceConditions){
            this.priceConditions = priceConditions && priceConditions.map(priceCondition => new PriceCondition(priceCondition));
            this.mainPriceCondition = this.getMainPriceCondition();
            this.focPriceCondition = this.getFocPriceCondition();
            this.rappelPriceCondition = this.getRappelPriceCondition();
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
        getTender: function (){
            return this.tender;
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
        getPriceConditions: function(){
            return this.priceConditions || [];
        },
        getMainPriceCondition: function(){
            return this.priceConditions?.find(priceCondition => priceCondition.getClassification()?.isMain);
        },
        getFocPriceCondition: function(){
            return this.priceConditions?.find(priceCondition => priceCondition.getClassification().conditionType.indexOf('FOC') > -1 );
        },
        getRappelPriceCondition: function(){
            return this.priceConditions?.find(priceCondition => priceCondition.getClassification().conditionType.indexOf('Rappel') > -1 );
        },
        getInstitute: function (){
            return this.institute || undefined;
        },
        setExpiryDateValueState:function(state){
            this.expiryDateValueState=state;
        },
        setEffectiveDateValueState:function(state){
            this.effectiveDateValueState=state;
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
        isEffectiveDateValid:function(){
            let isValid = false;
            this.effectiveDateValueState="Error";
            if(this.effectiveDate && this.effectiveDate !== ""){
                this.effectiveDateValueState="None";
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
                "synchronized",
                "extendPriceAgreement",
                "expiryExtensionPeriod",
                "expiryExtensionAcknowledged",
                "status",
                "cancellationComment",
                "ignoreConfPriceChange",
                "ignorePVLPriceChange"
            ]);
            data.SettlementDates = this.settlementDates.map(settlementDate => settlementDate.getJSON());

            return data;
        },
        getProductPackId:function(){
            return this.productPackId;
        },
        getInstituteId:function(){
            return this.instituteId;
        },
        getExpiryDate:function(){
            return this.expiryDate;
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
            all.priceConditions = this.priceConditions.map(priceCondition => priceCondition.getAll());
            all.settlementDates = this.settlementDates.map(settlementDate => settlementDate.getAll());
            return all;
        }
    });
    
    return PriceAgreement;
});