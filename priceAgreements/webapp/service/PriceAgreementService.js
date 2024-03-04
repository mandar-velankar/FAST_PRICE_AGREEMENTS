sap.ui.define([
	"com/bayer/tender/uilib/objects/BaseService",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (CoreService, Filter, FilterOperator) {
	"use strict";

	var PriceAgreementService = CoreService.extend("com.bayer.tender.priceagreements.state.PriceAgreementService", {
		constructor: function (model) {
            //EHQUT-Price agreement app - Product multiple selection limited
            model.setSizeLimit(2000);
            //EHQUT-Price agreement app - Product multiple selection limited
			CoreService.call(this, model);
		},
		getPriceAgreement: function (id) {
			const keyPath = this.model.createKey("/PriceAgreements", { ID: id });
			return this.odata(keyPath).get({ urlParameters: { $expand: "ConsumerPrice,OfferProduct,Materials,Institute,Tender/User,PriceConditions/PriceConditionClassification,PriceConditions/DiscountCondition,PriceConditions/FreeGoodsOther/ProductPack,PriceConditions/Settlement,Product/ProductPack,CustomerPrices,Deliveries,FOC,MaterialsFOC,MaterialsFOC/FreeGoodsOther,MaterialsFOC/FreeGoodsOther/Materials,SettlementDates,MasterPrices" } });
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

		getRoyalDecree: function (productCode) {
			const today = new Date();
			const filters = [];
			filters.push(new Filter({
				path: 'ProductPackID',
				operator: FilterOperator.EQ,
				value1: productCode
			}));
			// get only the valid values from DB. 	
			filters.push(new Filter({
				path: 'ValidTo',
				operator: FilterOperator.GT,
				value1: today.toJSON().substring(0,10) 
			}));
			return this.odata("/RoyalDecree").get({ filters: filters });
		},

		//EHQUT-199066-Italy – Brand filter in Price Agreements
		loadBrandProductNameList: function ( sCountryCode) {

			//set filters
			const filters = [];
			filters.push(
				new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, sCountryCode),
				
			);
			

			return this.odata("/PriceAgreementProductNames").get({ filters: filters });
			

		},

		updatePriceAgreement: function (priceAgreement) {

			const data = priceAgreement.getJSON();

			const sKey = this.model.createKey("/PriceAgreements", {
				ID: data.ID
			});

			return this.odata(sKey).put(data,{refreshAfterChange:false});

		},
        //EHQUT-Italy Synchronise Button enable
        // getCustomerPrics : function(priceAgreementID, material){
        //     var aFilters = [];

        //     aFilters.push(new Filter({
        //         path: 'PriceAgreementId',
        //         operator: FilterOperator.EQ,
        //         value1: priceAgreementID

        //     }))

        //     aFilters.push(new Filter({
        //         path: 'MaterialNumber',
        //         operator: FilterOperator.EQ,
        //         value1: material
        //     }))

		// 	var mParameters = {
		// 		filters: aFilters

		// 	};

		// 	return this.odata("/CustomerPrices").get(mParameters);
		// },
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

		updateTenderOwner: function(tender) {

			const data = tender.getJSON();

			if(data.TenderID) {
				const sKey = this.model.createKey("/PT_TMTEND", {
					TenderID: data.TenderID
				});

				return this.odata(sKey).put(data);
			}
		},

        deleteCustomerPrice: function (customerPrice) {

			let sKey = this.model.createKey("/CustomerPrices", {
				ID: customerPrice.iD
			});
			return this.odata(sKey).delete();

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

        getNewMaterials: function (id) {		

			if (!id) {
				return "Please provide price agreement ID.";
			}

			var aFilters = [];

            aFilters.push(new Filter({
                path: 'PriceAgreementId',
                operator: FilterOperator.EQ,
                value1: id.priceAgreementId
            }))

            aFilters.push(new Filter({
                path: 'isNew',
                operator: FilterOperator.EQ,
                value1: true
            }))

			var mParameters = {
				filters: aFilters

			};

			return this.odata("/NewMaterialsView").get(mParameters);
		},
		//EJUVE-CR3 START
		createApproval: function (oApprovalToSave) {


			var that = this;

			//path of offer that is selected
			var sPath = "/PriceAgreement_APPRST";

			//Create
			return that.odata(sPath).post(oApprovalToSave);

		},
		// EJUVE-CR3 END
		//EJUVE-CR9 START
		getPriceAgreementsByMaterialNumberAndCustomerId: function (priceAgreementId, productPackId, instituteId) {
			const filters = [];
			var orfilters=[];
			filters.push(new Filter({
				path: 'ID',
				operator: FilterOperator.NE,
				value1: priceAgreementId
			}));
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
			orfilters.push(new Filter({
                path: 'Status',
                operator: FilterOperator.EQ,
                value1: null
            }));
            orfilters.push(new Filter({
                path: 'Status',
                operator: FilterOperator.EQ,
                value1: ''
            }));
            filters.push(new sap.ui.model.Filter(orfilters, false));
			
			return this.odata("/PriceAgreements").get({ filters: filters });
		},
		getPriceAgreements: function (priceAgreementId) {
			const filters = [];
			filters.push(new Filter({
				path: 'ID',
				operator: FilterOperator.EQ,
				value1: priceAgreementId
			}));

			return this.odata("/PriceAgreements").get({ filters: filters });
		},
		updatePriceAgreementCancel: function (priceAgreement) {

			const data = priceAgreement.getJSON();

			const sKey = this.model.createKey("/PriceAgreements", {
				ID: data.ID
			});

			return this.odata(sKey).put(data, { refreshAfterChange: false });

		},
		getCustomerPrices: function (priceAgreementId) {
			const filters = [];
			filters.push(new Filter({
				path: 'PriceAgreementId',
				operator: FilterOperator.EQ,
				value1: priceAgreementId
			}));

			return this.odata("/CustomerPrices").get({ filters: filters });
		},
		deletePriceAgreement: function (customerPrice) {

			let sKey = this.model.createKey("/CustomerPrices", {
				ID: customerPrice
			});
			return this.odata(sKey).delete();

		},
		//EJUVE-CR9 END
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
		}/*,

		syncFocCustPrices: function (ids) {

			if (!ids || !Array.isArray(ids) || ids.length <= 0) return "You must provide a list of PriceAgreement IDs";

			const data = {
				"ids": ids
			};

			return this.odata("/syncFocCustPrices").post(data);

		},*/

	});
	return PriceAgreementService;
});