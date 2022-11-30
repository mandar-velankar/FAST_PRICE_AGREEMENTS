sap.ui.define([
	"../BaseController",
	"sap/ui/model/json/JSONModel",
	"../../model/SettlementDate",
	"sap/m/MessageBox"
], function(BaseController, JSONModel,SettlementDate,MessageBox) {
	"use strict";
	return BaseController.extend("com.bayer.tender.priceagreements.controller.dialog.SettlementCalendar", {
		onBeforeShow: function(parent, dialog, callback, data){
			this.parent = parent;
			this.dialog = dialog;
			this.callback = callback;

			this.paState = this.parent.getOwnerComponent().getState(this.parent.getOwnerComponent().PA);
			this.dialog.fragment.setModel(this.paState.getModel(), "pa");
            //copy settlmentdates to not directly change in state (to implement apply and cancel)
            let settlementDates = this.paState.getPriceAgreementInstance().cloneSettlementDates();
			if(settlementDates && settlementDates.length === 0){
				settlementDates = this.paState.getPriceAgreementInstance().calculateSettlementCalendarProposal();
			}
            this.settlementCalendarModel = new JSONModel({settlementDates,valid:true});
			this.dialog.fragment.setModel(this.settlementCalendarModel, "sc");
		},
		onChangeSettlementDate:function(event,dateType){
			const path = event.getSource().getBindingContext("sc").getPath();
			this.settlementCalendarModel.setProperty(`${path}/${dateType}ValueState`,event.getSource().isValidValue()?"None":"Error");
            let settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
			settlementDates = this.paState.getPriceAgreementInstance().calculateSettlementCalendarMinMaxDate(settlementDates);
			this.settlementCalendarModel.setProperty("/settlementDates",settlementDates);
			this.isSettlementCalendarValid();
		},
		isSettlementCalendarValid:function(){
			const settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
			const isValid = settlementDates.filter(settlementDate => settlementDate.toValueState === "Error" || settlementDate.fromValueState === "Error" ) || [];
			this.settlementCalendarModel.setProperty("/valid",(isValid.length === 0));
		},
		onApply: function() {
			const settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
            const isValid = this.settlementCalendarModel.getProperty("/valid");
			if(!isValid){
				MessageBox.error(this.getText("SettlementCalendarErrors"));
				return;
			}
			const emptyRanges = settlementDates.filter(settlementDate=> !settlementDate.toDate && !settlementDates.fromDate) || [];
			if(emptyRanges && emptyRanges.length > 0 ){
				MessageBox.error(this.getText("SettlementCalendarEmptyRanges"));
				return;
			}
            this.paState.getPriceAgreementInstance().applySettlementDates(settlementDates);
			this.dialog.fragment.close();
		},
		onAdd:function(event){
            let settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
			const lastFullDate = settlementDates[settlementDates.length-1]?.toDate;
			const lastDate = lastFullDate && this.getDateWithoutTime(lastFullDate);
			const expiryDate = this.getDateWithoutTime(this.paState.getPriceAgreementInstance().expiryDate);
			if(settlementDates && settlementDates.length > 0 && !lastDate){
				MessageBox.error(this.getText("SettlementCalendarEmpytLine"));
				return;
			}
			if( lastDate && expiryDate && lastDate.getTime() === expiryDate.getTime()){
				MessageBox.error(this.getText("SettlementCalendarCompleted"));
				return;
			}
			settlementDates.push(new SettlementDate({
				priceAgreementId:this.priceAgreementId
			}));
			settlementDates = this.paState.getPriceAgreementInstance().calculateSettlementCalendarMinMaxDate(settlementDates);
			this.settlementCalendarModel.setProperty("/settlementDates",settlementDates);
		},
		getDateWithoutTime:function(date){
			return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
		},
		onDeleteRange:function(event){
			const path = event.getSource().getBindingContext("sc").getPath();
			const idx = path.split("/").pop();
            let settlementDates = this.settlementCalendarModel.getProperty("/settlementDates");
			settlementDates.splice(idx,1);
			settlementDates = this.paState.getPriceAgreementInstance().calculateSettlementCalendarMinMaxDate(settlementDates);
			this.settlementCalendarModel.setProperty("/settlementDates",settlementDates);
		},
		onClose: function() {
			this.dialog.fragment.close();
			// this.callback.call(this.parent);
		},
		getText:function(key,props){
			return this.parent.getModel("i18n").getResourceBundle().getText(key,props);
		},
		isApplyButtonEnabled: function(editmode,isPriceAgreementSynchronized, customerPrices, isCancelled,syncStatus){
			if(!Array.isArray(customerPrices)) customerPrices = [];
            let allSynchronized = customerPrices.length > 0 && customerPrices.every(customerPrice => customerPrice.synchronized === true);
            if( allSynchronized || (isCancelled === 'Cancelled')) return false;
			
			if(syncStatus === "RUNNING") return false; //when sync is running,disable button

			if(editmode){
				return true;
			} else {
				return false;
			}
		},
	});
});