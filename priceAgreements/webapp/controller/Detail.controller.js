sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterType",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"com/bayer/tender/uilib/datatypes/PercentageType",
	"sap/ui/core/BusyIndicator"
], function (BaseController, JSONModel, formatter, mobileLibrary, Filter, FilterType,FilterOperator, MessageBox, Fragment, PercentageType,BusyIndicator) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("com.bayer.tender.priceagreements.controller.Detail", {

		formatter: formatter,
		types: {
			percent: PercentageType
		},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.oOwnerComponent.getRouter();

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
                selectedProductUoM: ""
			});
			this.paState = this.getOwnerComponent().getState(this.getOwnerComponent().PA);
			this.setModel(this.paState.getModel(), "pa");

			this.oObjectPageLayout = this.byId("DetailPage");
			this.paState.setDetailPage(this.oObjectPageLayout);

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("objectDetail").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");
			 
		},


		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},


		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {

			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);
			this.sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			this.getModel().metadataLoaded().then(function () {
				this.paState.getPriceAgreement(this.sObjectId).then(function (priceAgreement) {
					this.paState.setSelectedCountry(priceAgreement.countryCode);
                    this._setSelectedProductUoM(this.paState.getPriceAgreementInstance().uoM);
					this.addCountryDetailFragments(priceAgreement.countryCode);
                }.bind(this)).then(function(){
					this.refreshMaster();
				}.bind(this));
				// this.paState.getCandidatePrices(this.sObjectId, null);
			}.bind(this))
		},

		addCountryDetailFragments: function(sCountryCode){
			// clear the objectPage first
            const objectPage = this.byId("DetailPage");
			objectPage.destroySections();

            const sFragmentPath = "com.bayer.tender.priceagreements.view.fragments";

            if(sCountryCode) {
				Fragment.load({
					id: this.getView().getId(),
					name: sFragmentPath.concat(".Detail_",sCountryCode),
					controller: this
				})
				.then(function (ObjectPageSection) {
					if(ObjectPageSection.getMetadata().getName() === "sap.uxap.ObjectPageSection"){                
						objectPage.addSection(ObjectPageSection);
						this.getView().setBusy(false);
					}
				}.bind(this));
            }
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},


		onMaterialNumberChange: function () {
			// set filter
			const selectedMaterial = parseInt(this.byId("idMaterialNumberSelect").getSelectedItem().getKey());
			if (selectedMaterial) {
				this.paState.getCandidatePrices({
					priceAgreementId: this.sObjectId,
					materialNumber: selectedMaterial
				});
			} else {
				this.paState.getCandidatePrices({
					priceAgreementId: this.sObjectId,
				});
			}
		},

		onEditModePress: function () {
			const bValid = this._validateEditMode();
			if(bValid) this.paState.setEditMode(true);
		},
		
		_validateEditMode: function(){
			const countryCode = this.paState.getProperty("priceAgreement").getTender().getCountryCode();
			const bValid = this._validateCountryEditMode(countryCode);
			return bValid;
		},

		_validateCountryEditMode: function(countryCode){
			const tender = this.paState.getProperty("priceAgreement").getTender();
			const bSynchronised = this.paState.getProperty("priceAgreement").synchronized;
			if(countryCode === "ES"){
				if(bSynchronised && tender.getClassification() === "Commercial Agreement"){
					MessageBox.error("This commercial agreement is already synchronised with SAP. \nCommercial agreements cannot be extended. A new commercial agreement must be created to proceed.");
					return false;
				}
			}
			return true;
		},

		handleDateChange: function (oEvent) {
			var valid = oEvent.getParameter("valid");

			const isValid = this.paState.getPriceAgreementInstance().setExpiryDateValueState(valid ? "None" : "Error");
			this.paState.updateModel();
		},

        handleEffectiveDateChange: function (oEvent) {
			var valid = oEvent.getParameter("valid");

			const isValid = this.paState.getPriceAgreementInstance().setEffectiveDateValueState(valid ? "None" : "Error");
			this.paState.updateModel();
		},


		onFooterCancelPress: function (oEvent) {
			const onClose = (action) => {
				if (action === MessageBox.Action.YES) {
					this.paState.setEditMode(false);
					this.paState.restorePriceAgreement();
                    let candidatePrices = this.paState.getPriceAgreementInstance().getCandidatePrices();
                    this.paState.setAllApplied(candidatePrices.length > 0 && candidatePrices.every(candidatePrice => candidatePrice.applied === true));
				}
			};
			MessageBox.warning(this.getText("confirmCancel"), {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: MessageBox.Action.YES,
				onClose: onClose
			});
		},
		setBusy: function (status) {
			const viewModel = this.getModel("detailView");
			const detailView = this.getView();

			viewModel.setProperty("/busy", status);

			detailView.setBusyIndicatorDelay(0);
			detailView.setBusy(status);
		},
		refreshMaster: function () {
			const oMasterTable = this.getOwnerComponent().oListSelector._oList; 
			const oMasterTableBinding = oMasterTable.getBinding("items");
			if(oMasterTable.getItems().length === 0){
				BusyIndicator.show(0);
				oMasterTableBinding.attachDataReceived(function(){
					BusyIndicator.hide();
				});
				oMasterTableBinding.filter(new Filter("CountryCode", "EQ", this.paState.getSelectedCountry()), FilterType.Application);
			}
			return oMasterTable.getBinding("items");
		},
		onFooterSavePress: async function (oEvent) {
			const isValid = this.paState.getPriceAgreementInstance().isValid();
			this.paState.updateModel();
			if (!isValid || !this.byId("expiryDateID").isValidValue() || !this.byId("effectiveDateId").isValidValue()) {
				MessageBox.error(this.getText("requiredFields"));
				return false;
			}
            if(this.byId("idExtendExpiry") && this.byId("idExtendExpiry")?.getSelected() === true && (this.byId("idExtendExpiryDateID").getValue() > 12 || this.byId("idExtendExpiryDateID").getValue() === 0 )){
                MessageBox.error(this.getText("errorExpiry"));
                return false;
            }
			//expiry date changed + already synchronized ==> price agreement in SAP should be cancelled first
			Promise.resolve(((this.paState.hasPAExpiryDateChanged() || this.paState.hasPAEffectiveDateChanged()) && this.paState.getPriceAgreementInstance().synchronized)).then((confirm) => {
				if(confirm){
					return this.confirmCancelMessage("Existing");
				}
				return true;
			}).then(() => {
				return this.paState.findActivePriceAgreement();
			}).then((paFound) => {
				if (paFound && paFound.data && paFound.data.results && paFound.data.results.length > 1) {
					return this.confirmCancelMessage("ExistingPA");
				} 
				return true;
			}).then((ok) => {
				this.savePA();
			});
			// MessageBox.warning(this.getResourceBundle().getText("confirmCancelExisting"), {
			// 	actions: [MessageBox.Action.YES, MessageBox.Action.NO],
			// 	emphasizedAction: MessageBox.Action.YES,
			// 	onClose: (action) => {
			// 		if (action === MessageBox.Action.YES) {
			// 			this.savePriceAgreement();
			// 		}
			// 	}
			// });
			// } else {
			// 	this.savePA();
			// }

		},
		confirmCancelMessage: function (type) {
			return new Promise((resolve, reject)=>{
				MessageBox.warning(this.getResourceBundle().getText(`confirmCancel${type}`), {
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					emphasizedAction: MessageBox.Action.YES,
					onClose: (action) => {
						if (action === MessageBox.Action.YES) {
							resolve(true);
						} else { reject("Do nothing"); }
					}
				});
			});
		},
		savePA: function () {
			this.setBusy(true);
			return this.paState.saveCandidatePrices()
				.then(this.paState.savePriceAgreement.bind(this.paState, this.paState.getPriceAgreementInstance()))
				.then(() => {
					this.paState.setEditMode(false);
					//update view with saved values from database - to be sure that UI and DB are in sync
					this.paState.getPriceAgreement(this.sObjectId);
					//update master - UI5 framework triggers refresh automatically after merge/update
					//not needed otherwise will reload twice
					// this.refreshMaster();
				}).finally(() => {
					this.setBusy(false);
				});
		},

		/**
		 * Sychronizes CustomerPrices with SAP
		 * @param {*} evt On click event
		 */
		onSynchronize: function (evt) {
			this.synchronizePriceAgreement(this.sObjectId);
		},

		synchronizePriceAgreement: async function(priceAgreementID){
			if(!priceAgreementID){
				throw new Error("PriceAgreementID not specified");
			}
			try {
				this.setBusy(true);
				await this.paState.syncPriceAgreements([priceAgreementID]);
				//const oMasterTableBinding = this.refreshMaster();
				this.paState.getPriceAgreement(this.sObjectId);
				this.setBusy(false);
				MessageBox.success("Price Agreement successfully synchronized");
				// oMasterTableBinding.attachEventOnce("dataReceived", (data) => {
				// 	this.paState.getPriceAgreement(this.sObjectId);
				// 	this.setBusy(false);
				// 	MessageBox.success("Price Agreement successfully synchronized");
				// });
			} catch (error) {
				this.paState.getPriceAgreement(this.sObjectId);
				this.setBusy(false);
				const errMsg = JSON.parse(error.responseText)?.error?.message?.value;
				MessageBox.error(`Synchronization of Price Agreement failed. ${errMsg}`);
			}
		},


		onDeliveryPress: function (oEvent) {
			const objContext = oEvent.getParameter("listItem").getBindingContext("pa");
			const selectedObj = objContext?.getObject();

			var deliveryPath = objContext.getPath(),
				delivery = deliveryPath.split("/").slice(-1).pop();

			let oNextUIState = "";

			this.oOwnerComponent.getHelper().then(function (oHelper) {
				oNextUIState = oHelper.getNextUIState(2);
				this.oRouter.navTo("objectDetail", {
					layout: oNextUIState.layout,
					objectId: selectedObj?.PriceAgreementId,
					deliveryId: delivery
				});
			}.bind(this));


		},

        onRbgUoMChange: function(evt){
			const selectedIndex = evt.getParameter("selectedIndex");
			const uom = selectedIndex === 0 ? "Pack" : "Unit";
			this._setSelectedProductUoM(uom);
		},

        onApplyAll: function(evt){
            let applied = evt.getParameters().state;
            let candidatePrices = this.paState.getPriceAgreementInstance().getCandidatePrices();

            candidatePrices.filter(candidatePrice => candidatePrice.applied != applied && candidatePrice.synchronized === false)?.map(candidatePrice => { candidatePrice.applied = applied; });
        },

		_setSelectedProductUoM(uom){
			this.getView().getModel("detailView").setProperty("/selectedProductUoM", uom);
		},

        isAllApplied: function(customerPrices, editMode){
            let candidatePrices = customerPrices.length > 0 ? customerPrices : this.paState.getPriceAgreementInstance().getCandidatePrices();
            let allApplied = candidatePrices.length > 0 && candidatePrices.every(candidatePrice => candidatePrice.applied === true);
            let allSynchronized = candidatePrices.length > 0 && candidatePrices.every(candidatePrice => candidatePrice.synchronized === true);
            this.paState.setAllApplied(allApplied);
            return editMode && !allSynchronized;
		},

		isSyncButtonEnabled: function(isPriceAgreementSynchronized, customerPrices, isCancelled){
			if(!Array.isArray(customerPrices)) customerPrices = [];
			if(isPriceAgreementSynchronized || (isCancelled === 'Cancelled')) return false;
			if(customerPrices.length <= 0) return false; // when no customer prices are created yet, disable button
			if(!customerPrices.some(item => item.applied)) return false; // when customer prices do exist but, non are applied
			return true;
		},

        extendExpiry: function(evt){
            if(!evt.getParameter('selected')) this.byId("idExtendExpiryDateID").setValue(0);
        },
		onOpenSettlementCalendar:function(event){
			// sName, model, updateModelAlways, callback, data, popoverSource, autoOpen)
			this.openFragment("com.bayer.tender.priceagreements.view.dialog.SettlementCalendar", null, true);
		},

        onCancelPriceAgreement: async function(evt){
			this.setBusy(true);
			let that = this;

            sap.m.MessageBox.warning("Are you sure you want to terminate this price agreement?", {
                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                styleClass: "sapUiSizeCompact",
                onClose: async function (sAction){
                    if(sAction === 'YES'){
                        await that.paState.cancelPriceAgreement();
                        that.paState.getPriceAgreement(that.sObjectId)
                        .finally(() => {
                            that.setBusy(false);
                        });
                    } else {
                        that.setBusy(false);
                    }
                }
            });
        }

	});

});