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

			this.sObjectId = oEvent.getParameter("arguments").objectId;
			this.productId = oEvent.getParameter("arguments").productId;
			this.layout = oEvent.getParameter("arguments").layout;

			this.getModel("appView").setProperty("/layout", this.layout);

			/*this.getModel().metadataLoaded().then(function () {
				var sObjectPath = this.getModel().createKey("PublicSalesOpportunities", {
					ID: this.sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));*/

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailDetailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			const product = this.soaState.getProductFromSelectedOpportunityByProductId(this.productId);
			this.soaState.setSelectedProduct(product);
		},


		_onMetadataLoaded: function () {
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailDetailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
			this.soaState.clearSelectedOpportunity();
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
					productId: this.productId
				});
			}.bind(this));
		},

		handleExitFullScreen: function () {
			this.getModel("detailDetailView").setProperty("/actionButtonsInfo/fullScreen", false)
			this.oOwnerComponent.getHelper().then(function (oHelper) {
				this.oRouter.navTo("objectDetail", {
					layout: "ThreeColumnsMidExpanded",
					objectId: this.sObjectId,
					productId: this.productId
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