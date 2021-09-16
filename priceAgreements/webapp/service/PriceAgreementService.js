sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseService",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (CoreService, Filter, FilterOperator) {
    "use strict";

    var PriceAgreementService = CoreService.extend("com.bayer.tender.priceagreements.state.PriceAgreementService", {
        constructor: function (model) {
            CoreService.call(this, model);
        },
        getPriceAgreement: function (id) {
            const keyPath = this.model.createKey("/PriceAgreements",{ID:id});
            return this.odata(keyPath).get({urlParameters:{$expand:"Materials,Institute,Tender,Product/ProductPack,CustomerPrices"}});
        },

        getCandidatePrices: function (priceAgreementId, materialNumber) {

            var aFilters = [];

			if (priceAgreementId) {

				var oPriceAgreemenFilter = new Filter({
					path: 'PriceAgreementId',
					operator: FilterOperator.EQ,
					value1: priceAgreementId
				});

				aFilters.push(oPriceAgreemenFilter);
			}

            if (materialNumber) {

				var oMaterialNumberFilter = new Filter({
					path: 'MaterialNumber',
					operator: FilterOperator.EQ,
					value1: materialNumber
				});

				aFilters.push(oMaterialNumberFilter);
			}


            
			var mParameters = {
				filters: aFilters
				
			};

            return this.odata("/CandidatePrices").get(mParameters);
        },

    });
    return PriceAgreementService;
});