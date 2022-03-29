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
			const keyPath = this.model.createKey("/PriceAgreements", { ID: id });
			return this.odata(keyPath).get({ urlParameters: { $expand: "Materials,Institute,Tender,PriceConditions/PriceConditionClassification,Product/ProductPack,CustomerPrices,Deliveries,FOC,MaterialsFOC,MaterialsFOC/FreeGoodsOther,MaterialsFOC/FreeGoodsOther/Materials" } });
		},
		getPriceAgreementsByInstituteProduct: function (instituteId, productPackId,expiryDate) {
			const filters = [];
			filters.push(new Filter({
				path: 'InstituteId',
				operator: FilterOperator.EQ,
				value1: instituteId
			}));
			filters.push(new Filter({
				path: 'ProductPackId',
				operator: FilterOperator.EQ,
				value1: productPackId
			}));
			filters.push(new Filter({
				path: 'ExpiryDate',
				operator: FilterOperator.GE,
				value1: expiryDate
			}));
			
			return this.odata("/PriceAgreements").get({ filters: filters });
		},

		updatePriceAgreement: function (priceAgreement) {

			const data = priceAgreement.getJSON();

			const sKey = this.model.createKey("/PriceAgreements", {
				ID: data.ID
			});

			return this.odata(sKey).put(data);

		},

		saveCustomerPrice: function (customerPrice) {

			// const data = customerPrice.getAll();
			const data = customerPrice.getJSON();

			if (data.ID) {
				const sKey = this.model.createKey("/CustomerPrices", {
					ID: data.ID
				});

				return this.odata(sKey).put(data);
			} else {
				return this.odata("/CustomerPrices").post(data);
			}

		},



		getCandidatePrices: function (filters) {

			if (!filters) {
				return "Please provide filter object.";
			}

			var aFilters = [];

			if (filters.hasOwnProperty("priceAgreementId")) {
				aFilters.push(new Filter({
					path: 'PriceAgreementId',
					operator: FilterOperator.EQ,
					value1: filters.priceAgreementId
				}));
			}

			if (filters.hasOwnProperty("materialNumber")) {
				aFilters.push(new Filter({
					path: 'MaterialNumber',
					operator: FilterOperator.EQ,
					value1: filters.materialNumber
				}));
			}

			if (filters.hasOwnProperty("applied")) {
				aFilters.push(new Filter({
					path: 'Applied',
					operator: FilterOperator.EQ,
					value1: filters.applied
				}));
			}


			var mParameters = {
				filters: aFilters

			};

			return this.odata("/CandidatePrices").get(mParameters);
		},

		syncPriceAgreements: function (ids) {

			if (!ids || !Array.isArray(ids) || ids.length <= 0) return "You must provide a list of PriceAgreement IDs";

			const data = {
				"ids": ids
			};

			return this.odata("/syncPriceAgreements").post(data);

		},

		getFocMaterials: function (filters) {

			if (!filters) {
				return "Please provide filter object.";
			}

			var aFilters = [];

			if (filters.hasOwnProperty("priceAgreementId")) {
				aFilters.push(new Filter({
					path: 'PriceAgreementId',
					operator: FilterOperator.EQ,
					value1: filters.priceAgreementId
				}));
			}

			if (filters.hasOwnProperty("materialNumber")) {
				aFilters.push(new Filter({
					path: 'MaterialNumber',
					operator: FilterOperator.EQ,
					value1: filters.materialNumber
				}));
			}

			if (filters.hasOwnProperty("applied")) {
				aFilters.push(new Filter({
					path: 'Applied',
					operator: FilterOperator.EQ,
					value1: filters.applied
				}));
			}


			var mParameters = {
				filters: aFilters

			};

			return this.odata("/CandidatePrices").get(mParameters);
		},

		syncFocCustPrices: function (ids) {

			if (!ids || !Array.isArray(ids) || ids.length <= 0) return "You must provide a list of PriceAgreement IDs";

			const data = {
				"ids": ids
			};

			return this.odata("/syncFocCustPrices").post(data);

		},

	});
	return PriceAgreementService;
});