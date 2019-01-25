var xlsx = require('xlsx');
//var pro = require('protractor');
//var jas = require('jasmine');
//var obj = require("./JSObjectDemo.js");
//var using = require('jasmine-data-provider');
//var d = require('./CalcDatadriver.js');
//var e = d.datadrive;
//var address_of_cell = 'A1';
//var workBook = xlsx.readFile(`${__dirname}/ProtractorTest.xlsx`);
//var workBook = xlsx.readFile(`${__dirname}/CreateManifest.xlsx`);
console.log(browser.params.testName);

var workBook = xlsx.readFile(`${__dirname}\\` + browser.params.testName + '.xlsx');
var first_sheet_name = workBook.SheetNames[0];
var workSheet = workBook.Sheets[first_sheet_name];
var row = '4'; //This is the row in the spreadsheet where the commands will begin.  Above this is the URL and the column headers
//var space = ' ';
var nodemailer = require("nodemailer");
var d = new Date();
var date = d.getFullYear() + ((d.getMonth() + 1 ) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1 )) + (d.getDate() < 10 ? "0" + d.getDate() : d.getDate()) + "-" + (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) + "-" + (d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()) + "-" + (d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds());


//These are the columns where the instructions are located.  
var colTestName = workSheet['A' + row];
var colCommand = workSheet['B' + row];
var colLocateBy = workSheet['C' + row];
var colElement = workSheet['D' + row];
var colValue = workSheet['E' + row];
var colDelay = workSheet['F' + row]

var url = workSheet['A' + '2'].v;
var testName = workSheet['A' + '1'].v;
var cmdList = [];

var tst = [];
var cmd = [];
var loc = [];
var ele = [];
var val = [];
var del = [];

while (colTestName != undefined) {
	
	colTestName = workSheet['A' + row];
	colCommand = workSheet['B' + row];
	colLocateBy = workSheet['C' + row];
	colElement = workSheet['D' + row];
	colValue = workSheet['E' + row];
	colDelay = workSheet['F' + row];
	if (colTestName != undefined) {
		// console.log(col+row + '=' + desired_cell.v);
		tst.push(colTestName.v);
		cmd.push(colCommand ? colCommand.v : undefined)
		loc.push(colLocateBy ? colLocateBy.v : undefined)
		ele.push(colElement ? colElement.v : undefined)
		val.push(colValue ? colValue.v : undefined)
		del.push(colDelay ? colDelay.v : 0)
	}
	row++;
}





//Variable 'currentTest' will determine when the value in Column A changes and will cause a new 'it' block to begin.
//This causes the generated report to begin a new section.
var currentTest = 'none';
						// browser.waitForAngularEnabled(false);
browser.ignoreSynchronization = true;
debugger;
						// browser.get('http://juliemr.github.io/protractor-demo/');//Supercalculator website
						//browser.get('http://webservicedev.winwholesale.com/shipping-manifest-manager/#/manifest-dashboard');
						// var until = protractor.ExpectedConditions;
						// browser.wait(function(){return
						// element(by.css('#containerFluid >
						// manifest-dashboard > div >
						// div.page-title-wrapper.visible-tablet > help-doc >
						// a')).isPresent()});

//Begin processing the commands and data from the spreadsheet into lines in an output file.
for (var i = 0; i< tst.length; i++){
	//This section is the output file header.
	if(i==0){
		cmdList.push(String("browser.ignoreSynchronization = true;\n"));
		cmdList.push(String("browser.get('" + url + "');\n"));
		cmdList.push(String("browser.driver.manage().window().maximize();\n"));
		cmdList.push(String("describe('" + testName + "-" + date + "', function(){\n"));
		cmdList.push(String("\tvar until = protractor.ExpectedConditions;\n"));
		cmdList.push(String("\tbrowser.wait(until.elementToBeClickable(element(by.css('" + ele[i] + "'))), 10000);\n"));
		cmdList.push(String("\t\twhile (!(element(by.css('" + ele[i] + "')).isPresent().then(function() {\n"));
		cmdList.push(String("\t\tbrowser.sleep(1000);\n"));
		cmdList.push(String("\t})));\n"));
		cmdList.push(String("\n"));
	}
	
	if(currentTest != tst[i]){
		currentTest = tst[i];
		cmdList.push(String("\tit('" + tst[i] + "', function(){\n"));
	}
	
	if(cmd[i] == 'click'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
	}
	if(cmd[i] == 'sendKeys'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys('" + val[i] + "').then(function(){\n\t\t\tbrowser.actions().sendKeys(protractor.Key.TAB).perform();\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
	}
	if(cmd[i] == 'sendCmdKeys'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys(" + val[i] + ").then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
	}
	
	if(cmd[i] == 'sendPGDN'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys('" + val[i] + "').then(function(){\n\t\t\tbrowser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
	}
	
	if(cmd[i] == 'sendKeysEnter'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys('" + val[i] + "').then(function(){\n\t\t\tbrowser.sleep(200);\n\t\t\tbrowser.actions().sendKeys(protractor.Key.ENTER).perform();\n\t\t\tbrowser.sleep(" + (1000 +del[i]) + ");\n\t\t});\n"));
	}
	if(cmd[i] == 'clearSendKeys'){
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).clear();\n"));
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys(String('" + val[i] + "')).then(function(){\n\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t});\n"));
	}
	if(cmd[i] == 'verify'){
		cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getText()).toEqual(String('" + val[i] + "'));\n"));
	}
	if(cmd[i] == 'verifyByValue'){
		cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value')).toEqual(String('" + val[i] + "'));\n"));
	}
	if(cmd[i] == 'verifyInput'){
		cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value')).toEqual(String('" + val[i] + "'));\n"));
	}
	if(cmd[i] == 'verifyContains'){
		cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getText()).toContain('" + val[i] + "');\n"));
	}
	if(cmd[i] == 'verifySelect'){
		//cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getAttribute('ng-reflect-model')).toEqual(String('" + val[i] + "'));\n"));
		//cmdList.push(String("\t\texpect(element(by.selectedOption('" + ele[i] + "')).getText()).toEqual(String('" + val[i] + "'));\n"));
		//cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value').then(function(selectValue){\n\t\t\texpect(element(by.css('select option[value=' + selectValue + ']')).getText()).toEqual('" + val[i] + "');\n\t\t});\n"))
		//cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value').then(function(selectValue){\n\t\t\texpect(element(by.css('select option[value=' + selectValue + ']')).getText()).toEqual('" + val[i] + "');\n\t\t});\n"))
		//cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value').then(function(value){\n\t\t\tconsole.log('The value is ' + value);\n\t\t\texpect(element(by.css('select option[value=' + selectValue + ']')).getText()).toEqual('" + val[i] + "');\n\t\t});\n"))
		//cmdList.push(String("expect(element(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value')).toEqual('" + val[i] + "');\n"));
		
		cmdList.push(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).element(by.css('option:checked')).getText().then(function(text){expect(text.trim()).toEqual('" + val[i] + "')});\n"));
		
	}
	if(cmd[i] == 'verifyIsPresent'){
		cmdList.push(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).isPresent()).toBe(true);\n"));
	}
	if(cmd[i] == 'selectDropDown'){
		//cmdList.push(String("\t\telement.all(by." + loc[i] + "('" + ele[i] + "')).each(function(element, index){element.getText().then(function(text){console.log(index + ' - ' + text);if(text.trim() == '" + val[i] + "'){console.log('Click');element.click();browser.sleep(" + (1000 + del[i]) + ");}})});\n"));
		cmdList.push(String("\t\telement.all(by." + loc[i] + "('" + ele[i] + "')).each(function(element, index){\n\t\t\telement.getText().then(function(text){\n\t\t\t\tconsole.log(index + ' - ' + text);\n\t\t\t\tif(text.trim() == '" + val[i] + "'){\n\t\t\t\t\telement.click();\n\t\t\t\t\tbrowser.actions().sendKeys(protractor.Key.TAB).perform();\n\t\t\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t\t\t}})});\n"));		
		//cmdList.push(String("\t\telement.all(by." + loc[i] + "('" + ele[i] + "')).each(function(element, index){\n\t\t\telement.getAttribute('value').then(function(text){\n\t\t\t\tconsole.log(text.trim());\n\t\t\t\tif(text.trim() == '" + val[i] + "'){element.click();\n\t\t\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t\t\t}\n\t\t\t})\n\t\t});\n"));
		//cmdList.push(String("\t\telement.all(by." + loc[i] + "('" + ele[i] + "')).each(function(element, index){\n\t\t\telement.getInnerHTML().then(function(text){\n\t\t\t\tconsole.log(text);\n\t\t\t\tif(text.trim() == '" + val[i] + "'){element.click();\n\t\t\t\t\tbrowser.sleep(" + (1000 + del[i]) + ");\n\t\t\t\t}\n\t\t\t})\n\t\t});\n"));
	}
	if(i+1 == tst.length){
		cmdList.push(String("});\n"));
	}
	if(tst[i+1] != currentTest){
		cmdList.push(String("\t});\n"));
		
	}
	
}
var textField = "";
for (var j = 0; j < cmdList.length; j++){
	textField = textField + cmdList[j];
}
console.log(textField);
eval(textField);

//var fs = require('fs');
//fs.writeFile("./TESTS/Test.js", textField, function(err) {
//    if(err) {
//        return console.log(err);
//    }
//    console.log("The file was saved!");
//}); 
//var execSh = require("exec-sh");
//execSh("c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Protractorbat.bat", {cwd: "c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS"}, function(err){if(err){console.log("Exit code: ", err.code);}});



//var filename = 'C:/Users/gebire~1/PROTRA~1/Pr099E~1/TESTS/Protractorbat.bat';
//var cp = require('child_process');
//cp.execFile(filename);
//const spawn = require('child_process').exec('cmd.exe', ['/c', "C:\\Users\\gebirecki\\protractorworkspace\\Protractor4\\TESTS\\Protractorbat.bat"]);
//const bat = spawn('cmd.exe', ['/c', "C:\Users\gebirecki\protractorworkspace\Protractor4\TESTS\Protractorbat.bat"]);



//var exec = require('child_process');
//function child(){
//	child_process.exec("c:\Users\gebirecki\protractorworkspace\Protractor6\TESTS\Protractorbat.bat", function (error, stdout, stderr) {
//		console.log('stdout: ' + stdout);
//		console.log('stderr: ' + stderr);
//		if (error !== null) {
//			console.log('exec error: ' + error);
//		}
//	});
//}
//child();

