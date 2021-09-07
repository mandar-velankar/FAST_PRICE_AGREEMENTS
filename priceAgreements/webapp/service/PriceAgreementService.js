sap.ui.define([
    "com/bayer/tender/uilib/objects/BaseService"
], function (CoreService) {
    "use strict";

    var PriceAgreementService = CoreService.extend("com.bayer.tender.priceagreements.state.PriceAgreementService", {
        constructor: function (model) {
            CoreService.call(this, model);
        },
        getPriceAgreement: function (id) {
            const keyPath = this.model.createKey("/PriceAgreements",{ID:id});
            return this.odata(keyPath).get({urlParameters:{$expand:"Institute,Tender,Product/ProductPack,Candidates,CustomerPrices,CustomerPrices/Material"}});
        }

    });
    return PriceAgreementService;
});