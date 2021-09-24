/*!
 * ${copyright}
 */

sap.ui.define(["sap/m/SelectRenderer","sap/ui/core/Renderer"],

	function (SelectRenderer,Renderer) {
		"use strict";

		var SharedSelectRenderer = Renderer.extend(SelectRenderer);
		SharedSelectRenderer.apiVersion = 2;

		return SharedSelectRenderer;

	}, /* bExport= */ true);