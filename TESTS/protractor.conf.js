//var Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter');
//exports.config = {
//	framework : 'jasmine',
//	seleniumAddress : 'http://localhost:4444/wd/hub',
//	specs : [ 'Test.js' ],
//	//SELENIUM_PROMISE_MANAGER: false,
//	onPrepare : function() {
//		//var AllureReporter = require('jasmine-allure-reporter');
//		//jasmine.getEnv().addReporter(new AllureReporter({
//		//  resultsDir: 'allure-results'
//		jasmine.getEnv().addReporter(new Jasmine2HtmlReporter({
//			savePath : 'target/screenshots'
//		}));
//
//		//browser.driver.manage().window().maximize();
//		//jasmine.getEnv().addReporter(new Jasmine2HtmlReporter({
//		//	savePath : 'target/screenshots'
//		//}));
//	},
////	suite:{
////		//Smoke: ['Calc.js', 'Rundata.js']
////	},
//	jasmineNodeOpts:{
//		showColors: true,
//	},
//
//}
var d = new Date();
var date = d.getFullYear() + ((d.getMonth() + 1 ) < 10 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1 )) + (d.getDate() < 10 ? "0" + d.getDate() : d.getDate());
var base = "tmp/screenshots-" + date;
console.log(base);
var HtmlReporter = require('protractor-beautiful-reporter');
var HTMLReport = require('protractor-html-reporter-2');
var jasmineReporters = require('jasmine-reporters');
var reporter = new HtmlReporter({baseDirectory: base});
var Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter');

exports.config = {
		directConnect: true,// selenium server or chrome browser to connect
							// directly

	framework: 'jasmine2',
	seleniumAddress : 'http://localhost:4444/wd/hub',
	specs : [ 'Test.js' ],
	// SELENIUM_PROMISE_MANAGER: false,
	
	onPrepare : function() {
		var AllureReporter = require('jasmine-allure-reporter');
		jasmine.getEnv().addReporter(new AllureReporter({
			allureReport: {
			resultsDir: 'allure-report'
		}
	}))

		jasmine.getEnv().addReporter(new Jasmine2HtmlReporter({
			savePath : 'target/screenshots',
			cleanDestination: false
		}))
		jasmine.getEnv().beforeEach(function(){
			jasmine.DEFAULT_TIMEOUT_INTERVAL = 2500000;
		})

		
	jasmine.getEnv().afterEach(function(done){
      		browser.takeScreenshot().then(function (png) {
			allure.createAttachment('Screenshot', function () {
				return new Buffer(png, 'base64')
			}, 'image/png')();
			done();
		})
	})

	jasmine.getEnv().addReporter(new HtmlReporter({
		baseDirectory: base
	}).getJasmine2Reporter())
	
	 
	 // Protractor HTML reporter 2
	jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
		consolidateAll: true,
		savePath: './',
		filePrefix: 'xmlresults'
	}));
	
  },

	onComplete : function() {
		var browserName, browserVersion;
		var capsPromise = browser.getCapabilities();
		capsPromise.then(function (caps) {
			browserName = caps.get('browserName');
			browserVersion = caps.get('version');
			platform = caps.get('platform');
			var HTMLReport = require('protractor-html-reporter-2');
			testConfig = {
					reportTitle: 'Protractor Test Execution Report',
	            	outputPath: './',
	            	outputFilename: 'ProtractorTestReport',
	            	screenshotPath: './screenshots',
	            	testBrowser: browserName,
	            	browserVersion: browserVersion,
	            	modifiedSuiteName: false,
	            	screenshotsOnlyOnFailure: true,
	            	testPlatform: platform
			};// testConfig

			//new HTMLReport().from('xmlresults.xml', testConfig);
		}	)// onComplete
	   
	console.log("Sending Mail with reports for the test execution.");
	var sys = require('util')
	var exec = require('child_process').exec;
	function puts(error, stdout, stderr) { sys.puts(stdout) }
	exec("node mail.js", puts);
	 },

		// browser.driver.manage().window().maximize();
	
	jasmineNodeOpts:{
		showColors: true,
	}

}