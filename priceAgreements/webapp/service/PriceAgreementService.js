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

        getCandidatePrices: function (priceAgreementId) {

            var aFilters = [];

			if (priceAgreementId) {

				var oTenderFilter = new Filter({
					path: 'PriceAgreementId',
					operator: FilterOperator.EQ,
					value1: priceAgreementId
				});

				aFilters.push(oTenderFilter);
			}

            
			var mParameters = {
				filters: aFilters
				
			};

            return this.odata("/CandidatePrices").get(mParameters);
        },

    });
    return PriceAgreementService;
});