/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"combayer.tender.priceagreements./price_agreements/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
