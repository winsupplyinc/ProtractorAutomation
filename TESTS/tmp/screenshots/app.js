var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5512,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547760595095,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547760596189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547760596190,
                "type": ""
            }
        ],
        "screenShotFile": "001c0052-00d0-00c4-0097-00b90064003e.png",
        "timestamp": 1547760592549,
        "duration": 17382
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5512,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0061002c-00f1-00d7-006f-0088004500d4.png",
        "timestamp": 1547760610712,
        "duration": 3802
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5512,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #collapseStop1 > div > div > div > div > span)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #collapseStop1 > div > div > div > div > span)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:42:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Manifest - Add PO\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:34:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bf009a-003e-0072-0026-00da004a0090.png",
        "timestamp": 1547760615219,
        "duration": 11389
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5512,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected false to be true."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:114)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00b30069-00e0-008c-00f1-00c4004100eb.png",
        "timestamp": 1547760627417,
        "duration": 3490
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5512,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006100ae-00db-00dc-00a2-001c003200bc.png",
        "timestamp": 1547760631592,
        "duration": 404
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19876,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547817448187,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547817449274,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547817449275,
                "type": ""
            }
        ],
        "screenShotFile": "00400057-007b-00c2-00f7-0099002e0035.png",
        "timestamp": 1547817445657,
        "duration": 17481
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19876,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b6003b-00b3-00c0-004f-001a00b1003c.png",
        "timestamp": 1547817463908,
        "duration": 3837
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19876,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #collapseStop1 > div > div > div > div > span)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #collapseStop1 > div > div > div > div > span)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:42:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Manifest - Add PO\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:34:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00300084-0074-00e8-0014-001100be0026.png",
        "timestamp": 1547817468444,
        "duration": 11447
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19876,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span>...</span> is not clickable at point (1446, 917). Other element would receive the click: <div class=\"action-buttons\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span>...</span> is not clickable at point (1446, 917). Other element would receive the click: <div class=\"action-buttons\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:46:116)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:45:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000a00b2-00c2-00f7-0071-007b003e00bf.png",
        "timestamp": 1547817480547,
        "duration": 399
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19876,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e400f3-0087-00dd-0089-000600a1000e.png",
        "timestamp": 1547817481649,
        "duration": 460
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547817654300,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547817655580,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547817655581,
                "type": ""
            }
        ],
        "screenShotFile": "004f009d-001f-00bc-005a-00f1004900a8.png",
        "timestamp": 1547817651416,
        "duration": 17801
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002900c0-0080-007b-0001-00fb00c4009f.png",
        "timestamp": 1547817669938,
        "duration": 3824
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00df00dc-0090-0068-0070-00bc00ef00ba.png",
        "timestamp": 1547817674464,
        "duration": 11517
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected false to be true."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:114)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00610095-0087-007e-00e9-0028000600f2.png",
        "timestamp": 1547817686693,
        "duration": 3505
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007f000c-0005-00e1-0004-008700880027.png",
        "timestamp": 1547817690936,
        "duration": 431
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3688,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547817729365,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547817730462,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547817730463,
                "type": ""
            }
        ],
        "screenShotFile": "00fc0031-00cc-00e8-0069-00f100830061.png",
        "timestamp": 1547817727008,
        "duration": 17323
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3688,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c800d6-00b7-009e-0011-00890011000d.png",
        "timestamp": 1547817745047,
        "duration": 3852
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3688,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a100a1-0086-0071-0012-0014002e00ae.png",
        "timestamp": 1547817749598,
        "duration": 11626
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3688,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00640020-00a4-00f0-0023-003e00790000.png",
        "timestamp": 1547817761963,
        "duration": 3550
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3688,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fa0064-0068-001c-0047-00fb008200b3.png",
        "timestamp": 1547817766203,
        "duration": 11127
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547817900087,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547817901394,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547817901397,
                "type": ""
            }
        ],
        "screenShotFile": "00e50010-0066-004d-0028-00b1000e00de.png",
        "timestamp": 1547817897293,
        "duration": 17619
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000600d3-0029-0095-004b-00eb00a00009.png",
        "timestamp": 1547817915647,
        "duration": 3823
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001b00de-006d-0096-0058-0077005c00a7.png",
        "timestamp": 1547817920168,
        "duration": 11471
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d40012-00be-00f8-0087-00db007c0041.png",
        "timestamp": 1547817932337,
        "duration": 3533
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009a00cc-00cd-002f-00fb-003c0070000e.png",
        "timestamp": 1547817936557,
        "duration": 11143
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547818444669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547818445773,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547818445774,
                "type": ""
            }
        ],
        "screenShotFile": "00780011-00ab-0078-004d-00c800ce0033.png",
        "timestamp": 1547818442288,
        "duration": 16911
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a9004d-006c-009d-0088-00f700850040.png",
        "timestamp": 1547818459927,
        "duration": 3787
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f900e7-00bf-00b6-00bb-009700d7005d.png",
        "timestamp": 1547818464399,
        "duration": 11575
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ba000d-009f-005d-0036-00d000d300e9.png",
        "timestamp": 1547818476681,
        "duration": 3514
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ae0076-00b8-0015-007d-002f00e10033.png",
        "timestamp": 1547818480915,
        "duration": 11188
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547818690836,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547818692024,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547818692024,
                "type": ""
            }
        ],
        "screenShotFile": "005e00fa-004f-00ac-008f-002900d1005e.png",
        "timestamp": 1547818685958,
        "duration": 19725
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00cd00b2-00ea-0020-00e1-00a8006b0098.png",
        "timestamp": 1547818706401,
        "duration": 3844
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c50021-0098-00ec-0048-00a2008f002b.png",
        "timestamp": 1547818710978,
        "duration": 11663
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b10045-003b-007d-00e8-008b00bb00a0.png",
        "timestamp": 1547818723357,
        "duration": 3577
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006200f5-007c-0077-00ad-00fa004f00be.png",
        "timestamp": 1547818727670,
        "duration": 11159
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547818934974,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547818936437,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547818936438,
                "type": ""
            }
        ],
        "screenShotFile": "00d300c5-0069-00a5-0027-008e008b00ef.png",
        "timestamp": 1547818931623,
        "duration": 20977
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006d00d6-004d-00e4-00c5-002d005f0075.png",
        "timestamp": 1547818953382,
        "duration": 3820
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002e0033-0025-00bb-00c8-00f00040007e.png",
        "timestamp": 1547818957929,
        "duration": 11570
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0030008d-00ef-004b-0082-00ab007d001c.png",
        "timestamp": 1547818970206,
        "duration": 3549
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00460086-006b-00f5-00dd-00360069007d.png",
        "timestamp": 1547818974438,
        "duration": 11161
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547819262669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547819264227,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547819264229,
                "type": ""
            }
        ],
        "screenShotFile": "008d00d1-00dc-001a-00a0-00e200b2002d.png",
        "timestamp": 1547819259630,
        "duration": 20468
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00440068-00f2-0029-0092-002a00bd0012.png",
        "timestamp": 1547819280873,
        "duration": 3794
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009d0051-00d0-00ca-0083-0008003a00ff.png",
        "timestamp": 1547819285370,
        "duration": 11366
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003800a0-001a-00f7-006c-0009009b009c.png",
        "timestamp": 1547819297433,
        "duration": 3556
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fb00a8-00f2-0090-0043-00e800810070.png",
        "timestamp": 1547819301741,
        "duration": 11038
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547819750806,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547819751972,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547819751974,
                "type": ""
            }
        ],
        "screenShotFile": "00790020-00e3-0086-00cd-003e00ef002c.png",
        "timestamp": 1547819748200,
        "duration": 19629
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0041007b-008e-0060-0067-00d900350051.png",
        "timestamp": 1547819768556,
        "duration": 3783
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00390060-009f-0028-0001-00de00150016.png",
        "timestamp": 1547819773023,
        "duration": 11542
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009a00b3-0058-001c-00ac-006a00e400a9.png",
        "timestamp": 1547819785280,
        "duration": 3516
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00240065-0084-0091-0020-00bd008f0097.png",
        "timestamp": 1547819789468,
        "duration": 11149
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-1",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547829097661,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547829099222,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547829099225,
                "type": ""
            }
        ],
        "screenShotFile": "00e30004-00f0-000a-0012-00ec00ff0043.png",
        "timestamp": 1547829094600,
        "duration": 20846
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-1",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bd00c8-0051-00ea-00f3-0019003100b5.png",
        "timestamp": 1547829116236,
        "duration": 3766
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-1",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004000a6-003f-00bd-00fe-00af00c50093.png",
        "timestamp": 1547829120744,
        "duration": 11398
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-1",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00890041-00bd-0057-007d-00b00054005c.png",
        "timestamp": 1547829132857,
        "duration": 3526
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-1",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c200aa-00d0-00aa-00bd-007000d4002c.png",
        "timestamp": 1547829137085,
        "duration": 11074
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test1547829359667",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547829370940,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547829372095,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547829372096,
                "type": ""
            }
        ],
        "screenShotFile": "002500b1-0073-0059-00da-0047006a004f.png",
        "timestamp": 1547829368377,
        "duration": 19586
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test1547829359667",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fe006d-00ac-00c4-0090-00a900f8009a.png",
        "timestamp": 1547829388699,
        "duration": 3739
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test1547829359667",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006b0010-00bf-0081-0004-00f2009b0058.png",
        "timestamp": 1547829393145,
        "duration": 11444
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test1547829359667",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00370061-00db-00b5-005a-001e005a00a2.png",
        "timestamp": 1547829405278,
        "duration": 3511
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test1547829359667",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008900a3-001d-005b-004f-008400770031.png",
        "timestamp": 1547829409467,
        "duration": 11079
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2019118113957",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19292,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547829608930,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547829610138,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547829610140,
                "type": ""
            }
        ],
        "screenShotFile": "0013008a-00b4-00b3-005b-005b0055001f.png",
        "timestamp": 1547829606271,
        "duration": 19697
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-2019118113957",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19292,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004e0047-0079-00a5-003d-007400cd00f3.png",
        "timestamp": 1547829626705,
        "duration": 3737
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-2019118113957",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19292,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00cf00d4-00b4-0020-002e-007100b800b2.png",
        "timestamp": 1547829631144,
        "duration": 11426
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2019118113957",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19292,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0029001c-00a1-0003-00b3-009200650090.png",
        "timestamp": 1547829643279,
        "duration": 3498
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-2019118113957",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19292,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0003000a-00ee-00fb-009a-001d00a400ca.png",
        "timestamp": 1547829647454,
        "duration": 11051
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2019118-11:42:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547829784593,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547829785771,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547829785772,
                "type": ""
            }
        ],
        "screenShotFile": "00fc0045-0075-008b-00bf-00e900ad00b3.png",
        "timestamp": 1547829781838,
        "duration": 19775
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-2019118-11:42:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ac0070-00f4-000a-00fc-001000e1009a.png",
        "timestamp": 1547829802360,
        "duration": 3747
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-2019118-11:42:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fd0050-00dc-009d-0018-000e00a00051.png",
        "timestamp": 1547829806822,
        "duration": 11365
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2019118-11:42:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00af0084-00a1-00c6-003f-00e20077007e.png",
        "timestamp": 1547829818894,
        "duration": 3487
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-2019118-11:42:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006500e6-004f-00f7-008e-009900d800a5.png",
        "timestamp": 1547829823041,
        "duration": 11060
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2037-11:49:34",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10500,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547830185436,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547830186998,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547830187000,
                "type": ""
            }
        ],
        "screenShotFile": "0087002f-0087-00b8-0069-00f7009f00aa.png",
        "timestamp": 1547830182626,
        "duration": 20381
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-2037-11:49:34",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10500,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002b00ee-0028-00ae-00ad-007500bb00e9.png",
        "timestamp": 1547830203761,
        "duration": 3717
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-2037-11:49:34",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10500,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b50028-0082-0094-0018-0034004300df.png",
        "timestamp": 1547830208198,
        "duration": 11422
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-2037-11:49:34",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10500,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00830075-00ff-0081-0030-00ed009d002c.png",
        "timestamp": 1547830220323,
        "duration": 3507
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-2037-11:49:34",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10500,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d900d0-0004-0076-0004-00d000f70068.png",
        "timestamp": 1547830224517,
        "duration": 11061
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190018-11:54:7",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547830459057,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547830460384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547830460385,
                "type": ""
            }
        ],
        "screenShotFile": "001a00e8-008b-00db-00cf-00e9000b0094.png",
        "timestamp": 1547830456155,
        "duration": 19907
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190018-11:54:7",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f40073-0091-0034-007d-00e20062003e.png",
        "timestamp": 1547830476787,
        "duration": 3714
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190018-11:54:7",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002a004b-00b4-00bc-00a3-00f900500029.png",
        "timestamp": 1547830481186,
        "duration": 11370
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190018-11:54:7",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009000f7-0084-0067-00a6-00700066006d.png",
        "timestamp": 1547830493280,
        "duration": 3534
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190018-11:54:7",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008b005d-001d-0071-0092-00c30004008c.png",
        "timestamp": 1547830497470,
        "duration": 11139
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-11:58:8",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547830699635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547830700735,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547830700736,
                "type": ""
            }
        ],
        "screenShotFile": "00830015-00cf-005c-00e3-00af00cf00b8.png",
        "timestamp": 1547830697200,
        "duration": 19195
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-11:58:8",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00910090-00d1-0060-000c-004a00d800c2.png",
        "timestamp": 1547830717123,
        "duration": 3734
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-11:58:8",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002d003e-00ff-0037-00bd-00ce00940047.png",
        "timestamp": 1547830721552,
        "duration": 11498
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-11:58:8",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d70004-00cc-00f0-0090-00d10012009f.png",
        "timestamp": 1547830733760,
        "duration": 3489
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-11:58:8",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00390089-004e-00ed-0021-007500a000e0.png",
        "timestamp": 1547830737922,
        "duration": 11047
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:02:17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20368,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547830950317,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547830951874,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547830951876,
                "type": ""
            }
        ],
        "screenShotFile": "006000b3-0037-00f1-006c-00f500e600c7.png",
        "timestamp": 1547830946727,
        "duration": 24638
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-12:02:17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20368,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b40042-0010-009d-006c-00b500d200f9.png",
        "timestamp": 1547830972433,
        "duration": 4036
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-12:02:17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20368,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0031008e-00d5-0040-002e-00dd00cb0061.png",
        "timestamp": 1547830977640,
        "duration": 13090
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:02:17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20368,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006d0080-00e3-0017-0006-0094007900af.png",
        "timestamp": 1547830991719,
        "duration": 3989
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-12:02:17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20368,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d6009b-006a-0053-008f-005100c00012.png",
        "timestamp": 1547830996548,
        "duration": 11670
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:06:41",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10084,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '1/20/2019' to equal '01/20/2019'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:17:82)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547831213296,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547831214485,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547831214486,
                "type": ""
            }
        ],
        "screenShotFile": "00430076-0072-007d-00c8-00c300680075.png",
        "timestamp": 1547831210291,
        "duration": 20630
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-12:06:41",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10084,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00980066-0097-0059-0014-0010003c00db.png",
        "timestamp": 1547831231723,
        "duration": 3918
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-12:06:41",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10084,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ed0099-00b6-0010-00df-00a1008700a0.png",
        "timestamp": 1547831236371,
        "duration": 11342
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:06:41",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10084,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected false to be true."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:114)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "006d00a2-00da-005c-00ce-00af00d40073.png",
        "timestamp": 1547831248426,
        "duration": 3457
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-12:06:41",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10084,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "009c0070-0083-0065-00e5-00f90085001b.png",
        "timestamp": 1547831252604,
        "duration": 438
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:08:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547831299189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547831300338,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547831300339,
                "type": ""
            }
        ],
        "screenShotFile": "00a2007d-0087-00fb-009a-00e3001d00a9.png",
        "timestamp": 1547831296345,
        "duration": 19769
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-12:08:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b10090-0025-0045-00ed-004200950086.png",
        "timestamp": 1547831316840,
        "duration": 3749
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-12:08:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00dc0071-000c-00e1-006e-00b900760035.png",
        "timestamp": 1547831321279,
        "duration": 11351
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-12:08:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0053003e-0081-0043-00f3-004a009e00de.png",
        "timestamp": 1547831333337,
        "duration": 3492
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-12:08:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001b00f4-00b2-009c-005c-00e5003f00b8.png",
        "timestamp": 1547831337511,
        "duration": 10990
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-16:14:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547846107001,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547846108423,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547846108424,
                "type": ""
            }
        ],
        "screenShotFile": "004c00e9-00fd-0057-0020-00ed00920005.png",
        "timestamp": 1547846104026,
        "duration": 20241
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-16:14:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c400cf-00ab-0047-0095-00d600d30094.png",
        "timestamp": 1547846125008,
        "duration": 3745
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-16:14:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004a0060-00c6-00bc-0054-00bc00aa005c.png",
        "timestamp": 1547846129449,
        "duration": 11371
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-16:14:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bf0061-0039-0016-008b-008000520063.png",
        "timestamp": 1547846141540,
        "duration": 3480
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-16:14:53",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00bc0033-00cd-0056-00ba-00db008c0004.png",
        "timestamp": 1547846145711,
        "duration": 11066
    },
    {
        "description": "Create Driver|Shipping Manifest Automation Test-20190118-16:26:28",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547846800153,
                "type": ""
            }
        ],
        "screenShotFile": "00110086-0048-005d-009e-003300c80012.png",
        "timestamp": 1547846796987,
        "duration": 15185
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:27:49",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547846880533,
                "type": ""
            }
        ],
        "screenShotFile": "0041007f-00f4-00ef-0062-006e00f5008e.png",
        "timestamp": 1547846878135,
        "duration": 14070
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:32:54",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19048,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '' to equal 'The'.",
            "Expected '' to equal 'Duck'.",
            "Expected '' to equal 'The Duck'.",
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Secondary'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:17:56)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:20:55)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:23:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547847187322,
                "type": ""
            }
        ],
        "screenShotFile": "00190008-002e-0057-005f-003e00d80030.png",
        "timestamp": 1547847183236,
        "duration": 18151
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:39:38",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13252,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '' to equal 'The'.",
            "Expected '' to equal 'Duck'.",
            "Expected '' to equal 'The Duck'.",
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:17:56)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:20:55)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:23:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547847589611,
                "type": ""
            }
        ],
        "screenShotFile": "00530078-0068-008c-00b4-001000c3005f.png",
        "timestamp": 1547847587167,
        "duration": 21061
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:42:51",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19360,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '' to equal 'The'.",
            "Expected '' to equal 'Duck'.",
            "Expected '' to equal 'The Duck'.",
            "Expected '0: Primary' to equal 'Secondary'.",
            "Expected '1: Secondary' to equal 'Inactive'.",
            "Expected '1: No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:17:56)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:20:55)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:23:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:70)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547847782648,
                "type": ""
            }
        ],
        "screenShotFile": "000b006c-004c-0079-0000-00cb00a7007c.png",
        "timestamp": 1547847779780,
        "duration": 21741
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:44:14",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 804,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '' to equal 'Duck'.",
            "Expected '' to equal 'The Duck'.",
            "Expected '0: Primary' to equal 'Secondary'.",
            "Expected '1: Secondary' to equal 'Inactive'.",
            "Expected '1: No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:20:55)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:23:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:70)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547847865106,
                "type": ""
            }
        ],
        "screenShotFile": "00f8009f-0062-00ee-00d9-003b001a003d.png",
        "timestamp": 1547847862615,
        "duration": 21223
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:45:40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14484,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '' to equal 'The Duck'.",
            "Expected '0: Primary' to equal 'Secondary'.",
            "Expected '1: Secondary' to equal 'Inactive'.",
            "Expected '1: No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:23:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:64)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:70)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547847951130,
                "type": ""
            }
        ],
        "screenShotFile": "00d60098-0003-0085-00e4-000d00c60098.png",
        "timestamp": 1547847948622,
        "duration": 21053
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:47:20",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19616,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547848051681,
                "type": ""
            }
        ],
        "screenShotFile": "00c200d1-00f8-00d8-00b8-0001002300f8.png",
        "timestamp": 1547848048858,
        "duration": 21721
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:48:57",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2824,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Active\n                                        \n                                            Inactive\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:54)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547848148524,
                "type": ""
            }
        ],
        "screenShotFile": "005000c5-0052-0050-0036-0005001b0015.png",
        "timestamp": 1547848146048,
        "duration": 21316
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-16:52:58",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20304,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                        \n                                            Primary\n                                        \n                                            Secondary\n                                        \n                                    ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Active\n                                        \n                                            Inactive\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:54)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547848389667,
                "type": ""
            }
        ],
        "screenShotFile": "002c00a7-0051-0033-0012-006700bf0041.png",
        "timestamp": 1547848386924,
        "duration": 21272
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:01:54",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9264,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: expect(...).getText is not a function"
        ],
        "trace": [
            "TypeError: expect(...).getText is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:47)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547848925660,
                "type": ""
            }
        ],
        "screenShotFile": "00c2008c-00b0-000d-00f7-00ed004d0083.png",
        "timestamp": 1547848923197,
        "duration": 6275
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:02:59",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1284,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: expect(...).$ is not a function"
        ],
        "trace": [
            "TypeError: expect(...).$ is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547848990231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.winwholesale.com/default/img/logo-color.svg - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1547848999781,
                "type": ""
            }
        ],
        "screenShotFile": "00de00ab-002f-0023-0026-0005003e00db.png",
        "timestamp": 1547848987714,
        "duration": 14767
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:04:13",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11496,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: expect(...).element is not a function"
        ],
        "trace": [
            "TypeError: expect(...).element is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849063944,
                "type": ""
            }
        ],
        "screenShotFile": "005a0024-002a-0000-0095-001c00a0009b.png",
        "timestamp": 1547849061496,
        "duration": 6251
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:05:45",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18576,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: expect(...).getText is not a function"
        ],
        "trace": [
            "TypeError: expect(...).getText is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:61)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849156384,
                "type": ""
            }
        ],
        "screenShotFile": "00080015-0051-0025-00fb-00220082001b.png",
        "timestamp": 1547849154006,
        "duration": 6208
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:08:50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12436,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: expect(...).getText is not a function"
        ],
        "trace": [
            "TypeError: expect(...).getText is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:76)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849341845,
                "type": ""
            }
        ],
        "screenShotFile": "00fd002f-0030-00b0-001a-00e000510095.png",
        "timestamp": 1547849339448,
        "duration": 6382
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:09:59",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9772,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                            Primary\n                                        ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Active\n                                        \n                                            Inactive\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:86)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:54)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849410175,
                "type": ""
            }
        ],
        "screenShotFile": "00ee00ae-001d-00ad-0071-0007009000dc.png",
        "timestamp": 1547849407750,
        "duration": 21335
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:11:01",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11788,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                            Primary\n                                        ' to equal 'Secondary'.",
            "Expected '                                        \n                                            Active\n                                        \n                                            Inactive\n                                        \n                                    ' to equal 'Inactive'.",
            "Expected '                                        \n                                            Yes\n                                        \n                                            No\n                                        \n                                    ' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:86)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:54)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:58)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849473304,
                "type": ""
            }
        ],
        "screenShotFile": "00650055-00ab-008d-00e2-004e00fa000c.png",
        "timestamp": 1547849470012,
        "duration": 22629
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:13:08",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5180,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: element(...).element(...).getText(...).trim is not a function"
        ],
        "trace": [
            "TypeError: element(...).element(...).getText(...).trim is not a function\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:85)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849599449,
                "type": ""
            }
        ],
        "screenShotFile": "00190072-000e-00c9-005a-007b00b400ca.png",
        "timestamp": 1547849596649,
        "duration": 6997
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:14:56",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18284,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected '                                            Primary\n                                        ' to contain 'Secondary'.",
            "Expected '                                            Active\n                                        ' to contain 'Inactive'.",
            "Expected '                                            No\n                                        ' to contain 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:86)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:88)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:92)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849707719,
                "type": ""
            }
        ],
        "screenShotFile": "007d00b9-0010-002e-0081-008f00cc001b.png",
        "timestamp": 1547849704904,
        "duration": 21793
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190118-17:17:42",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12004,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.findElements(By(css selector, option:value))\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.findElements (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2081:19)\n    at parentWebElements.map (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:170:46)\n    at Array.map (<anonymous>)\n    at getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:167:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:73)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547849873642,
                "type": ""
            }
        ],
        "screenShotFile": "00970040-0086-00b5-0030-00c5005e0094.png",
        "timestamp": 1547849871211,
        "duration": 16491
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-17:22:57",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1547850189249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1547850190626,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1547850190627,
                "type": ""
            }
        ],
        "screenShotFile": "00050024-00a1-00bd-002f-009f00f40082.png",
        "timestamp": 1547850186446,
        "duration": 19941
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190118-17:22:57",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00170094-00b8-00e4-0058-006a00e0002e.png",
        "timestamp": 1547850207131,
        "duration": 3726
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190118-17:22:57",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00810043-006f-002a-0013-00f2003200ab.png",
        "timestamp": 1547850211574,
        "duration": 11346
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190118-17:22:57",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003c00c9-0009-002f-008b-000a009600a5.png",
        "timestamp": 1547850223642,
        "duration": 3495
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190118-17:22:57",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f90072-00f2-007b-00a4-002f00f3004d.png",
        "timestamp": 1547850227813,
        "duration": 11068
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-08:55:40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548078951552,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1548078952715,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548078952716,
                "type": ""
            }
        ],
        "screenShotFile": "009400b8-0067-004c-00e9-007f006f00b1.png",
        "timestamp": 1548078948881,
        "duration": 19871
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190121-08:55:40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ea00af-00cb-0031-00c6-00f200e000ec.png",
        "timestamp": 1548078969523,
        "duration": 3757
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190121-08:55:40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001900f8-000c-00da-00dd-007c005d003b.png",
        "timestamp": 1548078973968,
        "duration": 12080
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-08:55:40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected false to be true."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:114)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00e80027-00d8-0032-0010-004200d40042.png",
        "timestamp": 1548078986910,
        "duration": 3517
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190121-08:55:40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00db000b-008d-00ac-00c4-0007009d00ec.png",
        "timestamp": 1548078991194,
        "duration": 427
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-08:59:25",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079177860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1548079179217,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548079179218,
                "type": ""
            }
        ],
        "screenShotFile": "000200ee-00db-0039-0017-0032001b0039.png",
        "timestamp": 1548079174254,
        "duration": 20983
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190121-08:59:25",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8056,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #collapseStop0 > div > div > div > div > span)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #collapseStop0 > div > div > div > div > span)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:31:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Manifest - Add SO\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:28:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://webservicedev.winwholesale.com:8084/manifest-service-release/orders/3406087-0 - Failed to load resource: the server responded with a status of 404 ()",
                "timestamp": 1548079199302,
                "type": ""
            }
        ],
        "screenShotFile": "00bf009f-0086-0012-00c8-004f00f00086.png",
        "timestamp": 1548079195971,
        "duration": 3698
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:02:37",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079366280,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1548079367415,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548079367416,
                "type": ""
            }
        ],
        "screenShotFile": "003700cd-00f2-0092-00ee-00ea00ea00de.png",
        "timestamp": 1548079363567,
        "duration": 19877
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190121-09:02:37",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008e00fc-0040-002e-00c3-008000c500a4.png",
        "timestamp": 1548079384243,
        "duration": 3862
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190121-09:02:37",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00230004-0010-0004-0072-00bd0009005c.png",
        "timestamp": 1548079388829,
        "duration": 11368
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:02:37",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected false to be true."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:114)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "00c10091-0092-00d6-002d-000f0084009f.png",
        "timestamp": 1548079400958,
        "duration": 3478
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190121-09:02:37",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <span class=\"ui-sortable-column-icon fa fa-fw fa-sort\" ng-reflect-klass=\"ui-sortable-column-icon fa fa-\" ng-reflect-ng-class=\"[object Object]\"></span> is not clickable at point (256, 365). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:50:236)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Manifest\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:49:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a400b9-0098-003a-0020-00b1008500e1.png",
        "timestamp": 1548079405159,
        "duration": 456
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:04:04",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079456012,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1548079457146,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548079457147,
                "type": ""
            }
        ],
        "screenShotFile": "007300c8-00a6-0044-00a5-00a300d10026.png",
        "timestamp": 1548079453404,
        "duration": 19570
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190121-09:04:04",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002100bc-0050-004a-0004-00f2003f0080.png",
        "timestamp": 1548079473701,
        "duration": 3768
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190121-09:04:04",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0024007d-009b-0011-00d0-0036002800a4.png",
        "timestamp": 1548079478195,
        "duration": 11361
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:04:04",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00fc000d-005f-0061-002e-006700bf0052.png",
        "timestamp": 1548079490268,
        "duration": 3502
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190121-09:04:04",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00dc0065-0084-00cc-0043-007e00520002.png",
        "timestamp": 1548079494455,
        "duration": 11151
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:06:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11164,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079592824,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4771)",
                "timestamp": 1548079594193,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548079594194,
                "type": ""
            }
        ],
        "screenShotFile": "003300da-0046-0083-0090-006d00e10048.png",
        "timestamp": 1548079589867,
        "duration": 20052
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190121-09:06:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11164,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00330071-008d-001f-008d-00a9002e0088.png",
        "timestamp": 1548079610643,
        "duration": 3803
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190121-09:06:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11164,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00d100dc-0061-009c-00a9-008c00f3007e.png",
        "timestamp": 1548079615148,
        "duration": 11351
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190121-09:06:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11164,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00940034-0084-002c-00ae-0094004c00c8.png",
        "timestamp": 1548079627190,
        "duration": 3493
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190121-09:06:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11164,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002600a0-00c7-0088-0043-009300b60052.png",
        "timestamp": 1548079631385,
        "duration": 11039
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:09:00",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.findElements(By(css selector, option:value))\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.findElements (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2081:19)\n    at parentWebElements.map (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:170:46)\n    at Array.map (<anonymous>)\n    at getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:167:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:73)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079752533,
                "type": ""
            }
        ],
        "screenShotFile": "000100ca-00b9-0082-00df-008d00b100b2.png",
        "timestamp": 1548079749302,
        "duration": 17776
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:10:50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.findElements(By(css selector, option:value))\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.findElements (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2081:19)\n    at parentWebElements.map (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:170:46)\n    at Array.map (<anonymous>)\n    at getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:167:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:73)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548079862010,
                "type": ""
            }
        ],
        "screenShotFile": "0000001a-0060-007b-000f-00ce002d0033.png",
        "timestamp": 1548079858902,
        "duration": 17326
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:10:50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10844,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.findElements(By(css selector, option:value))\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.findElements (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2081:19)\n    at parentWebElements.map (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:170:46)\n    at Array.map (<anonymous>)\n    at getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:167:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:28:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548080644432,
                "type": ""
            }
        ],
        "screenShotFile": "005a00d4-0086-0098-009b-009600b100aa.png",
        "timestamp": 1548080638796,
        "duration": 22422
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:10:50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18972,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Primary' to equal 'Secondary'.",
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.findElements(By(css selector, option:value))\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.findElements (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2081:19)\n    at parentWebElements.map (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:170:46)\n    at Array.map (<anonymous>)\n    at getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:167:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548080750217,
                "type": ""
            }
        ],
        "screenShotFile": "008700d8-00da-002d-00f2-003100b900cf.png",
        "timestamp": 1548080746671,
        "duration": 20938
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19120,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Primary' to equal '1:Secondary'.",
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:26:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548081275370,
                "type": ""
            }
        ],
        "screenShotFile": "00e40063-005a-0021-0013-0090004c00ed.png",
        "timestamp": 1548081271386,
        "duration": 23264
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4672,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:29:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:32:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548081560797,
                "type": ""
            }
        ],
        "screenShotFile": "007200a7-00f3-00e8-0046-006800080098.png",
        "timestamp": 1548081558355,
        "duration": 21034
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 240,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548081839420,
                "type": ""
            }
        ],
        "screenShotFile": "00a600c1-006d-00e8-0045-00fb005f00e1.png",
        "timestamp": 1548081836984,
        "duration": 27359
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1188,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548081880952,
                "type": ""
            }
        ],
        "screenShotFile": "00db0077-00b5-00a3-00a9-003900a80025.png",
        "timestamp": 1548081878549,
        "duration": 21112
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17772,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548081976259,
                "type": ""
            }
        ],
        "screenShotFile": "007600c0-00be-006d-0068-000b003200b6.png",
        "timestamp": 1548081973436,
        "duration": 21464
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2752,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082140763,
                "type": ""
            }
        ],
        "screenShotFile": "00ad00f3-0038-00b3-0043-0005009c0019.png",
        "timestamp": 1548082137846,
        "duration": 21708
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10700,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082205124,
                "type": ""
            }
        ],
        "screenShotFile": "006000ca-007e-00b0-0073-004300d400de.png",
        "timestamp": 1548082202020,
        "duration": 21923
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11992,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082238840,
                "type": ""
            }
        ],
        "screenShotFile": "003200a3-00a9-0049-00b4-006b00ad00d6.png",
        "timestamp": 1548082236369,
        "duration": 21160
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12248,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:33:77)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082305367,
                "type": ""
            }
        ],
        "screenShotFile": "008e00cc-0098-000c-009d-0039003d00e2.png",
        "timestamp": 1548082302844,
        "duration": 17586
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2980,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082349970,
                "type": ""
            }
        ],
        "screenShotFile": "001b0039-0068-0031-0003-00af0092003d.png",
        "timestamp": 1548082347288,
        "duration": 17185
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Secondary' to equal 'Primary'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:27:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:38:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082478905,
                "type": ""
            }
        ],
        "screenShotFile": "00600043-0033-00c5-0027-002400dd0092.png",
        "timestamp": 1548082476304,
        "duration": 15594
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:34:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11620,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Secondary' to equal 'Primary'.",
            "Expected 'No' to equal 'Yes'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:27:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:37:81)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:38:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082526540,
                "type": ""
            }
        ],
        "screenShotFile": "00ff0083-0067-00e0-005e-007300740064.png",
        "timestamp": 1548082521308,
        "duration": 18572
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:57:32",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16536,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Secondary' to equal '1:Secondary'.",
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:27:75)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082663917,
                "type": ""
            }
        ],
        "screenShotFile": "009f00f7-00fa-00d3-005a-0009005e00ba.png",
        "timestamp": 1548082661203,
        "duration": 24642
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-09:58:46",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5848,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, select#employee)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, select#employee)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:36:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082737119,
                "type": ""
            }
        ],
        "screenShotFile": "009b0024-00cf-0043-0061-008800da00b7.png",
        "timestamp": 1548082734408,
        "duration": 25271
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:00:18",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2760,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button#driverModal)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button#driverModal)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:47:41)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (c:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082832354,
                "type": ""
            }
        ],
        "screenShotFile": "00620071-00fd-003b-0036-00c800f50022.png",
        "timestamp": 1548082826863,
        "duration": 36689
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:02:35",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9888,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548082967019,
                "type": ""
            }
        ],
        "screenShotFile": "00e1003e-00d7-0014-00f8-0095009a0096.png",
        "timestamp": 1548082964185,
        "duration": 34823
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:05:26",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13524,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548083140508,
                "type": ""
            }
        ],
        "screenShotFile": "003400be-0051-0045-0025-004b00f60047.png",
        "timestamp": 1548083135097,
        "duration": 40767
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:08:28",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11536,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548083319370,
                "type": ""
            }
        ],
        "screenShotFile": "002600d8-0029-0032-0013-008800840032.png",
        "timestamp": 1548083317001,
        "duration": 36850
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:19:23",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11988,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548083975181,
                "type": ""
            }
        ],
        "screenShotFile": "009700a8-0028-0041-0016-0068004d0021.png",
        "timestamp": 1548083972111,
        "duration": 38267
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:19:23",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11988,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00110021-00f4-0071-00ef-0016007600f3.png",
        "timestamp": 1548084011107,
        "duration": 388
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:20:40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084051611,
                "type": ""
            }
        ],
        "screenShotFile": "00d500b8-000d-0036-00f0-00e000ae0048.png",
        "timestamp": 1548084048508,
        "duration": 37655
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:20:40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8444,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b00087-00a6-00af-00e1-002b006c0014.png",
        "timestamp": 1548084086898,
        "duration": 401
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:22:09",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18220,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084140690,
                "type": ""
            }
        ],
        "screenShotFile": "006900bb-0051-00e3-0040-003500df00c6.png",
        "timestamp": 1548084138178,
        "duration": 36845
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:22:09",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18220,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00740098-0065-00c2-0061-00b600420049.png",
        "timestamp": 1548084175778,
        "duration": 408
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:23:27",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12248,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084219771,
                "type": ""
            }
        ],
        "screenShotFile": "0001005a-00b8-008e-0084-00bd00cb002a.png",
        "timestamp": 1548084216671,
        "duration": 37842
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:23:27",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12248,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000b0087-00f5-00d1-0024-0029007600bd.png",
        "timestamp": 1548084255260,
        "duration": 400
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:25:21",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10684,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084332269,
                "type": ""
            }
        ],
        "screenShotFile": "002200f7-0064-00ca-009c-009a00970023.png",
        "timestamp": 1548084329589,
        "duration": 37495
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:25:21",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10684,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d400a9-00b3-0093-0063-005700b2000a.png",
        "timestamp": 1548084367827,
        "duration": 386
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1792,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084437244,
                "type": ""
            }
        ],
        "screenShotFile": "006f0014-00bb-004c-0022-006f00c600ce.png",
        "timestamp": 1548084434227,
        "duration": 37385
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1792,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cc00ae-0024-0008-00a9-00a900aa00f1.png",
        "timestamp": 1548084472369,
        "duration": 397
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17264,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084576459,
                "type": ""
            }
        ],
        "screenShotFile": "009c0091-00a7-00be-00d0-0094008d0043.png",
        "timestamp": 1548084573647,
        "duration": 7983
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17264,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00720065-00a6-0063-004c-003200e0000a.png",
        "timestamp": 1548084582361,
        "duration": 415
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 236,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084621016,
                "type": ""
            }
        ],
        "screenShotFile": "00160081-00b7-0029-0084-00e600e80083.png",
        "timestamp": 1548084618350,
        "duration": 6596
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 236,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000b0001-008d-003a-0013-008e0042000f.png",
        "timestamp": 1548084625685,
        "duration": 401
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18764,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548084660148,
                "type": ""
            }
        ],
        "screenShotFile": "00e800b0-004c-00d6-00dc-00dd006e00c1.png",
        "timestamp": 1548084655013,
        "duration": 9371
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:27:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18764,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ed0092-0020-0003-0092-008400ea0022.png",
        "timestamp": 1548084665154,
        "duration": 409
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15104,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548085263256,
                "type": ""
            }
        ],
        "screenShotFile": "00b1000d-00da-0094-003d-007e00b000e7.png",
        "timestamp": 1548085260640,
        "duration": 37142
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15104,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006100af-001f-000e-0067-002d00ee0002.png",
        "timestamp": 1548085298526,
        "duration": 393
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9536,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548085375672,
                "type": ""
            }
        ],
        "screenShotFile": "004e00fb-007c-0048-00d8-000100ea00e3.png",
        "timestamp": 1548085372808,
        "duration": 7381
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9536,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006a00f3-008f-00e5-00d7-00fe0026009e.png",
        "timestamp": 1548085380951,
        "duration": 430
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9436,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548085399539,
                "type": ""
            }
        ],
        "screenShotFile": "00d300e9-0000-0099-00be-0028008a003e.png",
        "timestamp": 1548085397069,
        "duration": 6490
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-10:40:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9436,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ae00f0-000c-0007-0067-002700370008.png",
        "timestamp": 1548085404192,
        "duration": 323
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:10:36",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18920,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548087053095,
                "type": ""
            }
        ],
        "screenShotFile": "001d0039-00ba-0013-0097-00d5006600e9.png",
        "timestamp": 1548087048966,
        "duration": 39206
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-11:10:36",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18920,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007a009c-0050-0089-0055-00f400df0060.png",
        "timestamp": 1548087088958,
        "duration": 381
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10320,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548087405924,
                "type": ""
            }
        ],
        "screenShotFile": "00680086-0032-003d-009e-00f8007800ef.png",
        "timestamp": 1548087403141,
        "duration": 6763
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10320,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00410076-0040-00e4-00ad-00730025004e.png",
        "timestamp": 1548087410663,
        "duration": 385
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548087450029,
                "type": ""
            }
        ],
        "screenShotFile": "0053009e-00d4-009e-0001-00a200e500f9.png",
        "timestamp": 1548087447219,
        "duration": 6779
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b800eb-00bd-0014-0082-007a00150050.png",
        "timestamp": 1548087454735,
        "duration": 382
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548087510951,
                "type": ""
            }
        ],
        "screenShotFile": "00f10044-00e9-0031-0063-0009000f007d.png",
        "timestamp": 1548087507987,
        "duration": 6949
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11452,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002100e4-0002-00e1-006c-003b00df00f3.png",
        "timestamp": 1548087515671,
        "duration": 368
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11320,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548087970322,
                "type": ""
            }
        ],
        "screenShotFile": "00540085-00ff-0022-0061-00ac00210061.png",
        "timestamp": 1548087965389,
        "duration": 8975
    },
    {
        "description": "Find Driver|Shipping Manifest Create/Delete Driver-20190121-11:15:14",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11320,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00bb0077-00bb-00ac-00c8-006d00610040.png",
        "timestamp": 1548087975119,
        "duration": 6668
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:30:24",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17484,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548088235543,
                "type": ""
            }
        ],
        "screenShotFile": "0011009f-0091-00f7-00b6-008b00c7000d.png",
        "timestamp": 1548088232944,
        "duration": 36952
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:30:24",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17484,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548088270754,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548088270756,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://webservicedev.winwholesale.com:8084/manifest-service-release/drivers/2 - Failed to load resource: the server responded with a status of 501 ()",
                "timestamp": 1548088274078,
                "type": ""
            }
        ],
        "screenShotFile": "00450044-009e-0044-0043-00ef00930017.png",
        "timestamp": 1548088270644,
        "duration": 3781
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:40:05",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14136,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548088815890,
                "type": ""
            }
        ],
        "screenShotFile": "00620036-00a6-0038-0008-0042001a008b.png",
        "timestamp": 1548088813399,
        "duration": 37030
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:40:05",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14136,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548088851299,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548088851301,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://webservicedev.winwholesale.com:8084/manifest-service-release/drivers/2 - Failed to load resource: the server responded with a status of 501 ()",
                "timestamp": 1548088854587,
                "type": ""
            }
        ],
        "screenShotFile": "000900d2-00e1-00b0-0038-00cb00ee0091.png",
        "timestamp": 1548088851184,
        "duration": 3763
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:43:19",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21416,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548089010241,
                "type": ""
            }
        ],
        "screenShotFile": "0053004e-0072-0077-006b-0076001f0090.png",
        "timestamp": 1548089007664,
        "duration": 36806
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:43:19",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21416,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0046000d-00b4-0088-00ab-0075005600eb.png",
        "timestamp": 1548089045229,
        "duration": 1609
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14036,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548089103728,
                "type": ""
            }
        ],
        "screenShotFile": "007500dd-00e5-00a7-00a8-00da006b00d6.png",
        "timestamp": 1548089100757,
        "duration": 37752
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14036,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548089140583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548089140585,
                "type": ""
            }
        ],
        "screenShotFile": "009f00d8-00c5-00a5-00b9-00cd0049009e.png",
        "timestamp": 1548089139254,
        "duration": 4961
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19420,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)",
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, button.new-manifest-btn)\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous>\n    at pollCondition (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2195:19)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2191:7\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2190:22\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:67:16)\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:6:11)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)",
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, button.new-manifest-btn)\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:14:46)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at handleError (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4244:11)\n    at process.onerror (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:2371:17)\n    at process.emit (events.js:182:13)\n    at process.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\source-map-support\\source-map-support.js:439:21)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548089288616,
                "type": ""
            }
        ],
        "screenShotFile": "00940086-00e1-005c-008c-00ed0017000a.png",
        "timestamp": 1548089284772,
        "duration": 28954
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19420,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "ScriptTimeoutError: script timeout: result was not received in 11 seconds\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Protractor.waitForAngular() - Locator: By(css selector, #driverNameSelect > option)\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at ProtractorBrowser.executeAsyncScript_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:425:28)\n    at angularAppRoot.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:456:33)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Delete Driver\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:53:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\TESTS\\Test.js:4:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "003a000d-00a6-00b6-0044-00c7009f0098.png",
        "timestamp": 1548089314671,
        "duration": 11459
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548089342885,
                "type": ""
            }
        ],
        "screenShotFile": "00f4006d-0039-003f-0023-00e0007f0040.png",
        "timestamp": 1548089337781,
        "duration": 40012
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14644,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548089379918,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548089379919,
                "type": ""
            }
        ],
        "screenShotFile": "00ce001e-000b-0030-0097-0031005f0063.png",
        "timestamp": 1548089378583,
        "duration": 4942
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20748,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548107053552,
                "type": ""
            }
        ],
        "screenShotFile": "005f00cc-0017-0071-00dc-00b900e00062.png",
        "timestamp": 1548107051073,
        "duration": 37104
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-11:44:52",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20748,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548107090314,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548107090316,
                "type": ""
            }
        ],
        "screenShotFile": "00d00055-0024-0075-00d0-007200fa006e.png",
        "timestamp": 1548107088993,
        "duration": 5008
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-16:47:26",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14952,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548107257727,
                "type": ""
            }
        ],
        "screenShotFile": "009500e7-00c4-0010-0010-0075007e002c.png",
        "timestamp": 1548107255294,
        "duration": 37097
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-16:47:26",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14952,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548107294496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548107294498,
                "type": ""
            }
        ],
        "screenShotFile": "00df00d5-00f2-00e0-0017-0023002600ec.png",
        "timestamp": 1548107293173,
        "duration": 4963
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-16:59:22",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3552,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548107973480,
                "type": ""
            }
        ],
        "screenShotFile": "00810006-0013-00d4-0012-00c700650049.png",
        "timestamp": 1548107970995,
        "duration": 37168
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-16:59:22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3552,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548108010260,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548108010260,
                "type": ""
            }
        ],
        "screenShotFile": "00ce00a9-003e-0013-00aa-000d009800b9.png",
        "timestamp": 1548108008932,
        "duration": 9938
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190121-17:03:03",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548108194027,
                "type": ""
            }
        ],
        "screenShotFile": "001d0030-003c-00be-0087-000d00610022.png",
        "timestamp": 1548108191668,
        "duration": 36882
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190121-17:03:03",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548108230642,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548108230644,
                "type": ""
            }
        ],
        "screenShotFile": "00b900f1-003b-0019-00b8-007800e800ae.png",
        "timestamp": 1548108229313,
        "duration": 9933
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:04:09",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12788,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548191061442,
                "type": ""
            }
        ],
        "screenShotFile": "007e0022-00dd-0045-00fd-0010005300b1.png",
        "timestamp": 1548191059061,
        "duration": 37398
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:04:09",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12788,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548191098719,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548191098721,
                "type": ""
            }
        ],
        "screenShotFile": "00af005a-009f-0095-00d4-00d6009900a5.png",
        "timestamp": 1548191097335,
        "duration": 60347
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:07:23",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4696,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548191253965,
                "type": ""
            }
        ],
        "screenShotFile": "003900df-0040-009e-008c-006e007b0010.png",
        "timestamp": 1548191251585,
        "duration": 37253
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:07:23",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4696,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:425:11)\n    at tryOnTimeout (timers.js:289:5)\n    at listOnTimeout (timers.js:252:5)\n    at Timer.processTimers (timers.js:212:10)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548191290969,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548191290970,
                "type": ""
            }
        ],
        "screenShotFile": "00a50038-00c6-00d0-0025-006700ab00b3.png",
        "timestamp": 1548191289619,
        "duration": 60368
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:16:51",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11288,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548191823212,
                "type": ""
            }
        ],
        "screenShotFile": "00700080-00ee-0058-00f7-0097003b005f.png",
        "timestamp": 1548191820691,
        "duration": 37663
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:16:51",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11288,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548191860473,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548191860474,
                "type": ""
            }
        ],
        "screenShotFile": "007d00cf-0004-00ee-0052-003f0002005d.png",
        "timestamp": 1548191859135,
        "duration": 4978
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:22:09",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17388,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548192140521,
                "type": ""
            }
        ],
        "screenShotFile": "00b10080-0043-00cf-00ae-005200380032.png",
        "timestamp": 1548192137729,
        "duration": 37504
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:22:09",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17388,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.b9c48bd0b02a52814c68.js:127:4841)",
                "timestamp": 1548192177421,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548192177421,
                "type": ""
            }
        ],
        "screenShotFile": "00280097-0045-0048-00a7-00a300d000ce.png",
        "timestamp": 1548192176050,
        "duration": 4980
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:26:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548192377754,
                "type": ""
            }
        ],
        "screenShotFile": "004900a8-00ab-0079-00a9-00980032007c.png",
        "timestamp": 1548192375386,
        "duration": 36830
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:26:07",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13532,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548192414294,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548192414297,
                "type": ""
            }
        ],
        "screenShotFile": "00450089-001b-0059-0018-00ef00d3003e.png",
        "timestamp": 1548192412976,
        "duration": 4997
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16:27:39",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8944,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548192471086,
                "type": ""
            }
        ],
        "screenShotFile": "00ab0059-008a-00cc-00f7-004a00f30050.png",
        "timestamp": 1548192468181,
        "duration": 37507
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16:27:39",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8944,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548192507811,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548192507813,
                "type": ""
            }
        ],
        "screenShotFile": "0045001d-0041-00fe-00d4-00b500ef000f.png",
        "timestamp": 1548192506487,
        "duration": 4920
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190122-16-29-32",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5488,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548192584419,
                "type": ""
            }
        ],
        "screenShotFile": "00660061-00e9-0071-00ef-000d00200076.png",
        "timestamp": 1548192581222,
        "duration": 38079
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190122-16-29-32",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5488,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548192621405,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548192621407,
                "type": ""
            }
        ],
        "screenShotFile": "00b500ae-0025-0097-0011-0058007b00fe.png",
        "timestamp": 1548192620088,
        "duration": 4939
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

