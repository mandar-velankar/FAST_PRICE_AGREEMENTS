sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterType",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, Filter,FilterType, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter,MessageBox) {
	"use strict";

	return BaseController.extend("com.bayer.tender.priceagreements.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();


			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter : [],
				aSearch : []
			};

			this.setModel(oViewModel, "masterView");

             

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.paState = this.getOwnerComponent().getState(this.getOwnerComponent().PA);
			this.setModel(this.paState.getModel(), "pa");

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("ID", FilterOperator.Contains, sQuery)];
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onOpenViewSettings : function (oEvent) {
			var sDialogTab = "filter";
			if (oEvent.getSource() instanceof sap.m.Button) {
				var sButtonId = oEvent.getSource().getId();
				if (sButtonId.match("sort")) {
					sDialogTab = "sort";
				} else if (sButtonId.match("group")) {
					sDialogTab = "group";
				}
			}
			// load asynchronous XML fragment
			if (!this.byId("viewSettingsDialog")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "com.bayer.tender.priceagreements.view.ViewSettingsDialog",
					controller: this
				}).then(function(oDialog){
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {
				this.byId("viewSettingsDialog").open(sDialogTab);
			}
		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog : function (oEvent) {

			this._applySortGroup(oEvent);
		},

		/**
		 * Apply the chosen sorter and grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */
		_applySortGroup: function (oEvent) {
			var mParams = oEvent.getParameters(),
				sPath,
				bDescending,
				aSorters = [];
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			
			const oTable = this.byId("list");
			oTable.getBinding("items").sort(aSorters);
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange : function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed : function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader : function (oGroup) {
			return new GroupHeaderListItem({
				title : oGroup.text,
				upperCase : false
			});
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack : function() {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel : function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "ID",
				groupBy: "None",
				btnApplyNewPriceEnabled: false,
				btnApplyNewSkuEnabled: false,
			});
		},

		_onMasterMatched :  function() {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				objectId : oItem.getBindingContext().getProperty("ID")
			}, bReplace);
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount : function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch : function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar : function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},
		onChangeCountryFilter:function(event){
			this.paState.setFiltersByCountry();
			this.setFilter(event);
		},
		setFilter: function (oSelection) {

			var orFilters = [];
			var andFilters = [];
			const slctfilterSelectedItem = this.byId("idslctfilter").getSelectedItem();
			const slctfilterSelectedItemKey = slctfilterSelectedItem && slctfilterSelectedItem.getKey().toLowerCase();
			//get filters
			var hasNewMaterialsFilter = slctfilterSelectedItemKey === 'newmaterialnumberskey';
			const updatedRetailPriceFilter = slctfilterSelectedItemKey === 'updatedretailpricekey';
			const expiringSoonFilter = slctfilterSelectedItemKey === 'expiringsoonkey';
			const newAgreementFilter = slctfilterSelectedItemKey === 'newagreementskey';
            const expiredFilter = slctfilterSelectedItemKey === 'expiredkey';
            const cancelledFilter = slctfilterSelectedItemKey === 'cancelledkey';
            const activeAgreementsFilter = slctfilterSelectedItemKey === 'activeagreements';
            const toBeSyncedFilter = slctfilterSelectedItemKey === 'tobesynced';
            const updatedPVLFilter = slctfilterSelectedItemKey === 'updatedpvlkey';
            const updatedConfidentialPriceFilter = slctfilterSelectedItemKey === 'updatedconfidentialpricekey';
            const netPriceAbovePVLFilter = slctfilterSelectedItemKey === 'netpriceabovepvlkey';
            const netPriceBelowFloorPriceFilter = slctfilterSelectedItemKey === 'netpricebelowfloorpricekey';
            const oCountry = this.byId("idSlctCountry").getSelectedItem() ? this.byId("idSlctCountry").getSelectedItem().getKey() : "";
			
			if (oCountry != ""){
				andFilters.push(new Filter("CountryCode", "EQ", oCountry));
			}

			let sSearch = this.byId("idSearch").getProperty("value");

			if (sSearch.length > 0) {

				orFilters.push(new Filter({
					path: "TenderId",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Tender/ExternalID",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Tender/SAPID",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Tender/TenderName",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Product/ProductPack/PRODUCTPACKNAME",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Tender/Classification",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Institute/InstituteName",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "Tender/User/UserName",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				andFilters.push(new Filter(orFilters, false));
			}

			if(updatedRetailPriceFilter){
				andFilters.push(new Filter("hasNewPrice", "EQ", updatedRetailPriceFilter));
			}

			if(hasNewMaterialsFilter){ 
				andFilters.push(new Filter("hasNewMaterials", "EQ", hasNewMaterialsFilter));
			}

			// enabled/disable the ApplyNewPrice button 
			if(hasNewMaterialsFilter || updatedRetailPriceFilter){ 
				this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", true); 
			}else{
				this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", false);
			}

			const productPackfilter = this.byId("idProductPackfilter").getSelectedKey();

			if(productPackfilter){
				andFilters.push(new Filter("ProductPackId", "EQ", productPackfilter));
			}

			if(expiringSoonFilter){
				andFilters.push(new Filter("ExpiringSoon", "EQ", true));
			}

            if(expiredFilter){
				andFilters.push(new Filter("Expired", "EQ", true));
			}

            if(cancelledFilter){
                andFilters.push(new Filter("isCancelled", "EQ", true));
            }

			if(newAgreementFilter){
				andFilters.push(new Filter("isNewPriceAgreement", "EQ", true));
			}

			if(activeAgreementsFilter){
				// active agreement = expiry date in future + synchronized
				andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
				andFilters.push(new Filter("Synchronized", FilterOperator.EQ, true));
			}

			if(toBeSyncedFilter){
				// to be synchronized = expiry date in future + not synchronized
				andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
				andFilters.push(new Filter("Synchronized", FilterOperator.EQ, false));
				andFilters.push(new Filter("AppliedCount", FilterOperator.GE, 1));
			}

            if(updatedPVLFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 1));
			}

            if(updatedConfidentialPriceFilter){
				andFilters.push(new Filter("hasNewYLAP", "EQ", 1));
			}
            if(netPriceAbovePVLFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 3));
                andFilters.push(new Filter("hasNewYLAP", "EQ", 3))
			}
            if(netPriceBelowFloorPriceFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 4));
                andFilters.push(new Filter("hasNewYLAP", "EQ", 4))
			}

			if(andFilters.length > 0){
				var oFilters = new Filter(andFilters, true);

				//Binding to table with the filters and the sorters
				this.getView().byId("list").getBinding("items").filter(oFilters, FilterType.Application);
			}else{
				this.getView().byId("list").getBinding("items").aApplicationFilters = [];
				this.getView().byId("list").getBinding("items").filter();
			}
			
			if (this.getView().byId("list").getBinding("items").isSuspended()) {
				this.getView().byId("list").getBinding("items").resume();
			}

		},

        /**
		 * Get list of countries 
		 */
        getCountries: function(){
			this.getView().setBusy(true);

			return this.paState.getCountries()
			.then(() => {
				this.getView().setBusy(false);
			})
			.catch((error) => {
				console.error(error);
				this.getView().setBusy(false);
				this.getRouter().getTargets().display("detailObjectNotFound");
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				this.getView().setBusy(true);
				this.showNoAccessMessage("User ID doesn't have access");
				throw(error);
			});
		},        

		onProductPackIdsReceived: function(evt){
			// add empty item
			this.byId("idProductPackfilter").insertItem(new sap.ui.core.Item());
		},

        onUserCountriesReceived: function(evt){
			// add empty item
            let oCountryFilter = this.byId("idSlctCountry");
            // if(oCountryFilter.getItems().length > 1){
            //     oCountryFilter.insertItem(new sap.ui.core.Item());
            // } else if(oCountryFilter.getItems().length === 1){
                oCountryFilter.setSelectedKey(oCountryFilter.getItems()[0].getKey());
            // }
            // this.setFilter();
			this.onChangeCountryFilter(evt);
		},

		/**
		 * Apply the new Price to all of the existing Customer prices, 
		 * which means creating new entries for CustomerPrices 
		 * (same InstituteID/ProductPackID but with new MaterialNumber and ValidFrom as today's date)
		 * @param {Object} evt - Event object
		 */
		onApplyNewPricePress: function(evt){

			const _that = this;
			const priceAgreementsTableItems = this.byId("list").getItems();
			const priceAgreements = priceAgreementsTableItems.map(item => item.getBindingContext().getObject());
			const priceAgreementIDs = priceAgreements.map(pr => pr.ID);
			const filterTxt = this.byId("idslctfilter").getSelectedItem().getText();

			if(priceAgreements.length <= 0){
				MessageBox.warning(`There are no Price Agreements with ${filterTxt}.`);
				return;
			}

			const _fnOnClose = async function(sAction){

				if (sAction === "YES") {

					_that.getView().setBusyIndicatorDelay(0);
					_that.getView().setBusy(true);

					// apply the new price on each price agreement
					await Promise.all(priceAgreements.map(pr => _that.applyNewPrice.call(_that, pr)));

					// apply new SKU on each price agreement
					await Promise.all(priceAgreements.map(pr => _that.applyNewSKU.call(_that, pr)));

					// synchronize with sap backend
					await _that.paState.syncPriceAgreements(priceAgreementIDs);

					// synchronize with sap backend
					await _that.paState.syncFocCustPrices(priceAgreementIDs);

					// clear the filter and refresh the binding
					_that.byId("idslctfilter").setSelectedKey();
					_that.getView().byId("list").getBinding("items").aApplicationFilters = [];
					_that.getView().byId("list").getBinding("items").filter();

					_that.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", false);

					// navigate to master page
					_that.getOwnerComponent().oListSelector.clearMasterListSelection();
					_that.getRouter().navTo("master");

					_that.getView().setBusy(false);
				
				} 

			};

			MessageBox.warning("Are you sure you want to apply the new price to all of the existing customer prices?", {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				styleClass: "sapUiSizeCompact",
				onClose: _fnOnClose
			});
			
		},

		/**
		 * Calculates newNetOfferPrice from the ConsumerPrice (master data update),
		 * updates the PriceAgreement ListPrice and RetailPrice with the ConsumerPrice and 
		 * updates the CustomerPrices, if any available, whith the newly calculated newNetOfferPrice
		 * 
		 * @param {Object} priceAgreement 
		 * @returns {Promise}
		 */
		applyNewPrice: async function(priceAgreement){

			if(!priceAgreement.ConsumerPrice){
				return;
			}

			const uom = priceAgreement.UoM;
			//only works when already viewed in detail - otherwise will be empty
			// const customerPricesPaths = priceAgreement.CustomerPrices.__list;
			
			const consumerPrice = this.getView().getModel().getProperty(`/${priceAgreement.ConsumerPrice.__ref}`);

			// calulate the new NetOfferPrice
			let newNetOfferPrice = "";
			if(uom === "Pack"){
				newNetOfferPrice = consumerPrice.MaxPriceNhsPP * (1 - priceAgreement.Discount / 100);
				// update the PriceAgreement prices
				priceAgreement.ListPrice = consumerPrice.ConsumerPriceExclPP;
				priceAgreement.RetailPrice = consumerPrice.MaxPriceNhsPP;
			}else{
				newNetOfferPrice = consumerPrice.MaxPriceNhsPU * (1 - priceAgreement.Discount / 100);
				// update the PriceAgreement prices
				priceAgreement.ListPrice = consumerPrice.ConsumerPriceExclPU;
				priceAgreement.RetailPrice = consumerPrice.MaxPriceNhsPU;
			}

			// update the Price Agreement price
			priceAgreement.Price = newNetOfferPrice;

			// update CustomerPrices, if any available, whith the newly calculated newNetOfferPrice
			// const customerPrices = customerPricesPaths.map(path => {
			// 	const customerPriceObj = this.getView().getModel().getProperty(`/${path}`);
			// 	customerPriceObj.Price = newNetOfferPrice;
			// 	return this.paState.createCustomerPriceObject(customerPriceObj);
			// });
			

			// save changes
			
			const saveCustomerPricePromises = await this.paState.updateCustomerPrices(priceAgreement);//,newNetOfferPrice);
			const savePriceAgreement = this.paState.savePriceAgreement(this.paState.createPriceAgreementObject(priceAgreement));
			
			return await Promise.all(saveCustomerPricePromises, savePriceAgreement);

		},

		/**
		 * Creates CustomerPrices for new SKU. 
		 * New SKU is a records of CandidatePrices for which a CustomerPrice with the same 
		 * InstituteID and ProductPackId but a different Material number exists.
		 * @param {Object} priceAgreement 
		 * @returns {Promise}
		 */
		applyNewSKU: async function(priceAgreement){

			const candidatePrices = await this.paState.getCandidatePrices({
				priceAgreementId: priceAgreement.ID
			});

			const appliedCandidatePrices = candidatePrices.filter(cp => cp.applied);
			const newSKUsWithoutCustomerPrice = [];

			appliedCandidatePrices.forEach(acp => {
				const newSKUs = candidatePrices.filter(cp => !cp.applied && cp.instituteId === acp.instituteId);
				newSKUsWithoutCustomerPrice.push(...newSKUs);
			});

			// Create CustomerPrices
			await Promise.all(newSKUsWithoutCustomerPrice.map(candidate => {

				candidate.applied = true;
				//candidate.price = priceAgreement.Price;
				candidate.validFrom = new Date();
                candidate.validTo = priceAgreement.ExpiryDate;

				const customerPrice = this.paState.createCustomerPriceObject(candidate.getJSON());
				
				return this.paState.saveCustomerPrice(customerPrice);
			}));

		},

	});

});