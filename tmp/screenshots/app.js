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
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-08-42-45",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11820,
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
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548250968410,
                "type": ""
            }
        ],
        "screenShotFile": "009f002e-00d9-0084-0084-0019005e0073.png",
        "timestamp": 1548250965832,
        "duration": 37086
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-08-42-45",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11820,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548251005064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548251005065,
                "type": ""
            }
        ],
        "screenShotFile": "00c800be-00ad-003e-0017-008d007000f6.png",
        "timestamp": 1548251003710,
        "duration": 4977
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-08-47-01",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4408,
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
                "timestamp": 1548251226453,
                "type": ""
            }
        ],
        "screenShotFile": "00f800f8-004f-00d8-00a8-00d7004700b8.png",
        "timestamp": 1548251221413,
        "duration": 39668
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-08-47-01",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4408,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548251263166,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548251263168,
                "type": ""
            }
        ],
        "screenShotFile": "001800f6-0085-00f7-0068-002600b50086.png",
        "timestamp": 1548251261836,
        "duration": 4995
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-08-50-13",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10984,
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
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548251416239,
                "type": ""
            }
        ],
        "screenShotFile": "00230032-00b8-00b2-0064-002c001b0062.png",
        "timestamp": 1548251413455,
        "duration": 37287
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-08-50-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10984,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548251452793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548251452794,
                "type": ""
            }
        ],
        "screenShotFile": "00880051-0073-0077-0017-0085000100f3.png",
        "timestamp": 1548251451461,
        "duration": 5013
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-08-56-49",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15908,
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
                "timestamp": 1548251813813,
                "type": ""
            }
        ],
        "screenShotFile": "00450074-0092-0000-00be-00bb003e007c.png",
        "timestamp": 1548251809979,
        "duration": 39139
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-08-56-49",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15908,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548251851203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548251851206,
                "type": ""
            }
        ],
        "screenShotFile": "003500a2-000b-00bb-00b8-005800e7005b.png",
        "timestamp": 1548251849848,
        "duration": 5015
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-03-17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1832,
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
                "timestamp": 1548252201184,
                "type": ""
            }
        ],
        "screenShotFile": "0094009f-00e4-00af-0062-008c004c0000.png",
        "timestamp": 1548252197666,
        "duration": 38537
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-03-17",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1832,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548252238268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548252238270,
                "type": ""
            }
        ],
        "screenShotFile": "00720033-0034-00ef-005f-00b70046009d.png",
        "timestamp": 1548252236917,
        "duration": 4967
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-06-47",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7348,
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
                "timestamp": 1548252412824,
                "type": ""
            }
        ],
        "screenShotFile": "00fa0009-00d4-0069-00fd-00a800630059.png",
        "timestamp": 1548252407560,
        "duration": 40485
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-06-47",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7348,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548252450101,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548252450103,
                "type": ""
            }
        ],
        "screenShotFile": "005e002e-00ec-00a2-0044-004d00f6001a.png",
        "timestamp": 1548252448769,
        "duration": 4992
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-14-40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5676,
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
                "timestamp": 1548252885747,
                "type": ""
            }
        ],
        "screenShotFile": "00a60044-00cf-00c1-00be-00f300ec0054.png",
        "timestamp": 1548252880749,
        "duration": 39714
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-14-40",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5676,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548252922947,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548252922948,
                "type": ""
            }
        ],
        "screenShotFile": "009400aa-001c-0055-0025-005600f40059.png",
        "timestamp": 1548252921346,
        "duration": 5352
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-19-18",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18912,
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
                "timestamp": 1548253161323,
                "type": ""
            }
        ],
        "screenShotFile": "007b005e-00d4-0038-00cc-0018004f0076.png",
        "timestamp": 1548253158600,
        "duration": 37689
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-19-18",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18912,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548253198371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548253198375,
                "type": ""
            }
        ],
        "screenShotFile": "004400a8-00e1-004c-009e-0060004e0075.png",
        "timestamp": 1548253197021,
        "duration": 4971
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-20-26",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14844,
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
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548253232415,
                "type": ""
            }
        ],
        "screenShotFile": "004f00f3-00bf-008d-0066-007300570011.png",
        "timestamp": 1548253226154,
        "duration": 42515
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-20-26",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14844,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548253270775,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548253270777,
                "type": ""
            }
        ],
        "screenShotFile": "00d400b3-00f3-0027-00fd-006f006f005c.png",
        "timestamp": 1548253269416,
        "duration": 4956
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-34-11",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10040,
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
                "timestamp": 1548254054752,
                "type": ""
            }
        ],
        "screenShotFile": "00dc00db-00df-00e4-00f1-00d5003e0022.png",
        "timestamp": 1548254051979,
        "duration": 37810
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-34-11",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10040,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548254091851,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548254091853,
                "type": ""
            }
        ],
        "screenShotFile": "008e0049-006a-0013-00f1-00c90078002b.png",
        "timestamp": 1548254090520,
        "duration": 4972
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-09-36-32",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9320,
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
                "timestamp": 1548254195934,
                "type": ""
            }
        ],
        "screenShotFile": "00930082-00b0-004b-0039-000b00f400e0.png",
        "timestamp": 1548254192687,
        "duration": 38287
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-09-36-32",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9320,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548254233074,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548254233075,
                "type": ""
            }
        ],
        "screenShotFile": "00930047-00a6-0043-0054-00ac0094005d.png",
        "timestamp": 1548254231718,
        "duration": 4960
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-10-02-18",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11032,
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
                "timestamp": 1548255744187,
                "type": ""
            }
        ],
        "screenShotFile": "0048003c-000c-0025-00a7-00e600c40012.png",
        "timestamp": 1548255738862,
        "duration": 40626
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-10-02-18",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11032,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548255781529,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548255781531,
                "type": ""
            }
        ],
        "screenShotFile": "00cd0078-0045-0026-0085-00b3006200ca.png",
        "timestamp": 1548255780208,
        "duration": 4955
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-10-08-10",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13608,
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
                "timestamp": 1548256093821,
                "type": ""
            }
        ],
        "screenShotFile": "00d000d2-0094-0043-0091-00b700d900ce.png",
        "timestamp": 1548256090714,
        "duration": 38647
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-10-08-10",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13608,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548256131417,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548256131419,
                "type": ""
            }
        ],
        "screenShotFile": "001a00d1-00fe-0051-0044-0041002000c7.png",
        "timestamp": 1548256130098,
        "duration": 4965
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-10-09-36",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3960,
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
                "timestamp": 1548256179348,
                "type": ""
            }
        ],
        "screenShotFile": "00f700ad-003a-0099-0079-007100c60017.png",
        "timestamp": 1548256176416,
        "duration": 37767
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-10-09-36",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3960,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548256216217,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548256216218,
                "type": ""
            }
        ],
        "screenShotFile": "0026005d-002d-002e-0070-007e006200cd.png",
        "timestamp": 1548256214889,
        "duration": 4955
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-10-11-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11008,
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
                "timestamp": 1548256276217,
                "type": ""
            }
        ],
        "screenShotFile": "002d00fd-00fd-0046-0047-00b2003900cb.png",
        "timestamp": 1548256273767,
        "duration": 37236
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-10-11-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11008,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548256313069,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548256313072,
                "type": ""
            }
        ],
        "screenShotFile": "00cc00b1-0085-0044-005f-00e800d6002a.png",
        "timestamp": 1548256311723,
        "duration": 4997
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-13-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13432,
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
                "timestamp": 1548256407955,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4771)",
                "timestamp": 1548256409130,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548256409132,
                "type": ""
            }
        ],
        "screenShotFile": "003900b4-0012-00a5-0079-00ca00720033.png",
        "timestamp": 1548256402858,
        "duration": 19564
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190123-10-13-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13432,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005100e2-0006-0089-0074-006900b400fb.png",
        "timestamp": 1548256423140,
        "duration": 3825
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190123-10-13-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13432,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00130038-00eb-00db-00be-0050008b002b.png",
        "timestamp": 1548256427663,
        "duration": 11628
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-13-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13432,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005f0038-002d-005e-0043-00280083002c.png",
        "timestamp": 1548256439998,
        "duration": 3542
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190123-10-13-22",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13432,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00480072-00cc-0021-0045-00d6009b005b.png",
        "timestamp": 1548256444240,
        "duration": 11180
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-32-02",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 508,
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
                "timestamp": 1548257527851,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4771)",
                "timestamp": 1548257529061,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548257529063,
                "type": ""
            }
        ],
        "screenShotFile": "007d00dd-0064-00f2-00c3-002700340080.png",
        "timestamp": 1548257522763,
        "duration": 19990
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190123-10-32-02",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 508,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001c000b-005f-0010-0079-00f6008100ee.png",
        "timestamp": 1548257543465,
        "duration": 3868
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190123-10-32-02",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 508,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f00026-009e-0095-0093-00ce00b70005.png",
        "timestamp": 1548257548032,
        "duration": 11684
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-32-02",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 508,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c00003-0017-003e-00d9-00d2009d00cf.png",
        "timestamp": 1548257560421,
        "duration": 3602
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190123-10-32-02",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 508,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b5004f-0070-00d4-0027-00b2005b00cc.png",
        "timestamp": 1548257564733,
        "duration": 11274
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-39-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14156,
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
                "timestamp": 1548257956137,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckDirectivesFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15175)\n    at Object.eval [as updateDirectives] (ng:///AppModule/AppComponent.ngfactory.js:121:5)\n    at Object.debugUpdateDirectives [as updateDirectives] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15447)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4771)",
                "timestamp": 1548257957288,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///AppModule/AppComponent.ngfactory.js 69:73 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548257957290,
                "type": ""
            }
        ],
        "screenShotFile": "0002003f-003d-0028-00eb-0085008300dd.png",
        "timestamp": 1548257953478,
        "duration": 17223
    },
    {
        "description": "Create Manifest - Add SO|Shipping Manifest Automation Test-20190123-10-39-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14156,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f30049-006f-00c5-00a9-007f00970021.png",
        "timestamp": 1548257971426,
        "duration": 3859
    },
    {
        "description": "Create Manifest - Add PO|Shipping Manifest Automation Test-20190123-10-39-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14156,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f20099-008f-00ae-0043-0003001e00ef.png",
        "timestamp": 1548257975989,
        "duration": 11613
    },
    {
        "description": "Create Manifest|Shipping Manifest Automation Test-20190123-10-39-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14156,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009d00cf-00ec-0052-001c-006800410046.png",
        "timestamp": 1548257988305,
        "duration": 3510
    },
    {
        "description": "Delete Manifest|Shipping Manifest Automation Test-20190123-10-39-13",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14156,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e500b4-00d1-00f5-0089-006f009a00b4.png",
        "timestamp": 1548257992573,
        "duration": 11263
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-10-40-25",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7520,
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
                "timestamp": 1548258028777,
                "type": ""
            }
        ],
        "screenShotFile": "009b00e4-0011-008d-0002-005b00f40034.png",
        "timestamp": 1548258025203,
        "duration": 38539
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-10-40-25",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7520,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548258065789,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548258065791,
                "type": ""
            }
        ],
        "screenShotFile": "003a003d-003b-00c9-0008-008600d40087.png",
        "timestamp": 1548258064475,
        "duration": 4918
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-05-42",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3212,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, input#truckname)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, input#truckname)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:15:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548259545028,
                "type": ""
            }
        ],
        "screenShotFile": "002a0033-0026-007f-00d0-003700e400e1.png",
        "timestamp": 1548259542466,
        "duration": 7778
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-06-50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9560,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, input#truckname)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, input#truckname)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:15:38)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548259613743,
                "type": ""
            }
        ],
        "screenShotFile": "002c00de-00f0-00f4-00b0-009600890018.png",
        "timestamp": 1548259610414,
        "duration": 8878
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-07-50",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9252,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:25:96)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548259673974,
                "type": ""
            }
        ],
        "screenShotFile": "00170051-0058-00a9-008c-005900a700a2.png",
        "timestamp": 1548259670554,
        "duration": 16264
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-10-38",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4756,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:25:96)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548259841666,
                "type": ""
            }
        ],
        "screenShotFile": "00c7004c-00a0-00d8-0009-00180086001b.png",
        "timestamp": 1548259838563,
        "duration": 15705
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-11-30",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14988,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #driverModal > driver-new > div.mobile-modal-btn-div.action-buttons > div)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:26:96)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548259893865,
                "type": ""
            }
        ],
        "screenShotFile": "00ff006a-0044-003a-00d0-00520080004f.png",
        "timestamp": 1548259890289,
        "duration": 18558
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-14-08",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16264,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, option#status)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, option#status)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260051568,
                "type": ""
            }
        ],
        "screenShotFile": "002200d2-009b-0039-0089-006500eb007f.png",
        "timestamp": 1548260048952,
        "duration": 15077
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-16-26",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9984,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, option#status)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, option#status)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:25:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260191337,
                "type": ""
            }
        ],
        "screenShotFile": "009b0096-0035-00c0-00f0-004400b40078.png",
        "timestamp": 1548260186197,
        "duration": 19709
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-19-26",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16824,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:25:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260369558,
                "type": ""
            }
        ],
        "screenShotFile": "004a00ed-00ae-0063-0095-00dd004800f9.png",
        "timestamp": 1548260366358,
        "duration": 18195
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-20-22",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19188,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:25:30)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260425465,
                "type": ""
            }
        ],
        "screenShotFile": "00410073-00be-002d-003a-00be00f000b5.png",
        "timestamp": 1548260422325,
        "duration": 17966
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-24-13",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19468,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260656943,
                "type": ""
            }
        ],
        "screenShotFile": "00870040-00f8-00cd-00c7-00af00a40082.png",
        "timestamp": 1548260653612,
        "duration": 15889
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-29-22",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6964,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:19:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548260965395,
                "type": ""
            }
        ],
        "screenShotFile": "00880021-00c1-00e7-00ae-00fb006f002c.png",
        "timestamp": 1548260962697,
        "duration": 10989
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-30-24",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19396,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261027653,
                "type": ""
            }
        ],
        "screenShotFile": "00c200db-00a9-0079-0043-00700089006a.png",
        "timestamp": 1548261024642,
        "duration": 15735
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-36-16",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5200,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261379088,
                "type": ""
            }
        ],
        "screenShotFile": "00f600a8-0068-009a-0078-003600740034.png",
        "timestamp": 1548261376049,
        "duration": 15552
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-37-54",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10312,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261479074,
                "type": ""
            }
        ],
        "screenShotFile": "00fa00ad-007d-0001-0011-007100a900b3.png",
        "timestamp": 1548261474905,
        "duration": 16849
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-42-10",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4660,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:36)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261734990,
                "type": ""
            }
        ],
        "screenShotFile": "00f900a1-0012-00e0-0002-00ac0087007b.png",
        "timestamp": 1548261730962,
        "duration": 16844
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-43-43",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4308,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #status > select:nth-child(2))"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #status > select:nth-child(2))\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:52)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261825747,
                "type": ""
            }
        ],
        "screenShotFile": "00d200ea-001a-00e7-00ad-00e600a200cd.png",
        "timestamp": 1548261823084,
        "duration": 15136
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-44-38",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9420,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #status > select)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #status > select)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:39)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261881511,
                "type": ""
            }
        ],
        "screenShotFile": "00f500c9-003d-0073-00e8-0038001300b7.png",
        "timestamp": 1548261878584,
        "duration": 15544
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-45-36",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17104,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548261938761,
                "type": ""
            }
        ],
        "screenShotFile": "008e008e-0038-0046-0038-00ec005600b0.png",
        "timestamp": 1548261936215,
        "duration": 15026
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-46-37",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19304,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"status\" ng-reflect-model=\"Active\">...</select> is not clickable at point (808, 200). Other element would receive the click: <select class=\"form-control ng-untouched ng-pristine ng-valid\" id=\"cdlRequired\" name=\"cdlRequired\" required=\"\" ng-reflect-required=\"\" ng-reflect-name=\"cdlRequired\" ng-reflect-model=\"No\">...</select>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:24:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262000702,
                "type": ""
            }
        ],
        "screenShotFile": "002400e4-0093-000e-00a8-006f005f0015.png",
        "timestamp": 1548261998005,
        "duration": 15417
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-47-36",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 544,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Failed: No element found using locator: By(css selector, option#cdlRequired)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:26:84)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, option#cdlRequired)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:27:41)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:160:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262061461,
                "type": ""
            }
        ],
        "screenShotFile": "001200ec-00ae-00a8-009c-0023004f002f.png",
        "timestamp": 1548262056344,
        "duration": 19676
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-53-18",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2992,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Failed: No element found using locator: By(css selector, option#cdlRequired)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:26:84)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, option#cdlRequired)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:27:41)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262404225,
                "type": ""
            }
        ],
        "screenShotFile": "0020008f-005f-00ce-0009-00cf00c10073.png",
        "timestamp": 1548262398466,
        "duration": 20504
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-55-08",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1076,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Expected 'Active' to equal 'Inactive'.",
            "Failed: No element found using locator: By(css selector, option#cdlRequired)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:27:84)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, option#cdlRequired)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:28:41)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262511683,
                "type": ""
            }
        ],
        "screenShotFile": "00b900d5-00a0-00cb-0085-005000450072.png",
        "timestamp": 1548262508042,
        "duration": 18362
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-11-57-40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14916,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, option#cdlRequired)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, option#cdlRequired)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:27:41)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262662958,
                "type": ""
            }
        ],
        "screenShotFile": "00ab001f-00ad-007a-0031-00080018001e.png",
        "timestamp": 1548262660223,
        "duration": 17437
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-00-40",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6948,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button#newTruckModal)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button#newTruckModal)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:45:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548262843973,
                "type": ""
            }
        ],
        "screenShotFile": "003d0042-0062-0013-00a5-00e400f10032.png",
        "timestamp": 1548262840606,
        "duration": 32657
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-12-02-03",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4668,
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
                "timestamp": 1548262926436,
                "type": ""
            }
        ],
        "screenShotFile": "00f9008d-00c6-00bb-004c-00590009009a.png",
        "timestamp": 1548262923504,
        "duration": 32643
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-12-02-03",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4668,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548262958317,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548262958322,
                "type": ""
            }
        ],
        "screenShotFile": "0004003d-00b6-0047-0010-00fe0030009a.png",
        "timestamp": 1548262956907,
        "duration": 5082
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-12-03-43",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7212,
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
                "timestamp": 1548263027238,
                "type": ""
            }
        ],
        "screenShotFile": "00b600b0-00f0-00f8-0031-008c00c4009e.png",
        "timestamp": 1548263023755,
        "duration": 33260
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-12-03-43",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7212,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548263059115,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548263059117,
                "type": ""
            }
        ],
        "screenShotFile": "001b0043-0089-0042-00bb-005d00110085.png",
        "timestamp": 1548263057760,
        "duration": 4940
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-12-04-59",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19984,
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
                "timestamp": 1548263103469,
                "type": ""
            }
        ],
        "screenShotFile": "00c500ea-009a-00a5-00a3-00a100710024.png",
        "timestamp": 1548263099845,
        "duration": 33506
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-12-04-59",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19984,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548263135444,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548263135446,
                "type": ""
            }
        ],
        "screenShotFile": "00b30074-007f-00b3-000f-00bc005e0054.png",
        "timestamp": 1548263134108,
        "duration": 4956
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-10-03",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1324,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button#newTruckModal)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button#newTruckModal)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:75:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548263405843,
                "type": ""
            }
        ],
        "screenShotFile": "009500bb-002d-0024-00ad-00c200b800eb.png",
        "timestamp": 1548263403143,
        "duration": 31519
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-12-10-03",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1324,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:79:204)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:77:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "004c0004-0027-0079-0074-0049002f004e.png",
        "timestamp": 1548263435597,
        "duration": 485
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-13-01",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8496,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button#newTruckModal)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button#newTruckModal)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:75:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548263586662,
                "type": ""
            }
        ],
        "screenShotFile": "00f3009e-00ad-0024-00ab-005a00a00009.png",
        "timestamp": 1548263581222,
        "duration": 34301
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-12-13-01",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8496,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:79:204)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:77:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f4004d-007d-00b3-00ee-000e000500e2.png",
        "timestamp": 1548263616251,
        "duration": 408
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-20-04",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19300,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, button#newTruckModal)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, button#newTruckModal)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:75:43)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:13:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js 180:351 \"Template parse warnings:\\nThe \\u003Ctemplate> element is deprecated. Use \\u003Cng-template> instead (\\\"er.orderNumber}}\\u003C/span>\\n                                                                            [WARNING ->]\\u003Ctemplate #shippingInfoTemplate>\\n                                                                    \\\"): ng:///ManifestModule/NewManifestComponent.html@235:76\"",
                "timestamp": 1548264009539,
                "type": ""
            }
        ],
        "screenShotFile": "00870031-00a5-00d3-001e-007a00dc0008.png",
        "timestamp": 1548264004203,
        "duration": 34255
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-12-20-04",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19300,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:79:204)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:77:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "0083006e-00a7-00ec-00f8-009100f40043.png",
        "timestamp": 1548264039190,
        "duration": 568
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-22-48",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18540,
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
                "timestamp": 1548264171771,
                "type": ""
            }
        ],
        "screenShotFile": "00a400f3-0081-00f0-00f1-005700a90042.png",
        "timestamp": 1548264168720,
        "duration": 37706
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-12-22-48",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 18540,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <a>...</a> is not clickable at point (169, 334). Other element would receive the click: <div class=\"modal-content\">...</div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.44.609538 (b655c5a60b0b544917107a59d4153d4bf78e1b90),platform=Windows NT 10.0.15063 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:79:204)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Truck\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:77:2)\n    at addSpecsToSuite (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\gebirecki\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at eval (eval at <anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1), <anonymous>:4:1)\n    at Object.<anonymous> (C:\\Users\\gebirecki\\protractorworkspace\\Protractor6\\Fork.js:161:1)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)"
        ],
        "browserLogs": [],
        "screenShotFile": "005e00d5-00fc-00f7-003a-001500b800ef.png",
        "timestamp": 1548264207158,
        "duration": 587
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-12-26-37",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2768,
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
                "timestamp": 1548264403383,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///TruckModule/TruckNewComponent.ngfactory.js:1241:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548264440214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548264440215,
                "type": ""
            }
        ],
        "screenShotFile": "00680058-00b0-0050-00ac-0055001700ae.png",
        "timestamp": 1548264397839,
        "duration": 42742
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-12-26-37",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2768,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fe0063-004b-0025-004c-00c700480070.png",
        "timestamp": 1548264441364,
        "duration": 4863
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-13-03-56",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3836,
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
                "timestamp": 1548266639551,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///TruckModule/TruckNewComponent.ngfactory.js:1241:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548266676648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548266676648,
                "type": ""
            }
        ],
        "screenShotFile": "00990022-0039-00a1-00da-00d000ef0099.png",
        "timestamp": 1548266636567,
        "duration": 40430
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-13-03-56",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3836,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e0003c-003c-0035-00be-003e004700cb.png",
        "timestamp": 1548266677762,
        "duration": 4954
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-13-07-15",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7736,
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
                "timestamp": 1548266839270,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///TruckModule/TruckNewComponent.ngfactory.js:1241:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548266876142,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548266876144,
                "type": ""
            }
        ],
        "screenShotFile": "00e60087-006e-006e-0098-00f500ad0062.png",
        "timestamp": 1548266835881,
        "duration": 40629
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-13-07-15",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7736,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007400df-002a-000f-0041-000700a900c4.png",
        "timestamp": 1548266877248,
        "duration": 4996
    },
    {
        "description": "Create Truck|Shipping Manifest Create/Delete Truck-20190123-13-09-30",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11168,
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
                "timestamp": 1548266977182,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///TruckModule/TruckNewComponent.ngfactory.js:1241:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548267013840,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///TruckModule/TruckNewComponent.ngfactory.js 1214:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548267013841,
                "type": ""
            }
        ],
        "screenShotFile": "00e100de-0077-0034-006a-0082005200cc.png",
        "timestamp": 1548266970885,
        "duration": 43327
    },
    {
        "description": "Delete Truck|Shipping Manifest Create/Delete Truck-20190123-13-09-30",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11168,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a200c9-0083-00c6-0047-00000055003c.png",
        "timestamp": 1548267014985,
        "duration": 4949
    },
    {
        "description": "Create Driver|Shipping Manifest Create/Delete Driver-20190123-13-48-15",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6104,
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
                "timestamp": 1548269298634,
                "type": ""
            }
        ],
        "screenShotFile": "00e200f3-0021-00bd-00b5-00300044005f.png",
        "timestamp": 1548269295241,
        "duration": 33102
    },
    {
        "description": "Delete Driver|Shipping Manifest Create/Delete Driver-20190123-13-48-15",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6104,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR\" Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.\n    at viewDebugError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:546)\n    at expressionChangedAfterItHasBeenCheckedError (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:376)\n    at checkBindingNoChanges (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:78:1728)\n    at checkNoChangesNodeInline (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6942)\n    at checkNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:6768)\n    at debugCheckNoChangesNode (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:16595)\n    at debugCheckRenderNodeFn (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15690)\n    at Object.eval [as updateRenderer] (ng:///DriverModule/DriverNewComponent.ngfactory.js:1189:5)\n    at Object.debugUpdateRenderer [as updateRenderer] (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:15960)\n    at checkNoChangesView (http://webservicedev.winwholesale.com/shipping-manifest-manager-release/js/vendor.46137df9d05b764ac17b.js:127:4841)",
                "timestamp": 1548269330572,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "ng:///DriverModule/DriverNewComponent.ngfactory.js 1159:11 \"ERROR CONTEXT\" DebugContext_",
                "timestamp": 1548269330573,
                "type": ""
            }
        ],
        "screenShotFile": "008200b0-007b-00e6-00a7-007b003a0054.png",
        "timestamp": 1548269329090,
        "duration": 5092
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

