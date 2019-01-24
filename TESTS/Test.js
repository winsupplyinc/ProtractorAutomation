browser.ignoreSynchronization = true;
browser.get('http://webservicedev.winwholesale.com/shipping-manifest-manager-release/#/list');
browser.driver.manage().window().maximize();
describe('Shipping Manifest Automation Test-20190123-16-40-13', function(){
	var until = protractor.ExpectedConditions;
	browser.wait(until.elementToBeClickable(element(by.css('button.new-manifest-btn'))), 100000);
		while (!(element(by.css('button.new-manifest-btn')).isPresent().then(function() {
			console.log(fired);
			browser.sleep(1000);
		})));
	
	it('Create Manifest', function(){
		element(by.css('button.new-manifest-btn')).click().then(function(){
			browser.sleep(4000);
		});
		expect(element(by.css('input#newManifestDeliveryDate')).getAttribute('value')).toEqual(String('01/30/2019'));
		element(by.css('input#newManifestStartTime')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('input#newManifestStartTime')).clear();
		element(by.css('input#newManifestStartTime')).sendKeys(String('12:00 PM')).then(function(){
			browser.sleep(1000);
		});
		expect(element(by.css('input#newManifestStartTime')).getAttribute('value')).toEqual(String('12:00 PM'));
		element(by.css('#truck[name="truck"]')).click().then(function(){
			browser.sleep(1000);
		});
		element.all(by.css('#truck > option')).each(function(element, index){
			element.getAttribute('value').then(function(text){
				if(text.trim() == 'Nissan'){element.click();
					browser.sleep(1000);
				}
			})
		});
		element(by.css('textarea#notes')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('textarea#notes')).sendKeys('Drop it off').then(function(){
			browser.actions().sendKeys(protractor.Key.ENTER).perform();
			browser.sleep(1000);
		});
		expect(element(by.css('textarea#notes')).getAttribute('value')).toEqual(String('Drop it off'));
	});
	it('Create Manifest - Add SO', function(){
		element(by.css('input[ng-reflect-name="keyedOrderNum"]')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('input[ng-reflect-name="keyedOrderNum"]')).sendKeys('406087-01').then(function(){
			browser.sleep(1000);
			browser.actions().sendKeys(protractor.Key.ENTER).perform();
			browser.sleep(1000);
		});
		expect(element(by.css('#collapseStop0 > div > div > div > div > span')).getText()).toEqual(String('406087-01'));
		expect(element(by.css('#collapseStop0 > div > div > div > div > p-messages > div > ul > li > span.ui-messages-summary')).getText()).toEqual(String('Order 406087-01 successfully added to manifest'));
	});
	it('Create Manifest - Add PO', function(){
		element(by.css('#newManifestModal > new-manifest > div.action-buttons > div > div > div:nth-child(1) > button.btn.btn-md.delete-manifest-btn.dark-ui-secondary-btn.add-po-btn.left > span')).click().then(function(){
			browser.sleep(4000);
		});
		element(by.css('#newManifestModal > new-manifest > div.modal-dialog > div > div > div.add-po-content.container.footerMargin > div > div.row > form > div.form-group.col-lg-8.col-md-8.col-sm-8.col-xs-12 > input')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('#newManifestModal > new-manifest > div.modal-dialog > div > div > div.add-po-content.container.footerMargin > div > div.row > form > div.form-group.col-lg-8.col-md-8.col-sm-8.col-xs-12 > input')).sendKeys('059127').then(function(){
			browser.actions().sendKeys(protractor.Key.ENTER).perform();
			browser.sleep(1000);
		});
		element(by.css('input[placeholder="Order/Vendor Number, Vendor Name, Address"]')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('input[placeholder="Order/Vendor Number, Vendor Name, Address"]')).sendKeys(undefined).then(function(){
			browser.sleep(1000);
		});
		element(by.css('#newManifestModal > new-manifest > div.modal-dialog > div > div > div.add-po-content.container.footerMargin > div > div.po-content > p-datatable > div > div.ui-datatable-tablewrapper > table > tbody > tr > td:nth-child(1)')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('#newManifestModal > new-manifest > div.modal-dialog > div > div > div.add-po-content.container.footerMargin > div > div:nth-child(5) > button.btn.btn-md.btn-primary.background-blue.button-margin.right')).click().then(function(){
			browser.sleep(1000);
		});
		expect(element(by.css('#collapseStop1 > div > div > div > div > span')).getText()).toEqual(String('059127'));
		expect(element(by.css('#collapseStop1 > div > div > div > div > p-messages > div > ul > li > span.ui-messages-summary')).getText()).toEqual(String('Order 059127 successfully added to manifest'));
	});
	it('Create Manifest', function(){
		element(by.css('#newManifestModal > new-manifest > div.action-buttons > div > div > div.right > button > span')).click().then(function(){
			browser.sleep(3000);
		});
		expect(element(by.css('body > my-app > p-growl > div > div > div > div.ui-growl-message > span')).isPresent()).toBe(true);
	});
	it('Delete Manifest', function(){
		element(by.css('#containerFluid > list > div.win-body > div.tablerow.visible-lg.visible-md > p-datatable > div > div.ui-datatable-tablewrapper > table > thead > tr > th:nth-child(1) > span.ui-sortable-column-icon.fa.fa-fw.fa-sort')).click().then(function(){
			browser.sleep(3000);
		});
		element(by.css('#containerFluid > list > div.win-body > div.tablerow.visible-lg.visible-md > p-datatable > div > div.ui-datatable-tablewrapper > table > thead > tr > th.ui-state-default.ui-unselectable-text.ui-sortable-column.ui-state-active > span.ui-sortable-column-icon.fa.fa-fw.fa-sort.fa-sort-asc')).click().then(function(){
			browser.sleep(3000);
		});
		element(by.css('#containerFluid > list > div.win-body > div.tablerow.visible-lg.visible-md > p-datatable > div > div.ui-datatable-tablewrapper > table > tbody > tr:nth-child(1) > td:nth-child(1) > span.ui-cell-data > a')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('#newManifestModal > new-manifest > div.action-buttons > div > div > div:nth-child(3) > button > span')).click().then(function(){
			browser.sleep(1000);
		});
		element(by.css('#deleteManifestModal > div > div > div > div > div:nth-child(4) > button.btn.win-confirmation-btn-blue.background-blue')).click().then(function(){
			browser.sleep(2000);
		});
		expect(element(by.css('body > my-app > p-growl > div > div > div > div.ui-growl-message > span')).isPresent()).toBe(true);
	});
});