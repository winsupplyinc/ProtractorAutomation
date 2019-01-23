browser.ignoreSynchronization = true;
browser.get('http://webservicedev.winwholesale.com/shipping-manifest-manager-release/#/driver-list');
browser.driver.manage().window().maximize();
describe('Shipping Manifest Create/Delete Driver-20190123-08-37-33', function(){
	var until = protractor.ExpectedConditions;
		browser.wait(until.elementToBeClickable(element(by.css('button.new-manifest-btn'))), 10000);
			while (!(element(by.css('button.new-manifest-btn')).isPresent().then(function() {
			browser.sleep(1000);
		}))) {
		console.log('waiting for button.new-manifest-btn');
		browser.sleep(1000);
};
	it('Create Driver', function(){
		element(by.css('button.new-manifest-btn')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#firstname')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#firstname')).sendKeys('The').then(function(){browser.sleep(1000);});
		expect(element(by.css('input#firstname')).getAttribute('value')).toEqual(String('The'));
		element(by.css('input#lastname')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#lastname')).sendKeys('Duck').then(function(){browser.sleep(1000);});
		expect(element(by.css('input#lastname')).getAttribute('value')).toEqual(String('Duck'));
		element(by.css('input#alias')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#alias')).sendKeys('The Duck').then(function(){browser.sleep(1000);});
		expect(element(by.css('input#alias')).getAttribute('value')).toEqual(String('The Duck'));
		element(by.css('select#rank')).click().then(function(){browser.sleep(1000);});
		element(by.css('select#rank')).sendKeys('S').then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('select#rank')).getAttribute('ng-reflect-model')).toEqual(String('Secondary'));
		element(by.css('select#status')).click().then(function(){browser.sleep(1000);});
		element(by.css('select#status')).sendKeys('I').then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('select#status')).getAttribute('ng-reflect-model')).toEqual(String('Inactive'));
		element(by.css('select#adjustment')).click().then(function(){browser.sleep(1000);});
		element(by.css('select#adjustment')).sendKeys('Y').then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('select#adjustment')).getAttribute('ng-reflect-model')).toEqual(String('Yes'));
		element(by.css('select#emp')).click().then(function(){browser.sleep(1000);});
		element(by.css('select#emp')).sendKeys('Y').then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('select#emp')).getAttribute('ng-reflect-model')).toEqual(String('Yes'));
		element(by.css('input#username')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#username')).sendKeys('abc123').then(function(){browser.sleep(1000);});
		expect(element(by.css('input#username')).getAttribute('value')).toEqual(String('abc123'));
		element(by.css('select#cdl')).click().then(function(){browser.sleep(1000);});
		element(by.css('select#cdl')).sendKeys('Y').then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('select#cdl')).getAttribute('ng-reflect-model')).toEqual(String('Yes'));
		element(by.css('input#cdlExpiration')).click().then(function(){browser.sleep(1000);});
		element(by.css('input#cdlExpiration')).sendKeys('05/01/2022').then(function(){browser.sleep(1000);});
		expect(element(by.css('input#cdlExpiration')).getAttribute('value')).toEqual(String('05/01/2022'));
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div > div > button')).click().then(function(){browser.sleep(1000);});
		expect(element(by.css('body > my-app > p-growl > div > div > div > div.ui-growl-message > span')).isPresent()).toBe(true);
});
	it('Delete Driver', function(){
		element.all(by.css('#driverNameSelect > option')).each(function(element, index){element.getAttribute('value').then(function(text){if(text.trim() == 'The Duck (The Duck)'){element.click();browser.sleep(1000);}})});
		element(by.css('#containerFluid > drivers-list > div > div.tablerow.visible-lg.visible-md > p-datatable > div > div.ui-datatable-tablewrapper > table > tbody > tr > td:nth-child(1) > span.ui-cell-data > a')).click().then(function(){browser.sleep(1000);});
		element(by.css('#driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div > div.modal-btn-left.mobile-modal-btn > button')).click().then(function(){browser.sleep(1000);});
		element(by.css('#deleteDriverModal > div > div > div > div > div:nth-child(4) > button.btn.win-confirmation-btn-blue.background-blue')).click().then(function(){browser.sleep(1000);});
	});
});
