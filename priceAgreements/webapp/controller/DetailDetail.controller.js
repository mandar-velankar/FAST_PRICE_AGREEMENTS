sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("com.bayer.tender.priceagreements.controller.DetailDetail", {

		

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {

			this.oOwnerComponent = this.getOwnerComponent();
			this.oRouter = this.oOwnerComponent.getRouter();
			this.oDynamicPage = this.byId("idDynamicPage");

			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
				isProductDetailVisible: false,
				actionButtonsInfo: {
					fullScreen: false
				}
			});

			this.getRouter().getRoute("objectDetail").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailDetailView");



			

			this.paState = this.getOwnerComponent().getState(this.getOwnerComponent().PA);
			this.setModel(this.paState.getModel(), "pa");
			this.oObjectPageLayout = this.byId("DetailPage");
			this.paState.setDetailPage(this.oObjectPageLayout);

		},

		onExit: function () {
			this.oRouter.getRoute("objectDetail").detachPatternMatched(this._onObjectMatched, this);
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
			this.layout = oEvent.getParameter("arguments").layout;
			this.getModel("appView").setProperty("/layout", this.layout);
			this._delivery = oEvent.getParameter("arguments").deliveryId || this._delivery || "0";
			this.sObjectId = oEvent.getParameter("arguments").objectId;
			this.getView().bindElement({
				path: "/priceAgreement/Deliveries/" + this._delivery,
				model: "pa"
			});

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

		handleFullScreen: function () {
			let oNextUIState = "";
			this.getModel("detailDetailView").setProperty("/actionButtonsInfo/fullScreen", true);
			this.oOwnerComponent.getHelper().then(function (oHelper) {
				oNextUIState = oHelper.getNextUIState(3);
				this.oRouter.navTo("objectDetail", {
					layout: oNextUIState.layout,
					objectId: this.sObjectId,
					deliveryId: this._delivery
				});
			}.bind(this));
		},

		handleExitFullScreen: function () {
			this.getModel("detailDetailView").setProperty("/actionButtonsInfo/fullScreen", false)
			this.oOwnerComponent.getHelper().then(function (oHelper) {
				this.oRouter.navTo("objectDetail", {
					layout: "ThreeColumnsMidExpanded",
					objectId: this.sObjectId,
					deliveryId: this._delivery
				});
			}.bind(this));
		},

		handleClose: function () {
			let oNextUIState = "";
			this.oOwnerComponent.getHelper().then(function (oHelper) {
				oNextUIState = oHelper.getNextUIState(1);
				this.oRouter.navTo("object", {
					layout: oNextUIState.layout,
					objectId: this.sObjectId
				});
			}.bind(this));

		},


		setEditMode: function(isEditable){
			this.soaState.setEditMode(isEditable);
			this.oDynamicPage.setShowFooter(isEditable);
		},

		onExit: function () {
			this.oRouter.getRoute("master").detachPatternMatched(this._onObjectMatched, this);
			this.oRouter.getRoute("detail").detachPatternMatched(this._onObjectMatched, this);
		},


	});

});