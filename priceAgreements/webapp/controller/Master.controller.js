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
	"sap/m/MessageBox",
	"sap/m/Dialog",
	"sap/m/MessageToast",
	"sap/m/Token",
	"sap/m/Tokenizer",
	"sap/ui/core/BusyIndicator",
	"sap/m/library"
	
], function (BaseController, JSONModel, Filter,FilterType, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter,MessageBox,Dialog,MessageToast,Token,Tokenizer, BusyIndicator,mLib) {
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

            //needed to get correct filters when navigating from tender or refreshing
            this.correctFilters = 0;
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
            if(this.paState.getPriceAgreementInstance().iD && this.correctFilters === 0 && !this.paState.refreshAfterSave ) {
                this.onChangeCountryFilter();
                // set to 1 so we don't re-execture this code
                this.correctFilters = 1;
            };

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
		//EHQUT-199067-Italy – Price Agreements multiple selection
		onSelectionChange : function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");
				var CountryCode=this.getModel("pa").oData.selectedCountryFilter;
				if(CountryCode === 'IT'){
					this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
				}else{
			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
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

		//EHQUT-383702-Spain -search Division filter
		setFilter: function (oSelection) {

			var orFilters = [];
			var andFilters = [];
			const slctfilterSelectedItem = this.byId("idslctfilter").getSelectedItem();
			const slctfilterSelectedItemKey = slctfilterSelectedItem && slctfilterSelectedItem.getKey().toLowerCase();
			var oDivision = this.byId("idDivisionES").getSelectedItem()? this.byId("idDivisionES").getSelectedItem().getKey() : '';
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

                let oFilterCC = (andFilters.length > 0 && new sap.ui.model.Filter(andFilters, true)) || [];
                //filter the product dropdown filter, based on the selected country code
                //this could not be handled in the view, as the filters property does not allow dynamic parameters coming from the model
                this.byId('idProductPackfilter').getBinding("items")?.filter(oFilterCC, FilterType.Application);
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

                orFilters.push(new Filter({
					path: "OfferId",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "OfferProduct/Offer/Division",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				orFilters.push(new Filter({
					path: "MaterialsList",
					operator: FilterOperator.Contains,
					value1: sSearch,
					caseSensitive: false
				}));

				if(/^\d+$/.test(sSearch)){
					orFilters.push(new Filter({
						path: "Institute/CustomerID",
						operator: FilterOperator.EQ,
						value1: parseInt(sSearch)
					}));
				}

				andFilters.push(new Filter(orFilters, false));
			}

			if(updatedRetailPriceFilter){
				andFilters.push(new Filter("hasNewPrice", "EQ", updatedRetailPriceFilter));
			}

			if(hasNewMaterialsFilter){ 
				andFilters.push(new Filter("hasNewMaterials", "EQ", hasNewMaterialsFilter));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

			// enabled/disable the ApplyNewPrice button 
			if(hasNewMaterialsFilter || updatedRetailPriceFilter){ 
				this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", true); 
			}else{
				this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", false);
			}

			const productPackfilter = this.byId("idProductPackfilter").getSelectedKey();

			if(productPackfilter){
				andFilters.push(new Filter("hasProductPackId", "EQ", productPackfilter));
			}

			if(expiringSoonFilter){
				andFilters.push(new Filter("ExpiringSoon", "EQ", true));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

            if(expiredFilter){
				andFilters.push(new Filter("Expired", "EQ", true));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

            if(cancelledFilter){
                andFilters.push(new Filter("isCancelled", "EQ", true));
            }

			if(newAgreementFilter){
				andFilters.push(new Filter("isNewPriceAgreement", "EQ", true));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

			if(activeAgreementsFilter){
				// active agreement = expiry date in future + synchronized
				andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
				andFilters.push(new Filter("Synchronized", FilterOperator.EQ, true));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

			if(toBeSyncedFilter){
				// to be synchronized = expiry date in future + not synchronized
				andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
				andFilters.push(new Filter("Synchronized", FilterOperator.EQ, false));
				andFilters.push(new Filter("AppliedCount", FilterOperator.GE, 1));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}
			if (oDivision !== "All") {
				andFilters.push(new sap.ui.model.Filter("Division", "EQ", oDivision));
			}
            if(updatedPVLFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 1));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}

            if(updatedConfidentialPriceFilter){
				andFilters.push(new Filter("hasNewYLAP", "EQ", 1));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}
            if(netPriceAbovePVLFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 3));
                andFilters.push(new Filter("hasNewYLAP", "EQ", 3));
                andFilters.push(new Filter("isCancelled", "EQ", false));
			}
            if(netPriceBelowFloorPriceFilter){
				andFilters.push(new Filter("hasNewYLLP", "EQ", 4));
                andFilters.push(new Filter("hasNewYLAP", "EQ", 4));
                andFilters.push(new Filter("isCancelled", "EQ", false));
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
			//EHQUT-199067-Italy – Price Agreements multiple selection
			var CountryCode=this.getModel("pa").oData.selectedCountryFilter;
			if(CountryCode === 'IT'){
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
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
			//EHQUT-199067-Italy – Price Agreements multiple selection
			const _that = this;
			var priceAgreementsTableItems;
			var CountryCode=this.getModel("pa").oData.selectedCountryFilter;
			
			if(CountryCode === 'IT'){
				priceAgreementsTableItems = this.byId("list").getSelectedItems();
			}else{
				priceAgreementsTableItems = this.byId("list").getItems();
			}
			//EHQUT-199067-Italy – Price Agreements multiple selection
			//const priceAgreementsTableItems = this.byId("list").getItems();
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
                    await Promise.all(priceAgreements.map(pr => pr.CountryCode === 'IT' ? _that.applyNewSKU.call(_that, pr) : _that.applyNewSKUSpain.call(_that, pr)));

					// synchronize with sap backend
					 await _that.paState.syncPriceAgreements(priceAgreementIDs);

					// synchronize with sap backend
					//await _that.paState.syncFocCustPrices(priceAgreementIDs);

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
			//EHQUT-227400-Price error in massive apply price due to SKU change
			// update the Price Agreement price
			//priceAgreement.Price = newNetOfferPrice;
			if((newNetOfferPrice !== 0 && priceAgreement.CountryCode === 'IT') || priceAgreement.CountryCode === 'ES'){
				priceAgreement.Price = newNetOfferPrice;
			}

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
                newSKUs.map(sku => sku.priceCondition = acp.priceCondition);
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
		//EHQUT-199066-Italy – Brand filter in Price Agreements
		onAddProductForOffer: async function (oEvent) {

			
			this.getModel("pa").setProperty("/ProductCollection", null);
			this.getModel("pa").setProperty("/products", null);

 			//if dialog exists destroy it first, so we always set dialog buttons in correct state
			if (this._oDialog) {
				this._oDialog.destroy();
			}

			this._oDialog = new sap.m.Dialog("addBrandProductDialog", {
				title: "Add Product",
				stretch: true,
				horizontalScrolling:false,
				verticalScrolling:false,
				buttons: [new sap.m.Button({
						id: "idApplyButton",
						text: "Apply",
						enabled: true,
						tap: [this.onPriceAddProductDialogConfirm, this]

					})

				],
				//content with all fields that need to be filled
				content: [sap.ui.xmlfragment(this.getView().getId(), "com.bayer.tender.priceagreements.view.fragments.BrandProductList", this)]
					// End of content of dialog
			});

			this.getView().addDependent(this._oDialog);
			this._oDialog.open();

			//Clear all fields
			 var oBrandList = this.byId("idPriceBrandList");
			var aBrandTokens = [];
			oBrandList.setTokens(aBrandTokens);

		},

		//EHQUT-199066-Italy – Brand filter in Price Agreements
		onPriceAddProductDialogConfirm:function(){
			var oFastAppDataModel=this.getModel("pa");
			var productlist=oFastAppDataModel.getProperty("/products");
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
	
					let oFilterCC = (andFilters.length > 0 && new sap.ui.model.Filter(andFilters, true)) || [];
					this.byId('idProductPackfilter').getBinding("items")?.filter(oFilterCC, FilterType.Application);
				}
				if(productlist!== null){
					if(productlist.length>0){
						for(var i=0;i<productlist.length;i++){
							orFilters.push(new sap.ui.model.Filter("ProductPackId", sap.ui.model.FilterOperator.EQ, productlist[i].ProductPackId));
							
						}
						andFilters.push(new sap.ui.model.Filter(orFilters, false));
					}
	
				
				if(updatedRetailPriceFilter){
					andFilters.push(new Filter("hasNewPrice", "EQ", updatedRetailPriceFilter));
				}
	
				if(hasNewMaterialsFilter){ 
					andFilters.push(new Filter("hasNewMaterials", "EQ", hasNewMaterialsFilter));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				// enabled/disable the ApplyNewPrice button 
				if(hasNewMaterialsFilter || updatedRetailPriceFilter){ 
					this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", true); 
				}else{
					this.getView().getModel("masterView").setProperty("/btnApplyNewPriceEnabled", false);
				}
	
				const productPackfilter = this.byId("idProductPackfilter").getSelectedKey();
	
				if(productPackfilter){
					andFilters.push(new Filter("hasProductPackId", "EQ", productPackfilter));
				}
	
				if(expiringSoonFilter){
					andFilters.push(new Filter("ExpiringSoon", "EQ", true));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(expiredFilter){
					andFilters.push(new Filter("Expired", "EQ", true));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(cancelledFilter){
					andFilters.push(new Filter("isCancelled", "EQ", true));
				}
	
				if(newAgreementFilter){
					andFilters.push(new Filter("isNewPriceAgreement", "EQ", true));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(activeAgreementsFilter){
					// active agreement = expiry date in future + synchronized
					andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
					andFilters.push(new Filter("Synchronized", FilterOperator.EQ, true));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(toBeSyncedFilter){
					// to be synchronized = expiry date in future + not synchronized
					andFilters.push(new Filter("Expired", FilterOperator.EQ, false));
					andFilters.push(new Filter("Synchronized", FilterOperator.EQ, false));
					andFilters.push(new Filter("AppliedCount", FilterOperator.GE, 1));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(updatedPVLFilter){
					andFilters.push(new Filter("hasNewYLLP", "EQ", 1));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(updatedConfidentialPriceFilter){
					andFilters.push(new Filter("hasNewYLAP", "EQ", 1));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
				if(netPriceAbovePVLFilter){
					andFilters.push(new Filter("hasNewYLLP", "EQ", 3));
					andFilters.push(new Filter("hasNewYLAP", "EQ", 3));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
				if(netPriceBelowFloorPriceFilter){
					andFilters.push(new Filter("hasNewYLLP", "EQ", 4));
					andFilters.push(new Filter("hasNewYLAP", "EQ", 4));
					andFilters.push(new Filter("isCancelled", "EQ", false));
				}
	
				if(andFilters.length > 0){
					var oFilters = new Filter(andFilters, true);
	
					//Binding to table with the filters and the sorters
					this.getView().byId("list").getBinding("items").filter(oFilters, FilterType.Application);
					this._oDialog.close();
				}else{
					this.getView().byId("list").getBinding("items").aApplicationFilters = [];
					this.getView().byId("list").getBinding("items").filter();
					this._oDialog.close();
					
				}
			
				
			}else{
				this._oDialog.close();
			}
			},

			//EHQUT-199066-Italy – Brand filter in Price Agreements
			brandNameList_f4: function () {

				//that is this
				var that = this;
					
				//selection
				var sCountryCode=this.getModel("pa").oData.selectedCountryFilter;
				var aBrandTokens = [];
				this.aBrandProducts = [];
	
					//load the corresponding products for the input list
					$.when(this.paState.loadBrandProductNameList(sCountryCode)).done(function (oData) {
	
						//check if results are found
						if (oData && oData.data.results.length > 0) {
	
							//keep brand products
							that.aBrandProducts = oData.data.results;
	
							var aUniqueBrands = Array.from(new Set(oData.data.results.map(x => x.BRAND_ID)))
							.map(BRAND_ID => {
								return {
									BRAND_ID: BRAND_ID,
									BRAND_NAME: oData.data.results.find(x => x.BRAND_ID === BRAND_ID).BRAND_NAME
								};
							});
							
							aUniqueBrands.sort((a,b)=> ( a.BRAND_NAME.localeCompare(b.BRAND_NAME))); 
							
					var oBrandResults = {
						results: aUniqueBrands
					};
					
							//binding statemodel to value help popup
							var stateModel = new sap.ui.model.json.JSONModel();
							stateModel.setData(oBrandResults);
							if (!that._valueHelpSelectBrandDialog) {
								that._valueHelpSelectBrandDialog = new sap.m.TableSelectDialog({
									title: that.getResourceBundle().getText("brandname"),
									multiSelect: true,
									rememberSelections: true,
									growing: true,
									growingThreshold :100,
									items: {
										path: "/results",
										template: new sap.m.ColumnListItem({
											selected: "{selected}",
											cells: [
												new sap.m.Text({
												text: "{BRAND_NAME}"
												 })
												]
											
										})
									},
									columns:new sap.m.Column({
											
											header: new sap.m.Label({
												text: "Brand"
											})
										
									}),
								
									liveChange: function (oEvent) {
										var sValue = oEvent.getParameter("value");
										var oFilters = [];
										oFilters.push(new sap.ui.model.Filter("BRAND_NAME", sap.ui.model.FilterOperator.Contains, sValue));
										oFilters.push(new sap.ui.model.Filter("BRAND_ID", sap.ui.model.FilterOperator.Contains, sValue));
										oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter(oFilters, false));
									},
									confirm: function (oEvent) {
										that._handleCloseBrandNameList(oEvent);
									},
									cancel: function (oEvent) {
										that._handleCloseBrandNameList(oEvent);
									}
									
								});
							}
	
							that._valueHelpSelectBrandDialog.setModel(stateModel);
							
							that._valueHelpSelectBrandDialog.open();
	
						} else {
							MessageToast.show("There are no brands to display.");
						}
	
				});
	
			},

			//EHQUT-199066-Italy – Brand filter in Price Agreements
			onBrandTokenChange: function (oEvent) {

				var that = this;
				var oPriceDataModel = this.getModel("pa");
	
				//get multi input box
				var oBrandList = this.byId("idPriceBrandList");
				var oDefaultModel = Services.getDefaultModel();
	
				//Brands already existing in the multi input field
				that._aBrandTokens = oBrandList.getTokens();
	
				//added brands
				if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Added) {
					var aBrandsAdded = oEvent.getParameter("addedTokens");
					aBrandsAdded.forEach(function (iIndex, oBrandToken) {
						that._aBrandTokens.push(oBrandToken);
					});
				}
	
				//removed brands
				if (oEvent.getParameter('type') === Tokenizer.TokenUpdateType.Removed) {
					var aBrandsRemoved = oEvent.getParameter("removedTokens");
					aBrandsRemoved.forEach(function (oRemovedBrandToken, iIndex) {
						that._aBrandTokens = $.grep(that._aBrandTokens, function (oBrandToken) {
							return oBrandToken.getProperty("key") != oRemovedBrandToken.getProperty("key");
						});
					});
				}
	
	
				//load products for list
				if (that._aBrandTokens && that._aBrandTokens.length > 0) {
					$.when(Services.loadBrandProductNameList( sCountryCode)).done(function (oData) {
						//loaded products
	
						//path where the products should be stored
						var sPathProductCollection = "/ProductCollection";
	
						//path is updated with the products
						oPriceDataModel.setProperty(sPathProductCollection, oData.results);
	
						oProductInputList.getBinding("items").refresh(true);
						that.setScrollProductsInputContainter();
					});
				} else {
					//path for clearing
					var sPathProductCollection = "/ProductCollection";
	
					var aEmpty = [];
	
					//path is updated with the products
					oPriceDataModel.setProperty(sPathProductCollection, aEmpty);
	
					//refresh empty list
					oProductInputList.getBinding("items").refresh(true);
					
				}
			},
			// EHQUT-199066-Italy – Brand filter in Price Agreements
			_handleCloseBrandNameList: function (oEvent) {

				// //general
				var that = this;
				var oFastAppDataModel = that.getModel("pa");
	
				// //no selection anymore
				this.byId("idInfoToolbarInput").setVisible(false);
				var oListInput = this.byId("idPriceListProductsInput");
			   oListInput.removeSelections();
	
				//selected brands
				var aContexts = oEvent.getParameter("selectedContexts");
				if (aContexts && aContexts.length) {
	
					MessageToast.show("The following brands where selected: " + aContexts.map(function (oContext) {
						return oContext.getObject().BRAND_NAME;
					}).join(", "));
	
					//get multi input box
					var oBrandList = this.byId("idPriceBrandList");
					var aBrandTokens = [];
					var aBrands = [];
	
					//push the selected brands 
					aContexts.map(function (oContext) {
	
						var oToken = new Token({
							text: oContext.getObject().BRAND_NAME,
							key: oContext.getObject().BRAND_ID
						});
						aBrandTokens.push(oToken);
	
						//Brands for filtering
						var oBrand = {
							BRAND_ID: oContext.getObject().BRAND_ID
						}
						aBrands.push(oBrand);
					});
	
					//add the array of tokens to the multi input
					oBrandList.setTokens(aBrandTokens);
	
					//Filter brand products to find only the products of the selected brand
					const aFilteredBrandProducts = that.aBrandProducts.filter(
						(elem) => aBrands.find(({
							BRAND_ID
						}) => elem.BRAND_ID === BRAND_ID)
					);
	
					
					var sPathProductCollection = "/ProductCollection";
	
					//path is updated with the products
					oFastAppDataModel.setProperty(sPathProductCollection, aFilteredBrandProducts);
					//});
	
				} else {
	
					MessageToast.show("No new item was selected.");
	
				}
				oEvent.getSource().getBinding("items").filter([]);
				
			},
			//EHQUT-199066-Italy – Brand filter in Price Agreements
			onPressAddProductToOutputList: function(){ 
				const oSourceTable = this.byId("idPriceListProductsInput");
				const oSelectedItems = oSourceTable.getSelectedItems();
				const oSelectedProducts = oSelectedItems.map(item => item.getBindingContext("pa").getObject());
	
				oSelectedProducts.map(this.addSelectedProductToTarget.bind(this));
				this.getModel("pa").setProperty("/products",oSelectedProducts);
	
			},
			//EHQUT-199066-Italy – Brand filter in Price Agreements
			onPressRemoveProductFromOutputList:function(){
				const oTargetTable = this.byId("idPriceListProductsOutput");
				
				const oSelectedItem = oTargetTable.getSelectedItems();
				var oFastAppDataModel = this.getModel("pa");
				var aProducts=oFastAppDataModel.getProperty("/products");
				const oSelectedProducts = oSelectedItem.map(item => item.getBindingContext("pa").getObject());
				
				let index = aProducts.findIndex(x => x.ProductPackId === oSelectedProducts[0].ProductPackId);
				aProducts.splice(index,1);
				 oFastAppDataModel.setProperty("/products",aProducts);
	
				// refresh 
				oTargetTable.getBinding("items").refresh(true);
	
	
			},
			//EHQUT-199066-Italy – Brand filter in Price Agreements
			addSelectedProductToTarget: async function(product) { 
				const productPackId = product.ProductPackId;
	
				const bProductIsAlreadyAddedToTheTargetTable = this.paState.getProductByProductPackId(productPackId);
	
				if(bProductIsAlreadyAddedToTheTargetTable && !bProductIsAlreadyAddedToTheTargetTable.enabled){
					bProductIsAlreadyAddedToTheTargetTable.enabled = true;
	
					// update binding
					this.byId("idPriceListProductsOutput").getBinding("items").refresh(true);
				}else if(!bProductIsAlreadyAddedToTheTargetTable){
					this.paState.addProduct(product);
					this.paState.updateModel();
				}else {
					sap.m.MessageBox.show(`Product(${product.ProductName}) is already added.`, {
						title: "Error",
						icon: sap.m.MessageBox.Icon.ERROR
					});
				}
			},
			//EHQUT-199066-Italy – Brand filter in Price Agreements
			onSearchProductsInput: function(event){
			
				const searchValue = event.getParameter("newValue");
				const binding = this.getView().byId("idPriceListProductsInput").getBinding("items");
				const filters = ['ProductName'].map(filterPath => new Filter({
					path:filterPath,
					operator:FilterOperator.Contains,
					value1: searchValue
				}));
				binding.filter(new Filter({
					filters: filters
					
				}));
			},

        applyNewSKUSpain: async function(priceAgreement){
            await this.paState.saveCandidatePricesOnApplyPrices(priceAgreement.ID);
        },

	});

});