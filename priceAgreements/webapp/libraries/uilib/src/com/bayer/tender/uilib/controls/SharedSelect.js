/*!
 * ${copyright}
 */
// Provides control com.bayer.tender.uilib.Example.
sap.ui.define([
	"./../library", "sap/m/Select"
], function (library, Select) {
	"use strict";

	var SharedSelect = Select.extend("com.bayer.tender.uilib.controls.SharedSelect", {
		metadata: {
			library: "com.bayer.tender.uilib",
			properties: {
				memoryId: { type: "string", defaultValue: "" }
			}
		},
		//other option could be: setSelection
		onSelectionChange: function (oControlEvent) {
			Select.prototype.onSelectionChange.apply(this, arguments);
			if(this.getMemoryId()){
				localStorage.setItem(this.getMemoryId(), this.getSelectedKey());
			}
		},
		//synchronizeSelection - onBeforeRendering
		
		onBeforeRendering :function(){
			Select.prototype.onBeforeRendering.apply(this, arguments);

			const items = this.getItems() || [];
			const sharedSelectedKey = this.getSharedSelectedKey();
			const foundItemInMemory = sharedSelectedKey && items.find(item=>item.getEnabled() && item.getKey() === sharedSelectedKey);
			foundItemInMemory && this.setSelection(foundItemInMemory);
		},
		getSharedSelectedKey:function(){
			return ( this.getMemoryId() && localStorage.getItem(this.getMemoryId()) ) || "";
		}
	});
	return SharedSelect;
}, /* bExport= */ true);