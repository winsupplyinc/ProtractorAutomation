var xlsx = require('xlsx');
//var pro = require('protractor');
//var jas = require('jasmine');
var List = require("collections/list");
//var obj = require("./JSObjectDemo.js");
//var using = require('jasmine-data-provider');
//var d = require('./CalcDatadriver.js');
//var e = d.datadrive;
//var address_of_cell = 'A1';
//var workBook = xlsx.readFile(`${__dirname}/ProtractorTest.xlsx`);
var workBook = xlsx.readFile(`${__dirname}/CreateManifest.xlsx`);
var first_sheet_name = workBook.SheetNames[0];
var workSheet = workBook.Sheets[first_sheet_name];
var row = '3'; //This is the row in the spreadsheet where the commands will begin.  Above this is the URL and the column headers
//var space = ' ';
var nodemailer = require("nodemailer");


//These are the columns where the instructions are located.  
var colTestName = workSheet['A' + row];
var colCommand = workSheet['B' + row];
var colLocateBy = workSheet['C' + row];
var colElement = workSheet['D' + row];
var colValue = workSheet['E' + row];
var colDelay = workSheet['F' + row]

//The data from the spreadsheet will be stored in these list objects
var testName = new List;
var command = new List;
var locateBy = new List;
var elements = new List;
var values = new List;
var cmdList = new List;
var delay = new List;
var url = workSheet['A' + '1'].v;

//As long as Column A has data continue to read the values line by line.
while (colTestName != undefined) {
	colTestName = workSheet['A' + row];
	colCommand = workSheet['B' + row];
	colLocateBy = workSheet['C' + row];
	colElement = workSheet['D' + row];
	colValue = workSheet['E' + row];
	colDelay = workSheet['F' + row];
	if (colTestName != undefined) {
		// console.log(col+row + '=' + desired_cell.v);
		testName.add(colTestName.v);
		command.add(colCommand ? colCommand.v : undefined)
		locateBy.add(colLocateBy ? colLocateBy.v : undefined)
		elements.add(colElement ? colElement.v : undefined)
		values.add(colValue ? colValue.v : undefined)
		delay.add(colDelay ? colDelay.v : 0)
	}
	row++;
}

//Copy the Lists into variable Array's for ease of further processing.
var tst = testName.toArray();
var cmd = command.toArray();
var loc = locateBy.toArray();
var ele = elements.toArray();
var val = values.toArray();
var del = delay.toArray();

//Variable 'currentTest' will determine when the value in Column A changes and will cause a new 'it' block to begin.
//This causes the generated report to begin a new section.
var currentTest = 'none';
						// browser.waitForAngularEnabled(false);
browser.ignoreSynchronization = true;
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
		cmdList.add(String("browser.ignoreSynchronization = true;\n"));
		cmdList.add(String("browser.get('" + url + "');\n"));
		cmdList.add(String("browser.driver.manage().window().maximize();\n"));
		cmdList.add(String("describe('Shipping Manifest Automation Test', function(){\n"));
		
		cmdList.add(String("\tvar until = protractor.ExpectedConditions;\n"));
		cmdList.add(String("\t\tbrowser.wait(until.elementToBeClickable(element(by.css('" + ele[i] + "'))), 10000);\n"));
		cmdList.add(String("\t\t\twhile (!(element(by.css('" + ele[i] + "')).isPresent().then(function() {\n"));
		cmdList.add(String("\t\t\tbrowser.sleep(1000);\n"));
		cmdList.add(String("\t\t}))) {\n"));
		cmdList.add(String("\t\tconsole.log('waiting for " + ele[i] +"');\n"));
		cmdList.add(String("\t\tbrowser.sleep(1000);\n"));
		cmdList.add(String("};\n"));
	}
	
	if(currentTest != tst[i]){
		currentTest = tst[i];
		cmdList.add(String("\tit('" + tst[i] + "', function(){\n"));
	}
	
	if(cmd[i] == 'click'){
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
	}
	if(cmd[i] == 'sendKeys'){
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys('" + val[i] + "').then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
	}
	if(cmd[i] == 'sendCmdKeys'){
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys(" + val[i] + ").then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
	}
	if(cmd[i] == 'sendKeysEnter'){
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys('" + val[i] + "').then(function(){browser.sleep(" + (1000 + del[i]) + ");browser.actions().sendKeys(protractor.Key.ENTER).perform();browser.sleep(1000);});\n"));
		
		
	}
	if(cmd[i] == 'clearSendKeys'){
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).click().then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).clear();\n"));
		cmdList.add(String("\t\telement(by." + loc[i] + "('" + ele[i] + "')).sendKeys(String('" + val[i] + "')).then(function(){browser.sleep(" + (1000 + del[i]) + ");});\n"));
	}
	if(cmd[i] == 'verify'){
		cmdList.add(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getText()).toEqual(String('" + val[i] + "'));\n"));
	}
	if(cmd[i] == 'verifyByValue'){
		cmdList.add(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).getAttribute('value')).toEqual(String('" + val[i] + "'));\n"));
	}
	if(cmd[i] == 'verifyIsPresent'){
		cmdList.add(String("\t\texpect(element(by." + loc[i] + "('" + ele[i] + "')).isPresent()).toBe(true);\n"));
	}
	if(cmd[i] == 'selectDropDown'){
		cmdList.add(String("\t\telement.all(by." + loc[i] + "('" + ele[i] + "')).each(function(element, index){element.getText().then(function(text){if(text.trim() == '" + val[i] + "'){element.click();browser.sleep(" + (1000 + del[i]) + ");}})});\n"));
	}
	if(i+1 == tst.length){
		cmdList.add(String("\t});\n"));
	}
	if(tst[i+1] != currentTest){
		cmdList.add(String("\t});\n"));
		
	}
	
}
var cmdArr = cmdList.toArray();
var textField = "";
for (var j = 0; j < cmdArr.length; j++){
	textField = textField + cmdArr[j];
}

var fs = require('fs');
fs.writeFile("./TESTS/Test.js", textField, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 
//var filename = 'C:/Users/gebire~1/PROTRA~1/Pr099E~1/TESTS/Protractorbat.bat';
//var cp = require('child_process');
//cp.execFile(filename);
const spawn = require('child_process').exec('cmd.exe', ['/c', "C:\\Users\\gebirecki\\protractorworkspace\\Protractor4\\TESTS\\Protractorbat.bat"]);
//const bat = spawn('cmd.exe', ['/c', "C:\Users\gebirecki\protractorworkspace\Protractor4\TESTS\Protractorbat.bat"]);

//var exec = require('child_process').exec, child;
//function child(){
//	exec("C:/Users/gebire~1/PROTRA~1/Pr099E~1/TESTS/Protractorbat.bat", function (error, stdout, stderr) {
//		console.log('stdout: ' + stdout);
//		console.log('stderr: ' + stderr);
//		if (error !== null) {
//			console.log('exec error: ' + error);
//		}
//	});
//}
//child();

