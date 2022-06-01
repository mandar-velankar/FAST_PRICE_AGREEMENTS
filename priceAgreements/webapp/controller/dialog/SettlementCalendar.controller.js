sap.ui.define([
	"../BaseController",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel,MessageToast) {
	"use strict";
	return BaseController.extend("com.bayer.tender.priceagreements.controller.dialog.SettlementCalendar", {
		onBeforeShow: function(parent, dialog, callback, data){
			this.parent = parent;
			this.dialog = dialog;
			this.callback = callback;

			this.paState = this.parent.getOwnerComponent().getState(this.parent.getOwnerComponent().PA);
			this.dialog.fragment.setModel(this.paState.getModel(), "pa");
            //copy settlmentdates to not directly change in state (to implement apply and cancel)
            const settlementDates = this.paState.getPriceAgreementInstance().cloneSettlementDates();
            this.settlementCalendarModel = new JSONModel({settlementDates});
			this.dialog.fragment.setModel(this.settlementCalendarModel, "sc");
		},
		onChangeSettlementDate:function(event){
            let settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
			settlementDates = this.paState.getPriceAgreementInstance().calculateSettlementCalendarMinMaxDate(settlementDates)
			this.settlementCalendarModel.setProperty("/settlementDates",settlementDates);
		},
		onApply: function() {
            const settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
            this.paState.getPriceAgreementInstance().applySettlementDates(settlementDates);
			this.dialog.fragment.close();
			this.callback.call(this.parent);
		},
		onClose: function() {
			this.dialog.fragment.close();
			this.callback.call(this.parent);
		}
	});
});